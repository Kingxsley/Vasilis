from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import base64
import io
import uuid
from PIL import Image

router = APIRouter(prefix="/media", tags=["Media"])


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


def optimize_image(image_data: bytes, max_size: tuple = (1200, 1200), quality: int = 85) -> tuple:
    """Optimize an image for web display."""
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if no transparency needed
        if img.mode == 'RGBA':
            if img.split()[3].getextrema()[0] < 255:
                pass  # Has transparency - keep RGBA
            else:
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


class MediaItem(BaseModel):
    media_id: str
    filename: str
    mime_type: str
    size: int
    data_url: str
    category: Optional[str] = "general"
    alt_text: Optional[str] = None
    created_at: str
    created_by: str


@router.get("")
async def list_media(request: Request, category: Optional[str] = None):
    """List all media items"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if category:
        query["category"] = category
    
    media_items = await db.media.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"media": media_items}


@router.post("/upload")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    category: Optional[str] = Form("general"),
    alt_text: Optional[str] = Form(None)
):
    """Upload a new media file with automatic optimization"""
    user = await require_admin(request)
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: PNG, JPEG, SVG, WebP, GIF"
        )
    
    # Read file contents
    contents = await file.read()
    original_size = len(contents)
    
    # Check file size (max 10MB before optimization)
    if original_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB")
    
    # Optimize image (skip for SVG and GIF)
    if file.content_type in ["image/svg+xml", "image/gif"]:
        base64_data = base64.b64encode(contents).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_data}"
        optimized_size = original_size
        mime_type = file.content_type
    else:
        optimized_contents, mime_type = optimize_image(contents)
        optimized_size = len(optimized_contents)
        base64_data = base64.b64encode(optimized_contents).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
    
    # Generate unique ID
    media_id = str(uuid.uuid4())[:8]
    
    # Create media record
    media_item = {
        "media_id": media_id,
        "filename": file.filename,
        "mime_type": mime_type,
        "original_size": original_size,
        "size": optimized_size,
        "data_url": data_url,
        "category": category,
        "alt_text": alt_text or file.filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.media.insert_one(media_item)
    
    # Remove _id for response
    media_item.pop("_id", None)
    
    # Calculate savings
    savings_percent = round((1 - optimized_size / original_size) * 100, 1) if original_size > 0 else 0
    
    return {
        "message": "Media uploaded successfully",
        "media": media_item,
        "savings_percent": savings_percent
    }


@router.get("/{media_id}")
async def get_media(media_id: str, request: Request):
    """Get a specific media item"""
    await require_admin(request)
    db = get_db()
    
    media = await db.media.find_one({"media_id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return media


@router.patch("/{media_id}")
async def update_media(media_id: str, request: Request, alt_text: str = Form(None), category: str = Form(None)):
    """Update media metadata"""
    await require_admin(request)
    db = get_db()
    
    update_data = {}
    if alt_text is not None:
        update_data["alt_text"] = alt_text
    if category is not None:
        update_data["category"] = category
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.media.update_one(
        {"media_id": media_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"message": "Media updated"}


@router.delete("/{media_id}")
async def delete_media(media_id: str, request: Request):
    """Delete a media item"""
    await require_admin(request)
    db = get_db()
    
    result = await db.media.delete_one({"media_id": media_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"message": "Media deleted"}
