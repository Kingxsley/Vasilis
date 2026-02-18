from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import RedirectResponse, HTMLResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets

from models import (
    PhishingTemplateCreate, PhishingTemplateResponse,
    PhishingCampaignCreate, PhishingCampaignResponse,
    PhishingTargetResponse, PhishingStatsResponse, UserRole
)
from services.phishing_service import (
    generate_tracking_code, send_phishing_email,
    record_email_open, record_link_click, get_campaign_stats
)

router = APIRouter(prefix="/phishing", tags=["Phishing Simulation"])


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


# ============== TEMPLATE ROUTES ==============

@router.post("/templates", response_model=PhishingTemplateResponse)
async def create_template(data: PhishingTemplateCreate, request: Request):
    """Create a new phishing email template"""
    user = await require_admin(request)
    db = get_db()
    
    template_id = f"tmpl_{uuid.uuid4().hex[:12]}"
    template_doc = {
        "template_id": template_id,
        "name": data.name,
        "subject": data.subject,
        "sender_name": data.sender_name,
        "sender_email": data.sender_email,
        "body_html": data.body_html,
        "body_text": data.body_text,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.phishing_templates.insert_one(template_doc)
    
    return PhishingTemplateResponse(
        template_id=template_id,
        name=data.name,
        subject=data.subject,
        sender_name=data.sender_name,
        sender_email=data.sender_email,
        body_html=data.body_html,
        body_text=data.body_text,
        created_at=datetime.fromisoformat(template_doc["created_at"]),
        created_by=user["user_id"]
    )


@router.get("/templates", response_model=List[PhishingTemplateResponse])
async def list_templates(request: Request):
    """List all phishing email templates"""
    await require_admin(request)
    db = get_db()
    
    templates = await db.phishing_templates.find({}, {"_id": 0}).to_list(1000)
    result = []
    for t in templates:
        created_at = t.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(PhishingTemplateResponse(
            template_id=t["template_id"],
            name=t["name"],
            subject=t["subject"],
            sender_name=t["sender_name"],
            sender_email=t["sender_email"],
            body_html=t["body_html"],
            body_text=t.get("body_text"),
            created_at=created_at,
            created_by=t["created_by"]
        ))
    return result


@router.get("/templates/{template_id}", response_model=PhishingTemplateResponse)
async def get_template(template_id: str, request: Request):
    """Get a specific template"""
    await require_admin(request)
    db = get_db()
    
    template = await db.phishing_templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    created_at = template.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return PhishingTemplateResponse(
        template_id=template["template_id"],
        name=template["name"],
        subject=template["subject"],
        sender_name=template["sender_name"],
        sender_email=template["sender_email"],
        body_html=template["body_html"],
        body_text=template.get("body_text"),
        created_at=created_at,
        created_by=template["created_by"]
    )


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request):
    """Delete a template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.phishing_templates.delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


# ============== CAMPAIGN ROUTES ==============

@router.post("/campaigns", response_model=PhishingCampaignResponse)
async def create_campaign(data: PhishingCampaignCreate, request: Request):
    """Create a new phishing simulation campaign"""
    user = await require_admin(request)
    db = get_db()
    
    # Verify template exists
    template = await db.phishing_templates.find_one({"template_id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Verify organization exists
    org = await db.organizations.find_one({"organization_id": data.organization_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify target users exist and belong to organization
    target_users = await db.users.find(
        {"user_id": {"$in": data.target_user_ids}},
        {"_id": 0}
    ).to_list(10000)
    
    if len(target_users) != len(data.target_user_ids):
        raise HTTPException(status_code=400, detail="Some target users not found")
    
    # Determine initial status based on whether it's scheduled
    initial_status = "scheduled" if data.scheduled_at else "draft"
    
    campaign_id = f"phish_{uuid.uuid4().hex[:12]}"
    campaign_doc = {
        "campaign_id": campaign_id,
        "name": data.name,
        "organization_id": data.organization_id,
        "template_id": data.template_id,
        "landing_page_url": data.landing_page_url,
        "status": initial_status,
        "total_targets": len(target_users),
        "emails_sent": 0,
        "emails_opened": 0,
        "links_clicked": 0,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
        "started_at": None,
        "completed_at": None
    }
    await db.phishing_campaigns.insert_one(campaign_doc)
    
    # Create target records with unique tracking codes
    targets = []
    for u in target_users:
        target_doc = {
            "target_id": f"tgt_{uuid.uuid4().hex[:12]}",
            "campaign_id": campaign_id,
            "user_id": u["user_id"],
            "user_email": u["email"],
            "user_name": u["name"],
            "tracking_code": generate_tracking_code(),
            "email_sent": False,
            "email_sent_at": None,
            "email_opened": False,
            "email_opened_at": None,
            "link_clicked": False,
            "link_clicked_at": None,
            "click_ip": None,
            "click_user_agent": None
        }
        targets.append(target_doc)
    
    if targets:
        await db.phishing_targets.insert_many(targets)
    
    return PhishingCampaignResponse(
        campaign_id=campaign_id,
        name=data.name,
        organization_id=data.organization_id,
        template_id=data.template_id,
        status=initial_status,
        total_targets=len(target_users),
        emails_sent=0,
        emails_opened=0,
        links_clicked=0,
        created_at=datetime.fromisoformat(campaign_doc["created_at"]),
        scheduled_at=data.scheduled_at,
        started_at=None,
        completed_at=None
    )


@router.get("/campaigns", response_model=List[PhishingCampaignResponse])
async def list_campaigns(
    organization_id: Optional[str] = None,
    status: Optional[str] = None,
    request: Request = None
):
    """List all phishing campaigns"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if organization_id:
        query["organization_id"] = organization_id
    if status:
        query["status"] = status
    
    campaigns = await db.phishing_campaigns.find(query, {"_id": 0}).to_list(1000)
    result = []
    for c in campaigns:
        def parse_dt(val):
            if val is None:
                return None
            if isinstance(val, str):
                return datetime.fromisoformat(val)
            return val
        
        result.append(PhishingCampaignResponse(
            campaign_id=c["campaign_id"],
            name=c["name"],
            organization_id=c["organization_id"],
            template_id=c["template_id"],
            status=c.get("status", "draft"),
            total_targets=c.get("total_targets", 0),
            emails_sent=c.get("emails_sent", 0),
            emails_opened=c.get("emails_opened", 0),
            links_clicked=c.get("links_clicked", 0),
            created_at=parse_dt(c.get("created_at")),
            scheduled_at=parse_dt(c.get("scheduled_at")),
            started_at=parse_dt(c.get("started_at")),
            completed_at=parse_dt(c.get("completed_at"))
        ))
    return result


