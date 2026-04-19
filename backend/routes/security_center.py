"""
Security Center - IP Management and Rate Limiting Dashboard
Provides comprehensive IP tracking, blocking, and whitelist management
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import time

router = APIRouter(prefix="/security-center", tags=["Security Center"])


def get_db():
    """Lazy import to avoid circular dependency"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


class UserRole:
    SUPER_ADMIN = "super_admin"


async def get_current_user(request: Request) -> dict:
    """Lazy import to avoid circular dependency"""
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_super_admin(request: Request) -> dict:
    """Security Center is super admin only"""
    user = await get_current_user(request)
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


class IPBlockAction(BaseModel):
    ip_address: str
    reason: Optional[str] = None


class IPWhitelistAction(BaseModel):
    ip_address: str
    reason: Optional[str] = None


def get_rate_limiters():
    """Get rate limiter instances from middleware"""
    from middleware.security import ip_login_limiter, account_lockout
    return ip_login_limiter, account_lockout


@router.get("/dashboard-stats")
async def get_dashboard_stats(user: dict = Depends(require_super_admin)):
    """Get overall security dashboard statistics"""
    db = get_db()
    ip_limiter, account_lockout = get_rate_limiters()
    
    # Get stats from in-memory rate limiters
    total_blocked_ips = len(ip_limiter.blocked_ips)
    total_locked_accounts = len(account_lockout.locked_accounts)
    
    # Get permanent blocks/whitelists from database
    permanent_blocks = await db.ip_blocklist.count_documents({})
    whitelisted_ips = await db.ip_whitelist.count_documents({})
    
    # Get recent login attempts (last 24 hours)
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_attempts = await db.audit_logs.count_documents({
        "action": {"$in": ["login_blocked_ip_rate_limit", "login_blocked_lockout"]},
        "timestamp": {"$gte": cutoff.isoformat()}
    })
    
    return {
        "blocked_ips_temporary": total_blocked_ips,
        "locked_accounts": total_locked_accounts,
        "permanent_blocks": permanent_blocks,
        "whitelisted_ips": whitelisted_ips,
        "recent_blocks_24h": recent_attempts
    }


@router.get("/blocked-ips")
async def get_blocked_ips(user: dict = Depends(require_super_admin)):
    """Get all currently blocked IPs (temporary and permanent)"""
    db = get_db()
    ip_limiter, _ = get_rate_limiters()
    
    now = time.time()
    blocked_list = []
    
    # Temporary blocks (in-memory from rate limiter)
    for ip, unlock_time in ip_limiter.blocked_ips.items():
        if now < unlock_time:
            seconds_remaining = int(unlock_time - now)
            blocked_list.append({
                "ip_address": ip,
                "block_type": "temporary",
                "reason": "Rate limit exceeded (10 login attempts)",
                "blocked_at": datetime.fromtimestamp(unlock_time - 900, tz=timezone.utc).isoformat(),
                "expires_at": datetime.fromtimestamp(unlock_time, tz=timezone.utc).isoformat(),
                "seconds_remaining": seconds_remaining,
                "attempts": len(ip_limiter.ip_attempts.get(ip, []))
            })
    
    # Permanent blocks (from database)
    permanent = await db.ip_blocklist.find({}, {"_id": 0}).to_list(1000)
    for block in permanent:
        blocked_list.append({
            "ip_address": block["ip_address"],
            "block_type": "permanent",
            "reason": block.get("reason", "Manual block"),
            "blocked_at": block.get("blocked_at"),
            "blocked_by": block.get("blocked_by"),
            "expires_at": None,
            "seconds_remaining": None
        })
    
    return {"blocked_ips": blocked_list}


@router.get("/whitelisted-ips")
async def get_whitelisted_ips(user: dict = Depends(require_super_admin)):
    """Get all whitelisted IPs"""
    db = get_db()
    
    whitelist = await db.ip_whitelist.find({}, {"_id": 0}).to_list(1000)
    
    return {"whitelisted_ips": whitelist}


