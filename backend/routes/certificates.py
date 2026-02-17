"""
Certificate Routes - Training completion certificates
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import io
import uuid

from services.certificate_service import generate_training_certificate
from models import UserRole

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
    
    # Generate certificate
    certificate_id = f"CERT-{uuid.uuid4().hex[:8].upper()}"
    
    pdf_bytes = generate_training_certificate(
        user_name=user.get("name", "Unknown"),
        user_email=user.get("email", ""),
        modules_completed=modules_completed,
        average_score=avg_score,
        completion_date=latest_completion,
        organization_name=org_name,
        certificate_id=certificate_id
    )
    
    # Store certificate record
    await db.certificates.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "certificate_id": certificate_id,
                "user_id": user_id,
                "user_name": user.get("name"),
                "user_email": user.get("email"),
                "organization_id": user.get("organization_id"),
                "modules_completed": modules_completed,
                "average_score": avg_score,
                "completion_date": latest_completion.isoformat(),
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    filename = f"certificate_{user.get('name', 'user').replace(' ', '_')}_{certificate_id}.pdf"
    
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
