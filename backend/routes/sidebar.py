from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/sidebar", tags=["Sidebar"])


def get_db():
    from server import db
    return db


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class SidebarLink(BaseModel):
    label: str
    url: str
    is_external: bool = False


class SidebarSection(BaseModel):
    section_type: str  # 'cta', 'links', 'image', 'html'
    title: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    links: Optional[List[SidebarLink]] = None
    html_content: Optional[str] = None
    order: int = 0


class SidebarConfig(BaseModel):
    page: str  # 'news', 'blog', 'videos', 'about'
    enabled: bool = True
    sections: List[SidebarSection] = []


# Default sidebar configurations
DEFAULT_SIDEBARS = {
    "news": {
        "enabled": True,
        "sections": [
            {
                "section_type": "cta",
                "title": "Stay Protected",
                "description": "Get trained to identify cyber threats before they impact your organization.",
                "button_text": "Start Training",
                "button_url": "/auth",
                "order": 0
            },
            {
                "section_type": "links",
                "title": "Quick Links",
                "links": [
                    {"label": "Read our Blog", "url": "/blog", "is_external": False},
                    {"label": "Watch Training Videos", "url": "/videos", "is_external": False},
                    {"label": "About Us", "url": "/about", "is_external": False}
                ],
                "order": 1
            }
        ]
    },
    "blog": {
        "enabled": True,
        "sections": [
            {
                "section_type": "cta",
                "title": "Start Your Training",
                "description": "Learn to protect yourself and your organization from cyber threats.",
                "button_text": "Get Started",
                "button_url": "/auth",
                "order": 0
            },
            {
                "section_type": "links",
                "title": "Explore More",
                "links": [
                    {"label": "Latest News", "url": "/news", "is_external": False},
                    {"label": "Training Videos", "url": "/videos", "is_external": False},
                    {"label": "About Us", "url": "/about", "is_external": False}
                ],
                "order": 1
            }
        ]
    },
    "videos": {
        "enabled": True,
        "sections": [
            {
                "section_type": "cta",
                "title": "Ready to Learn?",
                "description": "Start your security awareness training today.",
                "button_text": "Begin Training",
                "button_url": "/auth",
                "order": 0
            }
        ]
    },
    "about": {
        "enabled": True,
        "sections": []
    }
}


@router.get("/{page}")
async def get_sidebar_config(page: str):
    """Get sidebar configuration for a page (public endpoint)"""
    db = get_db()
    
    if page not in ["news", "blog", "videos", "about"]:
        raise HTTPException(status_code=400, detail="Invalid page")
    
    config = await db.sidebar_configs.find_one({"page": page}, {"_id": 0})
    
    if not config:
        # Return default config
        default = DEFAULT_SIDEBARS.get(page, {"enabled": True, "sections": []})
        return {"page": page, **default}
    
    return config


@router.get("")
async def get_all_sidebar_configs(request: Request):
    """Get all sidebar configurations (admin only)"""
    await require_admin(request)
    db = get_db()
    
    configs = await db.sidebar_configs.find({}, {"_id": 0}).to_list(10)
    
    # Merge with defaults for any missing pages
    result = {}
    for page in ["news", "blog", "videos", "about"]:
        existing = next((c for c in configs if c.get("page") == page), None)
        if existing:
            result[page] = existing
        else:
            result[page] = {"page": page, **DEFAULT_SIDEBARS.get(page, {"enabled": True, "sections": []})}
    
    return result


@router.post("/{page}")
async def update_sidebar_config(page: str, config: SidebarConfig, request: Request):
    """Update sidebar configuration for a page"""
    user = await require_admin(request)
    db = get_db()
    
    if page not in ["news", "blog", "videos", "about"]:
        raise HTTPException(status_code=400, detail="Invalid page")
    
    config_dict = config.model_dump()
    config_dict["page"] = page
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    config_dict["updated_by"] = user["user_id"]
    
    await db.sidebar_configs.update_one(
        {"page": page},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"message": f"Sidebar for {page} updated successfully"}


@router.delete("/{page}")
async def reset_sidebar_config(page: str, request: Request):
    """Reset sidebar to default configuration"""
    await require_admin(request)
    db = get_db()
    
    if page not in ["news", "blog", "videos", "about"]:
        raise HTTPException(status_code=400, detail="Invalid page")
    
    await db.sidebar_configs.delete_one({"page": page})
    
    return {"message": f"Sidebar for {page} reset to default"}
