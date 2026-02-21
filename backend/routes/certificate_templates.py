"""
Certificate Template Routes - Drag & Drop Certificate Editor
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import base64
import io

from models import UserRole

router = APIRouter(prefix="/certificate-templates", tags=["Certificate Templates"])


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

class CertificateElement(BaseModel):
    id: str
    type: str  # text, image, signature, logo, certifying_body
    x: float  # percentage position 0-100
    y: float  # percentage position 0-100
    width: float  # percentage width
    height: float  # percentage height
    content: Optional[str] = None  # text content or base64 image
    style: Optional[Dict[str, Any]] = None  # CSS-like styles
    placeholder: Optional[str] = None  # For dynamic fields like {user_name}


class CertificateTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    background_color: Optional[str] = "#ffffff"
    background_image: Optional[str] = None
    border_style: Optional[str] = "classic"  # classic, modern, minimal, ornate
    orientation: Optional[str] = "landscape"  # landscape, portrait
    elements: List[CertificateElement] = []


class CertificateTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    border_style: Optional[str] = None
    orientation: Optional[str] = None
    elements: Optional[List[CertificateElement]] = None
    is_default: Optional[bool] = None


class CertifyingBodyCreate(BaseModel):
    name: str
    logo_data: str  # base64 encoded image
    title: Optional[str] = None  # e.g., "Certified by"


class SignatureCreate(BaseModel):
    name: str
    title: str  # e.g., "Program Director"
    signature_data: str  # base64 encoded signature image


# ============== TEMPLATE ROUTES ==============

@router.get("")
async def list_certificate_templates(request: Request):
    """List all certificate templates"""
    await require_admin(request)
    db = get_db()
    
    templates = await db.certificate_templates.find({}, {"_id": 0}).to_list(100)
    return templates


@router.get("/default")
async def get_default_template(request: Request):
    """Get the default certificate template"""
    db = get_db()
    
    template = await db.certificate_templates.find_one({"is_default": True}, {"_id": 0})
    if not template:
        # Return a basic default structure if none exists
        return {
            "template_id": "default",
            "name": "Default Certificate",
            "background_color": "#ffffff",
            "border_style": "classic",
            "orientation": "landscape",
            "elements": get_default_elements()
        }
    return template


@router.get("/{template_id}")
async def get_certificate_template(template_id: str, request: Request):
    """Get a specific certificate template"""
    await require_admin(request)
    db = get_db()
    
    template = await db.certificate_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("")
async def create_certificate_template(data: CertificateTemplateCreate, request: Request):
    """Create a new certificate template"""
    user = await require_admin(request)
    db = get_db()
    
    template_id = f"certtmpl_{uuid.uuid4().hex[:12]}"
    
    template_doc = {
        "template_id": template_id,
        "name": data.name,
        "description": data.description,
        "background_color": data.background_color,
        "background_image": data.background_image,
        "border_style": data.border_style,
        "orientation": data.orientation,
        "elements": [elem.dict() for elem in data.elements],
        "is_default": False,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.certificate_templates.insert_one(template_doc)
    
    return {"template_id": template_id, **template_doc}


@router.patch("/{template_id}")
async def update_certificate_template(template_id: str, data: CertificateTemplateUpdate, request: Request):
    """Update a certificate template"""
    await require_admin(request)
    db = get_db()
    
    # Build update dict
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_dict["name"] = data.name
    if data.description is not None:
        update_dict["description"] = data.description
    if data.background_color is not None:
        update_dict["background_color"] = data.background_color
    if data.background_image is not None:
        update_dict["background_image"] = data.background_image
    if data.border_style is not None:
        update_dict["border_style"] = data.border_style
    if data.orientation is not None:
        update_dict["orientation"] = data.orientation
    if data.elements is not None:
        update_dict["elements"] = [elem.dict() for elem in data.elements]
    if data.is_default is not None:
        # If setting as default, unset others
        if data.is_default:
            await db.certificate_templates.update_many({}, {"$set": {"is_default": False}})
        update_dict["is_default"] = data.is_default
    
    result = await db.certificate_templates.update_one(
        {"template_id": template_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated", "template_id": template_id}


@router.delete("/{template_id}")
async def delete_certificate_template(template_id: str, request: Request):
    """Delete a certificate template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.certificate_templates.delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


# ============== ASSET ROUTES (Signatures, Logos, Certifying Bodies) ==============

@router.get("/assets/signatures")
async def list_signatures(request: Request):
    """List all saved signatures"""
    await require_admin(request)
    db = get_db()
    
    signatures = await db.certificate_signatures.find({}, {"_id": 0}).to_list(100)
    return signatures


