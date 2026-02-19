from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/pages", tags=["Page Content"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    from models import UserRole
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Models
class HeroContent(BaseModel):
    badge_text: Optional[str] = "Human + AI Powered Security Training"
    title_line1: Optional[str] = "Train Your Team to"
    title_highlight: Optional[str] = "Defend"
    title_line2: Optional[str] = "Against Cyber Threats"
    subtitle: Optional[str] = "Realistic phishing simulations, malicious ad detection, and social engineering scenarios. Build a security-aware workforce with expert-crafted and AI-enhanced training content."
    cta_primary_text: Optional[str] = "Start Free Trial"
    cta_primary_link: Optional[str] = "/auth"
    cta_secondary_text: Optional[str] = "Watch Demo"
    cta_secondary_link: Optional[str] = ""


class StatItem(BaseModel):
    value: str
    label: str


class FeatureItem(BaseModel):
    title: str
    description: str
    bullet_points: List[str]
    icon: Optional[str] = "Mail"  # Mail, MousePointerClick, Users
    color: Optional[str] = "#D4A836"


class LandingPageContent(BaseModel):
    hero: Optional[HeroContent] = None
    stats: Optional[List[StatItem]] = None
    features_title: Optional[str] = "Comprehensive Security Training"
    features_subtitle: Optional[str] = "Three powerful modules designed to build real-world cybersecurity awareness"
    features: Optional[List[FeatureItem]] = None
    platform_image: Optional[str] = None  # Base64 or URL for the platform section image
    footer_text: Optional[str] = None


# Default content
DEFAULT_LANDING_CONTENT = {
    "page_id": "landing",
    "hero": {
        "badge_text": "Human + AI Powered Security Training",
        "title_line1": "Train Your Team to",
        "title_highlight": "Defend",
        "title_line2": "Against Cyber Threats",
        "subtitle": "Realistic phishing simulations, malicious ad detection, and social engineering scenarios. Build a security-aware workforce with expert-crafted and AI-enhanced training content.",
        "cta_primary_text": "Start Free Trial",
        "cta_primary_link": "/auth",
        "cta_secondary_text": "Watch Demo",
        "cta_secondary_link": ""
    },
    "stats": [
        {"value": "95%", "label": "Detection Rate"},
        {"value": "10k+", "label": "Users Trained"},
        {"value": "500+", "label": "Organizations"}
    ],
    "features_title": "Comprehensive Security Training",
    "features_subtitle": "Three powerful modules designed to build real-world cybersecurity awareness",
    "features": [
        {
            "title": "Phishing Email Detection",
            "description": "Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.",
            "bullet_points": ["Spoofed domain recognition", "Urgency tactic awareness", "Link verification skills"],
            "icon": "Mail",
            "color": "#D4A836"
        },
        {
            "title": "Malicious Ad Recognition",
            "description": "Spot fake advertisements, clickbait, and potentially harmful ad content before they compromise your system.",
            "bullet_points": ["Clickbait identification", "Fake download detection", "Ad network awareness"],
            "icon": "MousePointerClick",
            "color": "#FFB300"
        },
        {
            "title": "Social Engineering Defense",
            "description": "Recognize manipulation tactics including pretexting, baiting, and impersonation attempts.",
            "bullet_points": ["Pretexting scenarios", "Authority exploitation", "Emotional manipulation"],
            "icon": "Users",
            "color": "#FF3B30"
        }
    ],
    "footer_text": "© 2024 Vasilis NetShield. All rights reserved."
}


@router.get("/landing")
async def get_landing_page_content():
    """Get landing page content (public)"""
    db = get_db()
    
    content = await db.page_content.find_one({"page_id": "landing"}, {"_id": 0})
    
    if not content:
        # Return default content if none exists
        return DEFAULT_LANDING_CONTENT
    
    return content


