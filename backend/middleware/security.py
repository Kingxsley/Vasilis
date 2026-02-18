"""
Security Middleware and Utilities for Vasilis NetShield
"""
import os
import time
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional, Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# ============== RATE LIMITING ==============

class RateLimiter:
    """In-memory rate limiter for API endpoints"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.blocked_ips = {}  # IP -> unblock_time
    
    def is_rate_limited(self, ip: str, endpoint: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
        """Check if request should be rate limited"""
        now = time.time()
        key = f"{ip}:{endpoint}"
        
        # Check if IP is blocked
        if ip in self.blocked_ips:
            if now < self.blocked_ips[ip]:
                return True
            else:
                del self.blocked_ips[ip]
        
        # Clean old requests
        self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
        
        # Check rate limit
        if len(self.requests[key]) >= max_requests:
            return True
        
        # Record request
        self.requests[key].append(now)
        return False
    
    def block_ip(self, ip: str, duration_minutes: int = 15):
        """Block an IP for a duration"""
        self.blocked_ips[ip] = time.time() + (duration_minutes * 60)
        logger.warning(f"IP {ip} blocked for {duration_minutes} minutes")
    
    def get_remaining_requests(self, ip: str, endpoint: str, max_requests: int = 10, window_seconds: int = 60) -> int:
        """Get remaining requests in window"""
        now = time.time()
        key = f"{ip}:{endpoint}"
        self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
        return max(0, max_requests - len(self.requests[key]))


# Global rate limiter instance
rate_limiter = RateLimiter()


# Rate limit configurations per endpoint
RATE_LIMITS = {
    "/api/auth/login": {"max_requests": 5, "window_seconds": 60},      # 5 per minute
    "/api/auth/register": {"max_requests": 3, "window_seconds": 60},   # 3 per minute
    "/api/auth/session": {"max_requests": 10, "window_seconds": 60},   # 10 per minute
    "/api/users": {"max_requests": 30, "window_seconds": 60},          # 30 per minute
    "default": {"max_requests": 100, "window_seconds": 60}             # 100 per minute
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        
        # Get endpoint path
        path = request.url.path
        
        # Find matching rate limit config
        config = RATE_LIMITS.get(path, RATE_LIMITS["default"])
        
        # Check rate limit
        if rate_limiter.is_rate_limited(ip, path, **config):
            logger.warning(f"Rate limit exceeded for {ip} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after": config["window_seconds"]
                },
                headers={"Retry-After": str(config["window_seconds"])}
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = rate_limiter.get_remaining_requests(ip, path, **config)
        response.headers["X-RateLimit-Limit"] = str(config["max_requests"])
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(config["window_seconds"])
        
        return response


# ============== SECURITY HEADERS ==============

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy (adjust as needed)
        # response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        
        # HSTS (only enable in production with HTTPS)
        if os.environ.get("ENABLE_HSTS", "false").lower() == "true":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


# ============== ACCOUNT LOCKOUT ==============

class AccountLockoutManager:
    """Manage failed login attempts and account lockouts"""
    
    def __init__(self):
        self.failed_attempts = defaultdict(list)  # email -> [timestamps]
        self.locked_accounts = {}  # email -> unlock_time
        self.max_attempts = 5
        self.lockout_duration_minutes = 15
        self.attempt_window_minutes = 10
    
    def record_failed_attempt(self, email: str, ip: str = None):
        """Record a failed login attempt"""
        now = time.time()
        key = email.lower()
        
        # Clean old attempts
        window = self.attempt_window_minutes * 60
        self.failed_attempts[key] = [t for t in self.failed_attempts[key] if now - t < window]
        
        # Record attempt
        self.failed_attempts[key].append(now)
        
        logger.warning(f"Failed login attempt for {email} from {ip}. Count: {len(self.failed_attempts[key])}")
        
        # Check if should lock
        if len(self.failed_attempts[key]) >= self.max_attempts:
            self.lock_account(email)
            return True
        
        return False
    
    def lock_account(self, email: str):
        """Lock an account"""
        key = email.lower()
        unlock_time = time.time() + (self.lockout_duration_minutes * 60)
        self.locked_accounts[key] = unlock_time
        self.failed_attempts[key] = []  # Clear attempts
        logger.warning(f"Account {email} locked for {self.lockout_duration_minutes} minutes")
    
    def is_locked(self, email: str) -> tuple[bool, Optional[int]]:
        """Check if account is locked. Returns (is_locked, seconds_remaining)"""
        key = email.lower()
        
        if key not in self.locked_accounts:
            return False, None
        
        now = time.time()
        unlock_time = self.locked_accounts[key]
        
        if now >= unlock_time:
            del self.locked_accounts[key]
            return False, None
        
        return True, int(unlock_time - now)
    
    def clear_attempts(self, email: str):
        """Clear failed attempts after successful login"""
        key = email.lower()
        self.failed_attempts.pop(key, None)
    
    def get_attempts_remaining(self, email: str) -> int:
        """Get remaining attempts before lockout"""
        key = email.lower()
        now = time.time()
        window = self.attempt_window_minutes * 60
        attempts = [t for t in self.failed_attempts.get(key, []) if now - t < window]
        return max(0, self.max_attempts - len(attempts))


# Global instance
account_lockout = AccountLockoutManager()


# ============== PASSWORD POLICY ==============

class PasswordPolicy:
    """Enforce password requirements"""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # Common passwords to reject
    COMMON_PASSWORDS = {
        "password", "password123", "123456", "12345678", "qwerty", "abc123",
        "monkey", "letmein", "dragon", "111111", "baseball", "iloveyou",
        "trustno1", "sunshine", "master", "welcome", "shadow", "ashley",
        "football", "jesus", "michael", "ninja", "mustang", "password1"
    }
    
    @classmethod
    def validate(cls, password: str, email: str = None) -> tuple[bool, str]:
        """
        Validate password against policy.
        Returns (is_valid, error_message)
        """
        errors = []
        
        # Length check
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        # Uppercase check
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        # Lowercase check
        if cls.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        # Digit check
        if cls.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        # Special character check
        if cls.REQUIRE_SPECIAL and not any(c in cls.SPECIAL_CHARS for c in password):
            errors.append(f"Password must contain at least one special character ({cls.SPECIAL_CHARS})")
        
        # Common password check
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("This password is too common. Please choose a more unique password")
        
        # Check if password contains email
        if email:
            email_parts = email.lower().split("@")[0]
            if email_parts in password.lower():
                errors.append("Password should not contain your email address")
        
        if errors:
            return False, "; ".join(errors)
        
        return True, "Password meets requirements"
    
    @classmethod
    def get_requirements(cls) -> dict:
        """Return password requirements for display"""
        return {
            "min_length": cls.MIN_LENGTH,
            "require_uppercase": cls.REQUIRE_UPPERCASE,
            "require_lowercase": cls.REQUIRE_LOWERCASE,
            "require_digit": cls.REQUIRE_DIGIT,
            "require_special": cls.REQUIRE_SPECIAL,
            "special_chars": cls.SPECIAL_CHARS
        }


# ============== AUDIT LOGGING ==============

class AuditLogger:
    """Log security-relevant actions"""
    
    def __init__(self, db=None):
        self.db = db
    
    async def log(
        self,
        action: str,
        user_id: str = None,
        user_email: str = None,
        ip_address: str = None,
        details: dict = None,
        severity: str = "info"
    ):
        """Log an audit event"""
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "user_id": user_id,
            "user_email": user_email,
            "ip_address": ip_address,
            "details": details or {},
            "severity": severity  # info, warning, critical
        }
        
        # Log to file
        log_message = f"AUDIT: {action} | User: {user_email or user_id or 'anonymous'} | IP: {ip_address} | {details}"
        
        if severity == "critical":
            logger.critical(log_message)
        elif severity == "warning":
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Log to database if available
        if self.db is not None:
            try:
                await self.db.audit_logs.insert_one(event)
            except Exception as e:
                logger.error(f"Failed to write audit log to DB: {e}")


# ============== CSRF PROTECTION ==============

class CSRFProtection:
    """CSRF token generation and validation"""
    
    TOKEN_LENGTH = 32
    TOKEN_HEADER = "X-CSRF-Token"
    TOKEN_COOKIE = "csrf_token"
    
    @classmethod
    def generate_token(cls) -> str:
        """Generate a CSRF token"""
        return secrets.token_urlsafe(cls.TOKEN_LENGTH)
    
    @classmethod
    def validate_token(cls, request: Request, submitted_token: str) -> bool:
        """Validate CSRF token"""
        cookie_token = request.cookies.get(cls.TOKEN_COOKIE)
        
        if not cookie_token or not submitted_token:
            return False
        
        # Constant-time comparison to prevent timing attacks
        return secrets.compare_digest(cookie_token, submitted_token)


# ============== SECURE TOKEN GENERATION ==============

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


def generate_jwt_secret() -> str:
    """Generate a strong JWT secret key"""
    return secrets.token_hex(32)  # 256-bit key


# ============== IP UTILITIES ==============

def get_client_ip(request: Request) -> str:
    """Get the real client IP, accounting for proxies"""
    # Check X-Forwarded-For header (set by proxies/load balancers)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP (original client)
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP header (nginx)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct connection IP
    if request.client:
        return request.client.host
    
    return "unknown"
