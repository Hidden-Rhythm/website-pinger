import time
from typing import Dict, List
from collections import defaultdict

class InMemoryRateLimiter:
    """
    Stateless in-memory sliding window rate limiter for serverless environments.
    Tracks requests per client IP within a rolling time window.
    """
    def __init__(self, max_requests: int = 120, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.last_cleanup = time.time()

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        
        # Periodic cleanup of expired records every 60s
        if now - self.last_cleanup > 60:
            self._cleanup(now)
            self.last_cleanup = now

        timestamps = self.requests[client_ip]
        cutoff = now - self.window_seconds
        
        # Keep only timestamps within window
        valid_timestamps = [t for t in timestamps if t > cutoff]
        self.requests[client_ip] = valid_timestamps

        if len(valid_timestamps) >= self.max_requests:
            return False

        self.requests[client_ip].append(now)
        return True

    def _cleanup(self, now: float) -> None:
        cutoff = now - self.window_seconds
        to_delete = []
        for ip, timestamps in self.requests.items():
            valid = [t for t in timestamps if t > cutoff]
            if not valid:
                to_delete.append(ip)
            else:
                self.requests[ip] = valid
        for ip in to_delete:
            del self.requests[ip]

# Default rate limiter: 120 requests per minute per IP
global_rate_limiter = InMemoryRateLimiter(max_requests=120, window_seconds=60)
