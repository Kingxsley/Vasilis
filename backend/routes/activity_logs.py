"""
Activity Logs Routes - Track all user activities (super admin only)
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


async def log_activity(
    db,
    user_id: str,
    user_email: str,
    user_name: str,
    action: str,
    resource_type: str,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None
):
    """Log a user activity"""
    activity = {
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_email": user_email,
        "user_name": user_name,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "ip_address": ip_address,
        "user_agent": user_agent,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity)
    return activity


@router.get("")
async def get_activity_logs(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get activity logs (super admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view activity logs")
    
    db = get_db()
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if resource_type:
        query["resource_type"] = resource_type
    
    # Date filtering
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date + "T23:59:59"
        if date_query:
            query["timestamp"] = date_query
    
    skip = (page - 1) * limit
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.activity_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/stats")
async def get_activity_stats(request: Request, days: int = 30):
    """Get activity statistics (super admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view activity stats")
    
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Get activity counts by action
    action_pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    # Get most active users
    user_pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"user_id": "$user_id", "user_email": "$user_email", "user_name": "$user_name"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    # Get activity by resource type
    resource_pipeline = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$resource_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    actions = await db.activity_logs.aggregate(action_pipeline).to_list(10)
    active_users = await db.activity_logs.aggregate(user_pipeline).to_list(10)
    resources = await db.activity_logs.aggregate(resource_pipeline).to_list(20)
    
    total = await db.activity_logs.count_documents({"timestamp": {"$gte": cutoff}})
    
    return {
        "total_activities": total,
        "top_actions": [{"action": a["_id"], "count": a["count"]} for a in actions],
        "most_active_users": [
            {
                "user_id": u["_id"]["user_id"],
                "user_email": u["_id"]["user_email"],
                "user_name": u["_id"]["user_name"],
                "count": u["count"]
            } for u in active_users
        ],
        "activity_by_resource": [{"resource": r["_id"], "count": r["count"]} for r in resources]
    }


@router.delete("/{activity_id}")
async def delete_activity_log(activity_id: str, request: Request):
    """Delete an activity log (super admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete activity logs")
    
    db = get_db()
    result = await db.activity_logs.delete_one({"activity_id": activity_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity log not found")
    
    return {"message": "Activity log deleted"}


@router.delete("")
async def bulk_delete_activity_logs(request: Request):
    """Bulk delete activity logs (super admin only)"""
    user = await get_current_user(request)
    
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete activity logs")
    
    data = await request.json()
    activity_ids = data.get("activity_ids", [])
    
    if not activity_ids:
        raise HTTPException(status_code=400, detail="No activity IDs provided")
    
    db = get_db()
    result = await db.activity_logs.delete_many({"activity_id": {"$in": activity_ids}})
    
    return {"message": f"Deleted {result.deleted_count} activity logs"}
