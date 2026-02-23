from fastapi import APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import RedirectResponse, HTMLResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets
import base64
import logging

logger = logging.getLogger(__name__)

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


def get_audit_logger():
    from server import audit_logger
    return audit_logger


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
        "assigned_module_id": data.assigned_module_id,
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
        assigned_module_id=data.assigned_module_id,
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


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, request: Request):
    """Update a campaign (only draft/scheduled campaigns can be edited)"""
    await require_admin(request)
    db = get_db()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Only allow editing draft or scheduled campaigns
    if campaign.get("status") not in ["draft", "scheduled"]:
        raise HTTPException(status_code=400, detail="Only draft or scheduled campaigns can be edited")
    
    data = await request.json()
    
    # Build update document
    update_doc = {}
    
    if "name" in data:
        update_doc["name"] = data["name"]
    
    if "template_id" in data and data["template_id"]:
        template = await db.phishing_templates.find_one({"template_id": data["template_id"]}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        update_doc["template_id"] = data["template_id"]
    
    if "organization_id" in data and data["organization_id"]:
        org = await db.organizations.find_one({"organization_id": data["organization_id"]}, {"_id": 0})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        update_doc["organization_id"] = data["organization_id"]
    
    if "scheduled_at" in data:
        if data["scheduled_at"]:
            update_doc["scheduled_at"] = data["scheduled_at"]
            update_doc["status"] = "scheduled"
        else:
            update_doc["scheduled_at"] = None
            update_doc["status"] = "draft"
    
    # Handle target user changes
    if "target_user_ids" in data and data["target_user_ids"]:
        new_target_ids = data["target_user_ids"]
        
        # Get existing target user IDs
        existing_targets = await db.phishing_targets.find(
            {"campaign_id": campaign_id},
            {"user_id": 1, "_id": 0}
        ).to_list(10000)
        existing_user_ids = [t["user_id"] for t in existing_targets]
        
        # Find users to add and remove
        users_to_add = [uid for uid in new_target_ids if uid not in existing_user_ids]
        users_to_remove = [uid for uid in existing_user_ids if uid not in new_target_ids]
        
        # Remove targets no longer in list
        if users_to_remove:
            await db.phishing_targets.delete_many({
                "campaign_id": campaign_id,
                "user_id": {"$in": users_to_remove}
            })
        
        # Add new targets
        if users_to_add:
            new_users = await db.users.find(
                {"user_id": {"$in": users_to_add}},
                {"_id": 0}
            ).to_list(10000)
            
            new_targets = []
            for u in new_users:
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
                new_targets.append(target_doc)
            
            if new_targets:
                await db.phishing_targets.insert_many(new_targets)
        
        # Update total targets count
        total_targets = await db.phishing_targets.count_documents({"campaign_id": campaign_id})
        update_doc["total_targets"] = total_targets
    
    if update_doc:
        await db.phishing_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$set": update_doc}
        )
    
    return {"message": "Campaign updated successfully"}


