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
    # Phase 2: visibility — who can see this page? Multi-select. Default public.
    # Valid entries: "public", "user", "trainee", "org_admin", "super_admin"
    auth_levels: List[str] = ["public"]


class CustomPageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    page_type: Optional[str] = None
    blocks: Optional[List[PageBlock]] = None
    show_in_nav: Optional[bool] = None
    nav_section: Optional[str] = None
    is_published: Optional[bool] = None
    auth_levels: Optional[List[str]] = None


import uuid
from auth_levels import AuthLevel, user_meets_any_level


VALID_AUTH_LEVELS = {lvl.value for lvl in AuthLevel}


def _normalize_auth_levels(raw) -> List[str]:
    """Clean + validate an auth_levels list. Default to ['public'] if empty."""
    if not raw:
        return [AuthLevel.PUBLIC.value]
    out = []
    seen = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        item = item.strip().lower()
        if item in VALID_AUTH_LEVELS and item not in seen:
            out.append(item)
            seen.add(item)
    if not out:
        return [AuthLevel.PUBLIC.value]
    # If 'public' is present, it dominates (anyone is allowed).
    if AuthLevel.PUBLIC.value in out:
        return [AuthLevel.PUBLIC.value]
    return out


@router.get("/custom")
async def list_custom_pages(
    request: Request,
    include_unpublished: bool = False
):
    """List all custom pages honoring auth_levels visibility."""
    db = get_db()

    query = {}
    current_user = None

    # If not authenticated or requesting only published, filter by published
    try:
        current_user = await get_current_user(request)
        if not include_unpublished:
            query["is_published"] = True
    except Exception:
        query["is_published"] = True

    pages = await db.custom_pages.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    # Filter by auth_levels visibility (Phase 2)
    user_role = (current_user or {}).get("role")
    visible = []
    for p in pages:
        levels = p.get("auth_levels") or [AuthLevel.PUBLIC.value]
        if user_meets_any_level(user_role, levels):
            visible.append(p)

    return {"pages": visible, "total": len(visible)}


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
        "auth_levels": _normalize_auth_levels(data.auth_levels),
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
    """Get a custom page by slug.

    Visibility rules (Phase 2):
      - Unpublished pages: only visible to admins (unchanged).
      - Published pages honor the `auth_levels` list. If the current user
        doesn't satisfy any of the levels, we 404 (not 403) to avoid
        leaking the existence of private pages.
    """
    db = get_db()

    page = await db.custom_pages.find_one({"slug": slug.lower()}, {"_id": 0})

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # --- current user (may be None) -----------------------------------
    current_user = None
    try:
        current_user = await get_current_user(request)
    except Exception:
        current_user = None
    user_role = (current_user or {}).get("role")

    # --- unpublished: admin only --------------------------------------
    if not page.get("is_published"):
        try:
            await require_admin(request)
        except Exception:
            raise HTTPException(status_code=404, detail="Page not found")
        return page

    # --- published: auth_levels gate ----------------------------------
    auth_levels = page.get("auth_levels") or [AuthLevel.PUBLIC.value]
    if not user_meets_any_level(user_role, auth_levels):
        # 404 (not 403) to hide existence from unauthorized callers.
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
    if data.auth_levels is not None:
        update_doc["auth_levels"] = _normalize_auth_levels(data.auth_levels)
    
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
            },
            {
                "type": "blog_list",
                "name": "Blog Posts (dynamic)",
                "icon": "FileText",
                "default_content": {
                    "items_per_page": 9,
                    "columns": 3,
                    "layout": "grid",
                    "category_filter": "",
                    "tag_filter": "",
                    "sort": "newest",
                    "show_date": True,
                    "show_author": True,
                    "show_excerpt": True,
                    "show_search": True,
                    "featured_first": False
                }
            },
            {
                "type": "news_feed",
                "name": "News Feed (dynamic)",
                "icon": "Newspaper",
                "default_content": {
                    "source": "mixed",
                    "items_per_page": 9,
                    "columns": 3,
                    "category_filter": "",
                    "tag_filter": "",
                    "sort": "newest",
                    "show_date": True,
                    "show_author": True,
                    "show_excerpt": True,
                    "show_source_badge": True
                }
            }
        ]
    }


# ============================================================================
# Page Preset Templates + Reserved-Slug Seeder
# ============================================================================

