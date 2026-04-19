"""
Auth level system for CMS content visibility.

Each Page / Tile / Blog post / News item / Event carries an `auth_level` field
with one of 5 values. This module maps those levels to the existing UserRole
system (see models.py) and exposes a `require_auth_level(level)` dependency
factory that can be used in route decorators.

Hierarchy (higher roles always see lower-level content):
    public       -> anyone, no auth needed
    user         -> any authenticated user (any role)
    trainee      -> trainee + manager + org_admin + super_admin
    org_admin    -> org_admin + super_admin
    super_admin  -> super_admin only

Usage:
    from auth_levels import AuthLevel, require_auth_level

    @router.get("/secret", dependencies=[Depends(require_auth_level(AuthLevel.ORG_ADMIN))])
    async def secret(): ...

    # or as a callable dependency returning the user dict:
    @router.get("/profile")
    async def profile(user: dict = Depends(require_auth_level(AuthLevel.USER))):
        return user
"""
from __future__ import annotations

from enum import Enum
from typing import Callable, List, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer

from models import UserRole

# Bearer token reader that does NOT auto-error, so we can support both
# cookie-auth and anonymous access on PUBLIC endpoints.
_bearer = HTTPBearer(auto_error=False)

# All known authenticated roles in the system. Kept as a module-level
# constant rather than calling UserRole.all_roles() because the project
# has two different UserRole classes (models.py vs models/__init__.py)
# and the minimal one does not expose that classmethod.
_ALL_AUTHENTICATED_ROLES: List[str] = [
    "super_admin",
    "org_admin",
    "manager",
    "trainee",
    "media_manager",
    "viewer",
]


class AuthLevel(str, Enum):
    PUBLIC = "public"
    USER = "user"
    TRAINEE = "trainee"
    ORG_ADMIN = "org_admin"
    SUPER_ADMIN = "super_admin"

    @classmethod
    def values(cls) -> List[str]:
        return [m.value for m in cls]

    @classmethod
    def is_valid(cls, value: str) -> bool:
        return value in cls.values()


# Map each AuthLevel to the set of UserRole values that satisfy it.
# This is the single source of truth for access control on CMS content.
AUTH_LEVEL_TO_ROLES: dict[AuthLevel, List[str]] = {
    AuthLevel.PUBLIC: [],  # no auth required
    AuthLevel.USER: _ALL_AUTHENTICATED_ROLES,  # any authenticated role
    AuthLevel.TRAINEE: [
        UserRole.TRAINEE,
        "manager",
        UserRole.ORG_ADMIN,
        UserRole.SUPER_ADMIN,
    ],
    AuthLevel.ORG_ADMIN: [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN],
    AuthLevel.SUPER_ADMIN: [UserRole.SUPER_ADMIN],
}


def user_meets_level(user_role: Optional[str], level: AuthLevel) -> bool:
    """Pure-function check: does a user with the given role satisfy `level`?"""
    if level == AuthLevel.PUBLIC:
        return True
    if not user_role:
        return False
    allowed = AUTH_LEVEL_TO_ROLES.get(level, [])
    return user_role in allowed


def require_auth_level(level: AuthLevel) -> Callable:
    """Dependency factory.

    Returns a FastAPI dependency that enforces the given auth level. The
    returned callable relies on FastAPI's Depends system to resolve the
    bearer token (and therefore the request's Authorization header), then
    delegates to the project's existing `get_current_user` for cookie +
    JWT lookup. For AuthLevel.PUBLIC we short-circuit and return None
    without ever touching auth state.
    """
    async def _dep(
        request: Request,
        credentials=Depends(_bearer),
    ) -> Optional[dict]:
        if level == AuthLevel.PUBLIC:
            return None

        # Lazy import to break server.py <-> auth_levels.py circular dep
        from server import get_current_user  # type: ignore

        try:
            # Pass the credentials directly to get_current_user
            user = await get_current_user(request, credentials)
        except HTTPException as exc:
            # Normalise all auth failures to 401 at this layer
            if exc.status_code in (401, 403):
                raise HTTPException(status_code=401, detail="Unauthorized")
            raise

        role = user.get("role") if user else None
        if not user_meets_level(role, level):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required level: {level.value}",
            )
        return user

    return _dep


def filter_by_auth_level(items: list[dict], user_role: Optional[str]) -> list[dict]:
    """Filter a list of CMS items by their `auth_level` field against a user role.

    Used for list endpoints that return mixed public/authed content. Items whose
    auth_level the user does not satisfy are silently dropped (never leak their
    existence via 403s on list endpoints).
    """
    out = []
    for item in items:
        raw_level = item.get("auth_level", AuthLevel.PUBLIC.value)
        try:
            level = AuthLevel(raw_level)
        except ValueError:
            level = AuthLevel.PUBLIC
        if user_meets_level(user_role, level):
            out.append(item)
    return out
