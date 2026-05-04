"""
Security Middleware and Utilities for Vasilis NetShield
Enhanced with geolocation, audit log retention, and export functionality
"""
import os
import time
import hashlib
import secrets
import logging
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional, Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# ============== IP GEOLOCATION ==============

# Simple in-memory cache for IP geolocation
_geo_cache = {}
_geo_cache_ttl = 86400  # 24 hours

async def get_ip_geolocation(ip: str) -> dict:
    """Get geolocation info for an IP address using free API"""
    
    # Skip private/local IPs
    if ip in ["127.0.0.1", "localhost", "unknown", "::1"] or ip.startswith("192.168.") or ip.startswith("10."):
        return {"country": "Local", "country_code": "LC", "city": "Local", "region": "Local"}
    
    # Check cache
    cache_key = ip
    if cache_key in _geo_cache:
        cached = _geo_cache[cache_key]
        if time.time() - cached["cached_at"] < _geo_cache_ttl:
            return cached["data"]
    
    try:
        # Use ip-api.com (free, no API key needed, 45 requests/minute)
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,region,regionName,city,isp")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    result = {
                        "country": data.get("country", "Unknown"),
                        "country_code": data.get("countryCode", "XX"),
                        "city": data.get("city", "Unknown"),
                        "region": data.get("regionName", "Unknown"),
                        "isp": data.get("isp", "Unknown")
                    }
                    # Cache the result
                    _geo_cache[cache_key] = {"data": result, "cached_at": time.time()}
                    return result
    except Exception as e:
        logger.debug(f"Geolocation lookup failed for {ip}: {e}")
    
    return {"country": "Unknown", "country_code": "XX", "city": "Unknown", "region": "Unknown"}


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
# NOTE: Login endpoint uses dedicated IP rate limiter in route handler (10/15min → 429)
# plus per-account lockout (5/15min → 423) as per pentest requirements
RATE_LIMITS = {
    "/api/auth/login": {"max_requests": 100, "window_seconds": 60},  # Disabled middleware limit for login (handled in route)
    "/api/auth/register": {"max_requests": 3, "window_seconds": 60},
    "/api/auth/forgot-password": {"max_requests": 3, "window_seconds": 60},
    "/api/auth/session": {"max_requests": 10, "window_seconds": 60},
    "/api/users": {"max_requests": 30, "window_seconds": 60},
    "default": {"max_requests": 100, "window_seconds": 60}
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        ip = get_client_ip(request)
        
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
    """Add security headers to all responses.

    Covers the full set required by the pentest remediation spec:
      - X-Frame-Options: DENY                       (clickjacking)
      - X-Content-Type-Options: nosniff             (MIME sniffing)
      - Referrer-Policy: strict-origin-when-cross-origin
      - Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
      - Cross-Origin-Opener-Policy: same-origin     (COOP)
      - Cross-Origin-Resource-Policy: same-origin   (CORP)
      - Strict-Transport-Security: 2-year preload   (HSTS)
      - Content-Security-Policy with frame-ancestors 'none' (clickjacking + defense-in-depth)

    Also strips fingerprinting headers (X-Powered-By, Server) that
    may be injected by an upstream runtime.
    """

    CSP_VALUE = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https://vasilisnetshield.com https://www.vasilisnetshield.com https://api.vasilisnetshield.com; "
        "media-src 'self'; "
        "object-src 'none'; "
        "frame-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self' https://vasilisnetshield.com; "
        "upgrade-insecure-requests;"
    )

    PERMISSIONS_POLICY = (
        "camera=(), "
        "microphone=(), "
        "geolocation=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=()"
    )

    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)

        # Clickjacking protection (legacy + modern)
        response.headers["X-Frame-Options"] = "DENY"

        # MIME sniffing protection
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Legacy XSS filter (harmless, kept for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (includes FLoC opt-out via interest-cohort=())
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )

        # COOP: isolates browsing context - safe on API
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        # CORP: same-site allows frontend (vasilisnetshield.com) to read API responses
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # Content Security Policy (covers clickjacking via frame-ancestors 'none')
        response.headers["Content-Security-Policy"] = self.CSP_VALUE
        response.headers["Permissions-Policy"] = self.PERMISSIONS_POLICY
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # HSTS - 2 years with subdomains + preload (can be disabled via env for local)
        if os.environ.get("DISABLE_HSTS", "").lower() != "true":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        # Strip fingerprinting headers if any upstream layer added them
        for fp_header in ("X-Powered-By", "Server"):
            if fp_header in response.headers:
                del response.headers[fp_header]

        return response


