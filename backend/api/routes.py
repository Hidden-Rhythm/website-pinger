import logging
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse

from backend.api.models import (
    HttpCheckRequest,
    SslCheckRequest,
    ValidateUrlRequest,
    WebhookTestRequest,
    WebhookSendRequest,
)
from backend.monitoring.checker import execute_http_check
from backend.monitoring.ssl_checker import inspect_ssl_certificate
from backend.security.ssrf import validate_target_url, SSRFValidationError
from backend.security.rate_limiter import global_rate_limiter
from backend.notifications.dispatcher import (
    dispatch_discord_notification,
    dispatch_slack_notification,
    dispatch_generic_webhook,
)

logger = logging.getLogger("pulse.api")
router = APIRouter(prefix="/api")


def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    # Respect X-Forwarded-For if available
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(",")[0].strip()

    if not global_rate_limiter.is_allowed(client_ip):
        logger.warning(f"Rate limit exceeded for client: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "RATE_LIMITED", "message": "Too many requests. Please slow down."}
        )


@router.get("/health")
async def health_check():
    """Health check endpoint confirming stateless architecture."""
    return {
        "status": "healthy",
        "service": "Pulse Monitoring Backend",
        "storage": "stateless (database-free)",
        "version": "1.0.0"
    }


@router.post("/validate-url")
async def validate_url_endpoint(req: ValidateUrlRequest, request: Request):
    """Validate URL syntax and verify destination is not private/loopback/cloud-metadata."""
    check_rate_limit(request)
    try:
        parsed = validate_target_url(req.url)
        return {
            "valid": True,
            "scheme": parsed.scheme,
            "hostname": parsed.hostname,
            "port": parsed.port or (443 if parsed.scheme == "https" else 80),
            "message": "Target URL is valid and accessible."
        }
    except SSRFValidationError as e:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "error": {"code": e.code, "message": e.message}}
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "error": {"code": "VALIDATION_FAILED", "message": str(e)}}
        )


@router.post("/check")
async def check_endpoint(req: HttpCheckRequest, request: Request):
    """Safely execute HTTP check with SSRF defense and return timing/assertion results."""
    check_rate_limit(request)
    logger.info(f"Executing check for URL scheme={req.url.split('://')[0]} method={req.method}")

    res = await execute_http_check(
        url=req.url,
        method=req.method,
        headers=req.headers,
        body=req.body,
        timeout=req.timeout,
        follow_redirects=req.follow_redirects,
        expected_status_codes=req.expected_status_codes,
        monitor_type=req.monitor_type,
        keyword_assertion=req.keyword_assertion.model_dump() if req.keyword_assertion else None,
        json_assertion=req.json_assertion.model_dump() if req.json_assertion else None,
    )
    return res


@router.post("/check/ssl")
async def ssl_check_endpoint(req: SslCheckRequest, request: Request):
    """Inspect SSL/TLS certificate validity, expiry, and issuer safely."""
    check_rate_limit(request)
    logger.info(f"Inspecting SSL for target={req.url} port={req.port}")

    res = inspect_ssl_certificate(
        target=req.url,
        port=req.port,
        timeout=req.timeout
    )
    return res


@router.post("/webhook/test")
async def webhook_test_endpoint(req: WebhookTestRequest, request: Request):
    """Send test notification to user's configured webhook with SSRF protection."""
    check_rate_limit(request)
    logger.info(f"Testing webhook integration type={req.integration_type}")

    test_data = {
        "monitor_name": "Pulse Test Monitor",
        "monitor_url": "https://pulse.example.com",
        "status": "ONLINE",
        "status_code": 200,
        "response_time_ms": 142,
        "incident_id": "test-inc-01",
        "reason": "This is a test notification from Pulse.",
    }

    if req.integration_type == "discord":
        res = await dispatch_discord_notification(
            webhook_url=req.webhook_url,
            event="TEST",
            data=test_data,
            custom_template=req.custom_template
        )
    elif req.integration_type == "slack":
        res = await dispatch_slack_notification(
            webhook_url=req.webhook_url,
            event="TEST",
            data=test_data,
            custom_template=req.custom_template
        )
    else:
        res = await dispatch_generic_webhook(
            webhook_url=req.webhook_url,
            method="POST",
            headers=req.custom_headers,
            event="TEST",
            data=test_data
        )

    return res


@router.post("/webhook/send")
async def webhook_send_endpoint(req: WebhookSendRequest, request: Request):
    """Dispatch event notification to configured webhook with SSRF validation."""
    check_rate_limit(request)
    logger.info(f"Dispatching notification event={req.event} type={req.integration_type}")

    if req.integration_type == "discord":
        res = await dispatch_discord_notification(
            webhook_url=req.webhook_url,
            event=req.event,
            data=req.data,
            custom_template=req.custom_template
        )
    elif req.integration_type == "slack":
        res = await dispatch_slack_notification(
            webhook_url=req.webhook_url,
            event=req.event,
            data=req.data,
            custom_template=req.custom_template
        )
    else:
        res = await dispatch_generic_webhook(
            webhook_url=req.webhook_url,
            method="POST",
            headers=req.custom_headers,
            event=req.event,
            data=req.data
        )

    return res
