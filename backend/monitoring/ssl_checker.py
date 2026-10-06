import socket
import ssl
import datetime
import urllib.parse
from typing import Dict, Any, Optional
from backend.security.ssrf import resolve_and_verify_hostname, SSRFValidationError

def inspect_ssl_certificate(
    target: str,
    port: int = 443,
    timeout: float = 10.0
) -> Dict[str, Any]:
    """
    Safely inspect SSL/TLS certificate of a target host.
    Includes SSRF validation before connecting.
    """
    # Extract host if target is a full URL
    hostname = target.strip()
    if hostname.startswith("http://") or hostname.startswith("https://"):
        parsed = urllib.parse.urlparse(hostname)
        hostname = parsed.hostname or hostname
        if parsed.port:
            port = parsed.port

    if not hostname:
        return {
            "success": False,
            "error": {"code": "INVALID_HOSTNAME", "message": "Valid hostname is required for SSL check"}
        }

    # SSRF verification on hostname and port
    try:
        safe_endpoints = resolve_and_verify_hostname(hostname, port)
    except SSRFValidationError as e:
        return {
            "success": False,
            "error": {"code": e.code, "message": e.message}
        }
    except Exception as e:
        return {
            "success": False,
            "error": {"code": "DNS_ERROR", "message": f"DNS resolution failed: {str(e)}"}
        }

    ip_to_connect = safe_endpoints[0][0]

    context = ssl.create_default_context()
    # Enforce SNI with original hostname
    context.check_hostname = True

    start_time = datetime.datetime.now(datetime.timezone.utc)
    try:
        with socket.create_connection((ip_to_connect, port), timeout=timeout) as raw_sock:
            with context.wrap_socket(raw_sock, server_hostname=hostname) as ssl_sock:
                cert = ssl_sock.getpeercert()
                cipher = ssl_sock.cipher()
                version = ssl_sock.version()

                if not cert:
                    return {
                        "success": False,
                        "error": {"code": "NO_CERTIFICATE", "message": "Server presented no SSL certificate"}
                    }

                # Parse notAfter date
                # Typical format: 'May  9 12:00:00 2025 GMT'
                not_after_str = cert.get("notAfter", "")
                not_before_str = cert.get("notBefore", "")

                try:
                    expiry_date = datetime.datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=datetime.timezone.utc)
                    days_remaining = (expiry_date - start_time).days
                    is_valid = days_remaining > 0
                except Exception:
                    expiry_date = None
                    days_remaining = 0
                    is_valid = False

                # Extract Issuer & Subject
                def _parse_x509_tuples(tuples_list):
                    result = {}
                    for item in tuples_list:
                        for key, val in item:
                            result[key] = val
                    return result

                subject_dict = _parse_x509_tuples(cert.get("subject", []))
                issuer_dict = _parse_x509_tuples(cert.get("issuer", []))

                # Subject alternative names
                san_list = [entry[1] for entry in cert.get("subjectAltName", []) if len(entry) > 1]

                return {
                    "success": True,
                    "valid": is_valid,
                    "hostname": hostname,
                    "port": port,
                    "issuer": issuer_dict.get("organizationName") or issuer_dict.get("commonName") or "Unknown Issuer",
                    "issuer_details": issuer_dict,
                    "subject": subject_dict.get("commonName") or hostname,
                    "subject_details": subject_dict,
                    "expiry": expiry_date.isoformat() if expiry_date else not_after_str,
                    "not_before": not_before_str,
                    "days_remaining": days_remaining,
                    "san": san_list,
                    "cipher": cipher[0] if cipher else None,
                    "protocol_version": version,
                    "error": None
                }

    except ssl.SSLCertVerificationError as e:
        return {
            "success": True,
            "valid": False,
            "hostname": hostname,
            "days_remaining": 0,
            "error": {"code": "CERT_VERIFICATION_FAILED", "message": f"SSL certificate verification failed: {str(e)}"}
        }
    except socket.timeout:
        return {
            "success": False,
            "error": {"code": "TIMEOUT", "message": f"Connection timed out after {timeout}s"}
        }
    except Exception as e:
        return {
            "success": False,
            "error": {"code": "SSL_CONNECTION_ERROR", "message": f"SSL handshake failed: {str(e)}"}
        }
