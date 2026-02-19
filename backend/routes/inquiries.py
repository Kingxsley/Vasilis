"""
Inquiry Routes - Handle contact/signup inquiries (Access Requests)
Users cannot sign up directly - they submit an inquiry form
Admins review and create user accounts manually
Notifications sent to all super admins
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from models import UserRole

logger = logging.getLogger(__name__)
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


async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# ============== MODELS ==============

class InquiryCreate(BaseModel):
    name: str = None
    email: EmailStr
    phone: str = ""
    organization: str = None
    message: str


class InquiryUpdate(BaseModel):
    status: str  # pending, contacted, approved, rejected
    admin_notes: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def notify_super_admins_of_access_request(inquiry_data: dict):
    """Send email notification to all super admins about new access request"""
    db = get_db()
    
    try:
        # Get all super admins
        super_admins = await db.users.find(
            {"role": UserRole.SUPER_ADMIN, "is_active": True},
            {"_id": 0, "email": 1, "name": 1}
        ).to_list(100)
        
        if not super_admins:
            logger.warning("No super admins found to notify about access request")
            return
        
        from services.email_service import send_access_request_notification
        
        # Send notification to each super admin
        for admin in super_admins:
            try:
                await send_access_request_notification(
                    admin_email=admin.get("email"),
                    requester_name=inquiry_data.get("name", "Unknown"),
                    requester_email=inquiry_data.get("email"),
                    organization_name=inquiry_data.get("organization"),
                    message=inquiry_data.get("message"),
                    db=db
                )
                logger.info(f"Access request notification sent to {admin.get('email')}")
            except Exception as e:
                logger.error(f"Failed to send notification to {admin.get('email')}: {e}")
        
    except Exception as e:
        logger.error(f"Error notifying super admins: {e}")


# ============== PUBLIC ROUTES ==============

@router.post("")
async def create_inquiry(data: InquiryCreate, request: Request):
    """Submit a new access request / inquiry (public - no auth required)"""
    db = get_db()
    
    # Get client IP for tracking and geolocation
    from middleware.security import get_client_ip, get_ip_geolocation
    client_ip = get_client_ip(request)
    geo_data = await get_ip_geolocation(client_ip)
    
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
                    "name": data.name or existing.get("name"),
                    "phone": data.phone or existing.get("phone"),
                    "organization": data.organization or existing.get("organization"),
                    "message": data.message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"message": "Your access request has been updated", "inquiry_id": existing["inquiry_id"]}
    
    inquiry_id = f"inq_{uuid.uuid4().hex[:12]}"
    
    inquiry_doc = {
        "inquiry_id": inquiry_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "organization": data.organization,
        "message": data.message,
        "status": "pending",  # pending, contacted, approved, rejected
        "admin_notes": None,
        "ip_address": client_ip,
        "country": geo_data.get("country", "Unknown"),
        "country_code": geo_data.get("country_code", "XX"),
        "city": geo_data.get("city"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiries.insert_one(inquiry_doc)
    
    # Log the access request
    try:
        from server import audit_logger
        await audit_logger.log(
            action="access_request_submitted",
            user_email=data.email,
            ip_address=client_ip,
            details={
                "inquiry_id": inquiry_id,
                "name": data.name,
                "organization": data.organization
            },
            severity="info"
        )
    except Exception:
        pass
    
    # Send email notification to all super admins
    await notify_super_admins_of_access_request({
        "name": data.name,
        "email": data.email,
        "organization": data.organization,
        "message": data.message
    })
    
    # Also send contact form submission to info@vasilisnetshield.com
    try:
        from services.email_service import send_contact_form_submission
        await send_contact_form_submission(
            name=data.name or "Anonymous",
            email=data.email,
            message=data.message,
            phone=data.phone,
            db=db
        )
    except Exception as e:
        logger.error(f"Failed to send contact form email: {e}")
    
    return {
        "message": "Thank you for your interest! A team member will review your request and contact you soon.",
        "inquiry_id": inquiry_id
    }


# ============== ADMIN ROUTES ==============

@router.get("")
async def list_inquiries(
    request: Request,
    status: str = None,
    skip: int = 0,
    limit: int = 50
):
    """List all inquiries (super admin only)"""
    await require_super_admin(request)
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
    """Get inquiry statistics (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    total = await db.inquiries.count_documents({})
    pending = await db.inquiries.count_documents({"status": "pending"})
    contacted = await db.inquiries.count_documents({"status": "contacted"})
    approved = await db.inquiries.count_documents({"status": "approved"})
    rejected = await db.inquiries.count_documents({"status": "rejected"})
    
    # Get country breakdown
    pipeline = [
        {"$match": {"country": {"$exists": True, "$ne": "Unknown"}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    countries = await db.inquiries.aggregate(pipeline).to_list(10)
    
    return {
        "total": total,
        "pending": pending,
        "contacted": contacted,
        "approved": approved,
        "rejected": rejected,
        "by_country": [{"country": c["_id"], "count": c["count"]} for c in countries]
    }


@router.get("/{inquiry_id}")
async def get_inquiry(inquiry_id: str, request: Request):
    """Get a specific inquiry (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return inquiry


@router.patch("/{inquiry_id}")
async def update_inquiry(inquiry_id: str, data: InquiryUpdate, request: Request):
    """Update inquiry status (super admin only)"""
    user = await require_super_admin(request)
    db = get_db()
    
    valid_statuses = ["pending", "contacted", "approved", "rejected"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Get the inquiry first
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    update_doc = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    if data.admin_notes:
        update_doc["admin_notes"] = data.admin_notes
    
    await db.inquiries.update_one(
        {"inquiry_id": inquiry_id},
        {"$set": update_doc}
    )
    
    # Log status change
    try:
        from server import audit_logger
        await audit_logger.log(
            action="access_request_status_changed",
            user_id=user["user_id"],
            user_email=user.get("email"),
            details={
                "inquiry_id": inquiry_id,
                "requester_email": inquiry.get("email"),
                "old_status": inquiry.get("status"),
                "new_status": data.status
            },
            severity="info"
        )
    except Exception:
        pass
    
    return {"message": "Inquiry updated", "status": data.status}


@router.delete("/{inquiry_id}")
async def delete_inquiry(inquiry_id: str, request: Request):
    """Delete an inquiry (admin only)"""
    user = await require_admin(request)
    db = get_db()
    
    # Only super admins can delete
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can delete inquiries")
    
    result = await db.inquiries.delete_one({"inquiry_id": inquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {"message": "Inquiry deleted"}
