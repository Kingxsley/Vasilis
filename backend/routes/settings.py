from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import base64

router = APIRouter(prefix="/settings", tags=["Settings"])


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
    company_name: Optional[str] = "VasilisNetShield"
    tagline: Optional[str] = "Human + AI Powered Security Training"
    logo_url: Optional[str] = None  # Base64 data URL or external URL
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = "#D4A836"
    secondary_color: Optional[str] = "#0f3460"


class BrandingUpdate(BaseModel):
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


# ============== ROUTES ==============

@router.get("/branding")
async def get_branding():
    """Get branding settings (public endpoint)"""
    db = get_db()
    
    settings = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    
    if not settings:
        # Return defaults
        return {
            "company_name": "VasilisNetShield",
            "tagline": "Human + AI Powered Security Training",
            "logo_url": None,
            "favicon_url": None,
            "primary_color": "#D4A836",
            "secondary_color": "#0f3460"
        }
    
    return {
        "company_name": settings.get("company_name", "VasilisNetShield"),
        "tagline": settings.get("tagline", "Human + AI Powered Security Training"),
        "logo_url": settings.get("logo_url"),
        "favicon_url": settings.get("favicon_url"),
        "primary_color": settings.get("primary_color", "#D4A836"),
        "secondary_color": settings.get("secondary_color", "#0f3460")
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
    """Upload company logo"""
    user = await require_admin(request)
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: PNG, JPEG, SVG, WebP"
        )
    
    # Check file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 2MB")
    
    # Convert to base64 data URL
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    # Save to database
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "type": "branding",
                "logo_url": data_url,
                "logo_filename": file.filename,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["user_id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "Logo uploaded successfully",
        "logo_url": data_url
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
    """Upload favicon"""
    user = await require_admin(request)
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/png", "image/x-icon", "image/ico", "image/vnd.microsoft.icon"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: PNG, ICO"
        )
    
    # Check file size (max 500KB)
    contents = await file.read()
    if len(contents) > 500 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 500KB")
    
    # Convert to base64
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    await db.settings.update_one(
        {"type": "branding"},
        {
            "$set": {
                "type": "branding",
                "favicon_url": data_url,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["user_id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "Favicon uploaded successfully",
        "favicon_url": data_url
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
