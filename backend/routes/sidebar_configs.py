"""
Sidebar Configuration Management
Manages reusable sidebar configurations that can be assigned to multiple pages
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/sidebar-configs", tags=["Sidebar Configs"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "org_admin", "media_manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class WidgetConfig(BaseModel):
    widget_id: str
    widget_type: str
    title: Optional[str] = None
    enabled: bool = True
    order: int = 0
    config: Dict[str, Any] = {}


class SidebarConfigCreate(BaseModel):
    name: str
    description: Optional[str] = None
    widgets: List[WidgetConfig] = []


class SidebarConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    widgets: Optional[List[WidgetConfig]] = None


@router.get("")
async def get_sidebar_configs(user: dict = Depends(require_admin)):
    """Get all sidebar configurations"""
    db = get_db()
    
    configs = await db.sidebar_configs.find({}, {"_id": 0}).to_list(100)
    
    return configs


@router.get("/public/{config_slug}")
async def get_sidebar_config_public(config_slug: str):
    """Public endpoint — fetch sidebar config for rendering on public pages.

    No auth required. Only returns the enabled widgets. Used by
    PageBuilder-overridden public pages to render their attached sidebar.
    """
    db = get_db()

    config = await db.sidebar_configs.find_one({"page_slug": config_slug}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Sidebar config not found")

    # Filter only enabled widgets and sort by order
    widgets = [w for w in (config.get("widgets") or []) if w.get("enabled", True)]
    widgets.sort(key=lambda w: w.get("order", 0))
    config["widgets"] = widgets
    return config


@router.get("/{config_slug}")
async def get_sidebar_config(config_slug: str, user: dict = Depends(require_admin)):
    """Get a specific sidebar configuration"""
    db = get_db()
    
    config = await db.sidebar_configs.find_one({"page_slug": config_slug}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="Sidebar config not found")
    
    return config


@router.post("")
async def create_sidebar_config(data: SidebarConfigCreate, user: dict = Depends(require_admin)):
    """Create a new sidebar configuration"""
    db = get_db()
    
    # Generate slug from name
    import re
    slug = data.name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug[:50]
    
    # Check if slug already exists
    existing = await db.sidebar_configs.find_one({"page_slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Sidebar config with slug '{slug}' already exists")
    
    config_doc = {
        "page_slug": slug,
        "name": data.name,
        "description": data.description,
        "widgets": [w.model_dump() for w in data.widgets],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.sidebar_configs.insert_one(config_doc)
    config_doc.pop("_id", None)

    return {"message": "Sidebar config created", "page_slug": slug, "config": config_doc}


@router.patch("/{config_slug}")
async def update_sidebar_config(
    config_slug: str,
    data: SidebarConfigUpdate,
    user: dict = Depends(require_admin)
):
    """Update a sidebar configuration"""
    db = get_db()
    
    existing = await db.sidebar_configs.find_one({"page_slug": config_slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Sidebar config not found")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.widgets is not None:
        update_data["widgets"] = [w.model_dump() for w in data.widgets]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.sidebar_configs.update_one(
        {"page_slug": config_slug},
        {"$set": update_data}
    )
    
    return {"message": "Sidebar config updated", "page_slug": config_slug}


@router.delete("/{config_slug}")
async def delete_sidebar_config(config_slug: str, user: dict = Depends(require_admin)):
    """Delete a sidebar configuration"""
    db = get_db()
    
    result = await db.sidebar_configs.delete_one({"page_slug": config_slug})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sidebar config not found")
    
    # Also remove references from pages
    await db.pages.update_many(
        {"sidebar_config": config_slug},
        {"$set": {"sidebar_config": None}}
    )
    
    return {"message": "Sidebar config deleted", "page_slug": config_slug}
