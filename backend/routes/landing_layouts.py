"""
Landing Page Layout Editor Routes
Manage customizable landing page sections
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from models import UserRole

router = APIRouter(prefix="/landing-layouts", tags=["Landing Layouts"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============== MODELS ==============

class SectionContent(BaseModel):
    """Content for a section - varies by section type"""
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    image_url: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None  # For features, testimonials, etc.
    stats: Optional[List[Dict[str, Any]]] = None
    background_color: Optional[str] = None
    custom_html: Optional[str] = None


class LandingSection(BaseModel):
    section_id: str
    type: str  # hero, features, stats, testimonials, cta, faq, team, pricing, custom
    order: int
    visible: bool = True
    content: SectionContent


class LandingLayoutUpdate(BaseModel):
    sections: List[LandingSection]


class SectionCreate(BaseModel):
    type: str
    order: Optional[int] = None
    content: Optional[SectionContent] = None


# ============== ROUTES ==============

@router.get("")
async def get_landing_layout(request: Request):
    """Get the current landing page layout (public endpoint)"""
    db = get_db()
    
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    
    if not layout:
        # Return default layout
        return {
            "layout_id": "main",
            "sections": get_default_sections()
        }
    
    return layout


@router.get("/public")
async def get_public_landing_layout():
    """Get the landing page layout for public display (no auth required)"""
    db = get_db()
    
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    
    if not layout:
        return {
            "layout_id": "main",
            "sections": get_default_sections()
        }
    
    # Filter to only return visible sections
    visible_sections = [s for s in layout.get("sections", []) if s.get("visible", True)]
    visible_sections.sort(key=lambda s: s.get("order", 0))
    
    return {
        "layout_id": "main",
        "sections": visible_sections
    }


@router.put("")
async def update_landing_layout(data: LandingLayoutUpdate, request: Request):
    """Update the entire landing page layout"""
    await require_admin(request)
    db = get_db()
    
    layout_doc = {
        "layout_id": "main",
        "sections": [section.dict() for section in data.sections],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": layout_doc},
        upsert=True
    )
    
    return {"message": "Layout updated", "sections_count": len(data.sections)}


@router.post("/sections")
async def add_section(data: SectionCreate, request: Request):
    """Add a new section to the landing page"""
    await require_admin(request)
    db = get_db()
    
    # Get current layout
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    sections = layout.get("sections", []) if layout else []
    
    # Determine order
    order = data.order if data.order is not None else len(sections)
    
    # Create new section
    new_section = {
        "section_id": f"section_{uuid.uuid4().hex[:8]}",
        "type": data.type,
        "order": order,
        "visible": True,
        "content": data.content.dict() if data.content else get_default_content_for_type(data.type)
    }
    
    # Insert at correct position
    sections.append(new_section)
    # Reorder
    sections.sort(key=lambda s: s.get("order", 0))
    for i, s in enumerate(sections):
        s["order"] = i
    
    # Save
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": {"sections": sections, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return new_section


@router.patch("/sections/{section_id}")
async def update_section(section_id: str, content: SectionContent, request: Request):
    """Update a specific section"""
    await require_admin(request)
    db = get_db()
    
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    sections = layout.get("sections", [])
    found = False
    
    for section in sections:
        if section.get("section_id") == section_id:
            section["content"] = content.dict()
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Section not found")
    
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": {"sections": sections, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Section updated"}


@router.delete("/sections/{section_id}")
async def delete_section(section_id: str, request: Request):
    """Delete a section from the landing page"""
    await require_admin(request)
    db = get_db()
    
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    sections = [s for s in layout.get("sections", []) if s.get("section_id") != section_id]
    
    # Reorder remaining sections
    for i, s in enumerate(sections):
        s["order"] = i
    
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": {"sections": sections, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Section deleted"}


@router.post("/sections/reorder")
async def reorder_sections(section_ids: List[str], request: Request):
    """Reorder sections by providing section IDs in new order"""
    await require_admin(request)
    db = get_db()
    
    layout = await db.landing_layout.find_one({"layout_id": "main"}, {"_id": 0})
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    sections = layout.get("sections", [])
    section_map = {s["section_id"]: s for s in sections}
    
    reordered = []
    for i, sid in enumerate(section_ids):
        if sid in section_map:
            section_map[sid]["order"] = i
            reordered.append(section_map[sid])
    
    # Add any sections not in the list at the end
    for s in sections:
        if s["section_id"] not in section_ids:
            s["order"] = len(reordered)
            reordered.append(s)
    
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": {"sections": reordered, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Sections reordered"}


@router.patch("/sections/{section_id}/visibility")
async def toggle_section_visibility(section_id: str, visible: bool, request: Request):
    """Toggle section visibility"""
    await require_admin(request)
    db = get_db()
    
    result = await db.landing_layout.update_one(
        {"layout_id": "main", "sections.section_id": section_id},
        {"$set": {"sections.$.visible": visible, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    return {"message": f"Section visibility set to {visible}"}


@router.get("/section-types")
async def get_section_types():
    """Get available section types with descriptions"""
    return [
        {
            "type": "hero",
            "name": "Hero Banner",
            "description": "Main banner with headline, subtitle, and call-to-action buttons",
            "icon": "Zap"
        },
        {
            "type": "features",
            "name": "Features Grid",
            "description": "Display key features in a grid layout",
            "icon": "Grid3X3"
        },
        {
            "type": "stats",
            "name": "Statistics",
            "description": "Display key metrics and numbers",
            "icon": "BarChart3"
        },
        {
            "type": "testimonials",
            "name": "Testimonials",
            "description": "Customer testimonials and reviews",
            "icon": "Quote"
        },
        {
            "type": "cta",
            "name": "Call to Action",
            "description": "Conversion-focused section with button",
            "icon": "MousePointerClick"
        },
        {
            "type": "faq",
            "name": "FAQ",
            "description": "Frequently asked questions accordion",
            "icon": "HelpCircle"
        },
        {
            "type": "team",
            "name": "Team",
            "description": "Team members showcase",
            "icon": "Users"
        },
        {
            "type": "pricing",
            "name": "Pricing",
            "description": "Pricing plans comparison",
            "icon": "DollarSign"
        },
        {
            "type": "gallery",
            "name": "Image Gallery",
            "description": "Image showcase grid",
            "icon": "Images"
        },
        {
            "type": "text",
            "name": "Text Block",
            "description": "Simple text content section",
            "icon": "Type"
        },
        {
            "type": "custom",
            "name": "Custom HTML",
            "description": "Custom HTML content",
            "icon": "Code"
        }
    ]


@router.post("/reset-default")
async def reset_to_default(request: Request):
    """Reset landing page to default layout"""
    await require_admin(request)
    db = get_db()
    
    await db.landing_layout.update_one(
        {"layout_id": "main"},
        {"$set": {
            "sections": get_default_sections(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Layout reset to default"}


# ============== HELPERS ==============

def get_default_sections():
    """Get default landing page sections"""
    return [
        {
            "section_id": "section_hero",
            "type": "hero",
            "order": 0,
            "visible": True,
            "content": {
                "title": "Train Your Team to Defend Against Cyber Threats",
                "subtitle": "Human + AI Powered Security Training",
                "description": "Realistic phishing simulations, malicious ad detection, and social engineering scenarios. Build a security-aware workforce with expert-crafted and AI-enhanced training content.",
                "button_text": "Start Free Trial",
                "button_link": "/auth",
                "stats": [
                    {"value": "95%", "label": "Detection Rate"},
                    {"value": "10k+", "label": "Users Trained"},
                    {"value": "500+", "label": "Organizations"}
                ]
            }
        },
        {
            "section_id": "section_features",
            "type": "features",
            "order": 1,
            "visible": True,
            "content": {
                "title": "Comprehensive Security Training",
                "subtitle": "Three powerful modules designed to build real-world cybersecurity awareness",
                "items": [
                    {
                        "title": "Phishing Email Detection",
                        "description": "Learn to identify suspicious emails, fraudulent sender addresses, and malicious links through realistic simulations.",
                        "icon": "Mail",
                        "color": "#D4A836"
                    },
                    {
                        "title": "Malicious Ad Recognition",
                        "description": "Spot fake advertisements, clickbait, and potentially harmful ad content before they compromise your system.",
                        "icon": "MousePointerClick",
                        "color": "#FFB300"
                    },
                    {
                        "title": "Social Engineering Defense",
                        "description": "Recognize manipulation tactics including pretexting, baiting, and impersonation attempts.",
                        "icon": "Users",
                        "color": "#FF3B30"
                    }
                ]
            }
        },
        {
            "section_id": "section_platform",
            "type": "features",
            "order": 2,
            "visible": True,
            "content": {
                "title": "Enterprise-Ready Platform",
                "subtitle": "Manage multiple organizations, track progress, and deploy targeted campaigns",
                "items": [
                    {
                        "title": "Targeted Campaigns",
                        "description": "Create custom training campaigns for specific teams or departments.",
                        "icon": "Target",
                        "color": "#D4A836"
                    },
                    {
                        "title": "Real-Time Analytics",
                        "description": "Track completion rates, scores, and identify knowledge gaps.",
                        "icon": "BarChart3",
                        "color": "#00E676"
                    },
                    {
                        "title": "Expert + AI Content",
                        "description": "Human-crafted scenarios enhanced with AI for continuous learning.",
                        "icon": "Lock",
                        "color": "#FFB300"
                    }
                ]
            }
        },
        {
            "section_id": "section_cta",
            "type": "cta",
            "order": 3,
            "visible": True,
            "content": {
                "title": "Ready to Strengthen Your Security?",
                "description": "Join hundreds of organizations already using our platform to build a security-conscious workforce.",
                "button_text": "Start Training Today",
                "button_link": "/auth"
            }
        }
    ]


def get_default_content_for_type(section_type: str) -> dict:
    """Get default content for a section type"""
    defaults = {
        "hero": {
            "title": "Your Headline Here",
            "subtitle": "Subtitle text",
            "description": "Add your description here",
            "button_text": "Get Started",
            "button_link": "/auth"
        },
        "features": {
            "title": "Features",
            "subtitle": "What we offer",
            "items": [
                {"title": "Feature 1", "description": "Description", "icon": "Star", "color": "#D4A836"},
                {"title": "Feature 2", "description": "Description", "icon": "Shield", "color": "#00E676"},
                {"title": "Feature 3", "description": "Description", "icon": "Zap", "color": "#FFB300"}
            ]
        },
        "stats": {
            "title": "Our Impact",
            "stats": [
                {"value": "100+", "label": "Clients"},
                {"value": "99%", "label": "Success Rate"},
                {"value": "24/7", "label": "Support"}
            ]
        },
        "testimonials": {
            "title": "What Our Clients Say",
            "items": [
                {"quote": "Add testimonial here", "author": "Author Name", "role": "CEO, Company"}
            ]
        },
        "cta": {
            "title": "Ready to Get Started?",
            "description": "Join us today",
            "button_text": "Sign Up",
            "button_link": "/auth"
        },
        "faq": {
            "title": "Frequently Asked Questions",
            "items": [
                {"question": "Question 1?", "answer": "Answer 1"},
                {"question": "Question 2?", "answer": "Answer 2"}
            ]
        },
        "team": {
            "title": "Meet Our Team",
            "items": [
                {"name": "Team Member", "role": "Position", "image_url": ""}
            ]
        },
        "pricing": {
            "title": "Pricing Plans",
            "items": [
                {"name": "Basic", "price": "$9", "features": ["Feature 1", "Feature 2"]},
                {"name": "Pro", "price": "$29", "features": ["All Basic features", "Feature 3"]}
            ]
        },
        "gallery": {
            "title": "Gallery",
            "items": []
        },
        "text": {
            "title": "Section Title",
            "description": "Add your content here"
        },
        "custom": {
            "custom_html": "<div>Custom HTML content</div>"
        }
    }
    
    return defaults.get(section_type, {"title": "New Section"})
