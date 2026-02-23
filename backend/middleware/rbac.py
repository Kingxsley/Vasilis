"""
Enhanced Role-Based Access Control (RBAC) System
Supports granular permissions for features with read/write access
"""
from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime, timezone


# ============== PERMISSION DEFINITIONS ==============

class Permission(str, Enum):
    """Available permissions in the system"""
    # User Management
    USERS_READ = "users:read"
    USERS_WRITE = "users:write"
    USERS_DELETE = "users:delete"
    
    # Organization Management
    ORGS_READ = "orgs:read"
    ORGS_WRITE = "orgs:write"
    ORGS_DELETE = "orgs:delete"
    
    # Campaign Management
    CAMPAIGNS_READ = "campaigns:read"
    CAMPAIGNS_WRITE = "campaigns:write"
    CAMPAIGNS_DELETE = "campaigns:delete"
    
    # Training Management
    TRAINING_READ = "training:read"
    TRAINING_WRITE = "training:write"
    TRAINING_DELETE = "training:delete"
    
    # Content Management (Blog, News, Videos)
    CONTENT_READ = "content:read"
    CONTENT_WRITE = "content:write"
    CONTENT_DELETE = "content:delete"
    
    # Certificate Management
    CERTIFICATES_READ = "certificates:read"
    CERTIFICATES_WRITE = "certificates:write"
    CERTIFICATES_DELETE = "certificates:delete"
    
    # Settings & Branding
    SETTINGS_READ = "settings:read"
    SETTINGS_WRITE = "settings:write"
    
    # Analytics & Reports
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"
    
    # Security & Audit
    SECURITY_READ = "security:read"
    SECURITY_MANAGE = "security:manage"
    AUDIT_READ = "audit:read"
    AUDIT_EXPORT = "audit:export"
    
    # Admin Management (Super Admin only)
    ADMINS_MANAGE = "admins:manage"
    ROLES_MANAGE = "roles:manage"


# ============== ROLE DEFINITIONS ==============

class Role(str, Enum):
    """System roles"""
    SUPER_ADMIN = "super_admin"      # Full access to everything
    ORG_ADMIN = "org_admin"          # Manage their organization
    MANAGER = "manager"              # Limited management capabilities
    TRAINEE = "trainee"              # Basic user - training only
    MEDIA_MANAGER = "media_manager"  # Content management only
    VIEWER = "viewer"                # Read-only access


# Default permissions for each role
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    Role.SUPER_ADMIN: [p.value for p in Permission],  # All permissions
    
    Role.ORG_ADMIN: [
        Permission.USERS_READ.value,
        Permission.USERS_WRITE.value,
        Permission.ORGS_READ.value,
        Permission.CAMPAIGNS_READ.value,
        Permission.CAMPAIGNS_WRITE.value,
        Permission.TRAINING_READ.value,
        Permission.TRAINING_WRITE.value,
        Permission.CONTENT_READ.value,
        Permission.CERTIFICATES_READ.value,
        Permission.CERTIFICATES_WRITE.value,
        Permission.ANALYTICS_READ.value,
        Permission.ANALYTICS_EXPORT.value,
    ],
    
    Role.MANAGER: [
        Permission.USERS_READ.value,
        Permission.CAMPAIGNS_READ.value,
        Permission.CAMPAIGNS_WRITE.value,
        Permission.TRAINING_READ.value,
        Permission.CONTENT_READ.value,
        Permission.ANALYTICS_READ.value,
    ],
    
    Role.TRAINEE: [
        Permission.TRAINING_READ.value,
        Permission.CERTIFICATES_READ.value,
    ],
    
    Role.MEDIA_MANAGER: [
        Permission.CONTENT_READ.value,
        Permission.CONTENT_WRITE.value,
        Permission.CONTENT_DELETE.value,
    ],
    
    Role.VIEWER: [
        Permission.USERS_READ.value,
        Permission.ORGS_READ.value,
        Permission.CAMPAIGNS_READ.value,
        Permission.TRAINING_READ.value,
        Permission.CONTENT_READ.value,
        Permission.ANALYTICS_READ.value,
    ],
}


# ============== MODELS ==============

class UserPermissions(BaseModel):
    """User's effective permissions"""
    user_id: str
    role: str
    organization_id: Optional[str] = None
    permissions: List[str] = []
    custom_permissions: List[str] = []  # Additional permissions beyond role
    denied_permissions: List[str] = []   # Explicitly denied permissions


class PermissionGrant(BaseModel):
    """Permission grant for a user"""
    permission: str
    granted_by: str
    granted_at: str
    expires_at: Optional[str] = None
    reason: Optional[str] = None


# ============== RBAC MANAGER ==============

