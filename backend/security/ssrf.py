import socket
import ipaddress
import urllib.parse
from typing import List, Tuple, Optional

# Blocked IP ranges (IPv4 & IPv6)
BLOCKED_IP_NETWORKS = [
    # IPv4 loopback
    ipaddress.ip_network("127.0.0.0/8"),
    # IPv4 private networks (RFC 1918)
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    # IPv4 link-local & cloud metadata
    ipaddress.ip_network("169.254.0.0/16"),
    # IPv4 broadcast & unspecified
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv4 multicast
    ipaddress.ip_network("224.0.0.0/4"),
    # Carrier-grade NAT
    ipaddress.ip_network("100.64.0.0/10"),
    # Documentation & Test nets
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),
    # IPv6 loopback
    ipaddress.ip_network("::1/128"),
    # IPv6 unspecified
    ipaddress.ip_network("::/128"),
    # IPv6 unique local (RFC 4193)
    ipaddress.ip_network("fc00::/7"),
    # IPv6 link-local
    ipaddress.ip_network("fe80::/10"),
    # IPv6 multicast
    ipaddress.ip_network("ff00::/8"),
    # IPv6 documentation
    ipaddress.ip_network("2001:db8::/32"),
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "metadata.local",
    "instance-data",
    "169.254.169.254",
}


class SSRFValidationError(Exception):
    """Raised when a URL or resolved IP violates SSRF rules."""
    def __init__(self, message: str, code: str = "SSRF_BLOCKED"):
        super().__init__(message)
        self.code = code
        self.message = message


def is_ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address belongs to any blocked/private/reserved network."""
    # Special attributes
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True

    # Check against explicit CIDR ranges
    for network in BLOCKED_IP_NETWORKS:
        if ip in network:
            return True

    return False


def validate_url_syntax(url_str: str) -> urllib.parse.ParseResult:
    """Validate that the URL is strictly HTTP or HTTPS and well-formed."""
    if not url_str or not isinstance(url_str, str):
        raise SSRFValidationError("URL must be a non-empty string", "INVALID_URL")

    url_str = url_str.strip()
    try:
        parsed = urllib.parse.urlparse(url_str)
    except Exception as exc:
        raise SSRFValidationError(f"Malformed URL: {str(exc)}", "MALFORMED_URL")

    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFValidationError(
            f"Invalid protocol '{parsed.scheme}'. Only http:// and https:// are permitted.",
            "UNSUPPORTED_PROTOCOL"
        )

    if not parsed.hostname:
        raise SSRFValidationError("URL must include a valid hostname or domain", "MISSING_HOST")

    hostname_lower = parsed.hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES:
        raise SSRFValidationError(
            f"Host '{hostname_lower}' is an internal/cloud-metadata destination and cannot be monitored.",
            "INTERNAL_HOST_BLOCKED"
        )

    # Check if hostname is an IP literal directly
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
        if is_ip_blocked(ip_obj):
            raise SSRFValidationError(
                f"Destination IP '{hostname_lower}' belongs to a private, loopback, or reserved network and cannot be monitored.",
                "PRIVATE_IP_BLOCKED"
            )
    except ValueError:
        pass

    # Check for credentials in URL (user:pass@host)
    if parsed.username or parsed.password:
        raise SSRFValidationError("URLs with embedded user credentials are not allowed", "CREDENTIALS_DISALLOWED")

    return parsed


def resolve_and_verify_hostname(hostname: str, port: int = 80) -> List[Tuple[str, int]]:
    """
    Resolve hostname to IP addresses and ensure none are private, loopback, or cloud metadata.
    Returns list of safe (ip_address, port) tuples.
    """
    hostname = hostname.strip().lower()

    # If hostname is directly an IP address literal
    try:
        direct_ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(direct_ip):
            raise SSRFValidationError(
                f"Destination IP '{direct_ip}' belongs to a private, loopback, or reserved network and cannot be monitored.",
                "PRIVATE_IP_BLOCKED"
            )
        return [(str(direct_ip), port)]
    except ValueError:
        # Not an IP literal, proceed to DNS resolution
        pass

    try:
        # Resolve all addresses (both IPv4 and IPv6)
        addr_info = socket.getaddrinfo(hostname, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SSRFValidationError(f"DNS resolution failed for host '{hostname}': {str(exc)}", "DNS_RESOLUTION_FAILED")
    except Exception as exc:
        raise SSRFValidationError(f"Could not resolve host '{hostname}': {str(exc)}", "DNS_ERROR")

    if not addr_info:
        raise SSRFValidationError(f"No IP addresses found for host '{hostname}'", "NO_DNS_RECORDS")

    safe_endpoints: List[Tuple[str, int]] = []
    for family, socktype, proto, canonname, sockaddr in addr_info:
        ip_str = sockaddr[0]
        resolved_port = sockaddr[1] if len(sockaddr) > 1 else port
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            if is_ip_blocked(ip_obj):
                raise SSRFValidationError(
                    f"Host '{hostname}' resolved to private/internal IP address '{ip_str}'. Monitoring blocked.",
                    "PRIVATE_IP_BLOCKED"
                )
            safe_endpoints.append((ip_str, resolved_port))
        except ValueError:
            raise SSRFValidationError(f"Invalid resolved IP '{ip_str}'", "INVALID_RESOLVED_IP")

    return safe_endpoints


def validate_target_url(url_str: str) -> urllib.parse.ParseResult:
    """Comprehensive SSRF check: validates syntax and DNS resolution."""
    parsed = validate_url_syntax(url_str)
    default_port = 443 if parsed.scheme.lower() == "https" else 80
    port = parsed.port if parsed.port is not None else default_port
    resolve_and_verify_hostname(parsed.hostname, port)
    return parsed
