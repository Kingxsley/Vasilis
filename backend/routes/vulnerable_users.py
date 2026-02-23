"""
Vulnerable Users Routes - Dashboard for tracking users who clicked phishing links
Includes export functionality for CSV/PDF
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vulnerable-users", tags=["Vulnerable Users"])


def get_db():
    from server import db
    return db


async def require_admin(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    from models import UserRole
    credentials = await security(request)
    user = await _get_current_user(request, credentials)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("")
async def get_vulnerable_users(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    risk_level: Optional[str] = None,  # clicked, submitted, repeated
    skip: int = 0,
    limit: int = 100
):
    """
    Get list of vulnerable users who clicked phishing links or submitted credentials.
    
    Risk levels:
    - clicked: Users who clicked phishing links
    - submitted: Users who submitted credentials (higher risk)
    - repeated: Users who failed multiple times (highest risk)
    """
    user = await require_admin(request)
    db = get_db()
    
    # Build date filter
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Build query for phishing targets who clicked
    target_query = {"link_clicked": True}
    
    if campaign_id:
        target_query["campaign_id"] = campaign_id
    
    # Get all clicked targets
    targets = await db.phishing_targets.find(
        target_query,
        {"_id": 0}
    ).to_list(10000)
    
    # Build vulnerable users list with details
    vulnerable_users = {}
    
    for target in targets:
        user_id = target.get("user_id")
        user_email = target.get("user_email")
        
        if not user_email:
            continue
        
        # Get campaign info
        campaign = await db.phishing_campaigns.find_one(
            {"campaign_id": target.get("campaign_id")},
            {"_id": 0, "name": 1, "organization_id": 1}
        )
        
        org_id = campaign.get("organization_id") if campaign else None
        
        # Filter by organization if specified or if org_admin
        if organization_id and org_id != organization_id:
            continue
        if user.get("role") == "org_admin" and org_id != user.get("organization_id"):
            continue
        
        # Get user details
        user_doc = await db.users.find_one(
            {"user_id": user_id} if user_id else {"email": user_email},
            {"_id": 0, "name": 1, "email": 1, "organization_id": 1, "role": 1}
        )
        
        # Get organization name
        org_name = "Unknown"
        if org_id:
            org_doc = await db.organizations.find_one(
                {"organization_id": org_id},
                {"_id": 0, "name": 1}
            )
            org_name = org_doc.get("name") if org_doc else "Unknown"
        
        # Track user stats
        if user_email not in vulnerable_users:
            vulnerable_users[user_email] = {
                "user_id": user_id,
                "user_email": user_email,
                "user_name": user_doc.get("name") if user_doc else target.get("user_name", "Unknown"),
                "organization_id": org_id,
                "organization_name": org_name,
                "clicks": 0,
                "credential_submissions": 0,
                "campaigns_failed": [],
                "first_failure": None,
                "last_failure": None,
                "risk_level": "low"
            }
        
        vu = vulnerable_users[user_email]
        vu["clicks"] += 1
        
        # Track credential submissions
        if target.get("credentials_submitted"):
            vu["credential_submissions"] += 1
        
        # Track campaigns
        campaign_name = campaign.get("name") if campaign else "Unknown"
        if campaign_name not in vu["campaigns_failed"]:
            vu["campaigns_failed"].append(campaign_name)
        
        # Track failure times
        click_time = target.get("link_clicked_at")
        if click_time:
            if isinstance(click_time, str):
                click_time = datetime.fromisoformat(click_time.replace("Z", "+00:00"))
            
            if not vu["first_failure"] or click_time < datetime.fromisoformat(vu["first_failure"].replace("Z", "+00:00") if isinstance(vu["first_failure"], str) else vu["first_failure"].isoformat()):
                vu["first_failure"] = click_time.isoformat() if hasattr(click_time, 'isoformat') else click_time
            
            if not vu["last_failure"] or click_time > datetime.fromisoformat(vu["last_failure"].replace("Z", "+00:00") if isinstance(vu["last_failure"], str) else vu["last_failure"].isoformat()):
                vu["last_failure"] = click_time.isoformat() if hasattr(click_time, 'isoformat') else click_time
    
    # Calculate risk levels
    for email, vu in vulnerable_users.items():
        if vu["credential_submissions"] > 0:
            vu["risk_level"] = "critical"
        elif vu["clicks"] >= 3:
            vu["risk_level"] = "high"
        elif vu["clicks"] >= 2:
            vu["risk_level"] = "medium"
        else:
            vu["risk_level"] = "low"
    
    # Filter by risk level if specified
    if risk_level:
        if risk_level == "submitted":
            vulnerable_users = {k: v for k, v in vulnerable_users.items() if v["credential_submissions"] > 0}
        elif risk_level == "repeated":
            vulnerable_users = {k: v for k, v in vulnerable_users.items() if v["clicks"] >= 2}
        elif risk_level == "clicked":
            pass  # All clicked users are already included
    
    # Convert to list and sort by risk
    users_list = list(vulnerable_users.values())
    risk_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    users_list.sort(key=lambda x: (risk_order.get(x["risk_level"], 4), -x["clicks"]))
    
    # Calculate stats
    total = len(users_list)
    critical_count = sum(1 for u in users_list if u["risk_level"] == "critical")
    high_count = sum(1 for u in users_list if u["risk_level"] == "high")
    medium_count = sum(1 for u in users_list if u["risk_level"] == "medium")
    low_count = sum(1 for u in users_list if u["risk_level"] == "low")
    
    # Apply pagination
    paginated_users = users_list[skip:skip + limit]
    
    return {
        "users": paginated_users,
        "total": total,
        "stats": {
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count,
            "total_clicks": sum(u["clicks"] for u in users_list),
            "total_credential_submissions": sum(u["credential_submissions"] for u in users_list)
        },
        "skip": skip,
        "limit": limit
    }


@router.get("/export/csv")
async def export_vulnerable_users_csv(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None
):
    """Export vulnerable users list as CSV"""
    user = await require_admin(request)
    
    # Get vulnerable users data
    data = await get_vulnerable_users(
        request=request,
        days=days,
        organization_id=organization_id,
        skip=0,
        limit=10000
    )
    
    users = data["users"]
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "User Name",
        "Email",
        "Organization",
        "Risk Level",
        "Total Clicks",
        "Credential Submissions",
        "Campaigns Failed",
        "First Failure",
        "Last Failure"
    ])
    
    # Data rows
    for u in users:
        writer.writerow([
            u["user_name"],
            u["user_email"],
            u["organization_name"],
            u["risk_level"].upper(),
            u["clicks"],
            u["credential_submissions"],
            "; ".join(u["campaigns_failed"]),
            u["first_failure"],
            u["last_failure"]
        ])
    
    # Return CSV
    output.seek(0)
    
    filename = f"vulnerable_users_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/json")
async def export_vulnerable_users_json(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None
):
    """Export vulnerable users list as JSON"""
    user = await require_admin(request)
    
    # Get vulnerable users data
    data = await get_vulnerable_users(
        request=request,
        days=days,
        organization_id=organization_id,
        skip=0,
        limit=10000
    )
    
    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "period_days": days,
        "organization_id": organization_id,
        **data
    }


@router.get("/stats")
async def get_vulnerable_users_stats(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None
):
    """Get aggregated statistics for vulnerable users dashboard"""
    user = await require_admin(request)
    db = get_db()
    
    # Get full data
    data = await get_vulnerable_users(
        request=request,
        days=days,
        organization_id=organization_id,
        skip=0,
        limit=10000
    )
    
    users = data["users"]
    
    # Calculate additional stats
    by_organization = {}
    for u in users:
        org = u["organization_name"]
        if org not in by_organization:
            by_organization[org] = {"users": 0, "clicks": 0, "submissions": 0}
        by_organization[org]["users"] += 1
        by_organization[org]["clicks"] += u["clicks"]
        by_organization[org]["submissions"] += u["credential_submissions"]
    
    # Top repeat offenders
    repeat_offenders = [u for u in users if u["clicks"] >= 2]
    repeat_offenders.sort(key=lambda x: -x["clicks"])
    
    return {
        "summary": data["stats"],
        "by_organization": by_organization,
        "repeat_offenders": repeat_offenders[:10],
        "period_days": days
    }
