"""
Security utility functions for input validation and sanitization
"""
import re
import html
from typing import Optional


def sanitize_html_input(text: Optional[str]) -> str:
    """Escape HTML characters to prevent XSS attacks"""
    if text is None:
        return ""
    return html.escape(str(text))


def sanitize_search_query(query: Optional[str]) -> str:
    """Sanitize search query to prevent NoSQL injection via regex"""
    if query is None:
        return ""
    # Remove special regex characters that could be used for injection
    # Keep only alphanumeric, spaces, and basic punctuation
    sanitized = re.sub(r'[^\w\s\-@.\']', '', str(query))
    return sanitized[:200]  # Limit length


def sanitize_mongodb_query(value: str) -> str:
    """Sanitize values used in MongoDB queries to prevent operator injection"""
    if not isinstance(value, str):
        return str(value)
    # Remove MongoDB operators
    dangerous_patterns = [
        '$where', '$regex', '$gt', '$gte', '$lt', '$lte', 
        '$ne', '$in', '$nin', '$or', '$and', '$not',
        '$exists', '$type', '$mod', '$text', '$expr'
    ]
    sanitized = value
    for pattern in dangerous_patterns:
        sanitized = sanitized.replace(pattern, '')
    return sanitized


def validate_email_format(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_object_id(obj_id: str) -> bool:
    """Validate that a string looks like a safe object ID"""
    # Allow alphanumeric, underscores, and hyphens
    return bool(re.match(r'^[\w\-]+$', obj_id))
