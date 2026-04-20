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
    from shared.database import get_db as _get_db
    return _get_db()


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"


async def get_current_user(request: Request) -> dict:
    from shared.database import get_current_user_from_request
    return await get_current_user_from_request(request)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def optimize_image(image_data: bytes, content_type: str, max_size: tuple = (1600, 1600), quality: int = 82) -> tuple:
    """Optimize an image for web display.

    - JPEG/PNG/WebP: downscale to max_size, convert to WebP (85% quality) for
      big wins on photos; preserve PNG when alpha channel is actually used.
    - GIFs: preserve animation. Passes through all frames, strips metadata,
      reduces to max 800x800 if larger (keeps animation).
    - SVG: passthrough (vector).

    Returns (optimized_bytes, mime_type).
    """
    try:
        if content_type == "image/svg+xml":
            return image_data, content_type

        if content_type == "image/gif":
            # Preserve animation but downscale if huge
            img = Image.open(io.BytesIO(image_data))
            if not getattr(img, "is_animated", False):
                # Static GIF — treat as a regular image
                img = img.convert("RGBA" if "A" in img.mode else "RGB")
            frames = []
            durations = []
            try:
                while True:
                    frame = img.copy()
                    frame.thumbnail((800, 800), Image.Resampling.LANCZOS)
                    frames.append(frame)
                    durations.append(img.info.get("duration", 100))
                    img.seek(img.tell() + 1)
            except EOFError:
                pass
            out = io.BytesIO()
            if len(frames) > 1:
                frames[0].save(
                    out,
                    format="GIF",
                    save_all=True,
                    append_images=frames[1:],
                    duration=durations,
                    loop=img.info.get("loop", 0),
                    optimize=True,
                    disposal=2,
                )
            else:
                frames[0].save(out, format="GIF", optimize=True)
            return out.getvalue(), "image/gif"

        img = Image.open(io.BytesIO(image_data))

        # Preserve alpha only when actually used
        has_alpha = False
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            alpha = img.split()[-1]
            has_alpha = alpha.getextrema()[0] < 255
            if not has_alpha:
                img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        output = io.BytesIO()
        if has_alpha:
            # WebP handles alpha beautifully and is much smaller than PNG
            img.save(output, format="WEBP", quality=quality, method=6)
            mime_type = "image/webp"
        else:
            img.save(output, format="WEBP", quality=quality, method=6)
            mime_type = "image/webp"
        return output.getvalue(), mime_type
    except Exception as e:
        print(f"Image optimization failed: {e}")
        return image_data, content_type or "image/png"


def make_thumbnail(image_data: bytes, content_type: str, max_size: tuple = (400, 400)) -> tuple:
    """Create a small WebP thumbnail (strips animation for GIFs)."""
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA") if "A" in img.mode else img.convert("RGB")
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=70, method=6)
        return out.getvalue(), "image/webp"
    except Exception:
        return image_data, content_type


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
    """Upload a single image. Auto-optimizes (JPEG/PNG/WebP → WebP, GIFs preserve animation)."""
    user = await require_admin(request)
    db = get_db()

    item = await _upload_one(file, category, alt_text, user)
    await db.media.insert_one({**item})
    item.pop("_id", None)
    savings = round((1 - item["size"] / item["original_size"]) * 100, 1) if item["original_size"] > 0 else 0
    return {"message": "Media uploaded successfully", "media": item, "savings_percent": savings}


@router.post("/upload-batch")
async def upload_media_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form("general"),
):
    """Upload multiple images at once. Each file is optimized independently.

    Returns {uploaded: [...], failed: [{filename, error}], total, ok, errors}.
    """
    user = await require_admin(request)
    db = get_db()

    uploaded = []
    failed = []
    for file in files:
        try:
            item = await _upload_one(file, category, None, user)
            await db.media.insert_one({**item})
            item.pop("_id", None)
            uploaded.append(item)
        except HTTPException as he:
            failed.append({"filename": getattr(file, "filename", "?"), "error": he.detail})
        except Exception as e:
            failed.append({"filename": getattr(file, "filename", "?"), "error": str(e)})

    return {
        "uploaded": uploaded,
        "failed": failed,
        "total": len(files),
        "ok": len(uploaded),
        "errors": len(failed),
    }


async def _upload_one(file: UploadFile, category: Optional[str], alt_text: Optional[str], user: dict) -> dict:
    """Shared single-file upload helper. Raises HTTPException on bad input."""
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Allowed: PNG, JPEG, SVG, WebP, GIF")

    contents = await file.read()
    original_size = len(contents)
    if original_size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 20MB")

    # Optimize — always, including GIFs (preserves animation)
    optimized_contents, mime_type = optimize_image(contents, file.content_type)
    optimized_size = len(optimized_contents)

    # Generate thumbnail (small WebP, strips GIF animation for grid previews)
    thumb_contents, thumb_mime = make_thumbnail(contents, file.content_type)

    base64_data = base64.b64encode(optimized_contents).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_data}"
    thumb_b64 = base64.b64encode(thumb_contents).decode("utf-8")
    thumb_url = f"data:{thumb_mime};base64,{thumb_b64}"

    media_id = str(uuid.uuid4())[:8]
    return {
        "media_id": media_id,
        "filename": file.filename,
        "mime_type": mime_type,
        "original_mime_type": file.content_type,
        "original_size": original_size,
        "size": optimized_size,
        "data_url": data_url,
        "thumb_url": thumb_url,
        "category": category,
        "alt_text": alt_text or file.filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
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
