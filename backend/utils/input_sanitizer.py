"""
input_sanitizer.py
Shared utility for sanitising and validating user-submitted text fields
across contact forms and access request forms.

Defends against:
- SQL injection (SELECT, INSERT, DROP, --, /* */, xp_, EXEC, UNION etc.)
- NoSQL injection ($where, $gt, $lt, $ne, $regex operator strings)
- Script injection / XSS payloads (<script>, javascript:, onerror= etc.)
- Oversized inputs
"""

import re
import html
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Limits (characters)
# ---------------------------------------------------------------------------
LIMITS = {
    "name":         100,
    "email":        100,
    "phone":         30,
    "organization": 150,
    "subject":      150,
    "message":      200,   # ← 200-char cap as requested
    "default":      200,
}

# ---------------------------------------------------------------------------
# Pattern libraries
# ---------------------------------------------------------------------------

# SQL injection keywords and operators
_SQL_PATTERNS = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|"
    r"TRUNCATE|GRANT|REVOKE|HAVING|DECLARE|CAST|CONVERT|CHAR|NCHAR|VARCHAR|"
    r"WAITFOR|DELAY|BENCHMARK|SLEEP|XP_|SP_|INFORMATION_SCHEMA|SYS\.|"
    r"SYSOBJECTS|SYSCOLUMNS)\b"
    r"|--|;|/\*|\*/|'\s*OR\s*'|'\s*AND\s*'|=\s*'|'\s*=|1\s*=\s*1|1\s*=\s*0)",
    re.IGNORECASE
)

# NoSQL injection — MongoDB operator strings
_NOSQL_PATTERNS = re.compile(
    r"(\$where|\$gt|\$lt|\$gte|\$lte|\$ne|\$in|\$nin|\$regex|\$exists|"
    r"\$or|\$and|\$not|\$nor|\$elemMatch|\$size|\$type|\$mod|\$all)",
    re.IGNORECASE
)

# Script / XSS payloads
_SCRIPT_PATTERNS = re.compile(
    r"(<\s*script|</\s*script|javascript\s*:|vbscript\s*:|data\s*:|"
    r"on\w+\s*=|<\s*img|<\s*iframe|<\s*object|<\s*embed|<\s*link|"
    r"<\s*meta|<\s*form|eval\s*\(|expression\s*\(|document\s*\.|"
    r"window\s*\.|alert\s*\(|confirm\s*\(|prompt\s*\()",
    re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Core function
# ---------------------------------------------------------------------------

def sanitize_field(value: str, field_name: str = "default") -> str:
    """
    Sanitise a single text field:
    1. Strip leading/trailing whitespace
    2. HTML-escape special characters
    3. Enforce character limit
    4. Reject if injection patterns are detected
    Raises ValueError on rejection so the caller can return HTTP 400.
    """
    if not isinstance(value, str):
        return ""

    # 1. Strip
    value = value.strip()

    # 2. Enforce length BEFORE pattern checks (avoids CPU cost on huge inputs)
    limit = LIMITS.get(field_name, LIMITS["default"])
    if len(value) > limit:
        raise ValueError(
            f"Field '{field_name}' exceeds maximum length of {limit} characters."
        )

    # 3. Check for injection patterns — reject hard
    if _SQL_PATTERNS.search(value):
        logger.warning(f"SQL injection pattern detected in field '{field_name}'")
        raise ValueError(f"Field '{field_name}' contains disallowed content.")

    if _NOSQL_PATTERNS.search(value):
        logger.warning(f"NoSQL injection pattern detected in field '{field_name}'")
        raise ValueError(f"Field '{field_name}' contains disallowed content.")

    if _SCRIPT_PATTERNS.search(value):
        logger.warning(f"Script injection pattern detected in field '{field_name}'")
        raise ValueError(f"Field '{field_name}' contains disallowed content.")

    # 4. HTML-escape to neutralise any remaining angle-bracket content
    value = html.escape(value, quote=True)

    return value


def sanitize_submission(data: dict, field_map: dict = None) -> dict:
    """
    Sanitise a dict of form fields.
    field_map: {field_name: limit_key} — maps payload keys to LIMITS keys.
    Raises ValueError on any rejection.
    """
    field_map = field_map or {}
    cleaned = {}
    for key, val in data.items():
        limit_key = field_map.get(key, key)
        cleaned[key] = sanitize_field(str(val) if val is not None else "", limit_key)
    return cleaned