@router.post("/campaigns/{campaign_id}/launch")
async def launch_campaign(campaign_id: str, request: Request):
    """Launch a phishing campaign - sends emails to all targets"""
    user = await require_admin(request)
    db = get_db()
    audit_logger = get_audit_logger()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("status") not in ["draft", "paused", "scheduled"]:
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
    # Attempt to send to each target.  Only mark email_sent as true
    # when the send_phishing_email function returns success.  If the
    # email fails to send (e.g. SendGrid or SMTP error), the email_sent
    # flag will remain false so administrators can see accurate
    # statistics.
    for target in targets:
        try:
            success = await send_phishing_email(db, target, template, frontend_url)
        except Exception:
            success = False
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
    
    # Audit log for campaign launch
    await audit_logger.log(
        action="phishing_campaign_launched",
        user_id=user["user_id"],
        user_email=user.get("email"),
        user_name=user.get("name"),
        details={
            "actor_id": user["user_id"],
            "actor_email": user.get("email"),
            "actor_role": user.get("role"),
            "campaign_id": campaign_id,
            "campaign_name": campaign.get("name"),
            "emails_sent": sent_count,
            "total_targets": len(targets)
        },
        severity="info"
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
    await require_admin(request)
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


# ============== AGGREGATED STATS (for Analytics Dashboard) ==============

@router.get("/stats")
async def get_phishing_stats(request: Request, days: int = 30):
    """Get aggregated simulation statistics for analytics dashboard (phishing + ad campaigns)"""
    await require_admin(request)
    db = get_db()
    
    from datetime import timedelta
    
    # Calculate date filter
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # --- Phishing campaign data ---
    phish_query = {}
    if days < 365:
        phish_query["created_at"] = {"$gte": cutoff_date}
    
    phish_campaigns = await db.phishing_campaigns.find(phish_query, {"_id": 0}).to_list(1000)
    phish_campaign_ids = [c["campaign_id"] for c in phish_campaigns]
    phish_targets = await db.phishing_targets.find(
        {"campaign_id": {"$in": phish_campaign_ids}} if phish_campaign_ids else {},
        {"_id": 0}
    ).to_list(100000)
    
    phish_active = sum(1 for c in phish_campaigns if c.get("status") in ("running", "active"))
    phish_completed = sum(1 for c in phish_campaigns if c.get("status") == "completed")
    phish_sent = sum(1 for t in phish_targets if t.get("email_sent"))
    phish_opened = sum(1 for t in phish_targets if t.get("email_opened"))
    phish_clicked = sum(1 for t in phish_targets if t.get("link_clicked"))
    
    # --- Ad campaign data ---
    ad_query = {}
    if days < 365:
        ad_query["created_at"] = {"$gte": cutoff_date}
    
    ad_campaigns = await db.ad_campaigns.find(ad_query, {"_id": 0}).to_list(1000)
    ad_campaign_ids = [c["campaign_id"] for c in ad_campaigns]
    ad_targets = await db.ad_targets.find(
        {"campaign_id": {"$in": ad_campaign_ids}} if ad_campaign_ids else {},
        {"_id": 0}
    ).to_list(100000)
    
    ad_active = sum(1 for c in ad_campaigns if c.get("status") in ("running", "active"))
    ad_completed = sum(1 for c in ad_campaigns if c.get("status") == "completed")
    ad_total = len(ad_targets)
    ad_viewed = sum(1 for t in ad_targets if t.get("ad_viewed"))
    ad_clicked = sum(1 for t in ad_targets if t.get("ad_clicked"))
    
    # --- Combined totals ---
    total_campaigns = len(phish_campaigns) + len(ad_campaigns)
    active_campaigns = phish_active + ad_active
    completed_campaigns = phish_completed + ad_completed
    total_sent = phish_sent + ad_total  # ad targets are "sent" by default
    total_opened = phish_opened + ad_viewed
    total_clicked = phish_clicked + ad_clicked
    
    # Calculate rates
    open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
    click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0
    click_to_open_rate = (total_clicked / total_opened * 100) if total_opened > 0 else 0
    submission_rate = 0
    
    return {
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "completed_campaigns": completed_campaigns,
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_submitted": 0,
        "open_rate": round(open_rate, 1),
        "click_rate": round(click_rate, 1),
        "submission_rate": submission_rate,
        "click_to_open_rate": round(click_to_open_rate, 1),
        "period_days": days
    }


@router.get("/click-details")
async def get_click_details(request: Request, days: int = 30, org_id: str = None):
    """Get detailed information about users who clicked on phishing links"""
    user = await require_admin(request)
    db = get_db()
    
    # Get targets who clicked
    query = {"link_clicked": True}
    
    targets = await db.phishing_targets.find(query, {"_id": 0}).to_list(10000)
    
    # Get campaign and user details for each click
    click_details = []
    for target in targets:
        # Get campaign info
        campaign = await db.phishing_campaigns.find_one(
            {"campaign_id": target["campaign_id"]}, {"_id": 0}
        )
        
        # Get user info
        user_info = await db.users.find_one(
            {"user_id": target.get("user_id")}, {"_id": 0, "name": 1, "email": 1, "organization_id": 1}
        )
        
        # Get organization info
        org_info = None
        if user_info and user_info.get("organization_id"):
            org_info = await db.organizations.find_one(
                {"organization_id": user_info["organization_id"]}, {"_id": 0, "name": 1}
            )
        
        # Filter by org_id if specified
        if org_id and user_info and user_info.get("organization_id") != org_id:
            continue
            
        # For org_admin, only show their organization's data
        if user.get("role") == "org_admin" and user_info:
            if user_info.get("organization_id") != user.get("organization_id"):
                continue
        
        click_details.append({
            "user_name": user_info.get("name") if user_info else target.get("user_name", "Unknown"),
            "user_email": target.get("user_email"),
            "organization_name": org_info.get("name") if org_info else "Unknown",
            "organization_id": user_info.get("organization_id") if user_info else None,
            "campaign_name": campaign.get("name") if campaign else "Unknown Campaign",
            "campaign_id": target.get("campaign_id"),
            "clicked_at": target.get("link_clicked_at"),
            "click_ip": target.get("click_ip"),
            "click_user_agent": target.get("click_user_agent")
        })
    
    # Sort by click time descending
    click_details.sort(key=lambda x: x.get("clicked_at") or "", reverse=True)
    
    return {
        "click_details": click_details,
        "total": len(click_details)
    }


@router.get("/best-performing")
async def get_best_performing_campaigns(request: Request, limit: int = 10):
    """Get best performing phishing campaigns (lowest click rates)"""
    await require_admin(request)
    db = get_db()
    
    campaigns = await db.phishing_campaigns.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate stats for each campaign
    campaign_stats = []
    for campaign in campaigns:
        targets = await db.phishing_targets.find(
            {"campaign_id": campaign["campaign_id"]}, {"_id": 0}
        ).to_list(10000)
        
        # Only count targets where an email was actually sent.  This prevents
        # draft or unsent targets from inflating the sent count.
        total_sent = sum(1 for t in targets if t.get("email_sent"))
        total_clicked = sum(1 for t in targets if t.get("link_clicked"))
        click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0
        
        campaign_stats.append({
            "campaign_id": campaign["campaign_id"],
            "name": campaign.get("name"),
            "organization_id": campaign.get("organization_id"),
            "status": campaign.get("status"),
            "total_sent": total_sent,
            "total_clicked": total_clicked,
            "click_rate": round(click_rate, 1),
            "created_at": campaign.get("created_at")
        })
    
    # Sort by click rate (lower is better for security awareness)
    campaign_stats.sort(key=lambda x: (x["click_rate"], -x["total_sent"]))
    
    return {
        "campaigns": campaign_stats[:limit],
        "total": len(campaign_stats)
    }


@router.post("/campaigns/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str, request: Request):
    """Duplicate an existing campaign for editing"""
    await require_admin(request)
    db = get_db()
    
    # Get original campaign
    original = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get original targets
    original_targets = await db.phishing_targets.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(10000)
    
    # Create new campaign with copy
    new_campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    new_campaign = {
        **original,
        "campaign_id": new_campaign_id,
        "name": f"{original.get('name', 'Campaign')} (Copy)",
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "launched_at": None,
        "emails_sent": 0,
        "emails_opened": 0,
        "links_clicked": 0,
        "total_targets": len(original_targets)
    }
    
    await db.phishing_campaigns.insert_one(new_campaign)
    
    # Copy targets with new IDs and tracking codes
    if original_targets:
        new_targets = []
        for t in original_targets:
            new_target = {
                "target_id": f"tgt_{uuid.uuid4().hex[:12]}",
                "campaign_id": new_campaign_id,
                "user_id": t["user_id"],
                "user_email": t["user_email"],
                "user_name": t["user_name"],
                "tracking_code": generate_tracking_code(),
                "email_sent": False,
                "email_sent_at": None,
                "email_opened": False,
                "email_opened_at": None,
                "link_clicked": False,
                "link_clicked_at": None
            }
            new_targets.append(new_target)
        await db.phishing_targets.insert_many(new_targets)
    
    return {
        "message": "Campaign duplicated successfully",
        "campaign_id": new_campaign_id,
        "name": new_campaign["name"],
        "total_targets": len(original_targets)
    }


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
    
    # Get campaign and target info for personalized message
    user_name = "User"
    user_email = ""
    scenario_type = "phishing_email"
    organization_id = None
    user_id = None
    campaign_id = None
    
    if result:
        campaign = result.get("campaign", {})
        target = result.get("target", {})
        user_name = target.get("user_name", "User")
        user_email = target.get("user_email", "")  # Fixed: was looking for "email" but field is "user_email"
        scenario_type = campaign.get("scenario_type", "phishing_email")
        organization_id = campaign.get("organization_id")
        campaign_id = campaign.get("campaign_id")
        
        # Get user_id directly from target (already stored there)
        user_id = target.get("user_id")
        
        # If not in target, look up from users collection
        if not user_id and user_email:
            user_doc = await db.users.find_one({"email": user_email}, {"_id": 0, "user_id": 1, "organization_id": 1})
            if user_doc:
                user_id = user_doc.get("user_id")
                if not organization_id:
                    organization_id = user_doc.get("organization_id")
        
        # Record training failure for the user
        if user_id:
            failure_record = {
                "failure_id": f"fail_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "user_email": user_email,
                "organization_id": organization_id,
                "campaign_id": campaign_id,
                "scenario_type": scenario_type,
                "failure_type": "clicked_phishing_link",
                "tracking_code": tracking_code,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "pending_training"  # Will be updated when user completes training
            }
            await db.training_failures.insert_one(failure_record)
            
            # ===== AUTOMATIC RETRAINING FLOW =====
            try:
                from services.email_service import (
                    send_retraining_email, 
                    send_training_failure_notification
                )
                
                # 1. Send retraining email to the user
                await send_retraining_email(
                    user_email=user_email,
                    user_name=user_name,
                    scenario_type=scenario_type,
                    db=db
                )
                logger.info(f"Retraining email sent to {user_email}")
                
                # 2. Reset user's training progress for this scenario
                await db.training_progress.update_many(
                    {"user_id": user_id, "scenario_type": scenario_type},
                    {"$set": {"status": "reset", "reset_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Training progress reset for {user_email}")
                
                # 3. Notify admins (org_admin and super_admin)
                admin_emails = []
                
                # Get super admins
                super_admins = await db.users.find(
                    {"role": "super_admin", "is_active": True},
                    {"_id": 0, "email": 1}
                ).to_list(100)
                admin_emails.extend([a["email"] for a in super_admins])
                
                # Get org admin for the user's organization
                if organization_id:
                    org_admins = await db.users.find(
                        {"role": "org_admin", "organization_id": organization_id, "is_active": True},
                        {"_id": 0, "email": 1}
                    ).to_list(100)
                    admin_emails.extend([a["email"] for a in org_admins])
                
                # Get organization name
                org_name = None
                if organization_id:
                    org_doc = await db.organizations.find_one(
                        {"organization_id": organization_id},
                        {"_id": 0, "name": 1}
                    )
                    org_name = org_doc.get("name") if org_doc else None
                
                # Send notification to all admins
                if admin_emails:
                    await send_training_failure_notification(
                        admin_emails=list(set(admin_emails)),  # Remove duplicates
                        user_name=user_name,
                        user_email=user_email,
                        organization_name=org_name,
                        scenario_type=scenario_type,
                        db=db
                    )
                    logger.info(f"Training failure notification sent to {len(admin_emails)} admins")

                # 4. Automatically create new training sessions (reassign) for the user
                #    Get all active modules and assign them.  This ensures the user
                #    completes remedial training across relevant modules.  The
                #    sessions are created with status "reassigned" so the UI
                #    can differentiate them from normal sessions.
                try:
                    # Get the assigned module for this campaign, if any
                    assigned_module_id = campaign.get("assigned_module_id") if campaign else None
                    
                    if assigned_module_id:
                        # Assign only the specific module linked to this campaign
                        mod = await db.training_modules.find_one(
                            {"module_id": assigned_module_id, "is_active": True},
                            {"_id": 0, "module_id": 1, "scenarios_count": 1, "questions": 1}
                        )
                        if mod:
                            total_q = len(mod.get("questions") or []) or mod.get("scenarios_count", 0)
                            existing = await db.training_sessions.find_one(
                                {"user_id": user_id, "module_id": assigned_module_id, "status": "reassigned"},
                                {"_id": 1}
                            )
                            if not existing:
                                session_id = f"sess_{uuid.uuid4().hex[:12]}"
                                session_doc = {
                                    "session_id": session_id,
                                    "user_id": user_id,
                                    "module_id": assigned_module_id,
                                    "campaign_id": campaign_id,
                                    "status": "reassigned",
                                    "score": 0,
                                    "total_questions": total_q,
                                    "correct_answers": 0,
                                    "current_scenario_index": 0,
                                    "answers": [],
                                    "started_at": datetime.now(timezone.utc).isoformat(),
                                    "completed_at": None
                                }
                                await db.training_sessions.insert_one(session_doc)
                    else:
                        # No specific module assigned - assign all active modules
                        active_modules = await db.training_modules.find(
                            {"is_active": True}, {"_id": 0, "module_id": 1, "scenarios_count": 1, "questions": 1}
                        ).to_list(1000)
                        for mod in active_modules:
                            module_id = mod.get("module_id")
                            total_q = len(mod.get("questions") or []) or mod.get("scenarios_count", 0)
                            existing = await db.training_sessions.find_one(
                                {"user_id": user_id, "module_id": module_id, "status": "reassigned"},
                                {"_id": 1}
                            )
                            if existing:
                                continue
                            session_id = f"sess_{uuid.uuid4().hex[:12]}"
                            session_doc = {
                                "session_id": session_id,
                                "user_id": user_id,
                                "module_id": module_id,
                                "campaign_id": campaign_id,
                                "status": "reassigned",
                                "score": 0,
                                "total_questions": total_q,
                                "correct_answers": 0,
                                "current_scenario_index": 0,
                                "answers": [],
                                "started_at": datetime.now(timezone.utc).isoformat(),
                                "completed_at": None
                            }
                            await db.training_sessions.insert_one(session_doc)
                    logger.info(f"Auto-reassigned training modules for user {user_email}")
                except Exception as reassign_err:
                    logger.error(f"Failed to auto reassign training: {reassign_err}")
                    
            except Exception as e:
                logger.error(f"Error in automatic retraining flow: {e}")
    
    # IMPORTANT: Always show the phishing awareness page when someone clicks
    # Do NOT redirect to custom landing page - that defeats the purpose
    
    # Build personalized landing page with auto-redirect
    scenario_messages = {
        "phishing_email": {
            "title": "Phishing Email Detected",
            "risk": "Your login credentials, personal data, or financial information could have been stolen.",
            "icon": "&#9888;",  # Warning sign
            "color": "#FF6B6B"
        },
        "qr_code_phishing": {
            "title": "QR Code Phishing Attempt",
            "risk": "Malicious websites could have harvested your credentials or installed malware.",
            "icon": "&#9888;",
            "color": "#9C27B0"
        },
        "bec_scenario": {
            "title": "Business Email Compromise",
            "risk": "Unauthorized wire transfers, data theft, or impersonation attacks could have occurred.",
            "icon": "&#128176;",  # Money bag
            "color": "#FF5722"
        },
        "usb_drop": {
            "title": "USB Drop Attack",
            "risk": "Malware could have been installed on your device, compromising the entire network.",
            "icon": "&#128187;",  # Computer
            "color": "#00BCD4"
        },
        "mfa_fatigue": {
            "title": "MFA Fatigue Attack",
            "risk": "Your account could have been compromised despite multi-factor authentication.",
            "icon": "&#128274;",  # Lock
            "color": "#E91E63"
        },
        "data_handling_trap": {
            "title": "Data Handling Violation",
            "risk": "Sensitive company or customer data could have been exposed to unauthorized parties.",
            "icon": "&#128196;",  # Document
            "color": "#795548"
        },
        "ransomware_readiness": {
            "title": "Ransomware Attempt",
            "risk": "Your files and entire systems could have been encrypted and held for ransom.",
            "icon": "&#128274;",  # Lock
            "color": "#f44336"
        },
        "shadow_it_detection": {
            "title": "Shadow IT Risk",
            "risk": "Unauthorized applications could have exposed company data or created compliance violations.",
            "icon": "&#9729;",  # Cloud
            "color": "#607D8B"
        }
    }
    
    msg = scenario_messages.get(scenario_type, scenario_messages["phishing_email"])
    
    # Default landing page - phishing awareness message with auto-redirect
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Security Training Alert</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * {{ box-sizing: border-box; }}
            body {{ 
                font-family: 'Segoe UI', Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #0D1117 0%, #161B22 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{ 
                background: #161B22;
                padding: 40px; 
                border-radius: 16px; 
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                max-width: 600px;
                width: 100%;
                text-align: center;
                border: 1px solid #30363D;
            }}
            .icon {{ 
                font-size: 64px; 
                margin-bottom: 20px;
            }}
            h1 {{ 
                color: {msg['color']}; 
                margin: 0 0 10px 0;
                font-size: 28px;
            }}
            .subtitle {{
                color: #8B949E;
                margin-bottom: 30px;
            }}
            .alert {{ 
                background: rgba(255, 107, 107, 0.1); 
                border: 1px solid {msg['color']}40;
                padding: 20px; 
                border-radius: 12px; 
                margin: 20px 0;
                text-align: left;
            }}
            .alert h3 {{
                color: {msg['color']};
                margin: 0 0 10px 0;
            }}
            .alert p {{
                color: #E6EDF3;
                margin: 0;
                line-height: 1.6;
            }}
            .risk-box {{
                background: #0D1117;
                border: 1px solid #30363D;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .risk-box h4 {{
                color: #D4A836;
                margin: 0 0 10px 0;
            }}
            .risk-box ul {{
                text-align: left;
                color: #8B949E;
                margin: 0;
                padding-left: 20px;
            }}
            .risk-box li {{
                margin: 8px 0;
            }}
            .countdown {{
                background: #D4A836;
                color: #000;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: bold;
                display: inline-block;
                margin: 20px 0;
            }}
            .countdown span {{
                font-size: 24px;
            }}
            .btn {{
                background: #D4A836;
                color: #000;
                padding: 15px 40px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                transition: all 0.3s;
            }}
            .btn:hover {{
                background: #C49A30;
                transform: translateY(-2px);
            }}
            .footer {{
                margin-top: 30px;
                color: #484F58;
                font-size: 14px;
            }}
            .user-info {{
                color: #D4A836;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">{msg['icon']}</div>
            <h1>{msg['title']}</h1>
            <p class="subtitle">This was a simulated security test</p>
            
            <div class="alert">
                <h3>&#9888; You Clicked on a Test Link</h3>
                <p>
                    Hi <span class="user-info">{user_name}</span>, this was a security awareness exercise 
                    conducted by your organization. In a real attack scenario:
                </p>
            </div>
            
            <div class="risk-box">
                <h4>&#128161; What Could Have Happened</h4>
                <p style="color: #E6EDF3; margin-bottom: 15px;">{msg['risk']}</p>
                <ul>
                    <li>Attackers could have gained access to your account</li>
                    <li>Sensitive data could have been compromised</li>
                    <li>Malware could have been installed on your device</li>
                    <li>Your organization's network could have been breached</li>
                </ul>
            </div>
            
            <div class="countdown">
                You will be able to continue your security training in <span id="timer">10</span> seconds...
            </div>
            
            <br><br>
            
            <a href="/training" class="btn" id="trainingBtn">Start Training Now</a>
            
            <p class="footer">
                Powered by Vasilis NetShield Security Training<br>
                <small>Building cyber-aware organizations</small>
            </p>
        </div>
        
        <script>
            // Simple countdown timer. We no longer auto‑redirect when the
            // timer reaches zero.  Users can click the "Start Training Now"
            // button at any time to proceed to their training dashboard.
            let seconds = 10;
            const timer = document.getElementById('timer');
            const countdown = setInterval(() => {{
                seconds--;
                timer.textContent = seconds;
                if (seconds <= 0) {{
                    clearInterval(countdown);
                }}
            }}, 1000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# ============== TRAINING FAILURES API ==============

@router.get("/training-failures")
async def get_training_failures(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    status: str = None,
    organization_id: str = None
):
    """Get training failures for dashboard tracking
    - Super admins see all failures
    - Org admins see only their organization's failures
    """
    user = await require_admin(request)
    db = get_db()
    
    query = {}
    
    # Role-based filtering
    if user.get("role") == UserRole.ORG_ADMIN:
        # Org admins can only see their organization's failures
        query["organization_id"] = user.get("organization_id")
    elif organization_id:
        # Super admin can filter by org
        query["organization_id"] = organization_id
    
    if status:
        query["status"] = status
    
    failures = await db.training_failures.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.training_failures.count_documents(query)
    
    # Get stats
    pending_count = await db.training_failures.count_documents({**query, "status": "pending_training"})
    completed_count = await db.training_failures.count_documents({**query, "status": "completed_training"})
    
    return {
        "failures": failures,
        "total": total,
        "pending": pending_count,
        "completed": completed_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/training-failures/stats")
async def get_training_failure_stats(
    request: Request,
    organization_id: str = None
):
    """Get aggregated stats on training failures"""
    user = await require_admin(request)
    db = get_db()
    
    query = {}
    
    if user.get("role") == UserRole.ORG_ADMIN:
        query["organization_id"] = user.get("organization_id")
    elif organization_id:
        query["organization_id"] = organization_id
    
    # By scenario type
    by_type_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$scenario_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type = await db.training_failures.aggregate(by_type_pipeline).to_list(20)
    
    # By status
    by_status_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    by_status = await db.training_failures.aggregate(by_status_pipeline).to_list(10)
    
    # Recent failures (last 7 days)
    from datetime import timedelta
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_query = {**query, "timestamp": {"$gte": seven_days_ago}}
    recent_count = await db.training_failures.count_documents(recent_query)
    
    # Repeat offenders (users who failed multiple times)
    repeat_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$user_email", "failures": {"$sum": 1}}},
        {"$match": {"failures": {"$gt": 1}}},
        {"$count": "repeat_offenders"}
    ]
    repeat_result = await db.training_failures.aggregate(repeat_pipeline).to_list(1)
    repeat_offenders = repeat_result[0]["repeat_offenders"] if repeat_result else 0
    
    return {
        "by_scenario_type": {item["_id"]: item["count"] for item in by_type if item["_id"]},
        "by_status": {item["_id"]: item["count"] for item in by_status if item["_id"]},
        "recent_failures": recent_count,
        "repeat_offenders": repeat_offenders
    }


@router.patch("/training-failures/{failure_id}/complete")
async def mark_training_completed(failure_id: str, request: Request):
    """Mark a training failure as completed (user finished remedial training)"""
    await require_admin(request)
    db = get_db()
    
    result = await db.training_failures.update_one(
        {"failure_id": failure_id},
        {
            "$set": {
                "status": "completed_training",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Failure record not found")
    
    return {"message": "Training marked as completed", "failure_id": failure_id}


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


# ============== MEDIA/IMAGE ROUTES ==============

@router.post("/media/upload")
async def upload_phishing_media(request: Request, file: UploadFile = File(...)):
    """Upload an image for use in phishing email templates"""
    user = await require_admin(request)
    db = get_db()
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP, GIF")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    
    image_id = f"phimg_{uuid.uuid4().hex[:12]}"
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    image_doc = {
        "image_id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "data_url": data_url,
        "size": len(contents),
        "uploaded_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.phishing_media.insert_one(image_doc)
    
    return {
        "image_id": image_id,
        "filename": file.filename,
        "data_url": data_url,
        "message": "Image uploaded successfully"
    }


@router.get("/media")
async def list_phishing_media(request: Request, limit: int = 50):
    """List all uploaded images for phishing templates"""
    await require_admin(request)
    db = get_db()
    
    images = await db.phishing_media.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"images": images}


@router.get("/media/{image_id}")
async def get_phishing_media(image_id: str, request: Request):
    """Get a specific image"""
    await require_admin(request)
    db = get_db()
    
    image = await db.phishing_media.find_one({"image_id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return image


@router.delete("/media/{image_id}")
async def delete_phishing_media(image_id: str, request: Request):
    """Delete an image from the library"""
    await require_admin(request)
    db = get_db()
    
    result = await db.phishing_media.delete_one({"image_id": image_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return {"message": "Image deleted"}
