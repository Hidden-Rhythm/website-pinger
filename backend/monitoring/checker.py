import time
import json
import re
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
import httpx

from backend.security.ssrf import validate_target_url, SSRFValidationError

# Response body maximum download limit (512 KB)
MAX_RESPONSE_BODY_BYTES = 512 * 1024
MAX_REDIRECTS = 5
MAX_REQUEST_BODY_BYTES = 64 * 1024


def safe_json_extract(data: Any, path: str) -> Tuple[bool, Any]:
    """
    Safely extract value from nested dict/list using dot notation or array indexing.
    Example: 'data.status' or 'items.0.name' or 'results[0].id'
    NO eval() or exec() is used.
    """
    if not path or not path.strip():
        return False, None

    # Normalize tokens: e.g. "items[0].name" -> ["items", "0", "name"]
    normalized_path = re.sub(r'\[(\d+)\]', r'.\1', path.strip())
    tokens = [t for t in normalized_path.split('.') if t]

    current = data
    for token in tokens:
        if isinstance(current, dict):
            if token in current:
                current = current[token]
            else:
                return False, None
        elif isinstance(current, list):
            try:
                idx = int(token)
                if 0 <= idx < len(current):
                    current = current[idx]
                else:
                    return False, None
            except ValueError:
                return False, None
        else:
            return False, None

    return True, current


def evaluate_json_assertion(
    response_json: Any,
    path: str,
    operator: str,
    expected_value: Any
) -> Tuple[bool, str, Any]:
    """Evaluate JSON assertion safely."""
    exists, actual = safe_json_extract(response_json, path)

    op = (operator or "equals").lower().strip()

    if op == "exists":
        passed = exists
        msg = f"Path '{path}' exists" if passed else f"Path '{path}' does not exist in response"
        return passed, msg, actual

    if op == "not_exists":
        passed = not exists
        msg = f"Path '{path}' does not exist" if passed else f"Path '{path}' unexpectedly exists"
        return passed, msg, actual

    if not exists:
        return False, f"Path '{path}' not found in JSON response", None

    if op == "equals":
        # Compare as strings or exact types
        passed = str(actual).strip() == str(expected_value).strip()
        msg = f"Expected '{expected_value}', got '{actual}'"
        return passed, msg, actual

    if op == "not_equals":
        passed = str(actual).strip() != str(expected_value).strip()
        msg = f"Expected not '{expected_value}', got '{actual}'"
        return passed, msg, actual

    if op == "contains":
        passed = str(expected_value) in str(actual)
        msg = f"Expected '{actual}' to contain '{expected_value}'"
        return passed, msg, actual

    if op == "greater_than":
        try:
            passed = float(actual) > float(expected_value)
            msg = f"{actual} > {expected_value}"
            return passed, msg, actual
        except (ValueError, TypeError):
            return False, f"Cannot compare non-numeric values '{actual}' and '{expected_value}'", actual

    if op == "less_than":
        try:
            passed = float(actual) < float(expected_value)
            msg = f"{actual} < {expected_value}"
            return passed, msg, actual
        except (ValueError, TypeError):
            return False, f"Cannot compare non-numeric values '{actual}' and '{expected_value}'", actual

    return False, f"Unsupported operator '{operator}'", actual


