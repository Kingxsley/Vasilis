"""
Alert Templates Routes - Custom awareness page templates
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/alert-templates", tags=["Alert Templates"])

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

async def require_admin(request: Request):
    from server import get_current_user
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class AlertTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    html: str


class AlertTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    html: str
    preview: str
    isCustom: bool
    created_at: str


@router.get("")
async def get_alert_templates(request: Request):
    """Get all custom alert templates"""
    await require_admin(request)
    db = get_db()
    
    templates = await db.alert_templates.find({}, {"_id": 0}).to_list(100)
    
    # Add isCustom flag and preview
    for t in templates:
        t["isCustom"] = True
        t["preview"] = f"📝 Custom - {t.get('description', 'Custom template')[:50]}"
    
    return {"templates": templates}


@router.post("")
async def create_alert_template(data: AlertTemplateCreate, request: Request):
    """Create a new alert template"""
    user = await require_admin(request)
    db = get_db()
    
    template_id = f"alert_{uuid.uuid4().hex[:12]}"
    
    template_doc = {
        "id": template_id,
        "name": data.name,
        "description": data.description or "",
        "html": data.html,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alert_templates.insert_one(template_doc)
    
    return {
        "id": template_id,
        "name": data.name,
        "description": data.description,
        "html": data.html,
        "isCustom": True,
        "preview": f"📝 Custom - {data.description[:50] if data.description else 'Custom template'}",
        "created_at": template_doc["created_at"]
    }


@router.put("/{template_id}")
async def update_alert_template(template_id: str, data: AlertTemplateCreate, request: Request):
    """Update an alert template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.alert_templates.update_one(
        {"id": template_id},
        {"$set": {
            "name": data.name,
            "description": data.description,
            "html": data.html,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated", "id": template_id}


@router.delete("/{template_id}")
async def delete_alert_template(template_id: str, request: Request):
    """Delete an alert template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.alert_templates.delete_one({"id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}