# ============== ACCOUNT LOCKOUT ==============

class AccountLockoutManager:
    """Manage failed login attempts and account lockouts"""
    
    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.locked_accounts = {}
        self.max_attempts = 5  # Lock after 5 failed attempts per user request (pentest requirement)
        self.lockout_duration_minutes = 15
        self.attempt_window_minutes = 15  # Match pentest requirement: 15 minute window
        self.notification_callback = None  # Set by server.py for admin notifications
    
    def set_notification_callback(self, callback):
        """Set callback function for admin notifications"""
        self.notification_callback = callback
    
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
            self.lock_account(email, ip)
            return True
        
        return False
    
    async def notify_admins_async(self, email: str, ip: str):
        """Send async notification to admins about account lockout"""
        if self.notification_callback:
            try:
                await self.notification_callback(email, ip)
            except Exception as e:
                logger.error(f"Failed to notify admins about lockout: {e}")
    
    def lock_account(self, email: str, ip: str = None):
        """Lock an account"""
        key = email.lower()
        unlock_time = time.time() + (self.lockout_duration_minutes * 60)
        self.locked_accounts[key] = unlock_time
        self.failed_attempts[key] = []
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
        self.locked_accounts.pop(key, None)
    
    def get_attempts_remaining(self, email: str) -> int:
        """Get remaining attempts before lockout"""
        key = email.lower()
        now = time.time()
        window = self.attempt_window_minutes * 60
        attempts = [t for t in self.failed_attempts.get(key, []) if now - t < window]
        return max(0, self.max_attempts - len(attempts))


# Global instance
account_lockout = AccountLockoutManager()


# ============== IP-BASED LOGIN RATE LIMITER ==============

class IPLoginRateLimiter:
    """IP-based rate limiter specifically for login endpoint to prevent brute force attacks.
    
    Per pentest requirements:
    - Max 10 login requests per IP per 15 minutes → HTTP 429
    - Separate from per-account lockout (HTTP 423)
    - Supports permanent blocklist and whitelist from database
    """
    
    def __init__(self):
        self.ip_attempts = defaultdict(list)
        self.blocked_ips = {}
        self.max_requests = 10
        self.window_minutes = 15
        self.block_duration_minutes = 15
    
    async def is_whitelisted(self, ip: str) -> bool:
        """Check if IP is in whitelist (bypass rate limiting)"""
        try:
            from server import db
            whitelist = await db.ip_whitelist.find_one({"ip_address": ip})
            return whitelist is not None
        except:
            return False
    
    async def is_permanently_blocked(self, ip: str) -> bool:
        """Check if IP is in permanent blocklist"""
        try:
            from server import db
            blocked = await db.ip_blocklist.find_one({"ip_address": ip})
            return blocked is not None
        except:
            return False
    
    def record_attempt(self, ip: str) -> bool:
        """Record a login attempt from an IP. Returns True if IP should be blocked."""
        now = time.time()
        key = ip
        
        # Clean old attempts outside the window
        window = self.window_minutes * 60
        self.ip_attempts[key] = [t for t in self.ip_attempts[key] if now - t < window]
        
        # Record this attempt
        self.ip_attempts[key].append(now)
        
        # Check if limit exceeded (check AFTER recording to include this attempt)
        if len(self.ip_attempts[key]) >= self.max_requests:
            self.block_ip(ip)
            return True
        
        return False
    
    def block_ip(self, ip: str):
        """Block an IP for the configured duration."""
        unlock_time = time.time() + (self.block_duration_minutes * 60)
        self.blocked_ips[ip] = unlock_time
        logger.warning(f"IP {ip} blocked for {self.block_duration_minutes} minutes due to excessive login attempts")
    
    def is_blocked(self, ip: str) -> tuple[bool, Optional[int]]:
        """Check if an IP is blocked. Returns (is_blocked, seconds_remaining)."""
        if ip not in self.blocked_ips:
            return False, None
        
        now = time.time()
        unlock_time = self.blocked_ips[ip]
        
        if now >= unlock_time:
            del self.blocked_ips[ip]
            return False, None
        
        return True, int(unlock_time - now)
    
    def get_remaining_attempts(self, ip: str) -> int:
        """Get remaining login attempts for an IP before blocking."""
        now = time.time()
        window = self.window_minutes * 60
        attempts = [t for t in self.ip_attempts.get(ip, []) if now - t < window]
        return max(0, self.max_requests - len(attempts))


