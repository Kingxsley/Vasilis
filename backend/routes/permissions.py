"""
Permission Management Routes
API endpoints for managing user roles and permissions
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/permissions", tags=["Permissions"])

# Will be set by server.py
db = None
rbac_manager = None
audit_logger = None


def init_permission_routes(database, user_dep, rbac, logger):
    global db, rbac_manager, audit_logger
    db = database
    rbac_manager = rbac
    audit_logger = logger


async def get_current_user_from_request(request: Request) -> dict:
    """Get current user from request"""
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


# ============== MODELS ==============

class GrantPermissionRequest(BaseModel):
    user_id: str
    permission: str
    expires_at: Optional[str] = None
    reason: Optional[str] = None


class RevokePermissionRequest(BaseModel):
    user_id: str
    permission: str


class UpdateUserRoleRequest(BaseModel):
    user_id: str
    role: str


class BulkPermissionRequest(BaseModel):
    user_id: str
    permissions: List[str]
    action: str  # "grant" or "revoke"


# ============== ENDPOINTS ==============

@router.get("/roles")
async def get_available_roles(request: Request):
    """Get roles that current user can assign"""
    user = await get_current_user_from_request(request)
    
    if not rbac_manager:
        raise HTTPException(status_code=500, detail="RBAC not initialized")
    
    assignable_roles = rbac_manager.get_assignable_roles(user.get("role"))
    
    role_info = {
        "super_admin": {"name": "Super Admin", "description": "Full system access", "level": 1},
        "org_admin": {"name": "Organization Admin", "description": "Manage organization users and content", "level": 2},
        "manager": {"name": "Manager", "description": "Limited management capabilities", "level": 3},
        "media_manager": {"name": "Media Manager", "description": "Content management only", "level": 3},
        "trainee": {"name": "Trainee", "description": "Training access only", "level": 4},
        "viewer": {"name": "Viewer", "description": "Read-only access", "level": 5},
    }
    
    return {
        "assignable_roles": [
            {
                "id": role,
                **role_info.get(role, {"name": role, "description": "", "level": 99})
            }
            for role in assignable_roles
        ],
        "current_user_role": user.get("role")
    }


@router.get("/available")
async def get_available_permissions(request: Request):
    """Get permissions that current user can grant to others"""
    user = await get_current_user_from_request(request)
    
    if not rbac_manager:
        raise HTTPException(status_code=500, detail="RBAC not initialized")
    
    # Import here to avoid circular imports
    from middleware.rbac import PERMISSION_GROUPS
    
    assignable = rbac_manager.get_assignable_permissions(user.get("role"))
    
    # Filter permission groups to only show assignable permissions
    filtered_groups = {}
    for group_name, permissions in PERMISSION_GROUPS.items():
        filtered = [p for p in permissions if p["id"] in assignable]
        if filtered:
            filtered_groups[group_name] = filtered
    
    return {
        "permission_groups": filtered_groups,
        "all_assignable": assignable
    }


@router.get("/user/{user_id}")
async def get_user_permissions(user_id: str, request: Request):
    """Get permissions for a specific user"""
    user = await get_current_user_from_request(request)
    
    if db is None or rbac_manager is None:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    # Get target user
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if current user can view this user's permissions
    if user.get("role") != "super_admin":
        if user.get("role") == "org_admin":
            if user.get("organization_id") != target_user.get("organization_id"):
                raise HTTPException(status_code=403, detail="Cannot view permissions for users outside your organization")
        else:
            if user.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Cannot view other users' permissions")
    
    # Get effective permissions
    effective_permissions = await rbac_manager.get_user_permissions(target_user)
    
    # Get custom permission details
    custom_details = await rbac_manager.get_user_permission_details(user_id)
    
    # Get role's default permissions
    from middleware.rbac import ROLE_PERMISSIONS
    role_permissions = ROLE_PERMISSIONS.get(target_user.get("role"), [])
    
    return {
        "user_id": user_id,
        "email": target_user.get("email"),
        "name": target_user.get("name"),
        "role": target_user.get("role"),
        "organization_id": target_user.get("organization_id"),
        "role_permissions": role_permissions,
        "custom_grants": custom_details.get("grants", []),
        "denied_permissions": custom_details.get("denied", []),
        "effective_permissions": effective_permissions
    }


@router.post("/grant")
async def grant_permission(request_data: GrantPermissionRequest, request: Request):
    """Grant a permission to a user"""
    user = await get_current_user_from_request(request)
    
    if db is None or rbac_manager is None:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    # Check if current user can grant this permission
    assignable = rbac_manager.get_assignable_permissions(user.get("role"))
    if request_data.permission not in assignable:
        raise HTTPException(status_code=403, detail=f"You cannot grant the '{request_data.permission}' permission")
    
    # Get target user
    target_user = await db.users.find_one({"user_id": request_data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if can manage this user
    if not rbac_manager.can_manage_user(user, target_user):
        raise HTTPException(status_code=403, detail="You cannot manage this user")
    
    # Grant permission
    success = await rbac_manager.grant_permission(
        user_id=request_data.user_id,
        permission=request_data.permission,
        granted_by=user.get("user_id"),
        expires_at=request_data.expires_at,
        reason=request_data.reason
    )
    
    if success and audit_logger:
        await audit_logger.log(
            action="permission_granted",
            user_id=user.get("user_id"),
            user_email=user.get("email"),
            details={
                "target_user": request_data.user_id,
                "permission": request_data.permission,
                "expires_at": request_data.expires_at,
                "reason": request_data.reason
            },
            severity="info"
        )
    
    return {"success": success, "message": f"Permission '{request_data.permission}' granted to user"}


@router.post("/revoke")
async def revoke_permission(request_data: RevokePermissionRequest, request: Request):
    """Revoke a permission from a user"""
    user = await get_current_user_from_request(request)
    
    if db is None or rbac_manager is None:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    # Get target user
    target_user = await db.users.find_one({"user_id": request_data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if can manage this user
    if not rbac_manager.can_manage_user(user, target_user):
        raise HTTPException(status_code=403, detail="You cannot manage this user")
    
    # Revoke permission
    success = await rbac_manager.revoke_permission(
        user_id=request_data.user_id,
        permission=request_data.permission
    )
    
    if success and audit_logger:
        await audit_logger.log(
            action="permission_revoked",
            user_id=user.get("user_id"),
            user_email=user.get("email"),
            details={
                "target_user": request_data.user_id,
                "permission": request_data.permission
            },
            severity="info"
        )
    
    return {"success": success, "message": f"Permission '{request_data.permission}' revoked from user"}


@router.post("/bulk")
async def bulk_update_permissions(request_data: BulkPermissionRequest, request: Request):
    """Grant or revoke multiple permissions at once"""
    user = await get_current_user_from_request(request)
    
    if db is None or rbac_manager is None:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    if request_data.action not in ["grant", "revoke"]:
        raise HTTPException(status_code=400, detail="Action must be 'grant' or 'revoke'")
    
    # Get target user
    target_user = await db.users.find_one({"user_id": request_data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if can manage this user
    if not rbac_manager.can_manage_user(user, target_user):
        raise HTTPException(status_code=403, detail="You cannot manage this user")
    
    # Check assignable permissions
    assignable = rbac_manager.get_assignable_permissions(user.get("role"))
    
    results = {"success": [], "failed": []}
    
    for permission in request_data.permissions:
        if request_data.action == "grant":
            if permission not in assignable:
                results["failed"].append({"permission": permission, "reason": "Not assignable"})
                continue
            
            success = await rbac_manager.grant_permission(
                user_id=request_data.user_id,
                permission=permission,
                granted_by=user.get("user_id")
            )
        else:
            success = await rbac_manager.revoke_permission(
                user_id=request_data.user_id,
                permission=permission
            )
        
        if success:
            results["success"].append(permission)
        else:
            results["failed"].append({"permission": permission, "reason": "Database error"})
    
    if audit_logger:
        await audit_logger.log(
            action=f"permissions_bulk_{request_data.action}",
            user_id=user.get("user_id"),
            user_email=user.get("email"),
            details={
                "target_user": request_data.user_id,
                "action": request_data.action,
                "success_count": len(results["success"]),
                "failed_count": len(results["failed"])
            },
            severity="info"
        )
    
    return results


@router.put("/role")
async def update_user_role(request_data: UpdateUserRoleRequest, request: Request):
    """Update a user's role"""
    user = await get_current_user_from_request(request)
    
    if db is None or rbac_manager is None:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    # Check if current user can assign this role
    assignable_roles = rbac_manager.get_assignable_roles(user.get("role"))
    if request_data.role not in assignable_roles:
        raise HTTPException(status_code=403, detail=f"You cannot assign the '{request_data.role}' role")
    
    # Get target user
    target_user = await db.users.find_one({"user_id": request_data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Org admin cannot change super_admin users
    if user.get("role") == "org_admin" and target_user.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify super admin users")
    
    # Org admin can only modify users in their organization
    if user.get("role") == "org_admin":
        if user.get("organization_id") != target_user.get("organization_id"):
            raise HTTPException(status_code=403, detail="Cannot modify users outside your organization")
    
    old_role = target_user.get("role")
    
    # Update role
    await db.users.update_one(
        {"user_id": request_data.user_id},
        {"$set": {"role": request_data.role}}
    )
    
    if audit_logger:
        await audit_logger.log(
            action="user_role_changed",
            user_id=user.get("user_id"),
            user_email=user.get("email"),
            details={
                "target_user": request_data.user_id,
                "target_email": target_user.get("email"),
                "old_role": old_role,
                "new_role": request_data.role
            },
            severity="warning"
        )
    
    return {
        "success": True,
        "message": f"User role updated to '{request_data.role}'",
        "old_role": old_role,
        "new_role": request_data.role
    }


@router.get("/check/{permission}")
async def check_permission(permission: str, request: Request):
    """Check if current user has a specific permission"""
    user = await get_current_user_from_request(request)
    
    if not rbac_manager:
        raise HTTPException(status_code=500, detail="RBAC not initialized")
    
    has_perm = await rbac_manager.has_permission(user, permission)
    
    return {
        "permission": permission,
        "has_permission": has_perm,
        "user_role": user.get("role")
    }


@router.get("/my-permissions")
async def get_my_permissions(request: Request):
    """Get current user's effective permissions"""
    user = await get_current_user_from_request(request)
    
    if not rbac_manager:
        raise HTTPException(status_code=500, detail="RBAC not initialized")
    
    permissions = await rbac_manager.get_user_permissions(user)
    
    # Group permissions by category
    from middleware.rbac import PERMISSION_GROUPS
    
    grouped = {}
    for group_name, perms in PERMISSION_GROUPS.items():
        group_perms = []
        for p in perms:
            if p["id"] in permissions:
                group_perms.append({**p, "granted": True})
            else:
                group_perms.append({**p, "granted": False})
        grouped[group_name] = group_perms
    
    return {
        "role": user.get("role"),
        "organization_id": user.get("organization_id"),
        "permissions": permissions,
        "grouped_permissions": grouped
    }
