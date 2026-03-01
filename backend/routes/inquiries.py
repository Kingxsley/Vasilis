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
import aiohttp

from models import UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inquiries", tags=["Inquiries"])


def get_db():
    from server import db
    return db


async def send_discord_notification(webhook_url: str, embed: dict):
    """Send a Discord webhook notification"""
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        return False
    
    try:
        payload = {
            "username": "Vasilis NetShield",
            "embeds": [embed]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as resp:
                return resp.status in [200, 204]
    except Exception as e:
        logger.warning(f"Failed to send Discord notification: {e}")
        return False


async def notify_super_admins_discord(db, notification_type: str, details: dict):
    """Send Discord notification to all super admins with configured webhooks"""
    # Get branding settings for global webhook
    branding = await db.branding_settings.find_one({}, {"_id": 0, "discord_webhook_url": 1})
    global_webhook = branding.get("discord_webhook_url") if branding else None
    
    # Also get org-specific webhooks if applicable
    org_webhooks = []
    if details.get("organization_id"):
        org = await db.organizations.find_one(
            {"organization_id": details["organization_id"]},
            {"_id": 0, "discord_webhook_url": 1}
        )
        if org and org.get("discord_webhook_url"):
            org_webhooks.append(org["discord_webhook_url"])
    
    # Build embed based on notification type
    if notification_type == "access_request_new":
        embed = {
            "title": "🔔 New Access Request",
            "description": "A new access request has been submitted.",
            "color": 5793266,  # Purple
            "fields": [
                {"name": "Name", "value": details.get("name", "N/A"), "inline": True},
                {"name": "Email", "value": details.get("email", "N/A"), "inline": True},
                {"name": "Organization", "value": details.get("organization", "N/A"), "inline": True},
                {"name": "Country", "value": details.get("country", "N/A"), "inline": True}
            ],
            "footer": {"text": "Vasilis NetShield Security Platform"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if details.get("message"):
            embed["fields"].append({"name": "Message", "value": details["message"][:1000], "inline": False})
    
    elif notification_type == "access_request_assigned":
        embed = {
            "title": "📋 Access Request Assigned",
            "description": "An access request has been assigned to you for review.",
            "color": 10181046,  # Blue
            "fields": [
                {"name": "Requester", "value": details.get("requester_name", "N/A"), "inline": True},
                {"name": "Email", "value": details.get("requester_email", "N/A"), "inline": True},
                {"name": "Assigned By", "value": details.get("assigned_by", "N/A"), "inline": True}
            ],
            "footer": {"text": "Vasilis NetShield Security Platform"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    elif notification_type == "contact_form_new":
        embed = {
            "title": "📧 New Contact Form Submission",
            "description": "Someone has contacted you via the website.",
            "color": 3447003,  # Green
            "fields": [
                {"name": "Name", "value": details.get("name", "N/A"), "inline": True},
                {"name": "Email", "value": details.get("email", "N/A"), "inline": True},
                {"name": "Subject", "value": details.get("subject", "General Inquiry"), "inline": True}
            ],
            "footer": {"text": "Vasilis NetShield Security Platform"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if details.get("message"):
            embed["fields"].append({"name": "Message", "value": details["message"][:1000], "inline": False})
    
    else:
        return
    
    # Send to global webhook
    if global_webhook:
        await send_discord_notification(global_webhook, embed)
    
    # Send to org webhooks
    for webhook in org_webhooks:
        await send_discord_notification(webhook, embed)


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
    status: str  # pending, contacted, approved, rejected, resolved
    admin_notes: Optional[str] = None


class ApproveAndCreateUser(BaseModel):
    role: str = "trainee"  # trainee, org_admin, super_admin
    organization_id: Optional[str] = None
    send_welcome_email: bool = True


class AssignToAdmin(BaseModel):
    admin_id: str


# ============== HELPER FUNCTIONS ==============

async def notify_super_admins_of_access_request(inquiry_data: dict):
    """Send email notification to all super admins and admin email about new access request"""
    db = get_db()
    import os
    
    # Also send to the designated admin email
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "info@vasilisnetshield.com")
    
    try:
        # Get all super admins
        super_admins = await db.users.find(
            {"role": UserRole.SUPER_ADMIN, "is_active": True},
            {"_id": 0, "email": 1, "name": 1}
        ).to_list(100)
        
        # Add admin email if not already in list
        admin_emails = [a.get("email") for a in super_admins]
        if ADMIN_EMAIL not in admin_emails:
            super_admins.append({"email": ADMIN_EMAIL, "name": "Admin"})
        
        if not super_admins:
            logger.warning("No super admins found to notify about access request")
            return
        
        from services.email_service import send_access_request_notification
        
        # Send notification to each admin
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
    
    # Send Discord notification to super admins
    await notify_super_admins_discord(db, "access_request_new", {
        "name": data.name,
        "email": data.email,
        "organization": data.organization,
        "message": data.message,
        "country": geo_data.get("country", "Unknown")
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
    
    valid_statuses = ["pending", "contacted", "approved", "rejected", "resolved", "assigned"]
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


@router.post("/{inquiry_id}/approve")
async def approve_and_create_user(inquiry_id: str, data: ApproveAndCreateUser, request: Request):
    """Approve access request and create user account"""
    user = await require_super_admin(request)
    db = get_db()
    
    # Get the inquiry
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    if inquiry.get("status") == "approved":
        raise HTTPException(status_code=400, detail="This request has already been approved")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": inquiry["email"]}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with email {inquiry['email']} already exists")
    
    # Validate role
    valid_roles = ["trainee", "org_admin", "super_admin", "media_manager"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    # Validate organization if provided
    if data.organization_id and data.organization_id != "none":
        org = await db.organizations.find_one({"organization_id": data.organization_id}, {"_id": 0})
        if not org:
            raise HTTPException(status_code=400, detail="Organization not found")
    
    # Generate secure password
    import secrets
    import string
    password_chars = string.ascii_letters + string.digits + "!@#$%^&*"
    temp_password = ''.join(secrets.choice(password_chars) for _ in range(16))
    
    # Create the user
    from server import hash_password
    new_user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Set organization_id to None if "none" was selected
    org_id = data.organization_id if data.organization_id and data.organization_id != "none" else None
    
    user_doc = {
        "user_id": new_user_id,
        "email": inquiry["email"],
        "name": inquiry.get("name") or inquiry["email"].split("@")[0],
        "password_hash": hash_password(temp_password),
        "role": data.role,
        "organization_id": org_id,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat(),
        "created_from_inquiry": inquiry_id,
        "must_change_password": True  # Force password change on first login
    }
    
    await db.users.insert_one(user_doc)
    
    # Update inquiry status
    await db.inquiries.update_one(
        {"inquiry_id": inquiry_id},
        {"$set": {
            "status": "approved",
            "approved_by": user["user_id"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "created_user_id": new_user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send welcome email with credentials if requested
    if data.send_welcome_email:
        try:
            from services.email_service import send_welcome_email
            await send_welcome_email(
                to_email=inquiry["email"],
                user_name=inquiry.get("name") or inquiry["email"].split("@")[0],
                temp_password=temp_password,
                db=db
            )
            logger.info(f"Welcome email sent to {inquiry['email']}")
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
    
    # Log the approval
    try:
        from server import audit_logger
        await audit_logger.log(
            action="access_request_approved",
            user_id=user["user_id"],
            user_email=user.get("email"),
            details={
                "inquiry_id": inquiry_id,
                "new_user_id": new_user_id,
                "new_user_email": inquiry["email"],
                "role": data.role,
                "organization_id": data.organization_id
            },
            severity="info"
        )
    except Exception:
        pass
    
    return {
        "message": f"User account created for {inquiry['email']}",
        "user_id": new_user_id,
        "email": inquiry["email"],
        "role": data.role,
        "temp_password": temp_password if not data.send_welcome_email else None,
        "welcome_email_sent": data.send_welcome_email
    }


@router.post("/{inquiry_id}/assign")
async def assign_to_admin(inquiry_id: str, data: AssignToAdmin, request: Request):
    """Assign access request to a specific admin for handling"""
    user = await require_super_admin(request)
    db = get_db()
    
    # Get the inquiry
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    # Verify the target admin exists and is an admin
    target_admin = await db.users.find_one(
        {"user_id": data.admin_id, "role": {"$in": ["super_admin", "org_admin"]}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1}
    )
    if not target_admin:
        raise HTTPException(status_code=400, detail="Target admin not found or is not an admin")
    
    # Update inquiry
    await db.inquiries.update_one(
        {"inquiry_id": inquiry_id},
        {"$set": {
            "status": "assigned",
            "assigned_to": data.admin_id,
            "assigned_to_name": target_admin.get("name", target_admin.get("email")),
            "assigned_by": user["user_id"],
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Optionally send notification email to assigned admin
    try:
        from services.email_service import send_test_email
        await send_test_email(
            to_email=target_admin["email"],
            subject=f"Access Request Assigned: {inquiry.get('name', inquiry['email'])}",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #D4A836;">Access Request Assigned to You</h2>
                <p>An access request has been assigned to you for handling:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Name:</strong> {inquiry.get('name', 'N/A')}</p>
                    <p><strong>Email:</strong> {inquiry.get('email')}</p>
                    <p><strong>Organization:</strong> {inquiry.get('organization', 'N/A')}</p>
                    <p><strong>Message:</strong> {inquiry.get('message', 'N/A')}</p>
                </div>
                <p>Please review and take appropriate action.</p>
            </div>
            """
        )
    except Exception as e:
        logger.warning(f"Failed to send assignment notification email: {e}")
    
    # Send Discord notification to assigned admin
    await notify_super_admins_discord(db, "access_request_assigned", {
        "requester_name": inquiry.get("name", inquiry["email"]),
        "requester_email": inquiry.get("email"),
        "assigned_by": user.get("name", user.get("email"))
    })
    
    return {
        "message": f"Request assigned to {target_admin.get('name', target_admin.get('email'))}",
        "assigned_to": {
            "user_id": target_admin["user_id"],
            "name": target_admin.get("name"),
            "email": target_admin.get("email")
        }
    }


@router.post("/{inquiry_id}/resolve")
async def resolve_inquiry(inquiry_id: str, request: Request):
    """Mark an inquiry as resolved"""
    user = await require_admin(request)
    db = get_db()
    
    # Get the inquiry
    inquiry = await db.inquiries.find_one({"inquiry_id": inquiry_id}, {"_id": 0})
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    # Update inquiry status
    await db.inquiries.update_one(
        {"inquiry_id": inquiry_id},
        {"$set": {
            "status": "resolved",
            "resolved_by": user["user_id"],
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the resolution
    try:
        from server import audit_logger
        await audit_logger.log(
            action="access_request_resolved",
            user_id=user["user_id"],
            user_email=user.get("email"),
            details={
                "inquiry_id": inquiry_id,
                "requester_email": inquiry.get("email")
            },
            severity="info"
        )
    except Exception:
        pass
    
    return {"message": "Request marked as resolved"}


@router.get("/admins/list")
async def list_admins_for_assignment(request: Request):
    """Get list of admins for assignment dropdown"""
    await require_super_admin(request)
    db = get_db()
    
    admins = await db.users.find(
        {"role": {"$in": ["super_admin", "org_admin"]}, "is_active": True},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1}
    ).to_list(100)
    
    return {"admins": admins}


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
