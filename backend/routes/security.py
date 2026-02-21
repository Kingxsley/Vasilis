"""
Security Dashboard Routes
Provides audit logs, login attempts, blocked IPs, security metrics, and export functionality
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io
import json

router = APIRouter(prefix="/security", tags=["Security"])

# Will be set by server.py
db = None
_require_super_admin_dep = None
audit_logger = None
account_lockout = None

def init_security_routes(database, admin_dep, logger, lockout):
    global db, _require_super_admin_dep, audit_logger, account_lockout
    db = database
    _require_super_admin_dep = admin_dep
    audit_logger = logger
    account_lockout = lockout


async def require_super_admin(request: Request) -> dict:
    """Wrapper dependency that calls the actual require_super_admin dependency"""
    if _require_super_admin_dep is None:
        raise HTTPException(status_code=500, detail="Security not initialized")
    # Get the actual dependency function and call it with the request
    from utils import get_current_user, security
    credentials = await security(request)
    user = await get_current_user(request, credentials)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


@router.get("/dashboard")
async def get_security_dashboard(user: dict = Depends(require_super_admin)):
    """Get security dashboard overview"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)
    
    # Count recent login events
    login_success_24h = await db.audit_logs.count_documents({
        "action": "login_success",
        "timestamp": {"$gte": last_24h.isoformat()}
    })
    
    login_failed_24h = await db.audit_logs.count_documents({
        "action": {"$in": ["login_failed_user_not_found", "login_failed_wrong_password"]},
        "timestamp": {"$gte": last_24h.isoformat()}
    })
    
    lockouts_24h = await db.audit_logs.count_documents({
        "action": "login_blocked_lockout",
        "timestamp": {"$gte": last_24h.isoformat()}
    })
    
    password_resets_24h = await db.audit_logs.count_documents({
        "action": {"$in": ["password_reset_completed", "forgot_password_requested"]},
        "timestamp": {"$gte": last_24h.isoformat()}
    })
    
    # Total logs in last 30 days
    total_logs_30d = await db.audit_logs.count_documents({
        "timestamp": {"$gte": last_30d.isoformat()}
    })
    
    # Get active lockouts from in-memory cache
    active_lockouts = []
    if account_lockout:
        for email in list(account_lockout.locked_accounts.keys()):
            is_locked, seconds = account_lockout.is_locked(email)
            if is_locked:
                active_lockouts.append({
                    "email": email,
                    "locked_until": (now + timedelta(seconds=seconds)).isoformat(),
                    "seconds_remaining": seconds
                })
    
    # Top countries with failed logins (last 7 days)
    countries_pipeline = [
        {"$match": {
            "action": {"$in": ["login_failed_user_not_found", "login_failed_wrong_password"]},
            "timestamp": {"$gte": last_7d.isoformat()},
            "country": {"$exists": True, "$ne": "Unknown"}
        }},
        {"$group": {
            "_id": {"country": "$country", "country_code": "$country_code"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_countries_failed = await db.audit_logs.aggregate(countries_pipeline).to_list(10)
    
    # Suspicious IPs (3+ failed attempts)
    suspicious_ips_pipeline = [
        {"$match": {
            "action": {"$in": ["login_failed_user_not_found", "login_failed_wrong_password"]},
            "timestamp": {"$gte": last_24h.isoformat()}
        }},
        {"$group": {
            "_id": "$ip_address",
            "count": {"$sum": 1},
            "country": {"$first": "$country"},
            "emails_targeted": {"$addToSet": "$user_email"}
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    suspicious_ips = await db.audit_logs.aggregate(suspicious_ips_pipeline).to_list(10)
    
    # Recent critical events
    critical_events = await db.audit_logs.find(
        {"severity": "critical", "timestamp": {"$gte": last_7d.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    return {
        "summary": {
            "successful_logins_24h": login_success_24h,
            "failed_logins_24h": login_failed_24h,
            "account_lockouts_24h": lockouts_24h,
            "password_resets_24h": password_resets_24h,
            "active_lockouts": len(active_lockouts),
            "total_logs_30d": total_logs_30d
        },
        "active_lockouts": active_lockouts,
        "suspicious_ips": [
            {
                "ip": ip["_id"],
                "failed_attempts": ip["count"],
                "country": ip.get("country", "Unknown"),
                "emails_targeted": len(ip["emails_targeted"])
            } for ip in suspicious_ips
        ],
        "top_countries_failed": [
            {
                "country": c["_id"]["country"],
                "country_code": c["_id"]["country_code"],
                "count": c["count"]
            } for c in top_countries_failed
        ],
        "critical_events": critical_events,
        "retention_days": 30,
        "last_updated": now.isoformat()
    }


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, le=500),
    offset: int = 0,
    action: Optional[str] = None,
    severity: Optional[str] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(require_super_admin)
):
    """Get paginated audit logs with filters including country"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    
    if action:
        query["action"] = action
    if severity:
        query["severity"] = severity
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    if ip_address:
        query["ip_address"] = ip_address
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    total = await db.audit_logs.count_documents(query)
    
    logs = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    # Get unique action types for filter dropdown
    action_types = await db.audit_logs.distinct("action")
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": logs,
        "action_types": action_types
    }


@router.get("/audit-logs/export")
async def export_audit_logs(
    format: str = Query("csv", enum=["csv", "json"]),
    action: Optional[str] = None,
    severity: Optional[str] = None,
    user_email: Optional[str] = None,
    country: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(require_super_admin)
):
    """Export audit logs as CSV or JSON (last 30 days max)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Build query
    query = {}
    
    # Default to last 30 days if no date specified
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    query["timestamp"] = {"$gte": start_date}
    
    if end_date:
        query["timestamp"]["$lte"] = end_date
    
    if action:
        query["action"] = action
    if severity:
        query["severity"] = severity
    if user_email:
        query["user_email"] = {"$regex": user_email, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    
    # Fetch logs (max 10000)
    logs = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(10000).to_list(10000)
    
    # Generate filename
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    
    if format == "json":
        # Return JSON
        content = json.dumps(logs, indent=2, default=str)
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=audit_logs_{timestamp}.json"
            }
        )
    else:
        # Return CSV
        output = io.StringIO()
        
        # Define CSV columns
        fieldnames = [
            "timestamp", "action", "severity", "user_id", "user_email",
            "ip_address", "country", "country_code", "city", "region", "isp",
            "user_agent", "details"
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        for log in logs:
            # Convert details dict to string for CSV
            if "details" in log and isinstance(log["details"], dict):
                log["details"] = json.dumps(log["details"])
            writer.writerow(log)
        
        content = output.getvalue()
        
        return Response(
            content=content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit_logs_{timestamp}.csv"
            }
        )


@router.get("/audit-logs/stats")
async def get_audit_stats(
    days: int = Query(7, le=30),
    user: dict = Depends(require_super_admin)
):
    """Get audit log statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Events by action type
    action_stats_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    action_stats = await db.audit_logs.aggregate(action_stats_pipeline).to_list(20)
    
    # Events by country
    country_stats_pipeline = [
        {"$match": {
            "timestamp": {"$gte": start_date.isoformat()},
            "country": {"$exists": True, "$ne": "Unknown"}
        }},
        {"$group": {
            "_id": {"country": "$country", "code": "$country_code"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    country_stats = await db.audit_logs.aggregate(country_stats_pipeline).to_list(15)
    
    # Events by severity
    severity_stats_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    severity_stats = await db.audit_logs.aggregate(severity_stats_pipeline).to_list(10)
    
    # Daily event counts
    daily_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date.isoformat()}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_stats = await db.audit_logs.aggregate(daily_pipeline).to_list(31)
    
    return {
        "period_days": days,
        "by_action": [{"action": s["_id"], "count": s["count"]} for s in action_stats],
        "by_country": [
            {"country": s["_id"]["country"], "code": s["_id"]["code"], "count": s["count"]} 
            for s in country_stats
        ],
        "by_severity": [{"severity": s["_id"] or "info", "count": s["count"]} for s in severity_stats],
        "by_day": [{"date": s["_id"], "count": s["count"]} for s in daily_stats]
    }


@router.get("/login-history")
async def get_login_history(
    days: int = Query(7, le=30),
    user: dict = Depends(require_super_admin)
):
    """Get login history grouped by day"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "action": {"$in": ["login_success", "login_failed_user_not_found", "login_failed_wrong_password"]},
            "timestamp": {"$gte": start_date.isoformat()}
        }},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {
            "_id": {"date": "$date", "action": "$action"},
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": "$_id.date",
            "stats": {"$push": {"action": "$_id.action", "count": "$count"}}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.audit_logs.aggregate(pipeline).to_list(100)
    
    history = []
    for r in results:
        day_stats = {"date": r["_id"], "successful": 0, "failed": 0}
        for stat in r["stats"]:
            if stat["action"] == "login_success":
                day_stats["successful"] = stat["count"]
            else:
                day_stats["failed"] += stat["count"]
        history.append(day_stats)
    
    return {"history": history, "days": days}


@router.post("/unlock-account")
async def unlock_account(
    email: str,
    user: dict = Depends(require_super_admin)
):
    """Manually unlock a locked account"""
    if account_lockout:
        account_lockout.clear_attempts(email)
    
    if audit_logger:
        await audit_logger.log(
            action="admin_unlock_account",
            user_id=user["user_id"],
            user_email=email,
            details={"unlocked_by": user["email"]},
            severity="info"
        )
    
    return {"message": f"Account {email} has been unlocked"}


@router.post("/cleanup-logs")
async def cleanup_old_logs(user: dict = Depends(require_super_admin)):
    """Manually trigger cleanup of logs older than 30 days"""
    if audit_logger:
        deleted_count = await audit_logger.cleanup_old_logs()
        
        await audit_logger.log(
            action="audit_logs_cleanup",
            user_id=user["user_id"],
            user_email=user["email"],
            details={"deleted_count": deleted_count},
            severity="info"
        )
        
        return {"message": f"Cleaned up {deleted_count} old audit logs", "deleted_count": deleted_count}
    
    return {"message": "Audit logger not initialized", "deleted_count": 0}


@router.get("/rate-limit-status")
async def get_rate_limit_status(user: dict = Depends(require_super_admin)):
    """Get current rate limit configuration"""
    return {
        "endpoints": {
            "/api/auth/login": {"limit": 5, "window": "1 minute"},
            "/api/auth/register": {"limit": 3, "window": "1 minute"},
            "/api/auth/forgot-password": {"limit": 3, "window": "1 minute"},
            "default": {"limit": 100, "window": "1 minute"}
        },
        "account_lockout": {
            "max_attempts": 3,
            "lockout_duration": "15 minutes",
            "attempt_window": "10 minutes"
        },
        "audit_retention": {
            "retention_days": 30,
            "auto_cleanup": True
        }
    }


@router.get("/security-headers")
async def get_security_headers_config(user: dict = Depends(require_super_admin)):
    """Get current security headers configuration"""
    import os
    return {
        "headers_enabled": {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" if os.environ.get("DISABLE_HSTS", "").lower() != "true" else "Disabled"
        },
        "recommendations": [
            "Keep HSTS enabled for production",
            "Consider adding Content-Security-Policy header",
            "Use CORS with specific origins in production"
        ]
    }
