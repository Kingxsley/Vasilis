"""
Sidebar Widgets System for CMS
Provides dynamic widgets that can be added to any page's sidebar
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/sidebar-widgets", tags=["Sidebar Widgets"])


def get_db():
    """Lazy import to avoid circular dependency"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    MEDIA_MANAGER = "media_manager"


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MEDIA_MANAGER]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class WidgetConfig(BaseModel):
    """Configuration for a specific widget instance"""
    widget_id: str = Field(default_factory=lambda: f"widget_{uuid.uuid4().hex[:12]}")
    widget_type: str  # recent_posts, upcoming_events, tags, newsletter, contact_cta, custom_rich_text
    title: Optional[str] = None
    enabled: bool = True
    order: int = 0
    
    # Widget-specific configuration
    config: Dict[str, Any] = Field(default_factory=dict)
    # Examples:
    # recent_posts: {"count": 5, "show_excerpt": true, "show_image": true}
    # upcoming_events: {"count": 3, "show_location": true}
    # tags: {"max_tags": 20, "min_frequency": 1}
    # newsletter: {"placeholder": "Enter email", "button_text": "Subscribe"}
    # contact_cta: {"button_text": "Contact Us", "button_url": "/contact"}
    # custom_rich_text: {"content": "<p>HTML content</p>"}


class PageSidebarConfig(BaseModel):
    """Sidebar configuration for a specific page"""
    page_slug: str  # Can be any CMS page slug or special pages like 'blog', 'news', etc.
    enabled: bool = True
    widgets: List[WidgetConfig] = Field(default_factory=list)
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


# Default widget configurations
DEFAULT_WIDGETS = {
    "recent_posts": {
        "title": "Recent Posts",
        "config": {
            "count": 5,
            "show_excerpt": True,
            "show_image": True,
            "show_date": True
        }
    },
    "upcoming_events": {
        "title": "Upcoming Events",
        "config": {
            "count": 3,
            "show_location": True,
            "show_date": True
        }
    },
    "tags": {
        "title": "Popular Tags",
        "config": {
            "max_tags": 20,
            "min_frequency": 1,
            "show_count": True
        }
    },
    "newsletter": {
        "title": "Newsletter",
        "config": {
            "placeholder": "Enter your email",
            "button_text": "Subscribe",
            "success_message": "Thanks for subscribing!",
            "description": "Get the latest security tips and updates."
        }
    },
    "contact_cta": {
        "title": "Get in Touch",
        "config": {
            "description": "Have questions? We're here to help.",
            "button_text": "Contact Us",
            "button_url": "/contact"
        }
    },
    "custom_rich_text": {
        "title": "Custom Content",
        "config": {
            "content": "<p>Add your custom HTML content here.</p>"
        }
    }
}


@router.get("/{page_slug}")
async def get_page_sidebar_widgets(page_slug: str):
    """Get sidebar widget configuration for a page (public endpoint)"""
    db = get_db()
    
    config = await db.sidebar_widget_configs.find_one({"page_slug": page_slug}, {"_id": 0})
    
    if not config:
        # Return empty config
        return {
            "page_slug": page_slug,
            "enabled": True,
            "widgets": []
        }
    
    return config


@router.post("/{page_slug}")
async def update_page_sidebar_widgets(
    page_slug: str,
    config: PageSidebarConfig,
    user: dict = Depends(require_admin)
):
    """Update sidebar widget configuration for a page"""
    db = get_db()
    
    config_dict = config.model_dump()
    config_dict["page_slug"] = page_slug
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    config_dict["updated_by"] = user["user_id"]
    
    await db.sidebar_widget_configs.update_one(
        {"page_slug": page_slug},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"message": f"Sidebar widgets for {page_slug} updated successfully", "config": config_dict}


@router.delete("/{page_slug}")
async def delete_page_sidebar_widgets(
    page_slug: str,
    user: dict = Depends(require_admin)
):
    """Delete sidebar widget configuration for a page"""
    db = get_db()
    
    result = await db.sidebar_widget_configs.delete_one({"page_slug": page_slug})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sidebar config not found")
    
    return {"message": f"Sidebar widgets for {page_slug} deleted successfully"}


