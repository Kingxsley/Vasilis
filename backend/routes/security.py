"""
Security Dashboard Routes
Provides audit logs, login attempts, blocked IPs, and security metrics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os

router = APIRouter(prefix="/security", tags=["Security"])

# Will be set by server.py
db = None
require_super_admin = None
audit_logger = None
account_lockout = None

def init_security_routes(database, admin_dep, logger, lockout):
    global db, require_super_admin, audit_logger, account_lockout
    db = database
    require_super_admin = admin_dep
    audit_logger = logger
    account_lockout = lockout


@router.get("/dashboard")
async def get_security_dashboard(user: dict = Depends(lambda: require_super_admin)):
    """Get security dashboard overview"""
    if not db:
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
    
    # Get active lockouts from in-memory cache
    active_lockouts = []
    if account_lockout:
        for email, data in account_lockout.failed_attempts.items():
            is_locked, seconds = account_lockout.is_locked(email)
            if is_locked:
                active_lockouts.append({
                    "email": email,
                    "attempts": len(data["attempts"]),
                    "locked_until": (now + timedelta(seconds=seconds)).isoformat(),
                    "last_ip": data.get("last_ip", "unknown")
                })
    
    # Get unique IPs with failed logins in last 24h
    suspicious_ips_pipeline = [
        {"$match": {
            "action": {"$in": ["login_failed_user_not_found", "login_failed_wrong_password"]},
            "timestamp": {"$gte": last_24h.isoformat()}
        }},
        {"$group": {
            "_id": "$ip_address",
            "count": {"$sum": 1},
            "emails_targeted": {"$addToSet": "$user_email"}
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    suspicious_ips = await db.audit_logs.aggregate(suspicious_ips_pipeline).to_list(10)
    
    return {
        "summary": {
            "successful_logins_24h": login_success_24h,
            "failed_logins_24h": login_failed_24h,
            "account_lockouts_24h": lockouts_24h,
            "password_resets_24h": password_resets_24h,
            "active_lockouts": len(active_lockouts)
        },
        "active_lockouts": active_lockouts,
        "suspicious_ips": [
            {
                "ip": ip["_id"],
                "failed_attempts": ip["count"],
                "emails_targeted": len(ip["emails_targeted"])
            } for ip in suspicious_ips
        ],
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
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(lambda: require_super_admin)
):
    """Get paginated audit logs with filters"""
    if not db:
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
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": logs
    }


@router.get("/login-history")
async def get_login_history(
    days: int = Query(7, le=30),
    user: dict = Depends(lambda: require_super_admin)
):
    """Get login history grouped by day"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Daily login stats
    pipeline = [
        {"$match": {
            "action": {"$in": ["login_success", "login_failed_user_not_found", "login_failed_wrong_password"]},
            "timestamp": {"$gte": start_date.isoformat()}
        }},
        {"$addFields": {
            "date": {"$substr": ["$timestamp", 0, 10]}
        }},
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
    
    # Format for chart
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
    user: dict = Depends(lambda: require_super_admin)
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


@router.get("/rate-limit-status")
async def get_rate_limit_status(user: dict = Depends(lambda: require_super_admin)):
    """Get current rate limit configuration"""
    return {
        "endpoints": {
            "/api/auth/login": {"limit": 5, "window": "1 minute"},
            "/api/auth/register": {"limit": 3, "window": "1 minute"},
            "/api/auth/forgot-password": {"limit": 3, "window": "1 minute"},
            "default": {"limit": 100, "window": "1 minute"}
        },
        "account_lockout": {
            "max_attempts": 5,
            "lockout_duration": "15 minutes"
        }
    }