@router.get("/ip-attempts")
async def get_ip_attempts(
    ip_address: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_super_admin)
):
    """Get IP login attempt history from audit logs"""
    db = get_db()
    
    query = {
        "action": {
            "$in": [
                "login_blocked_ip_rate_limit",
                "login_blocked_lockout",
                "login_failed_user_not_found",
                "login_failed_wrong_password",
                "login_success"
            ]
        }
    }
    
    if ip_address:
        query["ip_address"] = ip_address
    
    attempts = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"attempts": attempts}


@router.get("/locked-accounts")
async def get_locked_accounts(user: dict = Depends(require_super_admin)):
    """Get all currently locked accounts"""
    _, account_lockout = get_rate_limiters()
    
    now = time.time()
    locked_list = []
    
    for email, unlock_time in account_lockout.locked_accounts.items():
        if now < unlock_time:
            seconds_remaining = int(unlock_time - now)
            locked_list.append({
                "email": email,
                "locked_at": datetime.fromtimestamp(unlock_time - 900, tz=timezone.utc).isoformat(),
                "expires_at": datetime.fromtimestamp(unlock_time, tz=timezone.utc).isoformat(),
                "seconds_remaining": seconds_remaining,
                "failed_attempts": len(account_lockout.failed_attempts.get(email.lower(), []))
            })
    
    return {"locked_accounts": locked_list}


@router.post("/unblock-ip")
async def unblock_ip(data: IPBlockAction, user: dict = Depends(require_super_admin)):
    """Manually unblock an IP (temporary block only)"""
    ip_limiter, _ = get_rate_limiters()
    
    # Remove from in-memory temporary blocks
    if data.ip_address in ip_limiter.blocked_ips:
        del ip_limiter.blocked_ips[data.ip_address]
    
    # Clear IP attempts
    ip_limiter.ip_attempts.pop(data.ip_address, None)
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="ip_manually_unblocked",
        user_id=user["user_id"],
        user_email=user.get("email"),
        ip_address=data.ip_address,
        details={"reason": data.reason or "Manual unblock by admin"},
        severity="info"
    )
    
    return {"message": f"IP {data.ip_address} unblocked successfully"}


@router.post("/block-ip-permanent")
async def block_ip_permanent(data: IPBlockAction, user: dict = Depends(require_super_admin)):
    """Add IP to permanent blocklist"""
    db = get_db()
    
    # Check if already blocked
    existing = await db.ip_blocklist.find_one({"ip_address": data.ip_address})
    if existing:
        raise HTTPException(status_code=400, detail="IP already in permanent blocklist")
    
    # Add to permanent blocklist
    block_doc = {
        "ip_address": data.ip_address,
        "reason": data.reason or "Manual permanent block",
        "blocked_at": datetime.now(timezone.utc).isoformat(),
        "blocked_by": user["user_id"],
        "blocked_by_email": user.get("email")
    }
    
    await db.ip_blocklist.insert_one(block_doc)
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="ip_permanently_blocked",
        user_id=user["user_id"],
        user_email=user.get("email"),
        ip_address=data.ip_address,
        details={"reason": data.reason or "Manual permanent block"},
        severity="warning"
    )
    
    return {"message": f"IP {data.ip_address} added to permanent blocklist"}


@router.delete("/unblock-ip-permanent/{ip_address}")
async def unblock_ip_permanent(ip_address: str, user: dict = Depends(require_super_admin)):
    """Remove IP from permanent blocklist"""
    db = get_db()
    
    result = await db.ip_blocklist.delete_one({"ip_address": ip_address})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IP not found in permanent blocklist")
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="ip_permanent_block_removed",
        user_id=user["user_id"],
        user_email=user.get("email"),
        ip_address=ip_address,
        details={"reason": "Removed from permanent blocklist"},
        severity="info"
    )
    
    return {"message": f"IP {ip_address} removed from permanent blocklist"}