class RBACManager:
    """Role-Based Access Control Manager"""
    
    def __init__(self, db=None):
        self.db = db
    
    def get_role_permissions(self, role: str) -> List[str]:
        """Get default permissions for a role"""
        return ROLE_PERMISSIONS.get(role, [])
    
    async def get_user_permissions(self, user: dict) -> List[str]:
        """
        Get all effective permissions for a user.
        Combines role permissions + custom grants - denied permissions
        """
        role = user.get("role", Role.TRAINEE)
        user_id = user.get("user_id")
        
        # Start with role's default permissions
        permissions = set(self.get_role_permissions(role))
        
        # Get custom permission grants from database
        if self.db is not None and user_id:
            custom_perms = await self.db.user_permissions.find_one(
                {"user_id": user_id},
                {"_id": 0}
            )
            
            if custom_perms:
                # Add granted permissions
                for grant in custom_perms.get("grants", []):
                    # Check if not expired
                    expires = grant.get("expires_at")
                    if expires:
                        if datetime.fromisoformat(expires) < datetime.now(timezone.utc):
                            continue
                    permissions.add(grant.get("permission"))
                
                # Remove denied permissions
                for denied in custom_perms.get("denied", []):
                    permissions.discard(denied)
        
        return list(permissions)
    
    async def has_permission(self, user: dict, permission: str) -> bool:
        """Check if user has a specific permission"""
        # Super admin has all permissions
        if user.get("role") == Role.SUPER_ADMIN:
            return True
        
        permissions = await self.get_user_permissions(user)
        return permission in permissions
    
    async def has_any_permission(self, user: dict, permissions: List[str]) -> bool:
        """Check if user has any of the specified permissions"""
        if user.get("role") == Role.SUPER_ADMIN:
            return True
        
        user_perms = await self.get_user_permissions(user)
        return any(p in user_perms for p in permissions)
    
    async def has_all_permissions(self, user: dict, permissions: List[str]) -> bool:
        """Check if user has all of the specified permissions"""
        if user.get("role") == Role.SUPER_ADMIN:
            return True
        
        user_perms = await self.get_user_permissions(user)
        return all(p in user_perms for p in permissions)
    
    def can_manage_organization(self, user: dict, org_id: str) -> bool:
        """Check if user can manage a specific organization"""
        # Super admin can manage any organization
        if user.get("role") == Role.SUPER_ADMIN:
            return True
        
        # Org admin can only manage their own organization
        if user.get("role") == Role.ORG_ADMIN:
            return user.get("organization_id") == org_id
        
        return False
    
    def can_manage_user(self, admin: dict, target_user: dict) -> bool:
        """Check if admin can manage a target user"""
        admin_role = admin.get("role")
        target_role = target_user.get("role")
        
        # Super admin can manage anyone
        if admin_role == Role.SUPER_ADMIN:
            return True
        
        # Org admin can manage users in their organization (except super admins)
        if admin_role == Role.ORG_ADMIN:
            if target_role == Role.SUPER_ADMIN:
                return False
            return admin.get("organization_id") == target_user.get("organization_id")
        
        return False
    
    async def grant_permission(
        self,
        user_id: str,
        permission: str,
        granted_by: str,
        expires_at: str = None,
        reason: str = None
    ) -> bool:
        """Grant a custom permission to a user"""
        if self.db is None:
            return False
        
        grant = {
            "permission": permission,
            "granted_by": granted_by,
            "granted_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "reason": reason
        }
        
        await self.db.user_permissions.update_one(
            {"user_id": user_id},
            {
                "$push": {"grants": grant},
                "$setOnInsert": {"user_id": user_id, "denied": []}
            },
            upsert=True
        )
        
        return True
    
    async def revoke_permission(self, user_id: str, permission: str) -> bool:
        """Revoke a custom permission from a user"""
        if self.db is None:
            return False
        
        await self.db.user_permissions.update_one(
            {"user_id": user_id},
            {"$pull": {"grants": {"permission": permission}}}
        )
        
        return True
    
    async def deny_permission(self, user_id: str, permission: str) -> bool:
        """Explicitly deny a permission (overrides role default)"""
        if self.db is None:
            return False
        
        await self.db.user_permissions.update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"denied": permission},
                "$setOnInsert": {"user_id": user_id, "grants": []}
            },
            upsert=True
        )
        
        return True
    
    async def get_user_permission_details(self, user_id: str) -> dict:
        """Get detailed permission info for a user"""
        if self.db is None:
            return {}
        
        perms = await self.db.user_permissions.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        return perms or {"user_id": user_id, "grants": [], "denied": []}
    
    def get_assignable_roles(self, admin_role: str) -> List[str]:
        """Get roles that an admin can assign to others"""
        if admin_role == Role.SUPER_ADMIN:
            return [r.value for r in Role]
        
        if admin_role == Role.ORG_ADMIN:
            # Org admins can assign these roles within their org
            return [
                Role.MANAGER.value,
                Role.TRAINEE.value,
                Role.MEDIA_MANAGER.value,
                Role.VIEWER.value
            ]
        
        return []
    
    def get_assignable_permissions(self, admin_role: str) -> List[str]:
        """Get permissions that an admin can grant to others"""
        if admin_role == Role.SUPER_ADMIN:
            return [p.value for p in Permission]
        
        if admin_role == Role.ORG_ADMIN:
            # Org admins can grant these permissions
            return [
                Permission.USERS_READ.value,
                Permission.CAMPAIGNS_READ.value,
                Permission.CAMPAIGNS_WRITE.value,
                Permission.TRAINING_READ.value,
                Permission.TRAINING_WRITE.value,
                Permission.CONTENT_READ.value,
                Permission.CONTENT_WRITE.value,
                Permission.CERTIFICATES_READ.value,
                Permission.ANALYTICS_READ.value,
            ]
        
        return []


