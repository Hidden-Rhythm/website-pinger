import pytest
from backend.security.ssrf import (
    validate_url_syntax,
    resolve_and_verify_hostname,
    validate_target_url,
    SSRFValidationError,
    is_ip_blocked
)
from backend.monitoring.checker import safe_json_extract, evaluate_json_assertion
import ipaddress

def test_ssrf_blocks_private_ips():
    # Direct private IPv4
    assert is_ip_blocked(ipaddress.ip_address("127.0.0.1"))
    assert is_ip_blocked(ipaddress.ip_address("10.0.0.1"))
    assert is_ip_blocked(ipaddress.ip_address("192.168.1.1"))
    assert is_ip_blocked(ipaddress.ip_address("172.16.0.1"))
    assert is_ip_blocked(ipaddress.ip_address("169.254.169.254"))
    # IPv6 loopback
    assert is_ip_blocked(ipaddress.ip_address("::1"))

def test_ssrf_rejects_disallowed_protocols():
    with pytest.raises(SSRFValidationError):
        validate_url_syntax("file:///etc/passwd")

    with pytest.raises(SSRFValidationError):
        validate_url_syntax("ftp://example.com/file")

    with pytest.raises(SSRFValidationError):
        validate_url_syntax("gopher://example.com")

def test_ssrf_rejects_localhost_hostname():
    with pytest.raises(SSRFValidationError):
        validate_url_syntax("http://localhost:8080/metrics")

    with pytest.raises(SSRFValidationError):
        validate_url_syntax("http://127.0.0.1:3000")

    with pytest.raises(SSRFValidationError):
        validate_url_syntax("http://metadata.google.internal")

def test_ssrf_allows_public_https():
    parsed = validate_url_syntax("https://example.com/api/test")
    assert parsed.scheme == "https"
    assert parsed.hostname == "example.com"

def test_safe_json_extract():
    sample = {
        "status": "ok",
        "data": {
            "uptime": 99.9,
            "services": ["auth", "billing", "api"],
            "nested": {"deep": {"val": 42}}
        }
    }
    
    ok, val = safe_json_extract(sample, "status")
    assert ok and val == "ok"

    ok, val = safe_json_extract(sample, "data.uptime")
    assert ok and val == 99.9

    ok, val = safe_json_extract(sample, "data.services[1]")
    assert ok and val == "billing"

    ok, val = safe_json_extract(sample, "data.nested.deep.val")
    assert ok and val == 42

    ok, _ = safe_json_extract(sample, "nonexistent.key")
    assert not ok

def test_json_assertion_operators():
    sample = {"code": 200, "message": "all systems operational", "active": True, "count": 10}
    
    # equals
    passed, _, _ = evaluate_json_assertion(sample, "code", "equals", 200)
    assert passed

    # not_equals
    passed, _, _ = evaluate_json_assertion(sample, "code", "not_equals", 500)
    assert passed

    # contains
    passed, _, _ = evaluate_json_assertion(sample, "message", "contains", "operational")
    assert passed

    # exists
    passed, _, _ = evaluate_json_assertion(sample, "active", "exists", None)
    assert passed

    # greater_than
    passed, _, _ = evaluate_json_assertion(sample, "count", "greater_than", 5)
    assert passed

    # less_than
    passed, _, _ = evaluate_json_assertion(sample, "count", "less_than", 20)
    assert passed

def test_keyword_assertions():
    text = "Welcome back to Pulse Dashboard 2026"
    assert "Pulse" in text
    assert "unauthorized" not in text

def test_rate_limiter():
    from backend.security.rate_limiter import InMemoryRateLimiter
    limiter = InMemoryRateLimiter(max_requests=3, window_seconds=10)
    assert limiter.is_allowed("1.2.3.4")
    assert limiter.is_allowed("1.2.3.4")
    assert limiter.is_allowed("1.2.3.4")
    assert not limiter.is_allowed("1.2.3.4")
    # Different IP should still be allowed
    assert limiter.is_allowed("5.6.7.8")

def test_template_substitution():
    from backend.notifications.dispatcher import substitute_template
    tpl = "Monitor {{monitor_name}} is {{status}} with code {{status_code}}"
    res = substitute_template(tpl, {"monitor_name": "API", "status": "DOWN", "status_code": 503})
    assert res == "Monitor API is DOWN with code 503"
