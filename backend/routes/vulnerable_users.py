"""
Vulnerable Users Routes - Dashboard for tracking users who clicked phishing links
Includes export functionality for CSV/PDF/JSON
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vulnerable-users", tags=["Vulnerable Users"])


@router.get("")
async def get_vulnerable_users(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Get list of vulnerable users who clicked phishing links or submitted credentials.
    """
    # Import here to avoid circular imports
    from server import db, get_current_user, security
    
    # Get current user
    try:
        credentials = await security(request)
        user = await get_current_user(request, credentials)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check admin permission
    user_role = user.get("role", "")
    if user_role not in ["super_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query for phishing targets who clicked OR submitted credentials
    target_query = {"$or": [{"link_clicked": True}, {"credentials_submitted": True}]}
    
    if campaign_id:
        target_query = {
            "$and": [
                {"$or": [{"link_clicked": True}, {"credentials_submitted": True}]},
                {"campaign_id": campaign_id}
            ]
        }
    
    # Get all clicked/submitted targets
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
        
        # Get campaign info including risk_level
        campaign = await db.phishing_campaigns.find_one(
            {"campaign_id": target.get("campaign_id")},
            {"_id": 0, "name": 1, "organization_id": 1, "risk_level": 1}
        )
        
        org_id = campaign.get("organization_id") if campaign else None
        campaign_risk_level = campaign.get("risk_level", "medium") if campaign else "medium"
        
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
                "risk_level": "low"  # Will be updated based on campaign risk levels
            }
        
        vu = vulnerable_users[user_email]
        
        # Only increment clicks if actually clicked
        if target.get("link_clicked"):
            vu["clicks"] += 1
        
        # Update risk level based on campaign's risk level (take the highest)
        risk_priority = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        current_priority = risk_priority.get(vu["risk_level"], 1)
        campaign_priority = risk_priority.get(campaign_risk_level, 2)
        if campaign_priority > current_priority:
            vu["risk_level"] = campaign_risk_level
        
        # Credential submission always elevates to critical
        if target.get("credentials_submitted"):
            vu["credential_submissions"] += 1
            vu["risk_level"] = "critical"
        campaign_name = campaign.get("name") if campaign else "Unknown"
        if campaign_name not in vu["campaigns_failed"]:
            vu["campaigns_failed"].append(campaign_name)
        
        # Track failure times
        click_time = target.get("link_clicked_at")
        if click_time:
            if isinstance(click_time, str):
                try:
                    click_time = datetime.fromisoformat(click_time.replace("Z", "+00:00"))
                except:
                    pass
            
            click_iso = click_time.isoformat() if hasattr(click_time, 'isoformat') else str(click_time)
            
            if not vu["first_failure"]:
                vu["first_failure"] = click_iso
            vu["last_failure"] = click_iso
    
    # Calculate risk levels - credential submissions always override to critical
    for email, vu in vulnerable_users.items():
        # Credential submission is always critical - this takes priority
        if vu["credential_submissions"] > 0:
            vu["risk_level"] = "critical"
        # Only adjust risk based on clicks if not already critical from credentials
        elif vu["risk_level"] != "critical":
            if vu["clicks"] >= 3:
                vu["risk_level"] = "high"
            elif vu["clicks"] >= 2:
                vu["risk_level"] = "medium"
            # Keep existing risk level from campaign if it's higher than "low"
            elif vu["risk_level"] == "low":
                vu["risk_level"] = "low"
    
    # Filter by risk level if specified
    if risk_level:
        if risk_level == "submitted":
            vulnerable_users = {k: v for k, v in vulnerable_users.items() if v["credential_submissions"] > 0}
        elif risk_level == "repeated":
            vulnerable_users = {k: v for k, v in vulnerable_users.items() if v["clicks"] >= 2}
    
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
    data = await get_vulnerable_users(
        request=request,
        days=days,
        organization_id=organization_id,
        skip=0,
        limit=10000
    )
    
    users = data["users"]
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "User Name", "Email", "Organization", "Risk Level",
        "Total Clicks", "Credential Submissions", "Campaigns Failed",
        "First Failure", "Last Failure"
    ])
    
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