@router.post("/whitelist-ip")
async def whitelist_ip(data: IPWhitelistAction, user: dict = Depends(require_super_admin)):
    """Add IP to whitelist (bypass all rate limiting)"""
    db = get_db()
    
    # Check if already whitelisted
    existing = await db.ip_whitelist.find_one({"ip_address": data.ip_address})
    if existing:
        raise HTTPException(status_code=400, detail="IP already whitelisted")
    
    # Add to whitelist
    whitelist_doc = {
        "ip_address": data.ip_address,
        "reason": data.reason or "Manual whitelist",
        "whitelisted_at": datetime.now(timezone.utc).isoformat(),
        "whitelisted_by": user["user_id"],
        "whitelisted_by_email": user.get("email")
    }
    
    await db.ip_whitelist.insert_one(whitelist_doc)
    
    # Also unblock if currently blocked
    ip_limiter, _ = get_rate_limiters()
    if data.ip_address in ip_limiter.blocked_ips:
        del ip_limiter.blocked_ips[data.ip_address]
    ip_limiter.ip_attempts.pop(data.ip_address, None)
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="ip_whitelisted",
        user_id=user["user_id"],
        user_email=user.get("email"),
        ip_address=data.ip_address,
        details={"reason": data.reason or "Manual whitelist"},
        severity="info"
    )
    
    return {"message": f"IP {data.ip_address} added to whitelist"}


@router.delete("/whitelist-ip/{ip_address}")
async def remove_ip_from_whitelist(ip_address: str, user: dict = Depends(require_super_admin)):
    """Remove IP from whitelist"""
    db = get_db()
    
    result = await db.ip_whitelist.delete_one({"ip_address": ip_address})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IP not found in whitelist")
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="ip_whitelist_removed",
        user_id=user["user_id"],
        user_email=user.get("email"),
        ip_address=ip_address,
        details={"reason": "Removed from whitelist"},
        severity="info"
    )
    
    return {"message": f"IP {ip_address} removed from whitelist"}


@router.post("/unlock-account")
async def unlock_account(email: str, user: dict = Depends(require_super_admin)):
    """Manually unlock a locked account"""
    _, account_lockout = get_rate_limiters()
    
    email_lower = email.lower()
    
    # Remove from locked accounts
    if email_lower in account_lockout.locked_accounts:
        del account_lockout.locked_accounts[email_lower]
    
    # Clear failed attempts
    account_lockout.failed_attempts.pop(email_lower, None)
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="account_manually_unlocked",
        user_id=user["user_id"],
        user_email=user.get("email"),
        details={"unlocked_email": email},
        severity="info"
    )
    
    return {"message": f"Account {email} unlocked successfully"}


@router.post("/clear-all-temporary-blocks")
async def clear_all_temporary_blocks(user: dict = Depends(require_super_admin)):
    """Clear all temporary IP blocks and account locks (emergency use)"""
    ip_limiter, account_lockout = get_rate_limiters()
    
    blocked_ip_count = len(ip_limiter.blocked_ips)
    locked_account_count = len(account_lockout.locked_accounts)
    
    # Clear all temporary blocks
    ip_limiter.blocked_ips.clear()
    ip_limiter.ip_attempts.clear()
    account_lockout.locked_accounts.clear()
    account_lockout.failed_attempts.clear()
    
    # Log action
    from middleware.security import audit_logger
    await audit_logger.log(
        action="all_temporary_blocks_cleared",
        user_id=user["user_id"],
        user_email=user.get("email"),
        details={
            "cleared_ips": blocked_ip_count,
            "cleared_accounts": locked_account_count
        },
        severity="warning"
    )
    
    return {
        "message": "All temporary blocks cleared",
        "cleared_ips": blocked_ip_count,
        "cleared_accounts": locked_account_count
    }
