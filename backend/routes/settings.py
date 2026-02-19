from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import base64
import io
from PIL import Image

router = APIRouter(prefix="/settings", tags=["Settings"])


def optimize_image(image_data: bytes, max_size: tuple = (800, 800), quality: int = 85) -> bytes:
    """
    Optimize an image for web display.
    - Resizes to fit within max_size while maintaining aspect ratio
    - Compresses with specified quality
    - Converts to WebP for better compression (falls back to PNG for transparency)
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if no transparency needed
        if img.mode == 'RGBA':
            # Check if image has actual transparency
            if img.split()[3].getextrema()[0] < 255:
                # Has transparency - keep RGBA
                pass
            else:
                # No transparency - convert to RGB
                img = img.convert('RGB')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if larger than max_size
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save to bytes
        output = io.BytesIO()
        if img.mode == 'RGBA':
            img.save(output, format='PNG', optimize=True)
            mime_type = 'image/png'
        else:
            img.save(output, format='WEBP', quality=quality, optimize=True)
            mime_type = 'image/webp'
        
        return output.getvalue(), mime_type
    except Exception as e:
        print(f"Image optimization failed: {e}")
        return image_data, 'image/png'


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


# ============== MODELS ==============

class BrandingSettings(BaseModel):
    company_name: Optional[str] = "Vasilis NetShield"
    tagline: Optional[str] = "Human + AI Powered Security Training"
    logo_url: Optional[str] = None  # Base64 data URL or external URL
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = "#D4A836"
    secondary_color: Optional[str] = "#0f3460"
    text_color: Optional[str] = "#E8DDB5"
    heading_color: Optional[str] = "#FFFFFF"
    accent_color: Optional[str] = "#D4A836"
    # Navigation menu visibility
    show_blog: Optional[bool] = True
    show_videos: Optional[bool] = True
    show_news: Optional[bool] = True
    show_about: Optional[bool] = True
    # Footer settings
    footer_copyright: Optional[str] = None  # e.g., "© 2024 Vasilis NetShield. All rights reserved."
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None


class BrandingUpdate(BaseModel):
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    text_color: Optional[str] = None
    heading_color: Optional[str] = None
    accent_color: Optional[str] = None
    show_blog: Optional[bool] = None
    show_videos: Optional[bool] = None
    show_news: Optional[bool] = None
    show_about: Optional[bool] = None
    # Footer settings
    footer_copyright: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None


# ============== ROUTES ==============

@router.get("/branding")
async def get_branding():
    """Get branding settings (public endpoint)"""
    db = get_db()
    
    settings = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    
    if not settings:
        # Return defaults
        return {
            "company_name": "Vasilis NetShield",
            "tagline": "Human + AI Powered Security Training",
            "logo_url": None,
            "favicon_url": None,
            "primary_color": "#D4A836",
            "secondary_color": "#0f3460",
            "text_color": "#E8DDB5",
            "heading_color": "#FFFFFF",
            "accent_color": "#D4A836",
            "show_blog": True,
            "show_videos": True,
            "show_news": True,
            "show_about": True,
            "footer_copyright": None,
            "social_facebook": None,
            "social_twitter": None,
            "social_linkedin": None,
            "social_instagram": None,
            "social_youtube": None
        }
    
    return {
        "company_name": settings.get("company_name", "Vasilis NetShield"),
        "tagline": settings.get("tagline", "Human + AI Powered Security Training"),
        "logo_url": settings.get("logo_url"),
        "favicon_url": settings.get("favicon_url"),
        "primary_color": settings.get("primary_color", "#D4A836"),
        "secondary_color": settings.get("secondary_color", "#0f3460"),
        "text_color": settings.get("text_color", "#E8DDB5"),
        "heading_color": settings.get("heading_color", "#FFFFFF"),
        "accent_color": settings.get("accent_color", "#D4A836"),
        "show_blog": settings.get("show_blog", True),
        "show_videos": settings.get("show_videos", True),
        "show_news": settings.get("show_news", True),
        "show_about": settings.get("show_about", True),
        "footer_copyright": settings.get("footer_copyright"),
        "social_facebook": settings.get("social_facebook"),
        "social_twitter": settings.get("social_twitter"),
        "social_linkedin": settings.get("social_linkedin"),
        "social_instagram": settings.get("social_instagram"),
        "social_youtube": settings.get("social_youtube")
    }


@router.patch("/branding")
async def update_branding(data: BrandingUpdate, request: Request):
    """Update branding settings"""
    user = await require_admin(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["type"] = "branding"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.settings.update_one(
        {"type": "branding"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_branding()


@router.post("/branding/logo")
async def upload_logo(request: Request, file: UploadFile = File(...)):
    """Upload company logo with automatic optimization"""
    await require_admin(request)
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: PNG, JPEG, SVG, WebP"
        )
    
    # Check file size (max 5MB before optimization)
    contents = await file.read()
    original_size = len(contents)
    if original_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    
    # Skip optimization for SVG files
    if file.content_type == "image/svg+xml":
        base64_data = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_data}"
        optimized_size = original_size
    else:
        # Optimize the image - logos should be max 400x400 for good quality
        optimized_contents, mime_type = optimize_image(contents, max_size=(400, 400), quality=90)
        optimized_size = len(optimized_contents)
        
        # Convert to base64 data URL
        base64_data = base64.b64encode(optimized_contents).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
    
    # Save to database
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "type": "branding",
                "logo_url": data_url,
                "logo_filename": file.filename,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Calculate savings
    savings_percent = round((1 - optimized_size / original_size) * 100, 1) if original_size > 0 else 0
    
    return {
        "message": "Logo uploaded and optimized successfully",
        "logo_url": data_url,
        "original_size": original_size,
        "optimized_size": optimized_size,
        "savings_percent": savings_percent
    }


@router.delete("/branding/logo")
async def delete_logo(request: Request):
    """Remove company logo"""
    user = await require_admin(request)
    db = get_db()
    
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "logo_url": None,
                "logo_filename": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["user_id"]
            }
        }
    )
    
    return {"message": "Logo removed"}


@router.post("/branding/favicon")
async def upload_favicon(request: Request, file: UploadFile = File(...)):
    """Upload favicon with automatic optimization"""
    await require_admin(request)
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/png", "image/x-icon", "image/ico", "image/vnd.microsoft.icon", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: PNG, ICO, SVG"
        )
    
    # Check file size (max 1MB before optimization)
    contents = await file.read()
    original_size = len(contents)
    if original_size > 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 1MB")
    
    # Skip optimization for SVG and ICO files
    if file.content_type in ["image/svg+xml", "image/x-icon", "image/ico", "image/vnd.microsoft.icon"]:
        base64_data = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_data}"
        optimized_size = original_size
    else:
        # Optimize - favicons should be 64x64 max
        optimized_contents, mime_type = optimize_image(contents, max_size=(64, 64), quality=90)
        optimized_size = len(optimized_contents)
        base64_data = base64.b64encode(optimized_contents).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
    
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "type": "branding",
                "favicon_url": data_url,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    savings_percent = round((1 - optimized_size / original_size) * 100, 1) if original_size > 0 else 0
    
    return {
        "message": "Favicon uploaded and optimized successfully",
        "favicon_url": data_url,
        "original_size": original_size,
        "optimized_size": optimized_size,
        "savings_percent": savings_percent
    }


@router.delete("/branding/favicon")
async def delete_favicon(request: Request):
    """Remove favicon"""
    user = await require_admin(request)
    db = get_db()
    
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "favicon_url": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["user_id"]
            }
        }
    )
    
    return {"message": "Favicon removed"}


# ============== PASSWORD POLICY SETTINGS ==============

class PasswordPolicySettings(BaseModel):
    password_expiry_days: Optional[int] = 0  # 0 = no expiry
    expiry_reminder_days: Optional[int] = 7  # Days before expiry to send reminder
    force_change_on_next_login: Optional[bool] = False
    
@router.get("/password-policy")
async def get_password_policy(request: Request):
    """Get password policy settings"""
    await require_admin(request)
    db = get_db()
    
    settings = await db.settings.find_one({"type": "password_policy"}, {"_id": 0})
    
    return {
        "password_expiry_days": settings.get("password_expiry_days", 0) if settings else 0,
        "expiry_reminder_days": settings.get("expiry_reminder_days", 7) if settings else 7,
        "force_change_on_next_login": settings.get("force_change_on_next_login", False) if settings else False
    }


@router.patch("/password-policy")
async def update_password_policy(data: PasswordPolicySettings, request: Request):
    """Update password policy settings"""
    user = await require_admin(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["type"] = "password_policy"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.settings.update_one(
        {"type": "password_policy"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_password_policy(request)


# ============== SEO SETTINGS ==============

class SEOSettings(BaseModel):
    site_title: Optional[str] = None
    site_description: Optional[str] = None
    site_keywords: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    twitter_title: Optional[str] = None
    twitter_description: Optional[str] = None
    twitter_image: Optional[str] = None
    robots_txt: Optional[str] = None
    google_analytics_id: Optional[str] = None
    google_search_console: Optional[str] = None
    canonical_url: Optional[str] = None


@router.get("/seo")
async def get_seo_settings(request: Request):
    """Get SEO settings"""
    await require_admin(request)
    db = get_db()
    
    settings = await db.settings.find_one({"type": "seo"}, {"_id": 0})
    
    if not settings:
        return {
            "site_title": "Vasilis NetShield | Security Training Platform",
            "site_description": "Human + AI Powered Security Training. Protect your organization with realistic phishing simulations.",
            "site_keywords": "cybersecurity training, phishing simulation, security awareness",
            "og_title": "Vasilis NetShield | Security Training Platform",
            "og_description": "Human + AI Powered Security Training",
            "og_image": "",
            "twitter_title": "Vasilis NetShield",
            "twitter_description": "Human + AI Powered Security Training",
            "twitter_image": "",
            "robots_txt": "User-agent: *\nAllow: /\n\nSitemap: https://vasilisnetshield.net/sitemap.xml",
            "google_analytics_id": "",
            "google_search_console": "",
            "canonical_url": "https://vasilisnetshield.net"
        }
    
    # Remove internal fields
    settings.pop("type", None)
    settings.pop("updated_at", None)
    settings.pop("updated_by", None)
    
    return settings


@router.post("/seo")
async def update_seo_settings(data: SEOSettings, request: Request):
    """Update SEO settings"""
    user = await require_admin(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["type"] = "seo"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.settings.update_one(
        {"type": "seo"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "SEO settings saved"}


@router.get("/seo/public")
async def get_public_seo_settings():
    """Get public SEO settings (no auth required) - for GA and meta tags"""
    db = get_db()
    
    settings = await db.settings.find_one({"type": "seo"}, {"_id": 0})
    
    if not settings:
        return {
            "site_title": "Vasilis NetShield | Security Training Platform",
            "site_description": "Human + AI Powered Security Training",
            "google_analytics_id": None
        }
    
    # Only return public-safe fields
    return {
        "site_title": settings.get("site_title"),
        "site_description": settings.get("site_description"),
        "site_keywords": settings.get("site_keywords"),
        "og_title": settings.get("og_title"),
        "og_description": settings.get("og_description"),
        "og_image": settings.get("og_image"),
        "twitter_title": settings.get("twitter_title"),
        "twitter_description": settings.get("twitter_description"),
        "twitter_image": settings.get("twitter_image"),
        "canonical_url": settings.get("canonical_url"),
        "google_analytics_id": settings.get("google_analytics_id"),
        "google_search_console": settings.get("google_search_console")
    }
