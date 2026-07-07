import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from app.logging import logger

class TokenBucketRateLimiter:
    """In-memory rate limiter utilizing the Token Bucket algorithm."""
    def __init__(self, rate_per_min: int = 60, capacity: int = 100):
        self.rate_per_min = rate_per_min
        self.capacity = capacity
        self.buckets: Dict[str, Tuple[float, float]] = {} # ip -> (tokens, last_update_time)

    def is_rate_limited(self, ip_address: str) -> bool:
        current_time = time.time()
        
        # Initialize bucket if client IP is unrecognized
        if ip_address not in self.buckets:
            self.buckets[ip_address] = (self.capacity, current_time)
            return False
            
        tokens, last_update = self.buckets[ip_address]
        
        # Calculate replenished tokens based on elapsed duration
        elapsed = current_time - last_update
        replenish_rate = self.rate_per_min / 60.0
        new_tokens = min(self.capacity, tokens + (elapsed * replenish_rate))
        
        # Deny if bucket is exhausted
        if new_tokens < 1.0:
            self.buckets[ip_address] = (new_tokens, current_time)
            return True
            
        # Deduct a token and approve
        self.buckets[ip_address] = (new_tokens - 1.0, current_time)
        return False

# Export global instancer
limiter = TokenBucketRateLimiter(rate_per_min=30, capacity=50)

def rate_limit_middleware(request: Request):
    """Dependency hook to apply rate limits to endpoints."""
    client_ip = request.client.host if request.client else "unknown_ip"
    if limiter.is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for client IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment and try again."
        )
