"""
Executive Training Routes - PowerPoint generation for training modules
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/executive-training", tags=["Executive Training"])


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


class PresentationRequest(BaseModel):
    module_name: str
    module_id: Optional[str] = None


@router.get("/available-modules")
async def get_available_modules(request: Request):
    """Get list of available predefined presentation modules"""
    await require_admin(request)  # Verify admin access
    
    from services.pptx_generator import get_available_modules, MODULE_CONTENT
    
    modules = []
    seen = set()
    for key in get_available_modules():
        content = MODULE_CONTENT.get(key)
        if content and content["title"] not in seen:
            modules.append({
                "key": key,
                "title": content["title"],
                "subtitle": content.get("subtitle", ""),
                "slide_count": len(content.get("slides", [])) + 4  # +4 for title, agenda, summary, Q&A
            })
            seen.add(content["title"])
    
    return {"modules": modules}


@router.get("/generate/{module_key}")
async def generate_presentation(module_key: str, request: Request):
    """
    Generate a PowerPoint presentation for a specific module.
    
    Returns a downloadable PPTX file.
    """
    user = await require_admin(request)
    
    from services.pptx_generator import generate_module_presentation, MODULE_CONTENT
    
    # Check if module exists
    content = MODULE_CONTENT.get(module_key)
    if not content:
        # Try to generate from database module
        db = get_db()
        module = await db.training_modules.find_one({"module_id": module_key}, {"_id": 0})
        if module:
            module_name = module.get("name", module_key)
        else:
            module_name = module_key.replace("_", " ").title()
    else:
        module_name = content["title"]
    
    try:
        pptx_bytes = generate_module_presentation(module_key)
        
        # Log the download
        try:
            from server import audit_logger
            from middleware.security import get_client_ip
            await audit_logger.log(
                action="presentation_downloaded",
                user_id=user["user_id"],
                user_email=user.get("email"),
                ip_address=get_client_ip(request),
                details={
                    "resource_type": "presentation",
                    "module_key": module_key,
                    "module_name": module_name
                },
                severity="info",
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log presentation download: {e}")
        
        filename = f"{module_name.replace(' ', '_')}_Training.pptx"
        return StreamingResponse(
            io.BytesIO(pptx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Failed to generate presentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")


@router.post("/generate-custom")
async def generate_custom_presentation(data: PresentationRequest, request: Request):
    """
    Generate a custom PowerPoint presentation for a module from the database.
    """
    user = await require_admin(request)
    db = get_db()
    
    from services.pptx_generator import generate_module_presentation
    
    # Get module from database if ID provided
    module_name = data.module_name
    if data.module_id:
        module = await db.training_modules.find_one({"module_id": data.module_id}, {"_id": 0})
        if module:
            module_name = module.get("name", module_name)
    
    try:
        pptx_bytes = generate_module_presentation(module_name)
        
        # Log the download
        try:
            from server import audit_logger
            from middleware.security import get_client_ip
            await audit_logger.log(
                action="presentation_downloaded",
                user_id=user["user_id"],
                user_email=user.get("email"),
                ip_address=get_client_ip(request),
                details={
                    "resource_type": "presentation",
                    "module_id": data.module_id,
                    "module_name": module_name
                },
                severity="info",
                request=request
            )
        except Exception as e:
            logger.error(f"Failed to log presentation download: {e}")
        
        filename = f"{module_name.replace(' ', '_')}_Training.pptx"
        return StreamingResponse(
            io.BytesIO(pptx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Failed to generate custom presentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")


async def require_super_admin(request: Request) -> dict:
    """Require super admin access"""
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


class UploadedPresentation(BaseModel):
    name: str
    description: Optional[str] = ""
    module_key: str


@router.get("/uploaded")
async def get_uploaded_presentations(request: Request):
    """Get all uploaded custom presentations (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    presentations = await db.uploaded_presentations.find(
        {}, 
        {"_id": 0, "file_data": 0}  # Exclude file data from listing
    ).sort("created_at", -1).to_list(100)
    
    return {"presentations": presentations}


@router.post("/upload")
async def upload_presentation(request: Request):
    """Upload a custom PPTX presentation (super admin only)"""
    from fastapi import Form, UploadFile, File
    from datetime import datetime, timezone
    import uuid
    
    user = await require_super_admin(request)
    db = get_db()
    
    # Parse form data
    form = await request.form()
    file = form.get("file")
    name = form.get("name", "Custom Presentation")
    description = form.get("description", "")
    module_key = form.get("module_key", f"custom_{uuid.uuid4().hex[:8]}")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Validate file type
    if not file.filename.endswith('.pptx'):
        raise HTTPException(status_code=400, detail="Only PPTX files are allowed")
    
    # Read file content
    file_content = await file.read()
    
    # Check file size (max 50MB)
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    presentation_id = f"pres_{uuid.uuid4().hex[:12]}"
    
    presentation = {
        "presentation_id": presentation_id,
        "name": name,
        "description": description,
        "module_key": module_key,
        "filename": file.filename,
        "file_size": len(file_content),
        "file_data": file_content,
        "uploaded_by": user["user_id"],
        "uploaded_by_email": user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.uploaded_presentations.insert_one(presentation)
    
    return {
        "presentation_id": presentation_id,
        "name": name,
        "module_key": module_key,
        "message": "Presentation uploaded successfully"
    }


@router.get("/download-uploaded/{presentation_id}")
async def download_uploaded_presentation(presentation_id: str, request: Request):
    """Download an uploaded presentation"""
    await require_admin(request)
    db = get_db()
    
    presentation = await db.uploaded_presentations.find_one(
        {"presentation_id": presentation_id}
    )
    
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    return StreamingResponse(
        io.BytesIO(presentation["file_data"]),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f"attachment; filename={presentation['filename']}"}
    )


@router.delete("/uploaded/{presentation_id}")
async def delete_uploaded_presentation(presentation_id: str, request: Request):
    """Delete an uploaded presentation (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    result = await db.uploaded_presentations.delete_one({"presentation_id": presentation_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    return {"message": "Presentation deleted successfully"}
