"""
Access Request Submissions Routes
Handles system access requests separately from general contact forms
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/access-requests", tags=["Access Requests"])

# Email recipient for access requests
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "info@vasilisnetshield.com")


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


async def send_notification_email(to_email: str, subject: str, body: str):
    """Send email notification using SendGrid if configured"""
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        sg_api_key = os.environ.get("SENDGRID_API_KEY")
        sender_email = os.environ.get("SENDER_EMAIL", "noreply@vasilisnetshield.com")
        
        if not sg_api_key:
            logger.warning("SendGrid API key not configured, skipping email notification")
            return False
        
        sg = sendgrid.SendGridAPIClient(api_key=sg_api_key)
        message = Mail(
            from_email=Email(sender_email),
            to_emails=To(to_email),
            subject=subject,
            plain_text_content=Content("text/plain", body)
        )
        
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}, status: {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


async def send_discord_access_request_notification(db, name: str, email: str, organization: str, reason: str):
    """Send Discord notification for access request"""
    import aiohttp
    
    # Get global webhook
    branding = await db.branding_settings.find_one({}, {"_id": 0, "discord_webhook_url": 1})
    webhook_url = branding.get("discord_webhook_url") if branding else None
    
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        return
    
    embed = {
        "title": "🔑 New System Access Request",
        "description": "Someone has requested access to the platform.",
        "color": 15844367,  # Orange color for access requests
        "fields": [
            {"name": "Name", "value": name or "N/A", "inline": True},
            {"name": "Email", "value": email or "N/A", "inline": True},
            {"name": "Organization", "value": organization or "N/A", "inline": True}
        ],
        "footer": {"text": "Vasilis NetShield Security Platform"},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if reason:
        embed["fields"].append({"name": "Reason for Access", "value": reason[:1000], "inline": False})
    
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json={"username": "Vasilis NetShield", "embeds": [embed]})
    except Exception as e:
        logger.warning(f"Failed to send Discord notification: {e}")


class AccessRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    organization: str
    job_title: Optional[str] = None
    reason: str
    requested_role: Optional[str] = "trainee"  # Default to trainee role


class StatusUpdate(BaseModel):
    status: str  # pending, approved, rejected


@router.post("")
async def submit_access_request(data: AccessRequest, background_tasks: BackgroundTasks):
    """Submit a system access request (public endpoint)"""
    db = get_db()
    
    request_id = f"access_{uuid.uuid4().hex[:12]}"
    
    submission = {
        "request_id": request_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "organization": data.organization,
        "job_title": data.job_title,
        "reason": data.reason,
        "requested_role": data.requested_role,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "access_request"
    }
    
    await db.access_requests.insert_one(submission)
    
    # Send notification email to admin
    email_body = f"""
New System Access Request

Name: {data.name}
Email: {data.email}
Phone: {data.phone or 'Not provided'}
Organization: {data.organization}
Job Title: {data.job_title or 'Not provided'}
Requested Role: {data.requested_role}

Reason for Access:
{data.reason}

---
Review this request in the admin dashboard.
    """
    
    background_tasks.add_task(
        send_notification_email,
        ADMIN_EMAIL,
        f"New Access Request: {data.name} from {data.organization}",
        email_body
    )
    
    # Send Discord notification
    background_tasks.add_task(
        send_discord_access_request_notification,
        db,
        data.name,
        data.email,
        data.organization,
        data.reason
    )
    
    return {"message": "Access request submitted successfully", "request_id": request_id}


@router.get("")
async def get_access_requests(request: Request, status: Optional[str] = None):
    """Get all access requests (admin only)"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.access_requests.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"requests": requests}


@router.get("/{request_id}")
async def get_access_request(request_id: str, request: Request):
    """Get a specific access request"""
    await require_admin(request)
    db = get_db()
    
    access_request = await db.access_requests.find_one(
        {"request_id": request_id},
        {"_id": 0}
    )
    
    if not access_request:
        raise HTTPException(status_code=404, detail="Access request not found")
    
    return access_request


@router.patch("/{request_id}/status")
async def update_access_request_status(request_id: str, data: StatusUpdate, request: Request):
    """Update access request status"""
    user = await require_admin(request)
    db = get_db()
    
    if data.status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.access_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": data.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": user.get("user_id")
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Access request not found")
    
    return {"message": "Status updated"}


@router.delete("/{request_id}")
async def delete_access_request(request_id: str, request: Request):
    """Delete an access request"""
    await require_admin(request)
    db = get_db()
    
    result = await db.access_requests.delete_one({"request_id": request_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Access request not found")
    
    return {"message": "Access request deleted"}