# Presets keyed by page_type. When the admin creates a new PageBuilder page
# with one of these types, the frontend will pre-populate `blocks` with these
# starter sections so they're not staring at an empty canvas.
PAGE_PRESETS = {
    "news": [
        {"type": "hero", "content": {
            "title": "News & Insights",
            "subtitle": "Our updates and curated industry news — all in one place.",
            "button_text": "",
            "button_url": "",
            "background_color": "#0f0f15",
        }},
        {"type": "news_feed", "content": {
            "source": "mixed",
            "items_per_page": 9,
            "columns": 3,
            "category_filter": "",
            "tag_filter": "",
            "sort": "newest",
            "show_date": True,
            "show_author": True,
            "show_excerpt": True,
            "show_source_badge": True,
        }},
    ],
    "about": [
        {"type": "hero", "content": {
            "title": "About Us",
            "subtitle": "Our mission, our team, and why we do what we do.",
            "button_text": "Get in touch",
            "button_url": "/contact",
            "background_color": "#0f0f15",
        }},
        {"type": "heading", "content": {"text": "Our Mission", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "Write a paragraph about your company mission here.", "align": "left"}},
        {"type": "divider", "content": {"style": "line"}},
        {"type": "cards", "content": {
            "columns": 3,
            "cards": [
                {"title": "Innovation", "description": "Constantly improving our platform.", "icon": "Shield"},
                {"title": "Trust", "description": "Security and privacy first.",            "icon": "Lock"},
                {"title": "Community", "description": "We grow with our customers.",         "icon": "Key"},
            ],
        }},
    ],
    "contact": [
        {"type": "heading", "content": {"text": "Contact Us", "level": "h1", "align": "center"}},
        {"type": "text", "content": {"text": "We'd love to hear from you. Fill out the form below and we'll get back to you within one business day.", "align": "center"}},
        {"type": "contact_form", "content": {
            "title": "Send us a message",
            "fields": ["name", "email", "message"],
            "submit_text": "Send Message",
            "success_message": "Thank you for your message!",
        }},
    ],
    "landing": [
        {"type": "hero", "content": {
            "title": "Your product, reimagined",
            "subtitle": "A short, punchy value proposition that sells your solution.",
            "button_text": "Get Started",
            "button_url": "/auth",
            "background_color": "#0f0f15",
        }},
        {"type": "heading", "content": {"text": "Why choose us?", "level": "h2", "align": "center"}},
        {"type": "cards", "content": {
            "columns": 3,
            "cards": [
                {"title": "Fast",   "description": "Deploy in minutes, not weeks.",        "icon": "Shield"},
                {"title": "Secure", "description": "Enterprise-grade security baked in.",  "icon": "Lock"},
                {"title": "Loved",  "description": "Trusted by thousands of teams.",       "icon": "Key"},
            ],
        }},
    ],
    "blog": [
        {"type": "hero", "content": {
            "title": "Blog",
            "subtitle": "Insights and updates from our team.",
            "button_text": "",
            "button_url": "",
            "background_color": "#0f0f15",
        }},
        {"type": "blog_list", "content": {
            "items_per_page": 9,
            "columns": 3,
            "layout": "grid",
            "category_filter": "",
            "tag_filter": "",
            "sort": "newest",
            "show_date": True,
            "show_author": True,
            "show_excerpt": True,
            "show_search": True,
            "featured_first": False,
        }},
    ],
    "privacy-policy": [
        {"type": "heading", "content": {"text": "Privacy Policy", "level": "h1", "align": "left"}},
        {"type": "text", "content": {"text": "Last updated: " + datetime.now(timezone.utc).strftime("%B %d, %Y") + "\n\nThis Privacy Policy describes how we collect, use, and protect your personal information when you use our website and services.", "align": "left"}},
        {"type": "heading", "content": {"text": "1. Information We Collect", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "We collect information you provide directly (such as when you create an account or contact us) and information collected automatically (such as usage data, device information, and cookies).", "align": "left"}},
        {"type": "heading", "content": {"text": "2. How We Use Your Information", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "We use your information to:\n• Provide and improve our services\n• Communicate with you\n• Ensure security and prevent fraud\n• Comply with legal obligations", "align": "left"}},
        {"type": "heading", "content": {"text": "3. Sharing Your Information", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "We do not sell your personal information. We may share your information with trusted service providers, when required by law, or to protect our rights.", "align": "left"}},
        {"type": "heading", "content": {"text": "4. Your Rights", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "You have the right to access, correct, delete, or export your personal data. You can also object to certain processing activities. Contact us to exercise these rights.", "align": "left"}},
        {"type": "heading", "content": {"text": "5. Cookies", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "We use cookies to enhance your experience. See our Cookie Policy for details about the categories we use and how to manage your preferences.", "align": "left"}},
        {"type": "heading", "content": {"text": "6. Contact Us", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "For privacy-related inquiries, please contact us at privacy@yourcompany.com.", "align": "left"}},
    ],
    "cookie-policy": [
        {"type": "heading", "content": {"text": "Cookie Policy", "level": "h1", "align": "left"}},
        {"type": "text", "content": {"text": "Last updated: " + datetime.now(timezone.utc).strftime("%B %d, %Y") + "\n\nThis Cookie Policy explains what cookies are, which cookies we use, and how you can manage your preferences.", "align": "left"}},
        {"type": "heading", "content": {"text": "What are cookies?", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how you use it.", "align": "left"}},
        {"type": "heading", "content": {"text": "Categories we use", "level": "h2", "align": "left"}},
        {"type": "cards", "content": {
            "columns": 3,
            "cards": [
                {"title": "Essential",  "description": "Required for core functionality like authentication and security. Cannot be disabled.", "icon": "Shield"},
                {"title": "Analytics",  "description": "Help us understand how visitors use our site so we can improve performance and features.",        "icon": "Lock"},
                {"title": "Marketing",  "description": "Used to show relevant content and measure the effectiveness of campaigns.",                          "icon": "Key"},
            ],
        }},
        {"type": "heading", "content": {"text": "Managing your preferences", "level": "h2", "align": "left"}},
        {"type": "text", "content": {"text": "You can change your cookie preferences at any time by clicking the 'Cookie Settings' link in the footer. You can also block cookies through your browser settings.", "align": "left"}},
    ],
}


@router.get("/presets")
async def list_presets(request: Request):
    """Return the starter block templates, keyed by page_type."""
    await require_admin(request)
    return {"presets": PAGE_PRESETS}


@router.post("/seed-reserved")
async def seed_reserved_pages(request: Request):
    """Seed draft PageBuilder pages for reserved slugs (blog, news).

    Idempotent: skips slugs that already exist. Default state:
      - is_published: False (admin must publish to go live)
      - show_in_nav: True so they appear in navigation auto-sync
      - auth_levels: ['public']
      - blocks: populated from PAGE_PRESETS for the matching page_type
    Returns {created: [...], skipped: [...]}.
    """
    await require_admin(request)
    db = get_db()

    reserved = [
        ("blog", "Blog", "blog"),
        ("news", "News", "news"),
        ("privacy-policy", "Privacy Policy", "privacy-policy"),
        ("cookie-policy", "Cookie Policy", "cookie-policy"),
    ]
    created = []
    skipped = []
    for slug, title, page_type in reserved:
        existing = await db.custom_pages.find_one({"slug": slug})
        if existing:
            skipped.append(slug)
            continue
        presets = PAGE_PRESETS.get(page_type, [])
        blocks = []
        for i, b in enumerate(presets):
            blocks.append({
                "block_id": f"block_{uuid.uuid4().hex[:8]}",
                "type": b["type"],
                "content": b["content"],
                "order": i,
            })
        # Privacy/cookie policy pages don't belong in the main nav by default
        show_in_nav = slug not in ("privacy-policy", "cookie-policy")
        page_doc = {
            "page_id": f"page_{uuid.uuid4().hex[:12]}",
            "title": title,
            "slug": slug,
            "description": f"Reserved system page for /{slug}. Customize via Page Builder.",
            "page_type": page_type,
            "blocks": blocks,
            "show_in_nav": show_in_nav,
            "nav_section": "header",
            "is_published": False,
            "is_system": True,
            "auth_levels": ["public"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.custom_pages.insert_one(page_doc)
        created.append(slug)

    return {"created": created, "skipped": skipped}


@router.post("/{page_id}/reset-to-preset")
async def reset_page_to_preset(page_id: str, request: Request):
    """Reset a reserved page's blocks back to the latest preset.

    Useful when presets evolve (e.g., new dynamic blocks) and admins want to
    pick up the new defaults without rebuilding manually. Only touches blocks
    — preserves title/slug/show_in_nav/published flags/sidebar_config.
    """
    await require_admin(request)
    db = get_db()

    page = await db.custom_pages.find_one({"page_id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    page_type = page.get("page_type") or page.get("slug")
    presets = PAGE_PRESETS.get(page_type)
    if not presets:
        raise HTTPException(status_code=400, detail=f"No preset defined for page_type='{page_type}'")

    blocks = []
    for i, b in enumerate(presets):
        blocks.append({
            "block_id": f"block_{uuid.uuid4().hex[:8]}",
            "type": b["type"],
            "content": b["content"],
            "order": i,
        })

    await db.custom_pages.update_one(
        {"page_id": page_id},
        {"$set": {
            "blocks": blocks,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    updated = await db.custom_pages.find_one({"page_id": page_id}, {"_id": 0})
    return {"message": "Page reset to preset", "page": updated}