# ============== PERMISSION GROUPS (for UI) ==============

PERMISSION_GROUPS = {
    "User Management": [
        {"id": Permission.USERS_READ.value, "name": "View Users", "description": "View user list and details"},
        {"id": Permission.USERS_WRITE.value, "name": "Edit Users", "description": "Create and edit users"},
        {"id": Permission.USERS_DELETE.value, "name": "Delete Users", "description": "Delete users"},
    ],
    "Organization Management": [
        {"id": Permission.ORGS_READ.value, "name": "View Organizations", "description": "View organization list"},
        {"id": Permission.ORGS_WRITE.value, "name": "Edit Organizations", "description": "Create and edit organizations"},
        {"id": Permission.ORGS_DELETE.value, "name": "Delete Organizations", "description": "Delete organizations"},
    ],
    "Campaign Management": [
        {"id": Permission.CAMPAIGNS_READ.value, "name": "View Campaigns", "description": "View campaign list and details"},
        {"id": Permission.CAMPAIGNS_WRITE.value, "name": "Edit Campaigns", "description": "Create and edit campaigns"},
        {"id": Permission.CAMPAIGNS_DELETE.value, "name": "Delete Campaigns", "description": "Delete campaigns"},
    ],
    "Training": [
        {"id": Permission.TRAINING_READ.value, "name": "Access Training", "description": "View and take training modules"},
        {"id": Permission.TRAINING_WRITE.value, "name": "Manage Training", "description": "Create and edit training modules"},
        {"id": Permission.TRAINING_DELETE.value, "name": "Delete Training", "description": "Delete training modules"},
    ],
    "Content (Blog/News/Videos)": [
        {"id": Permission.CONTENT_READ.value, "name": "View Content", "description": "View blog, news, and videos"},
        {"id": Permission.CONTENT_WRITE.value, "name": "Edit Content", "description": "Create and edit content"},
        {"id": Permission.CONTENT_DELETE.value, "name": "Delete Content", "description": "Delete content"},
    ],
    "Certificates": [
        {"id": Permission.CERTIFICATES_READ.value, "name": "View Certificates", "description": "View certificates"},
        {"id": Permission.CERTIFICATES_WRITE.value, "name": "Manage Certificates", "description": "Create and edit certificates"},
        {"id": Permission.CERTIFICATES_DELETE.value, "name": "Delete Certificates", "description": "Delete certificates"},
    ],
    "Settings": [
        {"id": Permission.SETTINGS_READ.value, "name": "View Settings", "description": "View system settings"},
        {"id": Permission.SETTINGS_WRITE.value, "name": "Edit Settings", "description": "Modify system settings"},
    ],
    "Analytics": [
        {"id": Permission.ANALYTICS_READ.value, "name": "View Analytics", "description": "View reports and analytics"},
        {"id": Permission.ANALYTICS_EXPORT.value, "name": "Export Analytics", "description": "Export reports"},
    ],
    "Security (Admin Only)": [
        {"id": Permission.SECURITY_READ.value, "name": "View Security", "description": "View security dashboard"},
        {"id": Permission.SECURITY_MANAGE.value, "name": "Manage Security", "description": "Manage security settings"},
        {"id": Permission.AUDIT_READ.value, "name": "View Audit Logs", "description": "View audit logs"},
        {"id": Permission.AUDIT_EXPORT.value, "name": "Export Audit Logs", "description": "Export audit logs"},
    ],
    "Administration (Super Admin Only)": [
        {"id": Permission.ADMINS_MANAGE.value, "name": "Manage Admins", "description": "Create and manage admin users"},
        {"id": Permission.ROLES_MANAGE.value, "name": "Manage Roles", "description": "Assign roles and permissions"},
    ],
}


# Global instance (will be initialized with db)
rbac_manager = RBACManager()