@router.get("/defaults/list")
async def get_default_widgets():
    """Get list of available widget types with their default configurations"""
    return {
        "widgets": [
            {
                "type": "recent_posts",
                "label": "Recent Blog Posts",
                "description": "Display recent blog posts with thumbnails",
                "default_config": DEFAULT_WIDGETS["recent_posts"]
            },
            {
                "type": "upcoming_events",
                "label": "Upcoming Events",
                "description": "Show upcoming events with dates",
                "default_config": DEFAULT_WIDGETS["upcoming_events"]
            },
            {
                "type": "tags",
                "label": "Tag Cloud",
                "description": "Display popular content tags",
                "default_config": DEFAULT_WIDGETS["tags"]
            },
            {
                "type": "newsletter",
                "label": "Newsletter Signup",
                "description": "Email newsletter subscription form",
                "default_config": DEFAULT_WIDGETS["newsletter"]
            },
            {
                "type": "contact_cta",
                "label": "Contact Call-to-Action",
                "description": "Button to contact or request info",
                "default_config": DEFAULT_WIDGETS["contact_cta"]
            },
            {
                "type": "custom_rich_text",
                "label": "Custom HTML",
                "description": "Custom rich text / HTML content",
                "default_config": DEFAULT_WIDGETS["custom_rich_text"]
            }
        ]
    }


@router.get("/render/{page_slug}")
async def render_page_sidebar_widgets(page_slug: str):
    """Render sidebar widgets for a page with actual data"""
    db = get_db()
    
    # Get widget configuration
    config = await db.sidebar_widget_configs.find_one({"page_slug": page_slug}, {"_id": 0})
    
    if not config or not config.get("enabled"):
        return {"widgets": []}
    
    rendered_widgets = []
    
    for widget in config.get("widgets", []):
        if not widget.get("enabled"):
            continue
        
        widget_type = widget.get("widget_type")
        widget_config = widget.get("config", {})
        
        rendered_widget = {
            "widget_id": widget.get("widget_id"),
            "widget_type": widget_type,
            "title": widget.get("title"),
            "order": widget.get("order", 0),
            "data": {}
        }
        
        # Fetch actual data based on widget type
        if widget_type == "recent_posts":
            count = widget_config.get("count", 5)
            posts = await db.blog_posts.find(
                {"published": True},
                {"_id": 0, "title": 1, "slug": 1, "excerpt": 1, "featured_image": 1, "created_at": 1}
            ).sort("created_at", -1).limit(count).to_list(count)
            rendered_widget["data"]["posts"] = posts
            rendered_widget["data"]["config"] = widget_config
        
        elif widget_type == "upcoming_events":
            count = widget_config.get("count", 3)
            # Placeholder - will be implemented when events system is added
            rendered_widget["data"]["events"] = []
            rendered_widget["data"]["config"] = widget_config
        
        elif widget_type == "tags":
            # Aggregate tags from blog posts
            pipeline = [
                {"$match": {"published": True, "tags": {"$exists": True, "$ne": []}}},
                {"$unwind": "$tags"},
                {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gte": widget_config.get("min_frequency", 1)}}},
                {"$sort": {"count": -1}},
                {"$limit": widget_config.get("max_tags", 20)}
            ]
            tags = await db.blog_posts.aggregate(pipeline).to_list(100)
            rendered_widget["data"]["tags"] = [{"name": t["_id"], "count": t["count"]} for t in tags]
            rendered_widget["data"]["config"] = widget_config
        
        elif widget_type == "newsletter":
            rendered_widget["data"]["config"] = widget_config
        
        elif widget_type == "contact_cta":
            rendered_widget["data"]["config"] = widget_config
        
        elif widget_type == "custom_rich_text":
            rendered_widget["data"]["content"] = widget_config.get("content", "")
        
        rendered_widgets.append(rendered_widget)
    
    # Sort by order
    rendered_widgets.sort(key=lambda w: w["order"])
    
    return {"widgets": rendered_widgets}

