"""
Shared database and auth accessors — breaks circular imports between server.py ↔ routes/utils.
All modules should import from here instead of `from server import db`.
"""


def get_db():
    """Lazy-import the database handle from server to avoid circular import at module level."""
    from server import db
    return db


async def get_current_user_from_request(request):
    """Lazy-import auth helpers and resolve the current user from a request."""
    from server import get_current_user, security
    credentials = await security(request)
    return await get_current_user(request, credentials)