@router.put("/landing")
async def update_landing_page_content(content: LandingPageContent, request: Request):
    """Update landing page content (admin only)"""
    await require_admin(request)
    db = get_db()
    
    update_doc = {
        "page_id": "landing",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if content.hero:
        update_doc["hero"] = content.hero.dict()
    if content.stats:
        update_doc["stats"] = [s.dict() for s in content.stats]
    if content.features_title:
        update_doc["features_title"] = content.features_title
    if content.features_subtitle:
        update_doc["features_subtitle"] = content.features_subtitle
    if content.features:
        update_doc["features"] = [f.dict() for f in content.features]
    if content.platform_image is not None:
        # Allow empty string to clear the image, or a valid base64/URL
        update_doc["platform_image"] = content.platform_image if content.platform_image else None
    if content.footer_text:
        update_doc["footer_text"] = content.footer_text
    
    # Upsert the content
    await db.page_content.update_one(
        {"page_id": "landing"},
        {"$set": update_doc},
        upsert=True
    )
    
    # Return updated content
    updated = await db.page_content.find_one({"page_id": "landing"}, {"_id": 0})
    return updated


@router.post("/landing/reset")
async def reset_landing_page_content(request: Request):
    """Reset landing page to default content (admin only)"""
    await require_admin(request)
    db = get_db()
    
    await db.page_content.update_one(
        {"page_id": "landing"},
        {"$set": {**DEFAULT_LANDING_CONTENT, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Landing page reset to defaults", "content": DEFAULT_LANDING_CONTENT}


# ============== CUSTOM PAGE BUILDER ==============

class PageBlock(BaseModel):
    block_id: Optional[str] = None
    type: str  # text, heading, button, image, form, divider, cards, hero
    content: dict  # Block-specific content
    order: int = 0


class CustomPageCreate(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    page_type: str = "custom"  # custom, contact, event, info
    blocks: List[PageBlock] = []
    show_in_nav: bool = False
    nav_section: str = "main"
    is_published: bool = False


class CustomPageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    page_type: Optional[str] = None
    blocks: Optional[List[PageBlock]] = None
    show_in_nav: Optional[bool] = None
    nav_section: Optional[str] = None
    is_published: Optional[bool] = None


import uuid


@router.get("/custom")
async def list_custom_pages(
    request: Request,
    include_unpublished: bool = False
):
    """List all custom pages"""
    db = get_db()
    
    query = {}
    
    # If not authenticated or requesting only published, filter by published
    try:
        await get_current_user(request)
        if not include_unpublished:
            query["is_published"] = True
    except Exception:
        query["is_published"] = True
    
    pages = await db.custom_pages.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return {"pages": pages, "total": len(pages)}


@router.post("/custom")
async def create_custom_page(data: CustomPageCreate, request: Request):
    """Create a new custom page"""
    await require_admin(request)
    db = get_db()
    
    # Validate slug is unique
    slug = data.slug.lower().strip().replace(" ", "-")
    existing = await db.custom_pages.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail="A page with this slug already exists")
    
    # Generate block IDs
    blocks = []
    for i, block in enumerate(data.blocks):
        block_dict = block.dict()
        block_dict["block_id"] = block.block_id or f"block_{uuid.uuid4().hex[:8]}"
        block_dict["order"] = i
        blocks.append(block_dict)
    
    page_id = f"page_{uuid.uuid4().hex[:12]}"
    page_doc = {
        "page_id": page_id,
        "title": data.title,
        "slug": slug,
        "description": data.description,
        "page_type": data.page_type,
        "blocks": blocks,
        "show_in_nav": data.show_in_nav,
        "nav_section": data.nav_section,
        "is_published": data.is_published,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.custom_pages.insert_one(page_doc)
    
    return {
        "message": "Page created successfully",
        "page_id": page_id,
        "slug": slug
    }


@router.get("/custom/{slug}")
async def get_custom_page(slug: str, request: Request = None):
    """Get a custom page by slug (public for published pages)"""
    db = get_db()
    
    page = await db.custom_pages.find_one({"slug": slug.lower()}, {"_id": 0})
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Check if user has access to unpublished pages
    if not page.get("is_published"):
        try:
            await require_admin(request)
        except Exception:
            raise HTTPException(status_code=404, detail="Page not found")
    
    return page


@router.patch("/custom/{page_id}")
async def update_custom_page(page_id: str, data: CustomPageUpdate, request: Request):
    """Update a custom page"""
    await require_admin(request)
    db = get_db()
    
    page = await db.custom_pages.find_one({"page_id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.title is not None:
        update_doc["title"] = data.title
    if data.slug is not None:
        new_slug = data.slug.lower().strip().replace(" ", "-")
        # Check if new slug is unique
        existing = await db.custom_pages.find_one({"slug": new_slug, "page_id": {"$ne": page_id}})
        if existing:
            raise HTTPException(status_code=400, detail="A page with this slug already exists")
        update_doc["slug"] = new_slug
    if data.description is not None:
        update_doc["description"] = data.description
    if data.page_type is not None:
        update_doc["page_type"] = data.page_type
    if data.blocks is not None:
        blocks = []
        for i, block in enumerate(data.blocks):
            block_dict = block.dict()
            block_dict["block_id"] = block.block_id or f"block_{uuid.uuid4().hex[:8]}"
            block_dict["order"] = i
            blocks.append(block_dict)
        update_doc["blocks"] = blocks
    if data.show_in_nav is not None:
        update_doc["show_in_nav"] = data.show_in_nav
    if data.nav_section is not None:
        update_doc["nav_section"] = data.nav_section
    if data.is_published is not None:
        update_doc["is_published"] = data.is_published
    
    await db.custom_pages.update_one({"page_id": page_id}, {"$set": update_doc})
    
    updated = await db.custom_pages.find_one({"page_id": page_id}, {"_id": 0})
    return updated


@router.delete("/custom/{page_id}")
async def delete_custom_page(page_id: str, request: Request):
    """Delete a custom page"""
    await require_admin(request)
    db = get_db()
    
    result = await db.custom_pages.delete_one({"page_id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {"message": "Page deleted successfully"}


@router.get("/custom/{page_id}/preview")
async def preview_custom_page(page_id: str, request: Request):
    """Get page preview (admin only, works for unpublished pages)"""
    await require_admin(request)
    db = get_db()
    
    page = await db.custom_pages.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return page


# Block type templates for the page builder
@router.get("/block-templates")
async def get_block_templates(request: Request):
    """Get available block templates for the page builder"""
    await require_admin(request)
    
    return {
        "templates": [
            {
                "type": "heading",
                "name": "Heading",
                "icon": "Type",
                "default_content": {
                    "text": "Section Title",
                    "level": "h2",
                    "align": "left"
                }
            },
            {
                "type": "text",
                "name": "Text Block",
                "icon": "FileText",
                "default_content": {
                    "text": "Enter your text here...",
                    "align": "left"
                }
            },
            {
                "type": "button",
                "name": "Button",
                "icon": "MousePointerClick",
                "default_content": {
                    "text": "Click Here",
                    "url": "#",
                    "style": "primary",
                    "open_new_tab": False
                }
            },
            {
                "type": "image",
                "name": "Image",
                "icon": "Image",
                "default_content": {
                    "url": "",
                    "alt": "Image description",
                    "caption": ""
                }
            },
            {
                "type": "divider",
                "name": "Divider",
                "icon": "Minus",
                "default_content": {
                    "style": "line"
                }
            },
            {
                "type": "hero",
                "name": "Hero Section",
                "icon": "Layout",
                "default_content": {
                    "title": "Welcome",
                    "subtitle": "Your subtitle here",
                    "background_color": "#0f0f15",
                    "button_text": "Get Started",
                    "button_url": "#"
                }
            },
            {
                "type": "contact_form",
                "name": "Contact Form",
                "icon": "Mail",
                "default_content": {
                    "title": "Contact Us",
                    "fields": ["name", "email", "message"],
                    "submit_text": "Send Message",
                    "success_message": "Thank you for your message!"
                }
            },
            {
                "type": "event_registration",
                "name": "Event Registration",
                "icon": "Calendar",
                "default_content": {
                    "title": "Register for Event",
                    "event_name": "Security Workshop",
                    "event_date": "",
                    "event_location": "",
                    "fields": ["name", "email", "company"],
                    "button_text": "Register Now"
                }
            },
            {
                "type": "cards",
                "name": "Card Grid",
                "icon": "LayoutGrid",
                "default_content": {
                    "cards": [
                        {"title": "Card 1", "description": "Description 1", "icon": "Shield"},
                        {"title": "Card 2", "description": "Description 2", "icon": "Lock"},
                        {"title": "Card 3", "description": "Description 3", "icon": "Key"}
                    ],
                    "columns": 3
                }
            }
        ]
    }