async def execute_http_check(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timeout: float = 10.0,
    follow_redirects: bool = True,
    expected_status_codes: Optional[List[int]] = None,
    monitor_type: str = "http",
    keyword_assertion: Optional[Dict[str, Any]] = None,
    json_assertion: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Safely execute HTTP check with:
    - Pre-flight and hop-by-hop SSRF validation
    - Timeouts & response size limits
    - Assertions for HTTP status, keyword, and JSON
    - Response time measurement
    """
    method = method.upper() if method else "GET"
    timeout = min(max(float(timeout), 1.0), 30.0)

    # Sanitize request body
    if body and len(body.encode("utf-8")) > MAX_REQUEST_BODY_BYTES:
        return {
            "success": False,
            "status_code": None,
            "response_time_ms": None,
            "final_url": url,
            "validation_passed": False,
            "error": {"code": "REQUEST_BODY_TOO_LARGE", "message": f"Request body exceeds {MAX_REQUEST_BODY_BYTES} bytes limit."}
        }

    # Headers setup
    req_headers = {"User-Agent": "Pulse/1.0 (+https://pulse.monitor)"}
    if headers:
        for k, v in headers.items():
            if k.lower() not in ("host", "connection"):
                req_headers[k] = str(v)

    current_url = url.strip()
    redirect_count = 0
    start_time = time.perf_counter()

    async with httpx.AsyncClient(verify=True) as client:
        while True:
            # SSRF check on every hop
            try:
                validate_target_url(current_url)
            except SSRFValidationError as e:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": elapsed_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": e.code, "message": e.message}
                }
            except Exception as e:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": elapsed_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": "VALIDATION_FAILED", "message": f"URL check failed: {str(e)}"}
                }

            try:
                req = client.build_request(
                    method=method if redirect_count == 0 else "GET",
                    url=current_url,
                    headers=req_headers,
                    content=body.encode("utf-8") if (body and redirect_count == 0) else None,
                    timeout=timeout,
                )
                
                resp = await client.send(req, stream=True)

                # Check redirect
                if resp.is_redirect and follow_redirects:
                    redirect_count += 1
                    if redirect_count > MAX_REDIRECTS:
                        await resp.aclose()
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        return {
                            "success": False,
                            "status_code": resp.status_code,
                            "response_time_ms": elapsed_ms,
                            "final_url": current_url,
                            "validation_passed": False,
                            "error": {"code": "TOO_MANY_REDIRECTS", "message": f"Exceeded maximum {MAX_REDIRECTS} redirects."}
                        }

                    location = resp.headers.get("location")
                    await resp.aclose()
                    if not location:
                        break
                    
                    # Resolve relative redirect
                    current_url = urllib.parse.urljoin(current_url, location)
                    continue
                else:
                    # Final response reached
                    content_bytes = bytearray()
                    async for chunk in resp.aiter_bytes():
                        content_bytes.extend(chunk)
                        if len(content_bytes) > MAX_RESPONSE_BODY_BYTES:
                            break
                    
                    await resp.aclose()
                    total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    
                    content_type = resp.headers.get("content-type", "")
                    content_text = content_bytes.decode("utf-8", errors="replace")

                    # Validate HTTP Status Code
                    status_code = resp.status_code
                    if expected_status_codes and len(expected_status_codes) > 0:
                        status_ok = status_code in expected_status_codes
                    else:
                        status_ok = 200 <= status_code < 400

                    validation_passed = status_ok
                    assertion_message = None

                    # Keyword assertion
                    if monitor_type == "keyword" and keyword_assertion:
                        exp_str = keyword_assertion.get("expected", "")
                        op = keyword_assertion.get("operator", "contains")
                        if op == "contains":
                            kw_ok = exp_str in content_text
                            assertion_message = f"Response contains '{exp_str}'" if kw_ok else f"Response did not contain keyword '{exp_str}'"
                        elif op == "not_contains" or op == "does_not_contain":
                            kw_ok = exp_str not in content_text
                            assertion_message = f"Response does not contain '{exp_str}'" if kw_ok else f"Response unexpectedly contained keyword '{exp_str}'"
                        else:
                            kw_ok = False
                            assertion_message = f"Unknown keyword operator '{op}'"
                        
                        validation_passed = validation_passed and kw_ok

                    # JSON assertion
                    elif monitor_type == "json" and json_assertion:
                        try:
                            parsed_json = json.loads(content_text)
                            path = json_assertion.get("path", "")
                            op = json_assertion.get("operator", "equals")
                            target_val = json_assertion.get("value")
                            json_ok, msg, _ = evaluate_json_assertion(parsed_json, path, op, target_val)
                            assertion_message = msg
                            validation_passed = validation_passed and json_ok
                        except json.JSONDecodeError:
                            validation_passed = False
                            assertion_message = "Response body is not valid JSON"

                    success = status_ok and validation_passed

                    return {
                        "success": success,
                        "status_code": status_code,
                        "response_time_ms": total_time_ms,
                        "final_url": str(resp.url),
                        "content_type": content_type,
                        "content_length": len(content_bytes),
                        "validation_passed": validation_passed,
                        "assertion_message": assertion_message,
                        "error": None if success else {
                            "code": "STATUS_CHECK_FAILED" if not status_ok else "ASSERTION_FAILED",
                            "message": assertion_message or f"HTTP status code {status_code} is outside acceptable range."
                        }
                    }

            except httpx.TimeoutException:
                total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": total_time_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": "TIMEOUT", "message": f"Endpoint timed out after configured {timeout}s limit."}
                }
            except httpx.ConnectError as e:
                total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": total_time_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": "CONNECTION_FAILED", "message": f"Could not connect to host: {str(e)}"}
                }
            except httpx.HTTPError as e:
                total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": total_time_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": "HTTP_ERROR", "message": f"HTTP transport error: {str(e)}"}
                }
            except Exception as e:
                total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "success": False,
                    "status_code": None,
                    "response_time_ms": total_time_ms,
                    "final_url": current_url,
                    "validation_passed": False,
                    "error": {"code": "CHECK_ERROR", "message": f"Unexpected error during check: {str(e)}"}
                }
