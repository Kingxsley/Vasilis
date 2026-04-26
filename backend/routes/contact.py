"""
Contact Form Submissions Routes
Handles contact form submissions and access requests with email notifications
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["Contact Forms"])

# Email recipient for form submissions
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


async def send_discord_contact_notification(db, name: str, email: str, subject: str, message: str):
    """Send Discord notification for contact form submission"""
    import aiohttp
    
    # Get global webhook
    branding = await db.branding_settings.find_one({}, {"_id": 0, "discord_webhook_url": 1})
    webhook_url = branding.get("discord_webhook_url") if branding else None
    
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        return
    
    embed = {
        "title": "📧 New Contact Form Submission",
        "description": "Someone has contacted you via the website.",
        "color": 3447003,
        "fields": [
            {"name": "Name", "value": name or "N/A", "inline": True},
            {"name": "Email", "value": email or "N/A", "inline": True},
            {"name": "Subject", "value": subject or "General Inquiry", "inline": True}
        ],
        "footer": {"text": "Vasilis NetShield Security Platform"},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if message:
        embed["fields"].append({"name": "Message", "value": message[:1000], "inline": False})
    
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json={"username": "Vasilis NetShield", "embeds": [embed]})
    except Exception as e:
        logger.warning(f"Failed to send Discord notification: {e}")


class ContactSubmission(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    organization: Optional[str] = None
    subject: Optional[str] = None
    message: str


class ContactReply(BaseModel):
    submission_id: str
    email: EmailStr
    subject: str
    message: str


class StatusUpdate(BaseModel):
    status: str


@router.post("")
async def submit_contact_form(data: ContactSubmission, background_tasks: BackgroundTasks):
    """Submit a contact form (public endpoint)"""
    db = get_db()
    
    submission_id = f"contact_{uuid.uuid4().hex[:12]}"
    
    submission = {
        "submission_id": submission_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "organization": data.organization,
        "subject": data.subject or "Contact Form Submission",
        "message": data.message,
        "status": "new",
        "type": "contact",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contact_submissions.insert_one(submission)
    
    # Send notification email to admin
    email_body = f"""
New Contact Form Submission

Name: {data.name}
Email: {data.email}
Phone: {data.phone or 'Not provided'}
Organization: {data.organization or 'Not provided'}

Subject: {data.subject or 'Contact Form'}

Message:
{data.message}

---
View this submission in the admin dashboard.
    """
    
    # Notify admin via email_service (HTML email with reply-to set to sender)
    async def notify_admin():
        try:
            from services.email_service import send_contact_form_submission
            await send_contact_form_submission(
                name=data.name,
                email=data.email,
                message=data.message,
                phone=data.phone,
                db=db
            )
        except Exception as e:
            logger.error(f"Admin notification email failed: {e}")
            # Fallback to simple email
            await send_notification_email(ADMIN_EMAIL, f"New Contact Form: {data.subject or 'Contact Inquiry'}", email_body)
    
    background_tasks.add_task(notify_admin)
    
    # Send Discord notification to super admins
    background_tasks.add_task(
        send_discord_contact_notification,
        db,
        data.name,
        data.email,
        data.subject,
        data.message
    )
    
    return {"message": "Contact form submitted successfully", "submission_id": submission_id}


@router.get("/submissions")
async def get_contact_submissions(request: Request, status: Optional[str] = None):
    """Get all contact form submissions (admin only)"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    submissions = await db.contact_submissions.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return submissions


@router.get("/submissions/{submission_id}")
async def get_submission(submission_id: str, request: Request):
    """Get a specific contact submission"""
    await require_admin(request)
    db = get_db()
    
    submission = await db.contact_submissions.find_one(
        {"submission_id": submission_id},
        {"_id": 0}
    )
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return submission


@router.patch("/submissions/{submission_id}/status")
async def update_submission_status(submission_id: str, data: StatusUpdate, request: Request):
    """Update submission status"""
    await require_admin(request)
    db = get_db()
    
    result = await db.contact_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Status updated"}


@router.delete("/submissions/{submission_id}")
async def delete_submission(submission_id: str, request: Request):
    """Delete a contact submission"""
    await require_admin(request)
    db = get_db()
    
    result = await db.contact_submissions.delete_one({"submission_id": submission_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Submission deleted"}


@router.post("/reply")
async def send_reply(data: ContactReply, request: Request, background_tasks: BackgroundTasks):
    """Send a reply to a contact submission"""
    user = await require_admin(request)
    db = get_db()
    
    # Build HTML email for the reply
    html_content = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f15;padding:30px;border-radius:10px;border:1px solid #D4A836;">
        <h2 style="color:#D4A836;margin-top:0;">Response from Vasilis NetShield</h2>
        <div style="background:#1a1a24;padding:20px;border-radius:8px;margin:20px 0;white-space:pre-wrap;color:#E8DDB5;">
{data.message}
        </div>
        <p style="color:#888;font-size:12px;margin-top:20px;">This is a direct reply from our team. You can reply to this email to continue the conversation.</p>
    </div>
    """
    
    # Send via email service for proper HTML delivery
    try:
        from services.email_service import send_test_email
        result = await send_test_email(
            to_email=data.email,
            subject=data.subject,
            html_content=html_content,
            from_name=user.get("name", "Vasilis NetShield Team")
        )
        success = result.get("success", False)
        if not success:
            raise HTTPException(status_code=502, detail=f"Email delivery failed: {result.get('error', 'Unknown error')}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send reply email: {e}")
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {str(e)}")
    
    # Update submission with reply record
    await db.contact_submissions.update_one(
        {"submission_id": data.submission_id},
        {
            "$set": {"status": "responded", "updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {
                "replies": {
                    "message": data.message,
                    "subject": data.subject,
                    "sent_by": user.get("email"),
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"message": "Reply sent successfully", "email_sent": True}
