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
