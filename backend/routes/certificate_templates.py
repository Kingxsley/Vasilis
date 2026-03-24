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
    
    # Return without _id
    return {
        "template_id": template_id,
        "name": data.name,
        "description": data.description,
        "background_color": data.background_color,
        "border_style": data.border_style,
        "orientation": data.orientation,
        "is_default": False,
        "message": "Template created"
    }


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


@router.get("/{template_id}/preview")
async def preview_certificate_template(template_id: str, request: Request):
    """
    Generate a PDF preview of a certificate template with sample data.
    Returns the actual rendered PDF so preview matches final output exactly.
    """
    from fastapi.responses import Response
    from services.certificate_service import generate_certificate_preview
    
    await require_admin(request)
    db = get_db()
    
    template = await db.certificate_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Fetch stored assets (signatures, certifying bodies, company logo)
    assets = {}
    
    # Get signatures
    signatures = await db.certificate_signatures.find({}, {"_id": 0}).to_list(100)
    for i, sig in enumerate(signatures):
        sig_data = sig.get("signature_data") or sig.get("image_data") or sig.get("data")
        if sig_data:
            assets[f"signature_{i+1}"] = sig_data
            # Also add by name
            sig_name = sig.get("name", "").lower().replace(" ", "_")
            if sig_name:
                assets[sig_name] = sig_data
    
    # Get certifying bodies
    bodies = await db.certificate_certifying_bodies.find({}, {"_id": 0}).to_list(100)
    for i, body in enumerate(bodies):
        body_data = body.get("logo_data") or body.get("image_data") or body.get("data")
        if body_data:
            assets[f"certifying_body_{i+1}"] = body_data
            # Also add by name
            body_name = body.get("name", "").lower().replace(" ", "_")
            if body_name:
                assets[body_name] = body_data
    
    # Get company logo from branding settings
    branding = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    if branding and branding.get("logo_url"):
        logo = branding.get("logo_url")
        assets["company_logo"] = logo
        assets["logo"] = logo
    
    try:
        pdf_bytes = generate_certificate_preview(template, assets)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=preview_{template_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


@router.post("/{template_id}/preview")
async def preview_certificate_with_data(template_id: str, request: Request):
    """
    Generate a PDF preview with custom placeholder data.
    Accepts JSON body with placeholder values.
    """
    from fastapi.responses import Response
    from services.certificate_service import generate_certificate_from_template
    
    await require_admin(request)
    db = get_db()
    
    template = await db.certificate_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        body = await request.json()
        placeholders = body.get("placeholders", {})
    except Exception:
        placeholders = {}
    
    # Default placeholders
    from datetime import datetime, timezone
    default_placeholders = {
        "user_name": "John Doe",
        "user_email": "john.doe@example.com",
        "training_name": "Security Awareness Training",
        "modules_completed": "Security Awareness Training",
        "average_score": "85.0%",
        "average_score_value": 85.0,
        "completion_date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "organization_name": "Example Organization",
        "certificate_id": "CERT-PREVIEW-001",
    }
    default_placeholders.update(placeholders)
    
    try:
        pdf_bytes = generate_certificate_from_template(template, default_placeholders, include_footer=False)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=preview_{template_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


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
    # Return without _id (MongoDB adds it after insert)
    return {"signature_id": signature_id, "name": data.name, "title": data.title, "message": "Signature saved"}


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
    # Return without _id
    return {"body_id": body_id, "name": data.name, "title": body_doc["title"], "message": "Certifying body saved"}


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
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Executive Gold",
            "description": "Premium gold-accented award certificate",
            "background_color": "#FFFDF5",
            "border_style": "ornate",
            "orientation": "landscape",
            "elements": get_executive_gold_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Cyber Shield",
            "description": "Dark cybersecurity-themed certificate",
            "background_color": "#0D1117",
            "border_style": "modern",
            "orientation": "landscape",
            "elements": get_cyber_shield_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Official Compliance",
            "description": "Formal compliance and regulatory style",
            "background_color": "#FAFBFC",
            "border_style": "corporate",
            "orientation": "portrait",
            "elements": get_compliance_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Tech Academy",
            "description": "Modern tech-style training certificate",
            "background_color": "#F0F4FF",
            "border_style": "modern",
            "orientation": "landscape",
            "elements": get_tech_academy_elements(),
            "is_default": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"certtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Elegant Serif",
            "description": "Timeless elegant design with serif typography",
            "background_color": "#FDF8F0",
            "border_style": "classic",
            "orientation": "landscape",
            "elements": get_elegant_serif_elements(),
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


@router.post("/update-presets")
async def update_preset_templates(request: Request):
    """Update existing preset templates with their element definitions (useful for fixing templates without elements)"""
    user = await require_admin(request)
    db = get_db()
    
    # Mapping of template names to their element functions
    template_elements = {
        "Classic Professional": get_default_elements(),
        "Modern Minimal": get_modern_elements(),
        "Corporate Blue": get_corporate_elements(),
        "Executive Gold": get_executive_gold_elements(),
        "Cyber Shield": get_cyber_shield_elements(),
        "Official Compliance": get_compliance_elements(),
        "Tech Academy": get_tech_academy_elements(),
        "Elegant Serif": get_elegant_serif_elements(),
    }
    
    updated = []
    for name, elements in template_elements.items():
        result = await db.certificate_templates.update_one(
            {"name": name},
            {
                "$set": {
                    "elements": elements,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        if result.modified_count > 0:
            updated.append(name)
    
    return {
        "message": f"Updated {len(updated)} templates with elements",
        "templates": updated
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
            "placeholder": "for successfully completing the {training_name} training",
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
            "placeholder": "has successfully completed the {training_name} training",
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
            "placeholder": "Has successfully demonstrated proficiency in\nthe {training_name} training program",
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



def get_executive_gold_elements():
    """Executive Gold - premium award certificate"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 42, "y": 3, "width": 16, "height": 10,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "ornament_top",
            "type": "text",
            "x": 30, "y": 14, "width": 40, "height": 3,
            "content": "✦  ✦  ✦",
            "style": {"fontSize": "18px", "textAlign": "center", "color": "#C5960C"}
        },
        {
            "id": "title",
            "type": "text",
            "x": 5, "y": 18, "width": 90, "height": 10,
            "content": "CERTIFICATE OF EXCELLENCE",
            "style": {"fontSize": "34px", "fontWeight": "bold", "textAlign": "center", "color": "#8B6914", "fontFamily": "Georgia, serif", "letterSpacing": "6px"}
        },
        {
            "id": "subtitle",
            "type": "text",
            "x": 15, "y": 29, "width": 70, "height": 5,
            "content": "Security Awareness Program",
            "style": {"fontSize": "16px", "textAlign": "center", "color": "#996515", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "presented_line",
            "type": "text",
            "x": 25, "y": 36, "width": 50, "height": 4,
            "content": "Proudly Presented To",
            "style": {"fontSize": "13px", "textAlign": "center", "color": "#666666", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10, "y": 41, "width": 80, "height": 10,
            "placeholder": "{user_name}",
            "style": {"fontSize": "34px", "fontWeight": "bold", "textAlign": "center", "color": "#1a1a1a", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "divider",
            "type": "text",
            "x": 25, "y": 52, "width": 50, "height": 2,
            "content": "━━━━━━━━━━━━━━━━━━━━━━",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#C5960C"}
        },
        {
            "id": "body_text",
            "type": "text",
            "x": 12, "y": 55, "width": 76, "height": 8,
            "placeholder": "In recognition of outstanding commitment to organizational cybersecurity\nand successful completion of the {training_name} training",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#444444", "lineHeight": "1.6"}
        },
        {
            "id": "score",
            "type": "text",
            "x": 30, "y": 65, "width": 40, "height": 5,
            "placeholder": "Final Score: {score}%",
            "style": {"fontSize": "16px", "fontWeight": "bold", "textAlign": "center", "color": "#8B6914"}
        },
        {
            "id": "date",
            "type": "text",
            "x": 30, "y": 71, "width": 40, "height": 4,
            "placeholder": "Awarded: {date}",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#888888"}
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 10, "y": 78, "width": 25, "height": 14,
            "placeholder": "{signature_1}",
            "style": {"title": "Chief Executive Officer"}
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 37, "y": 78, "width": 26, "height": 14,
            "placeholder": "{certifying_body}",
            "style": {"title": ""}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 65, "y": 78, "width": 25, "height": 14,
            "placeholder": "{signature_2}",
            "style": {"title": "Training Director"}
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 25, "y": 95, "width": 50, "height": 3,
            "placeholder": "Credential No. {certificate_id}",
            "style": {"fontSize": "8px", "textAlign": "center", "color": "#aaaaaa"}
        }
    ]


def get_cyber_shield_elements():
    """Cyber Shield - dark cybersecurity-themed"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 42, "y": 3, "width": 16, "height": 10,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "badge_text",
            "type": "text",
            "x": 20, "y": 14, "width": 60, "height": 4,
            "content": "🛡️  CYBERSECURITY DIVISION  🛡️",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#D4A836", "letterSpacing": "3px"}
        },
        {
            "id": "title",
            "type": "text",
            "x": 5, "y": 20, "width": 90, "height": 10,
            "content": "SECURITY CLEARANCE CERTIFICATE",
            "style": {"fontSize": "28px", "fontWeight": "bold", "textAlign": "center", "color": "#E8DDB5", "fontFamily": "Courier New, monospace", "letterSpacing": "3px"}
        },
        {
            "id": "subtitle",
            "type": "text",
            "x": 20, "y": 31, "width": 60, "height": 4,
            "content": "Threat Awareness & Response Training",
            "style": {"fontSize": "14px", "textAlign": "center", "color": "#6B9BD2"}
        },
        {
            "id": "divider",
            "type": "text",
            "x": 10, "y": 36, "width": 80, "height": 2,
            "content": "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#2979FF"}
        },
        {
            "id": "granted_to",
            "type": "text",
            "x": 25, "y": 39, "width": 50, "height": 4,
            "content": "GRANTED TO",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#888888", "letterSpacing": "4px"}
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10, "y": 44, "width": 80, "height": 10,
            "placeholder": "{user_name}",
            "style": {"fontSize": "32px", "fontWeight": "bold", "textAlign": "center", "color": "#FFFFFF", "fontFamily": "Courier New, monospace"}
        },
        {
            "id": "completion_text",
            "type": "text",
            "x": 10, "y": 56, "width": 80, "height": 8,
            "placeholder": "Has demonstrated advanced proficiency in the {training_name}\ntraining and identifying cybersecurity threats across all attack vectors",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#AAAAAA", "lineHeight": "1.6"}
        },
        {
            "id": "score",
            "type": "text",
            "x": 30, "y": 66, "width": 40, "height": 5,
            "placeholder": "THREAT SCORE: {score}%",
            "style": {"fontSize": "16px", "fontWeight": "bold", "textAlign": "center", "color": "#00E676", "fontFamily": "Courier New, monospace"}
        },
        {
            "id": "date",
            "type": "text",
            "x": 30, "y": 72, "width": 40, "height": 4,
            "placeholder": "Issued: {date}",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#666666"}
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 12, "y": 79, "width": 25, "height": 14,
            "placeholder": "{signature_1}",
            "style": {"title": "Security Director"}
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 38, "y": 79, "width": 24, "height": 14,
            "placeholder": "{certifying_body}",
            "style": {"title": ""}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 63, "y": 79, "width": 25, "height": 14,
            "placeholder": "{signature_2}",
            "style": {"title": "CISO"}
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 15, "y": 95, "width": 70, "height": 3,
            "placeholder": "CERT-ID: {certificate_id}",
            "style": {"fontSize": "9px", "textAlign": "center", "color": "#555555", "fontFamily": "Courier New, monospace"}
        }
    ]


def get_compliance_elements():
    """Official Compliance - formal portrait certificate"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 38, "y": 2, "width": 24, "height": 8,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "header_line",
            "type": "text",
            "x": 10, "y": 11, "width": 80, "height": 3,
            "content": "OFFICIAL DOCUMENT",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#999999", "letterSpacing": "5px"}
        },
        {
            "id": "title",
            "type": "text",
            "x": 5, "y": 15, "width": 90, "height": 6,
            "content": "CERTIFICATE OF COMPLIANCE",
            "style": {"fontSize": "26px", "fontWeight": "bold", "textAlign": "center", "color": "#1F4E79", "letterSpacing": "3px"}
        },
        {
            "id": "regulation",
            "type": "text",
            "x": 15, "y": 22, "width": 70, "height": 3,
            "content": "Information Security Awareness Standard",
            "style": {"fontSize": "13px", "textAlign": "center", "color": "#D4A836"}
        },
        {
            "id": "divider1",
            "type": "text",
            "x": 20, "y": 26, "width": 60, "height": 2,
            "content": "━━━━━━━━━━━━━━━━━━━━━━━━",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#CCCCCC"}
        },
        {
            "id": "certify_text",
            "type": "text",
            "x": 10, "y": 29, "width": 80, "height": 3,
            "content": "This is to certify that",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#666666"}
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10, "y": 33, "width": 80, "height": 6,
            "placeholder": "{user_name}",
            "style": {"fontSize": "28px", "fontWeight": "bold", "textAlign": "center", "color": "#1a1a1a", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "body_text",
            "type": "text",
            "x": 8, "y": 40, "width": 84, "height": 12,
            "placeholder": "has fulfilled all requirements and successfully completed the\n{training_name} compliance training program,\ndemonstrating knowledge of data protection, threat identification,\nand security best practices.",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#444444", "lineHeight": "1.7"}
        },
        {
            "id": "score",
            "type": "text",
            "x": 25, "y": 54, "width": 50, "height": 4,
            "placeholder": "Assessment Result: {score}% — PASSED",
            "style": {"fontSize": "13px", "fontWeight": "bold", "textAlign": "center", "color": "#1F4E79"}
        },
        {
            "id": "divider2",
            "type": "text",
            "x": 20, "y": 59, "width": 60, "height": 2,
            "content": "━━━━━━━━━━━━━━━━━━━━━━━━",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#CCCCCC"}
        },
        {
            "id": "date",
            "type": "text",
            "x": 25, "y": 62, "width": 50, "height": 3,
            "placeholder": "Date of Certification: {date}",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#666666"}
        },
        {
            "id": "validity",
            "type": "text",
            "x": 25, "y": 66, "width": 50, "height": 3,
            "content": "Valid for 12 months from date of issue",
            "style": {"fontSize": "10px", "textAlign": "center", "color": "#999999"}
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 10, "y": 72, "width": 35, "height": 12,
            "placeholder": "{signature_1}",
            "style": {"title": "Compliance Officer"}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 55, "y": 72, "width": 35, "height": 12,
            "placeholder": "{signature_2}",
            "style": {"title": "Department Head"}
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 30, "y": 86, "width": 40, "height": 8,
            "placeholder": "{certifying_body}",
            "style": {"title": ""}
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 10, "y": 96, "width": 80, "height": 2,
            "placeholder": "Reference: {certificate_id}",
            "style": {"fontSize": "8px", "textAlign": "center", "color": "#BBBBBB"}
        }
    ]


def get_tech_academy_elements():
    """Tech Academy - modern tech training certificate"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 3, "y": 4, "width": 14, "height": 10,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "badge",
            "type": "text",
            "x": 60, "y": 4, "width": 35, "height": 4,
            "content": "SECURITY ACADEMY",
            "style": {"fontSize": "11px", "textAlign": "right", "color": "#6366F1", "letterSpacing": "3px"}
        },
        {
            "id": "accent_line",
            "type": "text",
            "x": 3, "y": 16, "width": 94, "height": 2,
            "content": "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰",
            "style": {"fontSize": "8px", "textAlign": "center", "color": "#6366F1"}
        },
        {
            "id": "title",
            "type": "text",
            "x": 5, "y": 20, "width": 90, "height": 10,
            "content": "TRAINING CERTIFICATE",
            "style": {"fontSize": "32px", "fontWeight": "bold", "textAlign": "center", "color": "#1E1B4B", "fontFamily": "Helvetica, Arial, sans-serif", "letterSpacing": "4px"}
        },
        {
            "id": "course",
            "type": "text",
            "x": 15, "y": 31, "width": 70, "height": 5,
            "content": "Cybersecurity Fundamentals & Threat Response",
            "style": {"fontSize": "15px", "textAlign": "center", "color": "#6366F1"}
        },
        {
            "id": "awarded_to",
            "type": "text",
            "x": 30, "y": 39, "width": 40, "height": 3,
            "content": "Awarded to",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#888888"}
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10, "y": 43, "width": 80, "height": 10,
            "placeholder": "{user_name}",
            "style": {"fontSize": "30px", "fontWeight": "700", "textAlign": "center", "color": "#1E1B4B", "fontFamily": "Helvetica, Arial, sans-serif"}
        },
        {
            "id": "description",
            "type": "text",
            "x": 12, "y": 55, "width": 76, "height": 8,
            "placeholder": "For successfully completing the {training_name} training program\nand demonstrating practical knowledge in security best practices.",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#555555", "lineHeight": "1.6"}
        },
        {
            "id": "stats_row",
            "type": "text",
            "x": 15, "y": 65, "width": 70, "height": 5,
            "placeholder": "Score: {score}%  |  Date: {date}",
            "style": {"fontSize": "13px", "fontWeight": "600", "textAlign": "center", "color": "#6366F1", "fontFamily": "Courier New, monospace"}
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 10, "y": 76, "width": 25, "height": 16,
            "placeholder": "{signature_1}",
            "style": {"title": "Lead Instructor"}
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 38, "y": 76, "width": 24, "height": 16,
            "placeholder": "{certifying_body}",
            "style": {"title": ""}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 65, "y": 76, "width": 25, "height": 16,
            "placeholder": "{signature_2}",
            "style": {"title": "Academy Director"}
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 20, "y": 95, "width": 60, "height": 3,
            "placeholder": "CERT/{certificate_id}",
            "style": {"fontSize": "9px", "textAlign": "center", "color": "#AAAAAA", "fontFamily": "Courier New, monospace"}
        }
    ]


def get_elegant_serif_elements():
    """Elegant Serif - timeless typographic certificate"""
    return [
        {
            "id": "company_logo",
            "type": "logo",
            "x": 42, "y": 3, "width": 16, "height": 9,
            "placeholder": "{company_logo}",
            "style": {}
        },
        {
            "id": "ornament",
            "type": "text",
            "x": 25, "y": 13, "width": 50, "height": 3,
            "content": "❧  ❧  ❧",
            "style": {"fontSize": "16px", "textAlign": "center", "color": "#8B4513"}
        },
        {
            "id": "title",
            "type": "text",
            "x": 5, "y": 17, "width": 90, "height": 10,
            "content": "Certificate of Completion",
            "style": {"fontSize": "36px", "fontWeight": "normal", "textAlign": "center", "color": "#2C1810", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "divider",
            "type": "text",
            "x": 30, "y": 28, "width": 40, "height": 2,
            "content": "—  ✤  —",
            "style": {"fontSize": "14px", "textAlign": "center", "color": "#8B4513"}
        },
        {
            "id": "presented_to",
            "type": "text",
            "x": 20, "y": 32, "width": 60, "height": 4,
            "content": "This document certifies that",
            "style": {"fontSize": "13px", "textAlign": "center", "color": "#666666", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "user_name",
            "type": "text",
            "x": 10, "y": 37, "width": 80, "height": 10,
            "placeholder": "{user_name}",
            "style": {"fontSize": "34px", "fontWeight": "bold", "textAlign": "center", "color": "#2C1810", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "body_text",
            "type": "text",
            "x": 12, "y": 49, "width": 76, "height": 10,
            "placeholder": "has completed with distinction the comprehensive\n{training_name} Training Programme\nand has met all requirements for certification.",
            "style": {"fontSize": "12px", "textAlign": "center", "color": "#555555", "fontFamily": "Georgia, serif", "lineHeight": "1.8"}
        },
        {
            "id": "score",
            "type": "text",
            "x": 30, "y": 61, "width": 40, "height": 5,
            "placeholder": "With a score of {score}%",
            "style": {"fontSize": "14px", "fontWeight": "bold", "textAlign": "center", "color": "#8B4513", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "date",
            "type": "text",
            "x": 30, "y": 67, "width": 40, "height": 4,
            "placeholder": "Given this day, {date}",
            "style": {"fontSize": "11px", "textAlign": "center", "color": "#888888", "fontFamily": "Georgia, serif"}
        },
        {
            "id": "signature_left",
            "type": "signature",
            "x": 10, "y": 75, "width": 25, "height": 16,
            "placeholder": "{signature_1}",
            "style": {"title": "Programme Director"}
        },
        {
            "id": "certifying_body",
            "type": "certifying_body",
            "x": 38, "y": 75, "width": 24, "height": 16,
            "placeholder": "{certifying_body}",
            "style": {"title": ""}
        },
        {
            "id": "signature_right",
            "type": "signature",
            "x": 65, "y": 75, "width": 25, "height": 16,
            "placeholder": "{signature_2}",
            "style": {"title": "Head of Training"}
        },
        {
            "id": "ornament_bottom",
            "type": "text",
            "x": 25, "y": 93, "width": 50, "height": 2,
            "content": "❧  ❧  ❧",
            "style": {"fontSize": "14px", "textAlign": "center", "color": "#8B4513"}
        },
        {
            "id": "certificate_id",
            "type": "text",
            "x": 25, "y": 96, "width": 50, "height": 2,
            "placeholder": "Ref: {certificate_id}",
            "style": {"fontSize": "8px", "textAlign": "center", "color": "#BBBBBB", "fontFamily": "Georgia, serif"}
        }
    ]
