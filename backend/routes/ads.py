"""
Malicious Ad Simulation Routes
Create and track fake ad campaigns to test employee awareness
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets

from models import UserRole

router = APIRouter(prefix="/ads", tags=["Ad Simulation"])


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

class AdTemplateCreate(BaseModel):
    name: str
    ad_type: str  # banner, popup, sidebar, native
    headline: str
    description: str
    image_url: Optional[str] = None
    call_to_action: str
    style_css: Optional[str] = None


class AdTemplateResponse(BaseModel):
    template_id: str
    name: str
    ad_type: str
    headline: str
    description: str
    image_url: Optional[str] = None
    call_to_action: str
    style_css: Optional[str] = None
    created_at: datetime
    created_by: str


class AdCampaignCreate(BaseModel):
    name: str
    organization_id: str
    template_id: str
    target_user_ids: List[str]


class AdCampaignResponse(BaseModel):
    campaign_id: str
    name: str
    organization_id: str
    template_id: str
    status: str
    total_targets: int
    ads_viewed: int
    ads_clicked: int
    created_at: datetime


class AdTargetResponse(BaseModel):
    target_id: str
    campaign_id: str
    user_id: str
    user_email: str
    user_name: str
    tracking_code: str
    ad_viewed: bool
    ad_viewed_at: Optional[datetime] = None
    ad_clicked: bool
    ad_clicked_at: Optional[datetime] = None


class AdStatsResponse(BaseModel):
    campaign_id: str
    campaign_name: str
    total_targets: int
    ads_viewed: int
    ads_clicked: int
    view_rate: float
    click_rate: float
    status: str


# ============== TEMPLATE ROUTES ==============

@router.post("/templates", response_model=AdTemplateResponse)
async def create_ad_template(data: AdTemplateCreate, request: Request):
    """Create a new malicious ad template"""
    user = await require_admin(request)
    db = get_db()
    
    template_id = f"adtmpl_{uuid.uuid4().hex[:12]}"
    template_doc = {
        "template_id": template_id,
        "name": data.name,
        "ad_type": data.ad_type,
        "headline": data.headline,
        "description": data.description,
        "image_url": data.image_url,
        "call_to_action": data.call_to_action,
        "style_css": data.style_css,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ad_templates.insert_one(template_doc)
    
    return AdTemplateResponse(
        template_id=template_id,
        name=data.name,
        ad_type=data.ad_type,
        headline=data.headline,
        description=data.description,
        image_url=data.image_url,
        call_to_action=data.call_to_action,
        style_css=data.style_css,
        created_at=datetime.fromisoformat(template_doc["created_at"]),
        created_by=user["user_id"]
    )


@router.get("/templates", response_model=List[AdTemplateResponse])
async def list_ad_templates(request: Request):
    """List all ad templates"""
    await require_admin(request)
    db = get_db()
    
    templates = await db.ad_templates.find({}, {"_id": 0}).to_list(1000)
    result = []
    for t in templates:
        created_at = t.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(AdTemplateResponse(
            template_id=t["template_id"],
            name=t["name"],
            ad_type=t.get("ad_type", "banner"),
            headline=t.get("headline", ""),
            description=t.get("description", ""),
            image_url=t.get("image_url"),
            call_to_action=t.get("call_to_action", ""),
            style_css=t.get("style_css"),
            created_at=created_at,
            created_by=t.get("created_by", "")
        ))
    return result


@router.delete("/templates/{template_id}")
async def delete_ad_template(template_id: str, request: Request):
    """Delete an ad template"""
    await require_admin(request)
    db = get_db()
    
    result = await db.ad_templates.delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


@router.post("/templates/seed-defaults")
async def seed_default_ad_templates(request: Request):
    """Create default malicious ad templates"""
    user = await require_admin(request)
    db = get_db()
    
    default_templates = [
        {
            "template_id": f"adtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Free iPhone Giveaway",
            "ad_type": "popup",
            "headline": "Congratulations! You've Won!",
            "description": "You're the 1,000,000th visitor! Click now to claim your FREE iPhone 15 Pro!",
            "image_url": None,
            "call_to_action": "CLAIM NOW!!!",
            "style_css": "background: linear-gradient(135deg, #ff6b6b, #ffa500); color: white;",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"adtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Fake Antivirus Warning",
            "ad_type": "popup",
            "headline": "WARNING: Your Computer is Infected!",
            "description": "We detected 23 viruses on your system! Download our FREE antivirus now to protect your data!",
            "image_url": None,
            "call_to_action": "Download Protection",
            "style_css": "background: #ff0000; color: white; border: 3px solid yellow;",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"adtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Flash Player Update",
            "ad_type": "banner",
            "headline": "Your Flash Player is Out of Date",
            "description": "Critical security update required. Your browser may be vulnerable.",
            "image_url": None,
            "call_to_action": "Update Now",
            "style_css": "background: #1a1a2e; color: #e94560;",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "template_id": f"adtmpl_{uuid.uuid4().hex[:12]}",
            "name": "Work From Home Scam",
            "ad_type": "native",
            "headline": "Make $5,000/Week Working From Home!",
            "description": "Local mom discovers this ONE WEIRD TRICK to make money online. Banks hate her!",
            "image_url": None,
            "call_to_action": "Learn Her Secret",
            "style_css": "background: white; color: #333; border: 1px solid #ddd;",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Check for existing templates
    existing = await db.ad_templates.find({}, {"name": 1}).to_list(1000)
    existing_names = {t["name"] for t in existing}
    
    new_templates = [t for t in default_templates if t["name"] not in existing_names]
    
    if new_templates:
        await db.ad_templates.insert_many(new_templates)
    
    return {
        "message": f"Created {len(new_templates)} default ad templates",
        "templates_created": [t["name"] for t in new_templates]
    }


# ============== CAMPAIGN ROUTES ==============

@router.post("/campaigns", response_model=AdCampaignResponse)
async def create_ad_campaign(data: AdCampaignCreate, request: Request):
    """Create a new ad simulation campaign"""
    user = await require_admin(request)
    db = get_db()
    
    # Verify template exists
    template = await db.ad_templates.find_one({"template_id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Verify organization exists
    org = await db.organizations.find_one({"organization_id": data.organization_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify target users exist
    target_users = await db.users.find(
        {"user_id": {"$in": data.target_user_ids}},
        {"_id": 0}
    ).to_list(10000)
    
    if len(target_users) != len(data.target_user_ids):
        raise HTTPException(status_code=400, detail="Some target users not found")
    
    campaign_id = f"adcamp_{uuid.uuid4().hex[:12]}"
    campaign_doc = {
        "campaign_id": campaign_id,
        "name": data.name,
        "organization_id": data.organization_id,
        "template_id": data.template_id,
        "status": "active",  # Ad campaigns are active immediately
        "total_targets": len(target_users),
        "ads_viewed": 0,
        "ads_clicked": 0,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ad_campaigns.insert_one(campaign_doc)
    
    # Create target records with unique tracking codes
    targets = []
    for u in target_users:
        target_doc = {
            "target_id": f"adtgt_{uuid.uuid4().hex[:12]}",
            "campaign_id": campaign_id,
            "user_id": u["user_id"],
            "user_email": u["email"],
            "user_name": u["name"],
            "tracking_code": secrets.token_urlsafe(16),
            "ad_viewed": False,
            "ad_viewed_at": None,
            "ad_clicked": False,
            "ad_clicked_at": None,
            "click_ip": None,
            "click_user_agent": None
        }
        targets.append(target_doc)
    
    if targets:
        await db.ad_targets.insert_many(targets)
    
    return AdCampaignResponse(
        campaign_id=campaign_id,
        name=data.name,
        organization_id=data.organization_id,
        template_id=data.template_id,
        status="active",
        total_targets=len(target_users),
        ads_viewed=0,
        ads_clicked=0,
        created_at=datetime.fromisoformat(campaign_doc["created_at"])
    )


@router.get("/campaigns", response_model=List[AdCampaignResponse])
async def list_ad_campaigns(
    organization_id: Optional[str] = None,
    request: Request = None
):
    """List all ad campaigns"""
    await require_admin(request)
    db = get_db()
    
    query = {}
    if organization_id:
        query["organization_id"] = organization_id
    
    campaigns = await db.ad_campaigns.find(query, {"_id": 0}).to_list(1000)
    result = []
    for c in campaigns:
        created_at = c.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(AdCampaignResponse(
            campaign_id=c["campaign_id"],
            name=c["name"],
            organization_id=c.get("organization_id", ""),
            template_id=c.get("template_id", ""),
            status=c.get("status", "active"),
            total_targets=c.get("total_targets", 0),
            ads_viewed=c.get("ads_viewed", 0),
            ads_clicked=c.get("ads_clicked", 0),
            created_at=created_at
        ))
    return result


@router.get("/campaigns/{campaign_id}/targets", response_model=List[AdTargetResponse])
async def list_campaign_targets(campaign_id: str, request: Request):
    """List all targets in an ad campaign"""
    await require_admin(request)
    db = get_db()
    
    targets = await db.ad_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    
    result = []
    for t in targets:
        def parse_dt(val):
            if val is None:
                return None
            if isinstance(val, str):
                return datetime.fromisoformat(val)
            return val
        
        result.append(AdTargetResponse(
            target_id=t["target_id"],
            campaign_id=t["campaign_id"],
            user_id=t["user_id"],
            user_email=t["user_email"],
            user_name=t["user_name"],
            tracking_code=t["tracking_code"],
            ad_viewed=t.get("ad_viewed", False),
            ad_viewed_at=parse_dt(t.get("ad_viewed_at")),
            ad_clicked=t.get("ad_clicked", False),
            ad_clicked_at=parse_dt(t.get("ad_clicked_at"))
        ))
    return result


@router.get("/campaigns/{campaign_id}/stats", response_model=AdStatsResponse)
async def get_campaign_stats(campaign_id: str, request: Request):
    """Get statistics for an ad campaign"""
    await require_admin(request)
    db = get_db()
    
    campaign = await db.ad_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    targets = await db.ad_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    
    total = len(targets)
    viewed = sum(1 for t in targets if t.get("ad_viewed"))
    clicked = sum(1 for t in targets if t.get("ad_clicked"))
    
    return AdStatsResponse(
        campaign_id=campaign_id,
        campaign_name=campaign.get("name"),
        total_targets=total,
        ads_viewed=viewed,
        ads_clicked=clicked,
        view_rate=round((viewed / total * 100), 1) if total > 0 else 0,
        click_rate=round((clicked / total * 100), 1) if total > 0 else 0,
        status=campaign.get("status", "active")
    )


@router.delete("/campaigns/{campaign_id}")
async def delete_ad_campaign(campaign_id: str, request: Request):
    """Delete an ad campaign"""
    await require_admin(request)
    db = get_db()
    
    # Delete targets first
    await db.ad_targets.delete_many({"campaign_id": campaign_id})
    
    # Delete campaign
    result = await db.ad_campaigns.delete_one({"campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign deleted"}


# ============== TRACKING ROUTES (Public) ==============

@router.get("/render/{tracking_code}")
async def render_ad(tracking_code: str, request: Request):
    """Render the ad for a specific user (tracks view)"""
    db = get_db()
    
    # Find target
    target = await db.ad_targets.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Get template
    campaign = await db.ad_campaigns.find_one({"campaign_id": target["campaign_id"]}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    template = await db.ad_templates.find_one({"template_id": campaign["template_id"]}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Record view (only first time)
    if not target.get("ad_viewed"):
        await db.ad_targets.update_one(
            {"tracking_code": tracking_code},
            {
                "$set": {
                    "ad_viewed": True,
                    "ad_viewed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        await db.ad_campaigns.update_one(
            {"campaign_id": target["campaign_id"]},
            {"$inc": {"ads_viewed": 1}}
        )
    
    # Generate ad HTML
    click_url = f"/api/ads/track/click/{tracking_code}"
    style = template.get("style_css", "background: #fff; color: #333;")
    
    ad_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: Arial, sans-serif; }}
            .ad-container {{
                {style}
                padding: 20px;
                text-align: center;
                border-radius: 8px;
                max-width: 400px;
                margin: 10px auto;
                cursor: pointer;
            }}
            .ad-headline {{ font-size: 18px; font-weight: bold; margin-bottom: 10px; }}
            .ad-description {{ font-size: 14px; margin-bottom: 15px; }}
            .ad-cta {{
                display: inline-block;
                padding: 10px 20px;
                background: rgba(255,255,255,0.2);
                border: 2px solid currentColor;
                border-radius: 5px;
                font-weight: bold;
                text-decoration: none;
                color: inherit;
            }}
            .ad-cta:hover {{ background: rgba(255,255,255,0.3); }}
        </style>
    </head>
    <body>
        <div class="ad-container" onclick="window.location.href='{click_url}'">
            <div class="ad-headline">{template['headline']}</div>
            <div class="ad-description">{template['description']}</div>
            <a href="{click_url}" class="ad-cta">{template['call_to_action']}</a>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=ad_html)


@router.get("/track/click/{tracking_code}")
async def track_ad_click(tracking_code: str, request: Request):
    """Track when an ad is clicked"""
    db = get_db()
    
    target = await db.ad_targets.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Record click (only first time)
    if not target.get("ad_clicked"):
        await db.ad_targets.update_one(
            {"tracking_code": tracking_code},
            {
                "$set": {
                    "ad_clicked": True,
                    "ad_clicked_at": datetime.now(timezone.utc).isoformat(),
                    "click_ip": request.client.host if request.client else None,
                    "click_user_agent": request.headers.get("user-agent")
                }
            }
        )
        await db.ad_campaigns.update_one(
            {"campaign_id": target["campaign_id"]},
            {"$inc": {"ads_clicked": 1}}
        )
    
    # Show awareness landing page
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Security Training Alert</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                text-align: center; 
                background: #f5f5f5; 
            }
            .container { 
                background: white; 
                padding: 40px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            h1 { color: #D4A836; }
            .alert { 
                background: #fff3cd; 
                border: 1px solid #ffc107; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0; 
            }
            .warning-icon { font-size: 48px; color: #ffc107; }
            ul { text-align: left; margin: 20px 0; }
            li { margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="warning-icon">&#9888;</div>
            <h1>This Was a Security Training Exercise</h1>
            <div class="alert">
                <strong>You clicked on a simulated malicious advertisement!</strong><br><br>
                This was part of a security awareness training exercise.
            </div>
            <p>In a real scenario, clicking suspicious ads could:</p>
            <ul>
                <li>Install malware or ransomware on your device</li>
                <li>Redirect you to phishing sites that steal credentials</li>
                <li>Download unwanted software or browser extensions</li>
                <li>Expose your personal or company data</li>
            </ul>
            <h3>How to Spot Malicious Ads:</h3>
            <ul>
                <li><strong>Too good to be true:</strong> Free prizes, instant money</li>
                <li><strong>Urgency tactics:</strong> "Act now!", countdown timers</li>
                <li><strong>Scare tactics:</strong> "Your computer is infected!"</li>
                <li><strong>Poor grammar:</strong> Typos and odd phrasing</li>
            </ul>
            <p style="margin-top: 30px; color: #666;">
                Powered by Vasilis NetShield Security Training
            </p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


# ============== EMBED CODE GENERATION ==============

@router.get("/campaigns/{campaign_id}/embed/{user_id}")
async def get_ad_embed_code(campaign_id: str, user_id: str, request: Request):
    """Get embed code to display ad for a specific user"""
    await require_admin(request)
    db = get_db()
    
    target = await db.ad_targets.find_one(
        {"campaign_id": campaign_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    import os
    base_url = os.environ.get('FRONTEND_URL', str(request.base_url).rstrip('/'))
    
    embed_url = f"{base_url}/api/ads/render/{target['tracking_code']}"
    
    return {
        "tracking_code": target["tracking_code"],
        "embed_url": embed_url,
        "iframe_code": f'<iframe src="{embed_url}" width="400" height="200" frameborder="0"></iframe>',
        "direct_link": f"{base_url}/api/ads/track/click/{target['tracking_code']}"
    }


# ============== MASKED PUBLIC TRACKING URL ==============

@router.get("/track/view/{campaign_id}")
async def public_track_view(campaign_id: str, request: Request):
    """
    Public-facing masked tracking URL for ad campaigns.
    URL format: /api/ads/track/view/{campaign_id}?u={user_tracking_code}
    This provides a cleaner URL than the internal tracking code URL.
    """
    db = get_db()
    
    # Get tracking code from query param
    tracking_code = request.query_params.get("u")
    
    if not tracking_code:
        # If no tracking code, redirect to a generic awareness page
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head><title>Security Training</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>Security Awareness Training</h1>
            <p>This link requires a valid tracking parameter.</p>
        </body>
        </html>
        """)
    
    # Find target
    target = await db.ad_targets.find_one({"tracking_code": tracking_code}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Verify campaign matches
    if target["campaign_id"] != campaign_id:
        raise HTTPException(status_code=404, detail="Invalid tracking link")
    
    # Get template
    campaign = await db.ad_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    template = await db.ad_templates.find_one({"template_id": campaign["template_id"]}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Record view (only first time)
    if not target.get("ad_viewed"):
        await db.ad_targets.update_one(
            {"tracking_code": tracking_code},
            {
                "$set": {
                    "ad_viewed": True,
                    "ad_viewed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        await db.ad_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$inc": {"ads_viewed": 1}}
        )
    
    # Generate click URL using the masked format
    click_url = f"/api/ads/track/click/{tracking_code}"
    style = template.get("style_css", "background: #fff; color: #333;")
    
    ad_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: Arial, sans-serif; }}
            .ad-container {{
                {style}
                padding: 20px;
                text-align: center;
                border-radius: 8px;
                max-width: 400px;
                margin: 10px auto;
                cursor: pointer;
            }}
            .ad-headline {{ font-size: 18px; font-weight: bold; margin-bottom: 10px; }}
            .ad-description {{ font-size: 14px; margin-bottom: 15px; }}
            .ad-cta {{
                display: inline-block;
                padding: 10px 20px;
                background: rgba(255,255,255,0.2);
                border: 2px solid currentColor;
                border-radius: 5px;
                font-weight: bold;
                text-decoration: none;
                color: inherit;
            }}
            .ad-cta:hover {{ background: rgba(255,255,255,0.3); }}
        </style>
    </head>
    <body>
        <div class="ad-container" onclick="window.location.href='{click_url}'">
            <div class="ad-headline">{template['headline']}</div>
            <div class="ad-description">{template['description']}</div>
            <a href="{click_url}" class="ad-cta">{template['call_to_action']}</a>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=ad_html)
