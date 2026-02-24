"""
Certificate Routes - Training completion certificates
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import io
import uuid
import logging

from services.certificate_service import generate_training_certificate, generate_certificate_from_template
from models import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/certificates", tags=["Certificates"])


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


@router.get("/user/{user_id}")
async def generate_user_certificate(user_id: str, request: Request):
    """Generate a training completion certificate for a user"""
    current_user = await get_current_user(request)
    db = get_db()
    
    # Users can generate their own certificate, admins can generate for anyone
    if current_user["user_id"] != user_id and current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get user
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get completed training sessions
    sessions = await db.training_sessions.find(
        {"user_id": user_id, "status": "completed"},
        {"_id": 0}
    ).to_list(1000)
    
    if not sessions:
        raise HTTPException(status_code=400, detail="No completed training sessions found")
    
    # Calculate average score and get module names
    total_score = sum(s.get("score", 0) for s in sessions)
    avg_score = total_score / len(sessions) if sessions else 0
    
    # Map module IDs to names
    module_names = {
        "mod_phishing_email": "Phishing Email Detection",
        "mod_malicious_ads": "Malicious Ad Recognition",
        "mod_social_engineering": "Social Engineering Defense"
    }
    
    modules_completed = list(set(
        module_names.get(s.get("module_id"), s.get("module_id", "Unknown"))
        for s in sessions
    ))
    
    # Get organization name if user belongs to one
    org_name = None
    if user.get("organization_id"):
        org = await db.organizations.find_one(
            {"organization_id": user["organization_id"]},
            {"_id": 0}
        )
        if org:
            org_name = org.get("name")
    
    # Find most recent completion date
    completion_dates = [
        datetime.fromisoformat(s["completed_at"]) if isinstance(s.get("completed_at"), str) else s.get("completed_at")
        for s in sessions if s.get("completed_at")
    ]
    latest_completion = max(completion_dates) if completion_dates else datetime.now(timezone.utc)
    
    # Generate unique certificate ID
    certificate_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"

    # -----------------------------------------
    # Determine which certificate template to use
    # Priority:
    # 1. Organization-level certificate_template_id
    # 2. Module-level certificate_template_id from any completed module
    # 3. Global default template if defined
    template_doc = None
    # 1. Check organization
    if user.get("organization_id"):
        org = await db.organizations.find_one(
            {"organization_id": user["organization_id"]},
            {"_id": 0, "certificate_template_id": 1}
        )
        if org and org.get("certificate_template_id"):
            template_doc = await db.certificate_templates.find_one(
                {"template_id": org["certificate_template_id"]},
                {"_id": 0}
            )
    # 2. Check modules if still no template
    template_source = "organization" if template_doc else None
    if not template_doc:
        # Unique module IDs from completed sessions
        module_ids = list({s.get("module_id") for s in sessions})
        for m_id in module_ids:
            module = await db.training_modules.find_one(
                {"module_id": m_id},
                {"_id": 0, "certificate_template_id": 1}
            )
            if module and module.get("certificate_template_id"):
                template_doc = await db.certificate_templates.find_one(
                    {"template_id": module["certificate_template_id"]},
                    {"_id": 0}
                )
                if template_doc:
                    template_source = "module"
                    break
    # 3. Check for global default template
    if not template_doc:
        template_doc = await db.certificate_templates.find_one(
            {"is_default": True}, {"_id": 0}
        )
        if template_doc:
            template_source = "default"
    
    logger.info(f"Certificate for user {user_id}: template_source={template_source}, template_id={template_doc.get('template_id') if template_doc else None}")

    # Prepare placeholders for dynamic rendering
    placeholders = {
        "user_name": user.get("name", "Unknown"),
        "user_email": user.get("email", ""),
        "modules_completed": " • ".join(modules_completed),
        "average_score": f"{avg_score:.1f}%",
        "average_score_value": avg_score,
        "completion_date": latest_completion.strftime("%B %d, %Y"),
        "organization_name": org_name or "",
        "certificate_id": certificate_id
    }
    # Additional placeholders for backwards compatibility
    placeholders["modules_completed_list"] = placeholders["modules_completed"]

    # Render certificate using template if available and has elements
    if template_doc and template_doc.get("elements") and len(template_doc.get("elements", [])) > 0:
        try:
            logger.info(f"Using template '{template_doc.get('name')}' with {len(template_doc.get('elements', []))} elements")
            pdf_bytes = generate_certificate_from_template(template_doc, placeholders)
        except Exception as render_err:
            logger.error(f"Template rendering failed: {render_err}, falling back to default")
            # Fallback to default generator if rendering fails
            pdf_bytes = generate_training_certificate(
                user_name=user.get("name", "Unknown"),
                user_email=user.get("email", ""),
                modules_completed=modules_completed,
                average_score=avg_score,
                completion_date=latest_completion,
                organization_name=org_name,
                certificate_id=certificate_id
            )
    else:
        if template_doc:
            logger.warning(f"Template '{template_doc.get('name')}' has no elements, using default certificate design")
        # Use original certificate design
        pdf_bytes = generate_training_certificate(
            user_name=user.get("name", "Unknown"),
            user_email=user.get("email", ""),
            modules_completed=modules_completed,
            average_score=avg_score,
            completion_date=latest_completion,
            organization_name=org_name,
            certificate_id=certificate_id
        )
    
    # Store certificate record, including the template used (if any)
    cert_record = {
        "certificate_id": certificate_id,
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "organization_id": user.get("organization_id"),
        "modules_completed": modules_completed,
        "average_score": avg_score,
        "completion_date": latest_completion.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    if template_doc and template_doc.get("template_id"):
        cert_record["template_id"] = template_doc.get("template_id")
    await db.certificates.update_one(
        {"user_id": user_id}, {"$set": cert_record}, upsert=True
    )
    
    filename = f"certificate_{user.get('name', 'user').replace(' ', '_')}_{certificate_id}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# New route to generate a certificate for a specific module
@router.get("/user/{user_id}/module/{module_id}")
async def generate_user_module_certificate(user_id: str, module_id: str, request: Request):
    """
    Generate a certificate for a single completed training module for a specific user.

    This endpoint allows trainees to download a certificate for each module they have completed.
    The same template selection logic is applied as the general certificate generation:
    organization template first, then module template, then global default.
    """
    current_user = await get_current_user(request)
    db = get_db()

    # Users can generate their own certificate, admins can generate for anyone
    if current_user["user_id"] != user_id and current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get user
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Get completed session for this module
    session = await db.training_sessions.find_one(
        {"user_id": user_id, "module_id": module_id, "status": "completed"},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=400, detail="No completed session found for this module")

    # Fetch module details
    module = await db.training_modules.find_one({"module_id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Training module not found")
    module_name = module.get("name", module_id)

    # Determine score and completion date
    score = session.get("score", 0)
    completion_date = session.get("completed_at")
    if isinstance(completion_date, str):
        try:
            completion_dt = datetime.fromisoformat(completion_date)
        except Exception:
            completion_dt = datetime.now(timezone.utc)
    else:
        completion_dt = completion_date or datetime.now(timezone.utc)

    # Determine which certificate template to use
    template_doc = None
    template_source = "none"
    
    # 1. Organization-level template (highest priority)
    if user_doc.get("organization_id"):
        org = await db.organizations.find_one(
            {"organization_id": user_doc["organization_id"]},
            {"_id": 0, "certificate_template_id": 1}
        )
        if org and org.get("certificate_template_id"):
            template_doc = await db.certificate_templates.find_one(
                {"template_id": org["certificate_template_id"]},
                {"_id": 0}
            )
            if template_doc:
                template_source = "organization"
    
    # 2. Module-level template
    if not template_doc and module.get("certificate_template_id"):
        template_doc = await db.certificate_templates.find_one(
            {"template_id": module.get("certificate_template_id")},
            {"_id": 0}
        )
        if template_doc:
            template_source = "module"
    
    # 3. Global default template
    if not template_doc:
        template_doc = await db.certificate_templates.find_one(
            {"is_default": True}, {"_id": 0}
        )
        if template_doc:
            template_source = "default"
    
    logger.info(f"Certificate for user {user_id}, module {module_id}: template_source={template_source}, template_id={template_doc.get('template_id') if template_doc else None}")

    # Unique certificate ID
    certificate_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"

    # Prepare placeholders
    org_name = ""
    if user_doc.get("organization_id"):
        org = await db.organizations.find_one(
            {"organization_id": user_doc["organization_id"]}, {"_id": 0}
        )
        if org:
            org_name = org.get("name", "")

    placeholders = {
        "user_name": user_doc.get("name", "Unknown"),
        "user_email": user_doc.get("email", ""),
        "modules_completed": module_name,
        "modules_completed_list": module_name,
        "average_score": f"{score:.1f}%",
        "average_score_value": score,
        "completion_date": completion_dt.strftime("%B %d, %Y"),
        "organization_name": org_name or "",
        "certificate_id": certificate_id
    }

    # Generate certificate bytes - only use template if it has elements
    if template_doc and template_doc.get("elements") and len(template_doc.get("elements", [])) > 0:
        try:
            logger.info(f"Using template '{template_doc.get('name')}' with {len(template_doc.get('elements', []))} elements for module certificate")
            pdf_bytes = generate_certificate_from_template(template_doc, placeholders)
        except Exception as render_err:
            logger.error(f"Template rendering failed for module certificate: {render_err}, falling back to default")
            # Fallback to default generator
            pdf_bytes = generate_training_certificate(
                user_name=user_doc.get("name", "Unknown"),
                user_email=user_doc.get("email", ""),
                modules_completed=[module_name],
                average_score=score,
                completion_date=completion_dt,
                organization_name=org_name,
                certificate_id=certificate_id
            )
    else:
        if template_doc:
            logger.warning(f"Template '{template_doc.get('name')}' has no elements, using default certificate design for module")
        pdf_bytes = generate_training_certificate(
            user_name=user_doc.get("name", "Unknown"),
            user_email=user_doc.get("email", ""),
            modules_completed=[module_name],
            average_score=score,
            completion_date=completion_dt,
            organization_name=org_name,
            certificate_id=certificate_id
        )

    # Store certificate record with module_id
    cert_record = {
        "certificate_id": certificate_id,
        "user_id": user_id,
        "user_name": user_doc.get("name"),
        "user_email": user_doc.get("email"),
        "organization_id": user_doc.get("organization_id"),
        "module_id": module_id,
        "module_name": module_name,
        "score": score,
        "completion_date": completion_dt.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    if template_doc and template_doc.get("template_id"):
        cert_record["template_id"] = template_doc.get("template_id")
    await db.certificates.insert_one(cert_record)

    filename = f"certificate_{module_name.replace(' ', '_')}_{certificate_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/verify/{certificate_id}")
async def verify_certificate(certificate_id: str):
    """Verify a certificate by its ID"""
    db = get_db()
    
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    return {
        "valid": True,
        "certificate_id": cert["certificate_id"],
        "user_name": cert.get("user_name"),
        "modules_completed": cert.get("modules_completed"),
        "average_score": cert.get("average_score"),
        "completion_date": cert.get("completion_date"),
        "generated_at": cert.get("generated_at")
    }


@router.get("/user/{user_id}/check")
async def check_certificate_eligibility(user_id: str, request: Request):
    """Check if a user is eligible for a certificate"""
    current_user = await get_current_user(request)
    db = get_db()
    
    # Users can check their own eligibility, admins can check anyone
    if current_user["user_id"] != user_id and current_user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get completed sessions
    sessions = await db.training_sessions.find(
        {"user_id": user_id, "status": "completed"},
        {"_id": 0}
    ).to_list(1000)
    
    # Check for existing certificate
    existing_cert = await db.certificates.find_one({"user_id": user_id}, {"_id": 0})
    
    if not sessions:
        return {
            "eligible": False,
            "reason": "No completed training sessions",
            "completed_sessions": 0,
            "existing_certificate": None
        }
    
    # Calculate stats
    total_score = sum(s.get("score", 0) for s in sessions)
    avg_score = total_score / len(sessions)
    
    return {
        "eligible": True,
        "completed_sessions": len(sessions),
        "average_score": round(avg_score, 1),
        "existing_certificate": existing_cert.get("certificate_id") if existing_cert else None
    }