# Global IP rate limiter for login endpoint
ip_login_limiter = IPLoginRateLimiter()


# ============== PASSWORD POLICY ==============

class PasswordPolicy:
    """Enforce password requirements"""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    COMMON_PASSWORDS = {
        "password", "password123", "123456", "12345678", "qwerty", "abc123",
        "monkey", "letmein", "dragon", "111111", "baseball", "iloveyou",
        "trustno1", "sunshine", "master", "welcome", "shadow", "ashley",
        "football", "jesus", "michael", "ninja", "mustang", "password1"
    }
    
    @classmethod
    def validate(cls, password: str, email: str = None) -> tuple[bool, str]:
        """Validate password against policy"""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if cls.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if cls.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if cls.REQUIRE_SPECIAL and not any(c in cls.SPECIAL_CHARS for c in password):
            errors.append("Password must contain at least one special character")
        
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("This password is too common")
        
        if email:
            email_parts = email.lower().split("@")[0]
            if email_parts in password.lower():
                errors.append("Password should not contain your email address")
        
        if errors:
            return False, "; ".join(errors)
        
        return True, "Password meets requirements"
    
    @classmethod
    def get_requirements(cls) -> dict:
        return {
            "min_length": cls.MIN_LENGTH,
            "require_uppercase": cls.REQUIRE_UPPERCASE,
            "require_lowercase": cls.REQUIRE_LOWERCASE,
            "require_digit": cls.REQUIRE_DIGIT,
            "require_special": cls.REQUIRE_SPECIAL,
            "special_chars": cls.SPECIAL_CHARS
        }


# ============== ENHANCED AUDIT LOGGING ==============