@router.post("/assets/signatures")
async def create_signature(data: SignatureCreate, request: Request):
    """Save a new signature"""
    user = await require_admin(request)
    db = get_db()
    
    signature_id = f"sig_{uuid.uuid4().hex[:12]}"
    
    signature_doc = {
        "signature_id": signature_id,
        "name": data.name,
        "title": data.title,
        "signature_data": data.signature_data,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.certificate_signatures.insert_one(signature_doc)
    return {"signature_id": signature_id, **signature_doc}


@router.delete("/assets/signatures/{signature_id}")
async def delete_signature(signature_id: str, request: Request):
    """Delete a signature"""
    await require_admin(request)
    db = get_db()
    
    result = await db.certificate_signatures.delete_one({"signature_id": signature_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    return {"message": "Signature deleted"}


@router.get("/assets/certifying-bodies")
async def list_certifying_bodies(request: Request):
    """List all certifying bodies"""
    await require_admin(request)
    db = get_db()
    
    bodies = await db.certifying_bodies.find({}, {"_id": 0}).to_list(100)
    return bodies


@router.post("/assets/certifying-bodies")
async def create_certifying_body(data: CertifyingBodyCreate, request: Request):
    """Add a new certifying body"""
    user = await require_admin(request)
    db = get_db()
    
    body_id = f"certbody_{uuid.uuid4().hex[:12]}"
    
    body_doc = {
        "body_id": body_id,
        "name": data.name,
        "title": data.title or "Certified by",
        "logo_data": data.logo_data,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.certifying_bodies.insert_one(body_doc)
    return {"body_id": body_id, **body_doc}


@router.delete("/assets/certifying-bodies/{body_id}")
async def delete_certifying_body(body_id: str, request: Request):
    """Delete a certifying body"""
    await require_admin(request)
    db = get_db()
    
    result = await db.certifying_bodies.delete_one({"body_id": body_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certifying body not found")
    
    return {"message": "Certifying body deleted"}


@router.post("/assets/upload-image")
async def upload_certificate_image(file: UploadFile = File(...), request: Request = None):
    """Upload an image for use in certificates"""
    await require_admin(request)
    
    # Validate file type
    allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use PNG, JPEG, or WebP")
    
    # Read and encode
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    
    base64_data = base64.b64encode(content).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    return {"image_data": data_url}


# ============== PRESET TEMPLATES ==============

@router.post("/seed-presets")
async def seed_preset_templates(request: Request):
    """Create preset certificate templates"""
    user = await require_admin(request)
    db = get_db()
    
    presets = [
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Classic Professional",
            "description": "Traditional certificate with elegant borders",
            "background_color": "#fffef5",
            "border_style": "classic",
            "orientation": "landscape",
            "elements": get_default_elements(),
            "is_default": True,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Modern Minimal",
            "description": "Clean, contemporary design",
            "background_color": "#ffffff",
            "border_style": "modern",
            "orientation": "landscape",
            "elements": get_modern_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Corporate Blue",
            "description": "Professional corporate style",
            "background_color": "#f8fafc",
            "border_style": "corporate",
            "orientation": "landscape",
            "elements": get_corporate_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check existing
    existing = await db.certificate_templates.find({}, {"name": 1}).to_list(100)
    existing_names = {t["name"] for t in existing}
    
    new_templates = [t for t in presets if t["name"] not in existing_names]
    
    if new_templates:
        await db.certificate_templates.insert_many(new_templates)
    
    return {
        "message": f"Created {len(new_templates)} preset templates",
        "templates": [t["name"] for t in new_templates]
    }


def get_default_elements():
    """Default classic certificate elements"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 45,
            "y": 5,
            "width": 10,
            "height": 10,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "title",
            "type": "text",
            "x": 10,
            "y": 18,
            "width": 80,
            "height": 8,
            "content": "CERTIFICATE OF COMPLETION",
            "style": {
                "fontSize": "32px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#1F4E79",
                "fontFamily": "Georgia, serif"
            }
        },
        {
            "id": "subtitle",
            "type": "text",
            "x": 10,
            "y": 28,
            "width": 80,
            "height": 5,
            "content": "Cybersecurity Awareness Training",
            "style": {
                "fontSize": "18px",
                "textAlign": "center",
                "color": "#D4A836",
                "fontFamily": "Georgia, serif"
            }
        },
        {
            "id": "presented_to",
            "type": "text",
            "x": 10,
            "y": 38,
            "width": 80,
            "height": 4,
            "content": "This certificate is presented to",
            "style": {
                "fontSize": "14px",
                "textAlign": "center",
                "color": "#333333"
            }
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10,
            "y": 44,
            "width": 80,
            "height": 8,
            "placeholder": "{user_name}",
            "style": {
                "fontSize": "28px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#1F4E79",
                "fontFamily": "Georgia, serif"
            }
        },
        {
            "id": "completion_text",
            "type": "text",
            "x": 10,
            "y": 54,
            "width": 80,
            "height": 4,
            "content": "for successfully completing the security training program",
            "style": {
                "fontSize": "12px",
                "textAlign": "center",
                "color": "#333333"
            }
        },
        {
            "id": "score",
            "type": "text",
            "x": 10,
            "y": 60,
            "width": 80,
            "height": 5,
            "placeholder": "Score: {score}%",
            "style": {
                "fontSize": "16px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#51CF66"
            }
        },
        {
            "id": "date",
            "type": "text",
            "x": 10,
            "y": 68,
            "width": 80,
            "height": 4,
            "placeholder": "Awarded on {date}",
            "style": {
                "fontSize": "12px",
                "textAlign": "center",
                "color": "#666666"
            }
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 15,
            "y": 78,
            "width": 20,
            "height": 12,
            "placeholder": "{signature_1}",
            "style": {
                "title": "Program Director"
            }
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 65,
            "y": 78,
            "width": 20,
            "height": 12,
            "placeholder": "{signature_2}",
            "style": {
                "title": "Administrator"
            }
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 10,
            "y": 94,
            "width": 80,
            "height": 3,
            "placeholder": "Certificate ID: {certificate_id}",
            "style": {
                "fontSize": "10px",
                "textAlign": "center",
                "color": "#999999"
            }
        }
    ]


def get_modern_elements():
    """Modern minimal certificate elements"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 5,
            "y": 5,
            "width": 12,
            "height": 12,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "title",
            "type": "text",
            "x": 10,
            "y": 25,
            "width": 80,
            "height": 10,
            "content": "Certificate of Completion",
            "style": {
                "fontSize": "36px",
                "fontWeight": "300",
                "textAlign": "center",
                "color": "#1a1a1a",
                "fontFamily": "Helvetica, Arial, sans-serif"
            }
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10,
            "y": 42,
            "width": 80,
            "height": 10,
            "placeholder": "{user_name}",
            "style": {
                "fontSize": "32px",
                "fontWeight": "600",
                "textAlign": "center",
                "color": "#D4A836",
                "fontFamily": "Helvetica, Arial, sans-serif"
            }
        },
        {
            "id": "completion_text",
            "type": "text",
            "x": 10,
            "y": 56,
            "width": 80,
            "height": 6,
            "content": "has successfully completed the Cybersecurity Awareness Training",
            "style": {
                "fontSize": "14px",
                "textAlign": "center",
                "color": "#666666"
            }
        },
        {
            "id": "date",
            "type": "text",
            "x": 10,
            "y": 66,
            "width": 80,
            "height": 4,
            "placeholder": "{date}",
            "style": {
                "fontSize": "12px",
                "textAlign": "center",
                "color": "#999999"
            }
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 25,
            "y": 78,
            "width": 20,
            "height": 12,
            "placeholder": "{signature_1}",
            "style": {
                "title": "Director"
            }
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 55,
            "y": 78,
            "width": 20,
            "height": 12,
            "placeholder": "{certifying_body}",
            "style": {}
        }
    ]


def get_corporate_elements():
    """Corporate style certificate elements"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 40,
            "y": 3,
            "width": 20,
            "height": 10,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "title",
            "type": "text",
            "x": 10,
            "y": 16,
            "width": 80,
            "height": 8,
            "content": "CERTIFICATE OF ACHIEVEMENT",
            "style": {
                "fontSize": "28px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#1F4E79",
                "letterSpacing": "4px"
            }
        },
        {
            "id": "divider",
            "type": "text",
            "x": 35,
            "y": 26,
            "width": 30,
            "height": 2,
            "content": "━━━━━━━━━━",
            "style": {
                "fontSize": "14px",
                "textAlign": "center",
                "color": "#D4A836"
            }
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10,
            "y": 35,
            "width": 80,
            "height": 10,
            "placeholder": "{user_name}",
            "style": {
                "fontSize": "30px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#1a1a1a"
            }
        },
        {
            "id": "completion_text",
            "type": "text",
            "x": 10,
            "y": 48,
            "width": 80,
            "height": 10,
            "content": "Has successfully demonstrated proficiency in\nCybersecurity Awareness Training",
            "style": {
                "fontSize": "14px",
                "textAlign": "center",
                "color": "#444444",
                "lineHeight": "1.6"
            }
        },
        {
            "id": "score",
            "type": "text",
            "x": 10,
            "y": 62,
            "width": 80,
            "height": 5,
            "placeholder": "Achievement Score: {score}%",
            "style": {
                "fontSize": "16px",
                "fontWeight": "bold",
                "textAlign": "center",
                "color": "#1F4E79"
            }
        },
        {
            "id": "date",
            "type": "text",
            "x": 10,
            "y": 70,
            "width": 80,
            "height": 4,
            "placeholder": "Date: {date}",
            "style": {
                "fontSize": "12px",
                "textAlign": "center",
                "color": "#666666"
            }
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 10,
            "y": 80,
            "width": 25,
            "height": 12,
            "placeholder": "{signature_1}",
            "style": {
                "title": "Training Director"
            }
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 37.5,
            "y": 80,
            "width": 25,
            "height": 12,
            "placeholder": "{certifying_body}",
            "style": {}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 65,
            "y": 80,
            "width": 25,
            "height": 12,
            "placeholder": "{signature_2}",
            "style": {
                "title": "CEO"
            }
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 10,
            "y": 95,
            "width": 80,
            "height": 3,
            "placeholder": "Credential ID: {certificate_id}",
            "style": {
                "fontSize": "9px",
                "textAlign": "center",
                "color": "#999999"
            }
        }
    ]