@router.get("/export/pdf")
async def export_vulnerable_users_pdf(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None
):
    """Export vulnerable users list as PDF report"""
    from server import db
    
    data = await get_vulnerable_users(
        request=request,
        days=days,
        organization_id=organization_id,
        skip=0,
        limit=10000
    )
    
    users = data["users"]
    stats = data["stats"]
    
    # Get branding
    branding = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    company_name = branding.get("company_name", "Vasilis NetShield") if branding else "Vasilis NetShield"
    
    # Generate HTML for PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Vulnerable Users Report</title>
        <style>
            @page {{ size: A4; margin: 1cm; }}
            body {{ 
                font-family: Arial, sans-serif; 
                color: #333; 
                line-height: 1.6;
                margin: 0;
                padding: 20px;
            }}
            .header {{ 
                text-align: center; 
                border-bottom: 2px solid #D4A836; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
            }}
            .header h1 {{ color: #D4A836; margin: 0; font-size: 28px; }}
            .header p {{ color: #666; margin: 5px 0 0 0; }}
            .summary {{ 
                display: flex; 
                justify-content: space-around; 
                margin-bottom: 30px;
                flex-wrap: wrap;
            }}
            .stat-box {{ 
                text-align: center; 
                padding: 15px 25px; 
                border-radius: 8px;
                margin: 5px;
                min-width: 120px;
            }}
            .stat-critical {{ background: #fee2e2; border: 1px solid #ef4444; }}
            .stat-high {{ background: #ffedd5; border: 1px solid #f97316; }}
            .stat-medium {{ background: #fef9c3; border: 1px solid #eab308; }}
            .stat-low {{ background: #dcfce7; border: 1px solid #22c55e; }}
            .stat-box .number {{ font-size: 32px; font-weight: bold; }}
            .stat-box .label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
            .stat-critical .number {{ color: #dc2626; }}
            .stat-high .number {{ color: #ea580c; }}
            .stat-medium .number {{ color: #ca8a04; }}
            .stat-low .number {{ color: #16a34a; }}
            table {{ 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                font-size: 11px;
            }}
            th {{ 
                background: #1a1a2e; 
                color: white; 
                padding: 12px 8px; 
                text-align: left;
                font-weight: 600;
            }}
            td {{ 
                padding: 10px 8px; 
                border-bottom: 1px solid #e5e7eb;
                vertical-align: top;
            }}
            tr:nth-child(even) {{ background: #f9fafb; }}
            .risk-badge {{ 
                display: inline-block; 
                padding: 3px 8px; 
                border-radius: 4px; 
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }}
            .risk-critical {{ background: #fee2e2; color: #dc2626; }}
            .risk-high {{ background: #ffedd5; color: #ea580c; }}
            .risk-medium {{ background: #fef9c3; color: #ca8a04; }}
            .risk-low {{ background: #dcfce7; color: #16a34a; }}
            .footer {{ 
                margin-top: 30px; 
                text-align: center; 
                color: #999; 
                font-size: 10px;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
            }}
            .campaigns {{ font-size: 10px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{company_name}</h1>
            <p>Vulnerable Users Security Report</p>
            <p style="font-size: 12px;">Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')} | Period: Last {days} days</p>
        </div>
        
        <div class="summary">
            <div class="stat-box stat-critical">
                <div class="number">{stats['critical']}</div>
                <div class="label">Critical Risk</div>
            </div>
            <div class="stat-box stat-high">
                <div class="number">{stats['high']}</div>
                <div class="label">High Risk</div>
            </div>
            <div class="stat-box stat-medium">
                <div class="number">{stats['medium']}</div>
                <div class="label">Medium Risk</div>
            </div>
            <div class="stat-box stat-low">
                <div class="number">{stats['low']}</div>
                <div class="label">Low Risk</div>
            </div>
        </div>
        
        <h2 style="color: #1a1a2e; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            Vulnerable Users ({data['total']} total)
        </h2>
        
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Organization</th>
                    <th>Risk Level</th>
                    <th>Clicks</th>
                    <th>Credentials</th>
                    <th>Campaigns Failed</th>
                    <th>Last Failure</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for u in users:
        risk_class = f"risk-{u['risk_level']}"
        last_failure = u['last_failure'][:10] if u['last_failure'] else '-'
        campaigns = ', '.join(u['campaigns_failed'][:3])
        if len(u['campaigns_failed']) > 3:
            campaigns += f" (+{len(u['campaigns_failed']) - 3} more)"
        
        html_content += f"""
                <tr>
                    <td>
                        <strong>{u['user_name']}</strong><br>
                        <span style="color: #666; font-size: 10px;">{u['user_email']}</span>
                    </td>
                    <td>{u['organization_name']}</td>
                    <td><span class="risk-badge {risk_class}">{u['risk_level']}</span></td>
                    <td style="text-align: center;">{u['clicks']}</td>
                    <td style="text-align: center; color: {'#dc2626' if u['credential_submissions'] > 0 else '#666'};">
                        {u['credential_submissions']}
                    </td>
                    <td class="campaigns">{campaigns}</td>
                    <td>{last_failure}</td>
                </tr>
        """
    
    if not users:
        html_content += """
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #22c55e;">
                        <strong>No vulnerable users found!</strong><br>
                        All users are demonstrating good security awareness.
                    </td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="footer">
            <p>This report was generated by {company_name} Security Awareness Platform</p>
            <p>Total Link Clicks: {stats['total_clicks']} | Credential Submissions: {stats['total_credential_submissions']}</p>
        </div>
    </body>
    </html>
    """
    
    # Return HTML that can be printed as PDF (browser print-to-PDF)
    filename = f"vulnerable_users_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    
    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/stats")
async def get_vulnerable_users_stats(
    request: Request,
    days: int = 30,
    organization_id: Optional[str] = None
):
    """Get aggregated statistics for vulnerable users dashboard"""
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
