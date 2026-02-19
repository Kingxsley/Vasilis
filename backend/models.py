"""
Shared Models for Vasilis NetShield
"""

class UserRole:
    """User roles in the system"""
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    MANAGER = "manager"
    TRAINEE = "trainee"
    MEDIA_MANAGER = "media_manager"
    VIEWER = "viewer"
    
    @classmethod
    def all_roles(cls):
        return [
            cls.SUPER_ADMIN,
            cls.ORG_ADMIN,
            cls.MANAGER,
            cls.TRAINEE,
            cls.MEDIA_MANAGER,
            cls.VIEWER
        ]
    
    @classmethod
    def admin_roles(cls):
        """Roles that have admin capabilities"""
        return [cls.SUPER_ADMIN, cls.ORG_ADMIN]
