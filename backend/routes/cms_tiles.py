"""
CMS Tiles Management Routes
Allows admins to create, edit, publish/unpublish CMS tiles/pages
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cms-tiles", tags=["CMS Tiles"])


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
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


# Default tiles that come with the system
DEFAULT_TILES = [
    {
        "tile_id": "tile_blog",
        "name": "Blog",
        "slug": "blog",
        "icon": "FileText",
        "description": "Company blog and articles",
        "is_system": True,
        "published": True,
        "sort_order": 1,
        "route_type": "internal",  # internal means handled by React Router
        "custom_content": None
    },
    {
        "tile_id": "tile_news",
        "name": "News",
        "slug": "news",
        "icon": "Newspaper",
        "description": "Latest news and updates",
        "is_system": True,
        "published": True,
        "sort_order": 2,
        "route_type": "internal",
        "custom_content": None
    },
    {
        "tile_id": "tile_videos",
        "name": "Videos",
        "slug": "videos",
        "icon": "Video",
        "description": "Training videos and webinars",
        "is_system": True,
        "published": True,
        "sort_order": 3,
        "route_type": "internal",
        "custom_content": None
    },
    {
        "tile_id": "tile_about",
        "name": "About",
        "slug": "about",
        "icon": "Info",
        "description": "About us page",
        "is_system": True,
        "published": True,
        "sort_order": 4,
        "route_type": "internal",
        "custom_content": None
    }
]


class TileCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    icon: str = "FileText"
    description: Optional[str] = ""
    published: bool = True
    sort_order: int = 100
    route_type: str = "custom"  # 'internal', 'external', 'custom'
    external_url: Optional[str] = None
    custom_content: Optional[str] = None  # HTML content for custom pages


class TileUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    published: Optional[bool] = None
    sort_order: Optional[int] = None
    route_type: Optional[str] = None
    external_url: Optional[str] = None
    custom_content: Optional[str] = None


@router.get("")
async def get_all_tiles(request: Request, include_unpublished: bool = False):
    """Get all CMS tiles"""
    db = get_db()
    
    # Check if tiles collection exists, if not initialize with defaults
    count = await db.cms_tiles.count_documents({})
    if count == 0:
        # Initialize with default tiles
        for tile in DEFAULT_TILES:
            tile["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_tiles.insert_one(tile.copy())
    
    query = {}
    if not include_unpublished:
        query["published"] = True
    
    tiles = await db.cms_tiles.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return {"tiles": tiles}


@router.get("/public")
async def get_public_tiles():
    """Get published CMS tiles (no auth required) for landing page navigation"""
    db = get_db()
    
    # Initialize if needed
    count = await db.cms_tiles.count_documents({})
    if count == 0:
        for tile in DEFAULT_TILES:
            tile["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_tiles.insert_one(tile.copy())
    
    # Only return published tiles
    tiles = await db.cms_tiles.find(
        {"published": True}, 
        {"_id": 0, "tile_id": 1, "name": 1, "slug": 1, "icon": 1, "route_type": 1, "external_url": 1, "is_system": 1}
    ).sort("sort_order", 1).to_list(100)
    
    return {"tiles": tiles}


@router.get("/admin")
async def get_all_tiles_admin(request: Request):
    """Get all CMS tiles for admin (includes unpublished)"""
    await require_super_admin(request)
    db = get_db()
    
    # Initialize if needed
    count = await db.cms_tiles.count_documents({})
    if count == 0:
        for tile in DEFAULT_TILES:
            tile["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_tiles.insert_one(tile.copy())
    
    tiles = await db.cms_tiles.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return {"tiles": tiles}


@router.get("/{slug}")
async def get_tile_by_slug(slug: str, request: Request):
    """Get a specific tile by slug"""
    db = get_db()
    
    tile = await db.cms_tiles.find_one({"slug": slug}, {"_id": 0})
    if not tile:
        raise HTTPException(status_code=404, detail="Tile not found")
    
    # If unpublished, return 404 for public access
    if not tile.get("published", False):
        # Check if user is admin
        try:
            user = await get_current_user(request)
            if user.get("role") != "super_admin":
                raise HTTPException(status_code=404, detail="Page not found")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=404, detail="Page not found")
    
    return tile


@router.post("")
async def create_tile(data: TileCreate, request: Request):
    """Create a new CMS tile"""
    user = await require_super_admin(request)
    db = get_db()
    
    # Generate slug if not provided
    slug = data.slug or slugify(data.name)
    
    # Check for duplicate slug
    existing = await db.cms_tiles.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="A tile with this slug already exists")
    
    tile_id = f"tile_{uuid.uuid4().hex[:12]}"
    
    tile = {
        "tile_id": tile_id,
        "name": data.name,
        "slug": slug,
        "icon": data.icon,
        "description": data.description,
        "is_system": False,
        "published": data.published,
        "sort_order": data.sort_order,
        "route_type": data.route_type,
        "external_url": data.external_url,
        "custom_content": data.custom_content,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cms_tiles.insert_one(tile)
    tile.pop("_id", None)
    
    return tile


@router.patch("/{tile_id}")
async def update_tile(tile_id: str, data: TileUpdate, request: Request):
    """Update a CMS tile"""
    await require_super_admin(request)
    db = get_db()
    
    existing = await db.cms_tiles.find_one({"tile_id": tile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tile not found")
    
    update_data = {}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.slug is not None:
        # Check for duplicate slug
        dup = await db.cms_tiles.find_one({"slug": data.slug, "tile_id": {"$ne": tile_id}})
        if dup:
            raise HTTPException(status_code=400, detail="A tile with this slug already exists")
        update_data["slug"] = data.slug
    if data.icon is not None:
        update_data["icon"] = data.icon
    if data.description is not None:
        update_data["description"] = data.description
    if data.published is not None:
        update_data["published"] = data.published
    if data.sort_order is not None:
        update_data["sort_order"] = data.sort_order
    if data.route_type is not None:
        update_data["route_type"] = data.route_type
    if data.external_url is not None:
        update_data["external_url"] = data.external_url
    if data.custom_content is not None:
        update_data["custom_content"] = data.custom_content
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.cms_tiles.update_one(
            {"tile_id": tile_id},
            {"$set": update_data}
        )
    
    updated = await db.cms_tiles.find_one({"tile_id": tile_id}, {"_id": 0})
    return updated


@router.patch("/{tile_id}/publish")
async def toggle_tile_publish(tile_id: str, request: Request):
    """Toggle publish status of a tile"""
    await require_super_admin(request)
    db = get_db()
    
    existing = await db.cms_tiles.find_one({"tile_id": tile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tile not found")
    
    new_status = not existing.get("published", False)
    
    await db.cms_tiles.update_one(
        {"tile_id": tile_id},
        {"$set": {"published": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.cms_tiles.find_one({"tile_id": tile_id}, {"_id": 0})
    return updated


@router.delete("/{tile_id}")
async def delete_tile(tile_id: str, request: Request):
    """Delete a custom CMS tile (system tiles cannot be deleted)"""
    await require_super_admin(request)
    db = get_db()
    
    existing = await db.cms_tiles.find_one({"tile_id": tile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tile not found")
    
    if existing.get("is_system", False):
        raise HTTPException(status_code=400, detail="System tiles cannot be deleted. You can unpublish them instead.")
    
    await db.cms_tiles.delete_one({"tile_id": tile_id})
    
    return {"message": "Tile deleted", "tile_id": tile_id}


@router.post("/reorder")
async def reorder_tiles(items: List[dict], request: Request):
    """Reorder tiles by updating their sort_order"""
    await require_super_admin(request)
    db = get_db()
    
    for item in items:
        if "tile_id" in item and "sort_order" in item:
            await db.cms_tiles.update_one(
                {"tile_id": item["tile_id"]},
                {"$set": {"sort_order": item["sort_order"]}}
            )
    
    return {"message": "Tiles reordered successfully"}