class AuditLogger:
    """Enhanced audit logger with geolocation and retention"""
    
    RETENTION_DAYS = 30
    
    def __init__(self, db=None):
        self.db = db
    
    async def log(
        self,
        action: str,
        user_id: str = None,
        user_email: str = None,
        user_name: str = None,
        ip_address: str = None,
        details: dict = None,
        severity: str = "info",
        request: Request = None
    ):
        """Log an audit event with geolocation"""
        
        # Get geolocation if IP provided
        geo_data = {}
        if ip_address and ip_address not in ["unknown", None]:
            geo_data = await get_ip_geolocation(ip_address)
        
        # Get user agent if request provided
        user_agent = None
        if request:
            user_agent = request.headers.get("User-Agent", "Unknown")[:500]
        
        # If user_name not provided but we have db and user_id/email, try to look it up
        if not user_name and self.db is not None:
            try:
                if user_id:
                    user_doc = await self.db.users.find_one({"user_id": user_id}, {"name": 1})
                    if user_doc:
                        user_name = user_doc.get("name")
                elif user_email:
                    user_doc = await self.db.users.find_one({"email": user_email}, {"name": 1})
                    if user_doc:
                        user_name = user_doc.get("name")
            except Exception:
                pass
        
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "ip_address": ip_address,
            "country": geo_data.get("country", "Unknown"),
            "country_code": geo_data.get("country_code", "XX"),
            "city": geo_data.get("city"),
            "region": geo_data.get("region"),
            "isp": geo_data.get("isp"),
            "user_agent": user_agent,
            "details": details or {},
            "severity": severity
        }
        
        # Log to file
        log_message = f"AUDIT: {action} | User: {user_name or user_email or user_id or 'anonymous'} | IP: {ip_address} | Country: {geo_data.get('country', 'Unknown')}"
        
        if severity == "critical":
            logger.critical(log_message)
        elif severity == "warning":
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Log to database and mirror basic fields into activity_logs
        if self.db is not None:
            try:
                # Insert into audit_logs collection
                await self.db.audit_logs.insert_one(event)
                # Also insert a simplified record into activity_logs so activity
                # logs UI can display recent actions.  Use a separate
                # activity_id and include only relevant fields.  If details
                # contains resource identifiers, surface them, otherwise leave
                # them null.  We intentionally do not include the full audit
                # geolocation and severity data to keep activity logs focused
                # on user-visible actions.
                activity_entry = {
                    "activity_id": f"act_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "user_email": user_email,
                    "user_name": user_name,
                    "action": action,
                    "resource_type": None,
                    "resource_id": None,
                    "details": details or {},
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "timestamp": event["timestamp"]
                }
                # If details is a dict with known keys, try to populate resource info
                if isinstance(details, dict):
                    activity_entry["resource_type"] = details.get("resource_type")
                    activity_entry["resource_id"] = details.get("resource_id")
                await self.db.activity_logs.insert_one(activity_entry)
            except Exception as e:
                logger.error(f"Failed to write audit/activity log to DB: {e}")
    
    async def cleanup_old_logs(self):
        """Remove audit logs older than retention period"""
        if self.db is None:
            return 0
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.RETENTION_DAYS)
        
        try:
            result = await self.db.audit_logs.delete_many({
                "timestamp": {"$lt": cutoff_date.isoformat()}
            })
            logger.info(f"Cleaned up {result.deleted_count} old audit logs")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup old audit logs: {e}")
            return 0
    
    async def get_logs_for_export(
        self,
        start_date: datetime = None,
        end_date: datetime = None,
        action: str = None,
        user_email: str = None,
        limit: int = 10000
    ) -> list:
        """Get audit logs for export"""
        if self.db is None:
            return []
        
        query = {}
        
        if start_date:
            query["timestamp"] = {"$gte": start_date.isoformat()}
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date.isoformat()
            else:
                query["timestamp"] = {"$lte": end_date.isoformat()}
        if action:
            query["action"] = action
        if user_email:
            query["user_email"] = {"$regex": user_email, "$options": "i"}
        
        logs = await self.db.audit_logs.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return logs


# ============== CSRF PROTECTION ==============

class CSRFProtection:
    """CSRF token generation and validation"""
    
    TOKEN_LENGTH = 32
    TOKEN_HEADER = "X-CSRF-Token"
    TOKEN_COOKIE = "csrf_token"
    
    @classmethod
    def generate_token(cls) -> str:
        return secrets.token_urlsafe(cls.TOKEN_LENGTH)
    
    @classmethod
    def validate_token(cls, request: Request, submitted_token: str) -> bool:
        cookie_token = request.cookies.get(cls.TOKEN_COOKIE)
        
        if not cookie_token or not submitted_token:
            return False
        
        return secrets.compare_digest(cookie_token, submitted_token)


# ============== SECURE TOKEN GENERATION ==============

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


def generate_jwt_secret() -> str:
    """Generate a strong JWT secret key"""
    return secrets.token_hex(32)


# ============== IP UTILITIES ==============

def get_client_ip(request: Request) -> str:
    """Get the real client IP, accounting for proxies"""
    # Check X-Forwarded-For header
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Check CF-Connecting-IP (Cloudflare)
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    
    # Fall back to direct connection IP
    if request.client:
        return request.client.host
    
    return "unknown"
