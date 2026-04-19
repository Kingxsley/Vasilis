"""
Granular Permission Management
Allows granting/revoking specific permissions to users without changing roles
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone

router = APIRouter(prefix="/permissions/granular", tags=["Granular Permissions"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can manage permissions")
    return user


class GrantPermission(BaseModel):
    user_id: str
    permission: str
    access_level: str = "read"  # read, write, or both
    expires_at: str = None  # ISO datetime or None for permanent


class RevokePermission(BaseModel):
    user_id: str
    permission: str


@router.get("/user/{user_id}")
async def get_user_granular_permissions(user_id: str, admin: dict = Depends(require_super_admin)):
    """Get all granular permissions for a user"""
    db = get_db()
    
    perms = await db.user_granular_permissions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"permissions": perms}


@router.post("/grant")
async def grant_granular_permission(data: GrantPermission, admin: dict = Depends(require_super_admin)):
    """Grant a specific permission to a user"""
    db = get_db()
    
    # Check if user exists
    user = await db.users.find_one({"user_id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if permission already exists
    existing = await db.user_granular_permissions.find_one({
        "user_id": data.user_id,
        "permission": data.permission
    })
    
    perm_doc = {
        "user_id": data.user_id,
        "permission": data.permission,
        "access_level": data.access_level,
        "expires_at": data.expires_at,
        "granted_by": admin.get("user_id"),
        "granted_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        # Update existing permission
        await db.user_granular_permissions.update_one(
            {"user_id": data.user_id, "permission": data.permission},
            {"$set": perm_doc}
        )
        return {"message": "Permission updated", "permission": perm_doc}
    else:
        # Insert new permission
        await db.user_granular_permissions.insert_one(perm_doc)
        return {"message": "Permission granted", "permission": perm_doc}


@router.delete("/revoke")
async def revoke_granular_permission(data: RevokePermission, admin: dict = Depends(require_super_admin)):
    """Revoke a specific permission from a user"""
    db = get_db()
    
    result = await db.user_granular_permissions.delete_one({
        "user_id": data.user_id,
        "permission": data.permission
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return {"message": "Permission revoked"}


@router.get("/available")
async def get_available_permissions(admin: dict = Depends(require_super_admin)):
    """Get list of all available permissions that can be granted"""
    
    # Define all available permissions in the system
    permissions = [
        {"id": "analytics:read", "name": "Analytics - Read", "category": "Analytics"},
        {"id": "analytics:write", "name": "Analytics - Write", "category": "Analytics"},
        {"id": "campaigns:read", "name": "Campaigns - Read", "category": "Campaigns"},
        {"id": "campaigns:write", "name": "Campaigns - Write", "category": "Campaigns"},
        {"id": "users:read", "name": "Users - Read", "category": "Users"},
        {"id": "users:write", "name": "Users - Write", "category": "Users"},
        {"id": "content:read", "name": "Content - Read", "category": "Content"},
        {"id": "content:write", "name": "Content - Write", "category": "Content"},
        {"id": "training:read", "name": "Training - Read", "category": "Training"},
        {"id": "training:write", "name": "Training - Write", "category": "Training"},
        {"id": "security:read", "name": "Security Center - Read", "category": "Security"},
        {"id": "security:write", "name": "Security Center - Write", "category": "Security"},
        {"id": "reports:read", "name": "Reports - Read", "category": "Reports"},
        {"id": "reports:write", "name": "Reports - Write", "category": "Reports"},
        {"id": "events:read", "name": "Events - Read", "category": "Events"},
        {"id": "events:write", "name": "Events - Write", "category": "Events"},
        {"id": "settings:read", "name": "Settings - Read", "category": "Settings"},
        {"id": "settings:write", "name": "Settings - Write", "category": "Settings"},
    ]
    
    return {"permissions": permissions}
