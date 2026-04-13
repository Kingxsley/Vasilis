"""
Shared database accessor — breaks circular imports between server.py ↔ routes/utils.
All modules should import `get_db` from here instead of `from server import db`.
"""


def get_db():
    """Lazy-import the database handle from server to avoid circular import at module level."""
    from server import db
    return db
