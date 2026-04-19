"""
Navigation Menu Management Routes
Allows admins to add, edit, and remove custom navigation items
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/navigation", tags=["Navigation"])


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


async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# Available icons that can be used in navigation
AVAILABLE_ICONS = [
    "LayoutDashboard", "Building2", "Users", "BookOpen", "BarChart3", 
    "Mail", "Monitor", "Upload", "Award", "FileText", "Settings", 
    "Layout", "Crosshair", "GraduationCap", "Cog", "ShieldAlert", 
    "TrendingUp", "MessageSquare", "Image", "Search", "Globe", 
    "ExternalLink", "Link", "Home", "Folder", "Database", "Cloud",
    "Lock", "Key", "Bell", "Calendar", "Clock", "Star", "Heart",
    "Bookmark", "Flag", "Tag", "Map", "Navigation", "Compass",
    "Layers", "Grid", "List", "Table", "PieChart", "Activity",
    "Zap", "Target", "Briefcase", "CreditCard", "DollarSign",
    "Phone", "Video", "Music", "Camera", "Mic", "Headphones"
]

# Available sections to add items to
AVAILABLE_SECTIONS = [
    {"id": "main", "label": "Overview"},
    {"id": "management", "label": "Management"},
    {"id": "simulations", "label": "Simulations"},
    {"id": "content", "label": "Content"},
    {"id": "training", "label": "Training"},
    {"id": "settings", "label": "Settings"},
    {"id": "security", "label": "Security"},
]

# Available roles for visibility control
AVAILABLE_ROLES = [
    {"id": "super_admin", "label": "Super Admin"},
    {"id": "org_admin", "label": "Organization Admin"},
    {"id": "media_manager", "label": "Media Manager"},
    {"id": "trainee", "label": "Trainee"},
    {"id": "all", "label": "All Users"},
]


class NavItemCreate(BaseModel):
    label: str
    link_type: str  # 'internal', 'external', 'cms_page'
    path: str  # Internal path like '/dashboard' or external URL
    icon: str = "Link"
    section_id: str = "main"
    visible_to: List[str] = ["all"]  # Role IDs
    open_in_new_tab: bool = False
    sort_order: int = 100
    is_active: bool = True


class NavItemUpdate(BaseModel):
    label: Optional[str] = None
    link_type: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    section_id: Optional[str] = None
    visible_to: Optional[List[str]] = None
    open_in_new_tab: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/options")
async def get_navigation_options(request: Request):
    """Get available icons, sections, and roles for creating nav items"""
    await require_admin(request)
    
    db = get_db()
    
    # Get CMS pages that can be linked
    cms_pages = []
    try:
        pages = await db.pages.find(
            {"status": "published"},
            {"_id": 0, "page_id": 1, "title": 1, "slug": 1}
        ).to_list(100)
        cms_pages = [{"id": p["page_id"], "title": p["title"], "slug": p["slug"]} for p in pages]
    except Exception:
        pass
    
    return {
        "icons": AVAILABLE_ICONS,
        "sections": AVAILABLE_SECTIONS,
        "roles": AVAILABLE_ROLES,
        "cms_pages": cms_pages
    }


@router.get("")
async def get_custom_nav_items(request: Request):
    """Get all custom navigation items"""
    await require_admin(request)
    
    db = get_db()
    
    items = await db.navigation_items.find(
        {},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    
    return {"items": items}


@router.get("/public")
async def get_public_nav_items(request: Request):
    """Get navigation items visible to the current user, including published pages and CMS tiles"""
    user = await get_current_user(request)
    user_role = user.get("role", "trainee")
    
    db = get_db()
    
    # Get active custom navigation items
    items = await db.navigation_items.find(
        {
            "is_active": True,
            "$or": [
                {"visible_to": "all"},
                {"visible_to": user_role}
            ]
        },
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    
    # Fetch published pages with show_in_nav=true
    try:
        published_pages = await db.pages.find(
            {
                "is_published": True,
                "show_in_nav": True
            },
            {"_id": 0, "title": 1, "slug": 1, "page_type": 1}
        ).sort("title", 1).to_list(100)
        
        for page in published_pages:
            nav_item = {
                "item_id": f"page_{page['slug']}",
                "label": page["title"],
                "link_type": "internal",
                "path": f"/page/{page['slug']}",
                "icon": "FileText",
                "section_id": "content",
                "visible_to": ["all"],
                "open_in_new_tab": False,
                "sort_order": 45 + hash(page['slug']) % 10,
                "is_active": True,
                "is_dynamic_page": True
            }
            items.append(nav_item)
    except Exception as e:
        logger.warning(f"Failed to fetch pages for navigation: {e}")
    
    # Also fetch published CMS tiles
    try:
        cms_tiles = await db.cms_tiles.find(
            {"published": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(100)
        
        for tile in cms_tiles:
            if tile.get("route_type") == "external" and tile.get("external_url"):
                path = tile["external_url"]
                link_type = "external"
            elif tile.get("route_type") == "custom":
                path = f"/page/{tile['slug']}"
                link_type = "internal"
            else:
                path = f"/{tile['slug']}"
                link_type = "internal"
            
            nav_item = {
                "item_id": f"cms_{tile['tile_id']}",
                "label": tile["name"],
                "link_type": link_type,
                "path": path,
                "icon": tile.get("icon", "FileText"),
                "section_id": "content",
                "visible_to": ["all"],
                "open_in_new_tab": tile.get("route_type") == "external",
                "sort_order": 50 + tile.get("sort_order", 100),
                "is_active": True,
                "is_cms_tile": True
            }
            items.append(nav_item)
    except Exception as e:
        logger.warning(f"Failed to fetch CMS tiles for navigation: {e}")
    
    # Add blog link if there are published posts
    try:
        blog_count = await db.blog_posts.count_documents({"published": True})
        if blog_count > 0:
            items.append({
                "item_id": "blog_auto",
                "label": "Blog",
                "link_type": "internal",
                "path": "/blog",
                "icon": "BookOpen",
                "section_id": "content",
                "visible_to": ["all"],
                "open_in_new_tab": False,
                "sort_order": 40,
                "is_active": True,
                "is_auto_generated": True
            })
    except:
        pass
    
    return {"items": items, "user_role": user_role}


@router.post("")
async def create_nav_item(data: NavItemCreate, request: Request):
    """Create a new custom navigation item"""
    user = await require_super_admin(request)
    
    db = get_db()
    
    # Validate section
    valid_sections = [s["id"] for s in AVAILABLE_SECTIONS]
    if data.section_id not in valid_sections:
        raise HTTPException(status_code=400, detail=f"Invalid section. Must be one of: {valid_sections}")
    
    # Validate icon
    if data.icon not in AVAILABLE_ICONS:
        data.icon = "Link"  # Default fallback
    
    # Validate link type
    if data.link_type not in ["internal", "external", "cms_page"]:
        raise HTTPException(status_code=400, detail="Invalid link_type. Must be 'internal', 'external', or 'cms_page'")
    
    # For external links, ensure it starts with http
    if data.link_type == "external" and not data.path.startswith(("http://", "https://")):
        data.path = "https://" + data.path
    
    # For internal links, ensure it starts with /
    if data.link_type == "internal" and not data.path.startswith("/"):
        data.path = "/" + data.path
    
    item_id = f"nav_{uuid.uuid4().hex[:12]}"
    
    nav_item = {
        "item_id": item_id,
        "label": data.label,
        "link_type": data.link_type,
        "path": data.path,
        "icon": data.icon,
        "section_id": data.section_id,
        "visible_to": data.visible_to,
        "open_in_new_tab": data.open_in_new_tab,
        "sort_order": data.sort_order,
        "is_active": data.is_active,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_custom": True  # Mark as user-created item
    }
    
    await db.navigation_items.insert_one(nav_item)
    
    # Remove _id before returning
    nav_item.pop("_id", None)
    
    return nav_item


@router.patch("/{item_id}")
async def update_nav_item(item_id: str, data: NavItemUpdate, request: Request):
    """Update a custom navigation item"""
    await require_super_admin(request)
    
    db = get_db()
    
    # Check item exists
    existing = await db.navigation_items.find_one({"item_id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Navigation item not found")
    
    # Build update dict
    update_data = {}
    
    if data.label is not None:
        update_data["label"] = data.label
    if data.link_type is not None:
        update_data["link_type"] = data.link_type
    if data.path is not None:
        path = data.path
        if data.link_type == "external" and not path.startswith(("http://", "https://")):
            path = "https://" + path
        elif data.link_type == "internal" and not path.startswith("/"):
            path = "/" + path
        update_data["path"] = path
    if data.icon is not None:
        update_data["icon"] = data.icon if data.icon in AVAILABLE_ICONS else "Link"
    if data.section_id is not None:
        valid_sections = [s["id"] for s in AVAILABLE_SECTIONS]
        if data.section_id in valid_sections:
            update_data["section_id"] = data.section_id
    if data.visible_to is not None:
        update_data["visible_to"] = data.visible_to
    if data.open_in_new_tab is not None:
        update_data["open_in_new_tab"] = data.open_in_new_tab
    if data.sort_order is not None:
        update_data["sort_order"] = data.sort_order
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.navigation_items.update_one(
            {"item_id": item_id},
            {"$set": update_data}
        )
    
    # Return updated item
    updated = await db.navigation_items.find_one({"item_id": item_id}, {"_id": 0})
    return updated


@router.delete("/{item_id}")
async def delete_nav_item(item_id: str, request: Request):
    """Delete a custom navigation item"""
    await require_super_admin(request)
    
    db = get_db()
    
    result = await db.navigation_items.delete_one({"item_id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Navigation item not found")
    
    return {"message": "Navigation item deleted", "item_id": item_id}


@router.post("/reorder")
async def reorder_nav_items(items: List[dict], request: Request):
    """Reorder navigation items by updating their sort_order"""
    await require_super_admin(request)
    
    db = get_db()
    
    for item in items:
        if "item_id" in item and "sort_order" in item:
            await db.navigation_items.update_one(
                {"item_id": item["item_id"]},
                {"$set": {"sort_order": item["sort_order"]}}
            )
    
    return {"message": "Items reordered successfully"}
