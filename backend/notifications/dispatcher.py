import datetime
from typing import Dict, Any, Optional
import httpx

from backend.security.ssrf import validate_target_url, SSRFValidationError

EVENT_COLORS = {
    "MONITOR_DOWN": 0xEF4444,        # Red
    "MONITOR_RECOVERED": 0x22C55E,   # Green
    "MONITOR_DEGRADED": 0xF59E0B,    # Amber
    "SLOW_RESPONSE": 0xF59E0B,       # Amber
    "SSL_EXPIRING": 0xF59E0B,        # Amber
    "SSL_EXPIRED": 0xEF4444,         # Red
    "STATUS_CHANGED": 0x3B82F6,      # Blue
    "INCIDENT_CREATED": 0xEF4444,    # Red
    "INCIDENT_RESOLVED": 0x22C55E,   # Green
    "TEST": 0x8B5CF6,                # Violet
}

EVENT_EMOJIS = {
    "MONITOR_DOWN": "🔴",
    "MONITOR_RECOVERED": "🟢",
    "MONITOR_DEGRADED": "⚠️",
    "SLOW_RESPONSE": "⏱️",
    "SSL_EXPIRING": "⚠️",
    "SSL_EXPIRED": "🔴",
    "STATUS_CHANGED": "ℹ️",
    "INCIDENT_CREATED": "🚨",
    "INCIDENT_RESOLVED": "✅",
    "TEST": "🔔",
}


def substitute_template(text: str, variables: Dict[str, Any]) -> str:
    """Safely replace {{key}} tokens with variables without eval."""
    result = text
    for key, val in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(val) if val is not None else "")
    return result


async def dispatch_discord_notification(
    webhook_url: str,
    event: str,
    data: Dict[str, Any],
    custom_template: Optional[str] = None
) -> Dict[str, Any]:
    """Format and send Discord Webhook notification with SSRF protection."""
    # SSRF check on webhook URL
    try:
        validate_target_url(webhook_url)
    except SSRFValidationError as e:
        return {"success": False, "error": f"Invalid webhook URL: {e.message}"}

    emoji = EVENT_EMOJIS.get(event, "🔔")
    color = EVENT_COLORS.get(event, 0x3B82F6)
    title = f"{emoji} {event.replace('_', ' ')}"

    variables = {
        "monitor_name": data.get("monitor_name", "Pulse Monitor"),
        "monitor_url": data.get("monitor_url", ""),
        "status": data.get("status", "UNKNOWN"),
        "status_code": data.get("status_code", "N/A"),
        "response_time": f"{data.get('response_time_ms', '0')} ms",
        "incident_id": data.get("incident_id", "N/A"),
        "downtime": data.get("downtime", "N/A"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y • %H:%M UTC"),
        "reason": data.get("reason", "N/A"),
    }

    content_msg = None
    if custom_template and custom_template.strip():
        content_msg = substitute_template(custom_template, variables)

    embed_fields = [
        {"name": "Monitor", "value": variables["monitor_name"], "inline": True},
        {"name": "Status", "value": str(variables["status"]), "inline": True},
    ]

    if variables["monitor_url"]:
        embed_fields.append({"name": "URL", "value": f"[{variables['monitor_url']}]({variables['monitor_url']})", "inline": False})
    if data.get("status_code"):
        embed_fields.append({"name": "HTTP Code", "value": str(data["status_code"]), "inline": True})
    if data.get("response_time_ms") is not None:
        embed_fields.append({"name": "Response Time", "value": f"{data['response_time_ms']} ms", "inline": True})
    if data.get("downtime"):
        embed_fields.append({"name": "Downtime", "value": str(data["downtime"]), "inline": True})
    if data.get("reason"):
        embed_fields.append({"name": "Details", "value": str(data["reason"]), "inline": False})

    payload = {
        "username": "Pulse Monitor",
        "content": content_msg,
        "embeds": [
            {
                "title": title,
                "color": color,
                "fields": embed_fields,
                "footer": {"text": f"Pulse Database-Free Monitoring • {variables['timestamp']}"}
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code in (200, 204):
                return {"success": True, "status_code": resp.status_code}
            return {
                "success": False,
                "status_code": resp.status_code,
                "error": f"Discord returned status {resp.status_code}: {resp.text[:200]}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def dispatch_slack_notification(
    webhook_url: str,
    event: str,
    data: Dict[str, Any],
    custom_template: Optional[str] = None
) -> Dict[str, Any]:
    """Format and send Slack Webhook notification with SSRF protection."""
    try:
        validate_target_url(webhook_url)
    except SSRFValidationError as e:
        return {"success": False, "error": f"Invalid webhook URL: {e.message}"}

    emoji = EVENT_EMOJIS.get(event, "🔔")
    title = f"{emoji} *{event.replace('_', ' ')}*"

    variables = {
        "monitor_name": data.get("monitor_name", "Pulse Monitor"),
        "monitor_url": data.get("monitor_url", ""),
        "status": data.get("status", "UNKNOWN"),
        "status_code": data.get("status_code", "N/A"),
        "response_time": f"{data.get('response_time_ms', '0')} ms",
        "incident_id": data.get("incident_id", "N/A"),
        "downtime": data.get("downtime", "N/A"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%d %b %Y • %H:%M UTC"),
        "reason": data.get("reason", "N/A"),
    }

    text_msg = substitute_template(custom_template, variables) if custom_template else f"{title}: {variables['monitor_name']} is {variables['status']}"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"{emoji} Pulse: {event.replace('_', ' ')}"}
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Monitor:*\n{variables['monitor_name']}"},
                {"type": "mrkdwn", "text": f"*Status:*\n{variables['status']}"},
                {"type": "mrkdwn", "text": f"*URL:*\n{variables['monitor_url']}"},
                {"type": "mrkdwn", "text": f"*Response Time:*\n{variables['response_time']}"},
            ]
        }
    ]

    if data.get("reason"):
        blocks.append({
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": f"*Details:* {data['reason']}"}]
        })

    payload = {
        "text": text_msg,
        "blocks": blocks
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code == 200 and "ok" in resp.text.lower():
                return {"success": True, "status_code": resp.status_code}
            return {
                "success": False,
                "status_code": resp.status_code,
                "error": f"Slack returned status {resp.status_code}: {resp.text[:200]}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def dispatch_generic_webhook(
    webhook_url: str,
    method: str,
    headers: Optional[Dict[str, str]],
    event: str,
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """Dispatch generic webhook payload with SSRF protection."""
    try:
        validate_target_url(webhook_url)
    except SSRFValidationError as e:
        return {"success": False, "error": f"Invalid webhook URL: {e.message}"}

    method = method.upper() if method else "POST"
    req_headers = {"User-Agent": "Pulse-Webhook/1.0", "Content-Type": "application/json"}
    if headers:
        for k, v in headers.items():
            if k.lower() not in ("host", "connection"):
                req_headers[k] = str(v)

    payload = {
        "pulse_version": "1.0",
        "event": event,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "data": data
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.request(method=method, url=webhook_url, headers=req_headers, json=payload)
            success = 200 <= resp.status_code < 300
            return {
                "success": success,
                "status_code": resp.status_code,
                "error": None if success else f"Webhook returned HTTP {resp.status_code}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}
