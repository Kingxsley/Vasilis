"""
Custom Email Templates Routes - Visual email template builder
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/custom-email-templates", tags=["Custom Email Templates"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

def get_db():
    if db is None:
        from server import db as server_db
        return server_db
    return db

async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)

async def require_admin(request: Request):
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class CustomEmailTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    subject: str
    type: Optional[str] = "custom"  # training, notification, phishing, reminder
    html: str
    config: Optional[dict] = None  # Store visual builder config for future editing


@router.get("")
async def get_custom_email_templates(request: Request):
    """Get all custom email templates"""
    await require_admin(request)
    db = get_db()
    
    templates = await db.custom_email_templates.find({}, {"_id": 0}).to_list(100)
    
    return {"templates": templates}


@router.get("/{template_id}")
async def get_custom_email_template(template_id: str, request: Request):
    """Get a specific custom email template"""
    await require_admin(request)
    db = get_db()
    
    template = await db.custom_email_templates.find_one({"id": template_id}, {"_id": 0})
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template


@router.post("")
async def create_custom_email_template(data: CustomEmailTemplateCreate, request: Request):
    """Create a new custom email template"""
    user = await require_admin(request)
    db = get_db()
    
    template_id = f"email_{uuid.uuid4().hex[:12]}"
    
    template_doc = {
        "id": template_id,
        "name": data.name,
        "description": data.description or "",
        "subject": data.subject,
        "type": data.type or "custom",
        "html": data.html,
        "config": data.config,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.custom_email_templates.insert_one(template_doc)
    
    return {
        "id": template_id,
        "name": data.name,
        "description": data.description,
        "subject": data.subject,
        "type": data.type,
        "html": data.html,
        "config": data.config,
        "created_at": template_doc["created_at"]
    }


@router.put("/{template_id}")
async def update_custom_email_template(template_id: str, data: CustomEmailTemplateCreate, request: Request):
    """Update a custom email template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.custom_email_templates.update_one(
        {"id": template_id},
        {"$set": {
            "name": data.name,
            "description": data.description,
            "subject": data.subject,
            "type": data.type,
            "html": data.html,
            "config": data.config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated", "id": template_id}


@router.delete("/{template_id}")
async def delete_custom_email_template(template_id: str, request: Request):
    """Delete a custom email template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.custom_email_templates.delete_one({"id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}
