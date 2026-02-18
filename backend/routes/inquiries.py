"""
Inquiry Routes - Handle contact/signup inquiries
Users cannot sign up directly - they submit an inquiry form
Admins review and create user accounts manually
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import uuid

from models import UserRole

router = APIRouter(prefix="/inquiries", tags=["Inquiries"])


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

class InquiryCreate(BaseModel):
    email: EmailStr
    phone: str
    message: str


class InquiryUpdate(BaseModel):
    status: str  # pending, contacted, approved, rejected
    admin_notes: str = None


# ============== PUBLIC ROUTES ==============

@router.post("")
async def create_inquiry(data: InquiryCreate, request: Request):
    """Submit a new inquiry (public - no auth required)"""
    db = get_db()
    
    # Check if email already has a pending inquiry
    existing = await db.inquiries.find_one({
        "email": data.email,
        "status": "pending"
    })
    
    if existing:
        # Update the existing inquiry
        await db.inquiries.update_one(
            {"inquiry_id": existing["inquiry_id"]},
            {
                "$set": {
                    "phone": data.phone,
                    "message": data.message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"message": "Your inquiry has been updated", "inquiry_id": existing["inquiry_id"]}
    
    inquiry_id = f"inq_{uuid.uuid4().hex[:12]}"
    
    # Get client IP for tracking
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    
    inquiry_doc = {
        "inquiry_id": inquiry_id,
        "email": data.email,
        "phone": data.phone,
        "message": data.message,
        "status": "pending",  # pending, contacted, approved, rejected
        "admin_notes": None,
        "ip_address": client_ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiries.insert_one(inquiry_doc)
    
    # Optionally send notification email to admin
    try:
        from services.email_service import send_admin_notification
        await send_admin_notification(
            subject="New Inquiry Received",
            body=f"""
A new inquiry has been submitted:

Email: {data.email}
Phone: {data.phone}
Message: {data.message}

Login to the admin panel to review and create the user account.
            """
        )
    except Exception:
        pass  # Don't fail if email notification fails
    
    return {"message": "Thank you! We will contact you soon.", "inquiry_id": inquiry_id}


# ============== ADMIN ROUTES ==============

@router.get("")
async def list_inquiries(
    request: Request,
    status: str = None,
    skip: int = 0,
    limit: int = 50
):
    """List all inquiries (admin only)"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    inquiries = await db.inquiries.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.inquiries.count_documents(query)
    
    return {
        "inquiries": inquiries,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats")
async def get_inquiry_stats(request: Request):
    """Get inquiry statistics (admin only)"""
    await require_admin(request)
    db = get_db()
    
    total = await db.inquiries.count_documents({})
    pending = await db.inquiries.count_documents({"status": "pending"})
    contacted = await db.inquiries.count_documents({"status": "contacted"})
    approved = await db.inquiries.count_documents({"status": "approved"})
    rejected = await db.inquiries.count_documents({"status": "rejected"})
    
    return {
        "total": total,
        "pending": pending,
        "contacted": contacted,
        "approved": approved,
        "rejected": rejected
    }


@router.get("/{inquiry_id}")
async def get_inquiry(inquiry_id: str, request: Request):
    """Get a specific inquiry (admin only)"""
    await require_admin(request)
    db = get_db()
    
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return inquiry


@router.patch("/{inquiry_id}")
async def update_inquiry(inquiry_id: str, data: InquiryUpdate, request: Request):
    """Update inquiry status (admin only)"""
    user = await require_admin(request)
    db = get_db()
    
    valid_statuses = ["pending", "contacted", "approved", "rejected"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_doc = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    if data.admin_notes:
        update_doc["admin_notes"] = data.admin_notes
    
    result = await db.inquiries.update_one(
        {"inquiry_id": inquiry_id},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {"message": "Inquiry updated", "status": data.status}


@router.delete("/{inquiry_id}")
async def delete_inquiry(inquiry_id: str, request: Request):
    """Delete an inquiry (admin only)"""
    await require_admin(request)
    db = get_db()
    
    result = await db.inquiries.delete_one({"inquiry_id": inquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {"message": "Inquiry deleted"}