@router.get("/campaigns/{campaign_id}", response_model=PhishingCampaignResponse)
async def get_campaign(campaign_id: str, request: Request):
    """Get a specific campaign"""
    await require_admin(request)
    db = get_db()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    def parse_dt(val):
        if val is None:
            return None
        if isinstance(val, str):
            return datetime.fromisoformat(val)
        return val
    
    return PhishingCampaignResponse(
        campaign_id=campaign["campaign_id"],
        name=campaign["name"],
        organization_id=campaign["organization_id"],
        template_id=campaign["template_id"],
        status=campaign.get("status", "draft"),
        total_targets=campaign.get("total_targets", 0),
        emails_sent=campaign.get("emails_sent", 0),
        emails_opened=campaign.get("emails_opened", 0),
        links_clicked=campaign.get("links_clicked", 0),
        created_at=parse_dt(campaign.get("created_at")),
        scheduled_at=parse_dt(campaign.get("scheduled_at")),
        started_at=parse_dt(campaign.get("started_at")),
        completed_at=parse_dt(campaign.get("completed_at"))
    )


@router.post("/campaigns/{campaign_id}/launch")
async def launch_campaign(campaign_id: str, request: Request):
    """Launch a phishing campaign - sends emails to all targets"""
    user = await require_admin(request)
    db = get_db()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("status") not in ["draft", "paused"]:
        raise HTTPException(status_code=400, detail=f"Campaign cannot be launched from {campaign.get('status')} status")
    
    template = await db.phishing_templates.find_one({"template_id": campaign["template_id"]}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get base URL from request
    base_url = str(request.base_url).rstrip('/')
    # Use the frontend URL if available in env
    import os
    frontend_url = os.environ.get('FRONTEND_URL', base_url)
    
    # Update campaign status
    await db.phishing_campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "status": "active",
                "started_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Get all targets
    targets = await db.phishing_targets.find(
        {"campaign_id": campaign_id, "email_sent": False},
        {"_id": 0}
    ).to_list(10000)
    
    sent_count = 0
    for target in targets:
        success = await send_phishing_email(db, target, template, frontend_url)
        if success:
            await db.phishing_targets.update_one(
                {"target_id": target["target_id"]},
                {
                    "$set": {
                        "email_sent": True,
                        "email_sent_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            sent_count += 1
    
    # Update campaign stats
    await db.phishing_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"emails_sent": sent_count}}
    )
    
    return {
        "message": f"Campaign launched. {sent_count} emails sent.",
        "emails_sent": sent_count,
        "total_targets": len(targets)
    }


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, request: Request):
    """Pause an active campaign"""
    await require_admin(request)
    db = get_db()
    
    result = await db.phishing_campaigns.update_one(
        {"campaign_id": campaign_id, "status": "active"},
        {"$set": {"status": "paused"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="Campaign not found or not active")
    
    return {"message": "Campaign paused"}


@router.post("/campaigns/{campaign_id}/complete")
async def complete_campaign(campaign_id: str, request: Request):
    """Mark a campaign as completed"""
    await require_admin(request)
    db = get_db()
    
    result = await db.phishing_campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign completed"}


@router.post("/campaigns/check-scheduled")
async def check_scheduled_campaigns(request: Request):
    """Check and launch any scheduled campaigns that are due"""
    user = await require_admin(request)
    db = get_db()
    
    now = datetime.now(timezone.utc)
    
    # Find scheduled campaigns that are due
    scheduled_campaigns = await db.phishing_campaigns.find({
        "status": "scheduled",
        "scheduled_at": {"$lte": now.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    launched_count = 0
    for campaign in scheduled_campaigns:
        # Get template
        template = await db.phishing_templates.find_one(
            {"template_id": campaign["template_id"]}, 
            {"_id": 0}
        )
        if not template:
            continue
        
        # Get base URL
        import os
        frontend_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
        
        # Update status to active
        await db.phishing_campaigns.update_one(
            {"campaign_id": campaign["campaign_id"]},
            {
                "$set": {
                    "status": "active",
                    "started_at": now.isoformat()
                }
            }
        )
        
        # Get and send to targets
        targets = await db.phishing_targets.find(
            {"campaign_id": campaign["campaign_id"], "email_sent": False},
            {"_id": 0}
        ).to_list(10000)
        
        sent_count = 0
        for target in targets:
            success = await send_phishing_email(db, target, template, frontend_url)
            if success:
                await db.phishing_targets.update_one(
                    {"target_id": target["target_id"]},
                    {
                        "$set": {
                            "email_sent": True,
                            "email_sent_at": now.isoformat()
                        }
                    }
                )
                sent_count += 1
        
        # Update campaign stats
        await db.phishing_campaigns.update_one(
            {"campaign_id": campaign["campaign_id"]},
            {"$set": {"emails_sent": sent_count}}
        )
        
        launched_count += 1
    
    return {
        "message": f"Checked scheduled campaigns. Launched {launched_count} campaigns.",
        "launched_count": launched_count
    }


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, request: Request):
    """Delete a campaign and its targets"""
    await require_admin(request)
    db = get_db()
    
    # Delete targets first
    await db.phishing_targets.delete_many({"campaign_id": campaign_id})
    
    # Delete campaign
    result = await db.phishing_campaigns.delete_one({"campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign deleted"}


# ============== TARGET & STATS ROUTES ==============

@router.get("/campaigns/{campaign_id}/targets", response_model=List[PhishingTargetResponse])
async def list_campaign_targets(campaign_id: str, request: Request):
    """List all targets in a campaign with their tracking status"""
    await require_admin(request)
    db = get_db()
    
    targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    
    result = []
    for t in targets:
        def parse_dt(val):
            if val is None:
                return None
            if isinstance(val, str):
                return datetime.fromisoformat(val)
            return val
        
        result.append(PhishingTargetResponse(
            target_id=t["target_id"],
            campaign_id=t["campaign_id"],
            user_id=t["user_id"],
            user_email=t["user_email"],
            user_name=t["user_name"],
            tracking_code=t["tracking_code"],
            email_sent=t.get("email_sent", False),
            email_sent_at=parse_dt(t.get("email_sent_at")),
            email_opened=t.get("email_opened", False),
            email_opened_at=parse_dt(t.get("email_opened_at")),
            link_clicked=t.get("link_clicked", False),
            link_clicked_at=parse_dt(t.get("link_clicked_at")),
            click_ip=t.get("click_ip"),
            click_user_agent=t.get("click_user_agent")
        ))
    return result


@router.get("/campaigns/{campaign_id}/stats", response_model=PhishingStatsResponse)
async def get_campaign_statistics(campaign_id: str, request: Request):
    """Get detailed statistics for a campaign"""
    await require_admin(request)
    db = get_db()
    
    stats = await get_campaign_stats(db, campaign_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return PhishingStatsResponse(
        campaign_id=stats["campaign_id"],
        campaign_name=stats["campaign_name"],
        total_targets=stats["total_targets"],
        emails_sent=stats["emails_sent"],
        emails_opened=stats["emails_opened"],
        links_clicked=stats["links_clicked"],
        open_rate=stats["open_rate"],
        click_rate=stats["click_rate"],
        status=stats["status"]
    )


# ============== TRACKING ROUTES (Public) ==============

@router.get("/track/open/{tracking_code}")
async def track_email_open(tracking_code: str, request: Request):
    """Track when a phishing email is opened (via tracking pixel)"""
    db = get_db()
    
    request_info = {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }
    
    await record_email_open(db, tracking_code, request_info)
    
    # Return a 1x1 transparent pixel
    pixel = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    return Response(content=pixel, media_type="image/gif")


@router.get("/track/click/{tracking_code}")
async def track_link_click(tracking_code: str, request: Request):
    """Track when a phishing link is clicked"""
    db = get_db()
    
    request_info = {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }
    
    result = await record_link_click(db, tracking_code, request_info)
    
    if result:
        # Redirect to landing page or default phishing awareness page
        landing_url = result.get("campaign", {}).get("landing_page_url")
        if landing_url:
            return RedirectResponse(url=landing_url, status_code=302)
    
    # Default landing page - phishing awareness message
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Security Training Alert</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #D4A836; }
            .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .success { color: #28a745; font-size: 48px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">&#10003;</div>
            <h1>This Was a Security Training Exercise</h1>
            <div class="alert">
                <strong>You clicked on a simulated phishing link!</strong><br><br>
                This was part of a security awareness training exercise conducted by your organization.
            </div>
            <p>In a real attack, clicking this link could have:</p>
            <ul style="text-align: left;">
                <li>Downloaded malware to your device</li>
                <li>Stolen your login credentials</li>
                <li>Compromised sensitive company data</li>
            </ul>
            <p><strong>Remember:</strong> Always verify links before clicking, especially in unexpected emails.</p>
            <p style="margin-top: 30px; color: #666;">Powered by VasilisNetShield Security Training</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# ============== DEFAULT TEMPLATES ==============

@router.post("/templates/seed-defaults")
async def seed_default_templates(request: Request):
    """Create default phishing email templates"""
    user = await require_admin(request)
    db = get_db()
    
    default_templates = [
        {
            "template_id": f"tmpl_{uuid.uuid4().hex[:12]}",
            "name": "IT Password Reset",
            "subject": "Urgent: Password Reset Required - {{USER_NAME}}",
            "sender_name": "IT Support",
            "sender_email": "it-support@company-secure.net",
            "body_html": """
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;}</style></head>
<body>
<div style="max-width:600px;margin:0 auto;padding:20px;">
    <img src="https://via.placeholder.com/150x50?text=IT+Support" alt="IT Support" style="margin-bottom:20px;">
    <h2>Password Reset Required</h2>
    <p>Dear {{USER_NAME}},</p>
    <p>Our security system has detected that your password has not been updated in 90 days. For security purposes, you must reset your password within <strong>24 hours</strong> or your account will be temporarily locked.</p>
    <p style="text-align:center;margin:30px 0;">
        <a href="{{TRACKING_LINK}}" style="background:#0066cc;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">Reset Password Now</a>
    </p>
    <p>If you did not request this, please contact IT Support immediately.</p>
    <p>Best regards,<br>IT Support Team</p>
</div>
</body>
</html>
            """,
            "body_text": "Dear {{USER_NAME}}, Your password needs to be reset. Click here: {{TRACKING_LINK}}",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"tmpl_{uuid.uuid4().hex[:12]}",
            "name": "HR Benefits Update",
            "subject": "Action Required: Review Your Updated Benefits - {{USER_NAME}}",
            "sender_name": "HR Department",
            "sender_email": "hr-benefits@company-hr.net",
            "body_html": """
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;}</style></head>
<body>
<div style="max-width:600px;margin:0 auto;padding:20px;">
    <h2 style="color:#2e7d32;">Benefits Enrollment Update</h2>
    <p>Dear {{USER_NAME}},</p>
    <p>We're excited to announce updates to your employee benefits package for the upcoming year. These changes include:</p>
    <ul>
        <li>Enhanced health insurance coverage</li>
        <li>New dental and vision plans</li>
        <li>Increased 401(k) matching</li>
    </ul>
    <p><strong>Important:</strong> You must review and confirm your benefits selections by the end of this week.</p>
    <p style="text-align:center;margin:30px 0;">
        <a href="{{TRACKING_LINK}}" style="background:#2e7d32;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">Review Benefits</a>
    </p>
    <p>Thank you,<br>Human Resources</p>
</div>
</body>
</html>
            """,
            "body_text": "Dear {{USER_NAME}}, Please review your updated benefits: {{TRACKING_LINK}}",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"tmpl_{uuid.uuid4().hex[:12]}",
            "name": "Package Delivery Notification",
            "subject": "Your Package Delivery Update - Tracking #PKG{{USER_NAME}}2024",
            "sender_name": "Delivery Services",
            "sender_email": "tracking@delivery-express-notify.com",
            "body_html": """
<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;}</style></head>
<body>
<div style="max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
    <div style="background:#ff6600;color:white;padding:10px;text-align:center;">
        <h2 style="margin:0;">DELIVERY EXPRESS</h2>
    </div>
    <div style="background:white;padding:20px;">
        <p>Hello {{USER_NAME}},</p>
        <p>We attempted to deliver your package today but were unable to complete the delivery. Your package is being held at our distribution center.</p>
        <table style="width:100%;margin:20px 0;">
            <tr><td><strong>Status:</strong></td><td style="color:orange;">Delivery Attempted</td></tr>
            <tr><td><strong>Next Step:</strong></td><td>Schedule Redelivery</td></tr>
        </table>
        <p style="text-align:center;">
            <a href="{{TRACKING_LINK}}" style="background:#ff6600;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">Schedule Redelivery</a>
        </p>
        <p style="font-size:12px;color:#666;">If you don't schedule within 5 days, the package will be returned to sender.</p>
    </div>
</div>
</body>
</html>
            """,
            "body_text": "Hello {{USER_NAME}}, We attempted to deliver your package. Schedule redelivery: {{TRACKING_LINK}}",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check which templates already exist
    existing = await db.phishing_templates.find({}, {"name": 1}).to_list(1000)
    existing_names = {t["name"] for t in existing}
    
    new_templates = [t for t in default_templates if t["name"] not in existing_names]
    
    if new_templates:
        await db.phishing_templates.insert_many(new_templates)
    
    return {
        "message": f"Created {len(new_templates)} default templates",
        "templates_created": [t["name"] for t in new_templates]
    }
