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
        update_doc["platform_image"] = content.platform_image
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
