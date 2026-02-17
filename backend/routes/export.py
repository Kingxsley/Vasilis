"""
Export Routes - Reports in Excel and PDF format
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
import io

from services.report_service import (
    generate_phishing_campaign_excel,
    generate_phishing_campaign_pdf,
    generate_training_report_excel
)
from services.phishing_service import get_campaign_stats
from models import UserRole

router = APIRouter(prefix="/export", tags=["Export"])


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
