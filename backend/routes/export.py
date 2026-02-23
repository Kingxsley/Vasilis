"""
Export Routes - Reports in Excel and PDF format
"""
from fastapi import APIRouter, HTTPException, Request, Response, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
import io
import secrets

from services.report_service import (
    generate_phishing_campaign_excel,
    generate_phishing_campaign_pdf,
    generate_training_report_excel
)
from services.phishing_service import get_campaign_stats
from models import UserRole

router = APIRouter(prefix="/export", tags=["Export"])

# Temporary download tokens (in-memory, would use Redis in production)
download_tokens = {}


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


def generate_download_token(report_type: str, resource_id: str) -> str:
    """Generate a temporary download token valid for 5 minutes"""
    token = secrets.token_urlsafe(32)
    download_tokens[token] = {
        "type": report_type,
        "resource_id": resource_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5)
    }
    return token


def validate_download_token(token: str, report_type: str, resource_id: str) -> bool:
    """Validate a download token"""
    if token not in download_tokens:
        return False
    
    token_data = download_tokens[token]
    
    # Check expiration
    if datetime.now(timezone.utc) > token_data["expires_at"]:
        del download_tokens[token]
        return False
    
    # Check type and resource
    if token_data["type"] != report_type or token_data["resource_id"] != resource_id:
        return False
    
    # Token is valid, delete it (one-time use)
    del download_tokens[token]
    return True


# ============== TOKEN GENERATION ENDPOINTS ==============

@router.post("/token/phishing/{campaign_id}/{format}")
async def generate_phishing_export_token(campaign_id: str, format: str, request: Request):
    """Generate a download token for phishing campaign export"""
    await require_admin(request)
    
    if format not in ["excel", "pdf"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'excel' or 'pdf'")
    
    db = get_db()
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    token = generate_download_token(f"phishing_{format}", campaign_id)
    
    return {
        "download_url": f"/export/download/phishing/{campaign_id}/{format}?token={token}",
        "expires_in": 300  # 5 minutes
    }


@router.post("/token/training/{format}")
async def generate_training_export_token(format: str, request: Request, organization_id: str = None):
    """Generate a download token for training report export"""
    await require_admin(request)
    
    if format not in ["excel"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'excel'")
    
    resource_id = organization_id or "all"
    token = generate_download_token(f"training_{format}", resource_id)
    
    url = f"/export/download/training/{format}?token={token}"
    if organization_id:
        url += f"&organization_id={organization_id}"
    
    return {
        "download_url": url,
        "expires_in": 300  # 5 minutes
    }


# ============== PUBLIC DOWNLOAD ENDPOINTS (with token) ==============

@router.get("/download/phishing/{campaign_id}/excel")
async def download_phishing_excel(campaign_id: str, token: str = Query(...)):
    """Download phishing campaign Excel report using token"""
    if not validate_download_token(token, "phishing_excel", campaign_id):
        raise HTTPException(status_code=401, detail="Invalid or expired download token")
    
    db = get_db()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    stats = await get_campaign_stats(db, campaign_id)
    excel_bytes = generate_phishing_campaign_excel(campaign, targets, stats)
    
    filename = f"phishing_report_{campaign.get('name', 'campaign').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/phishing/{campaign_id}/pdf")
async def download_phishing_pdf(campaign_id: str, token: str = Query(...)):
    """Download phishing campaign PDF report using token"""
    if not validate_download_token(token, "phishing_pdf", campaign_id):
        raise HTTPException(status_code=401, detail="Invalid or expired download token")
    
    db = get_db()
    
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    stats = await get_campaign_stats(db, campaign_id)
    org = await db.organizations.find_one({"organization_id": campaign.get('organization_id')}, {"_id": 0})
    org_name = org.get('name') if org else None
    pdf_bytes = generate_phishing_campaign_pdf(campaign, targets, stats, org_name)
    
    filename = f"phishing_report_{campaign.get('name', 'campaign').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/training/excel")
async def download_training_excel(token: str = Query(...), organization_id: str = None):
    """Download training report Excel using token"""
    resource_id = organization_id or "all"
    if not validate_download_token(token, "training_excel", resource_id):
        raise HTTPException(status_code=401, detail="Invalid or expired download token")
    
    db = get_db()
    
    query = {}
    if organization_id:
        users = await db.users.find({"organization_id": organization_id}, {"_id": 0}).to_list(10000)
        user_ids = [u["user_id"] for u in users]
        query["user_id"] = {"$in": user_ids}
    
    sessions = await db.training_sessions.find(query, {"_id": 0}).to_list(10000)
    all_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    users_map = {u["user_id"]: u for u in all_users}
    excel_bytes = generate_training_report_excel(sessions, users_map)
    
    filename = f"training_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== ORIGINAL AUTHENTICATED ENDPOINTS ==============


@router.get("/phishing/{campaign_id}/excel")
async def export_phishing_campaign_excel(campaign_id: str, request: Request):
    """Export phishing campaign report as Excel file"""
    await require_admin(request)
    db = get_db()
    
    # Get campaign
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get targets
    targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    
    # Get stats
    stats = await get_campaign_stats(db, campaign_id)
    
    # Generate Excel
    excel_bytes = generate_phishing_campaign_excel(campaign, targets, stats)
    
    # Create filename
    filename = f"phishing_report_{campaign.get('name', 'campaign').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/phishing/{campaign_id}/pdf")
async def export_phishing_campaign_pdf(campaign_id: str, request: Request):
    """Export phishing campaign report as PDF file"""
    await require_admin(request)
    db = get_db()
    
    # Get campaign
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get targets
    targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(10000)
    
    # Get stats
    stats = await get_campaign_stats(db, campaign_id)
    
    # Get organization name
    org = await db.organizations.find_one({"organization_id": campaign.get('organization_id')}, {"_id": 0})
    org_name = org.get('name') if org else None
    
    # Generate PDF
    pdf_bytes = generate_phishing_campaign_pdf(campaign, targets, stats, org_name)
    
    # Create filename
    filename = f"phishing_report_{campaign.get('name', 'campaign').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/training/excel")
async def export_training_report_excel(
    organization_id: str = None,
    request: Request = None
):
    """Export training sessions report as Excel file"""
    await require_admin(request)
    db = get_db()
    
    # Build query
    query = {}
    if organization_id:
        # Get users in org
        users = await db.users.find({"organization_id": organization_id}, {"_id": 0}).to_list(10000)
        user_ids = [u["user_id"] for u in users]
        query["user_id"] = {"$in": user_ids}
    
    # Get sessions
    sessions = await db.training_sessions.find(query, {"_id": 0}).to_list(10000)
    
    # Get all users for mapping
    all_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    users_map = {u["user_id"]: u for u in all_users}
    
    # Generate Excel
    excel_bytes = generate_training_report_excel(sessions, users_map)
    
    filename = f"training_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
