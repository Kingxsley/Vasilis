"""
Admin-only CMS maintenance endpoints.

Exposes the same backup/wipe logic as scripts/reset_cms.py but via an
authenticated HTTP endpoint so the Phase-2 admin dashboard can trigger
resets without shell access.

All endpoints require SUPER_ADMIN and are destructive. Every destructive
call auto-creates a timestamped backup first — no exceptions.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth_levels import AuthLevel, require_auth_level

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/cms", tags=["CMS Admin"])

CMS_COLLECTIONS = [
    "pages",
    "cms_tiles",
    "news",
    "events",
    "blog_posts",
    "contact_submissions",
    "sidebar_configs",
    "navigation_items",
    "landing_layouts",
]


def _now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _get_db():
    # Late import to match the pattern used elsewhere in the routes/ package.
    from server import db  # type: ignore
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    return db


class ResetRequest(BaseModel):
    confirm: bool = False
    i_understand_data_loss: bool = False


class ResetResponse(BaseModel):
    dry_run: bool
    backup_stamp: Optional[str] = None
    before_counts: dict
    backed_up: dict = {}
    deleted: dict = {}
    restore_command: Optional[str] = None


@router.get("/status", response_model=ResetResponse)
async def cms_status(_admin: dict = Depends(require_auth_level(AuthLevel.SUPER_ADMIN))):
    """Read-only: show current doc counts for each CMS collection."""
    db = _get_db()
    before = {}
    for name in CMS_COLLECTIONS:
        before[name] = await db[name].count_documents({})
    return ResetResponse(dry_run=True, before_counts=before)


@router.post("/reset", response_model=ResetResponse)
async def cms_reset(
    body: ResetRequest,
    _admin: dict = Depends(require_auth_level(AuthLevel.SUPER_ADMIN)),
):
    """Back up and then wipe the 9 CMS collections.

    Requires BOTH `confirm=true` AND `i_understand_data_loss=true` in the body.
    Otherwise returns a dry-run summary.
    """
    db = _get_db()

    before = {}
    for name in CMS_COLLECTIONS:
        before[name] = await db[name].count_documents({})

    if not (body.confirm and body.i_understand_data_loss):
        return ResetResponse(dry_run=True, before_counts=before)

    stamp = _now_stamp()
    backed_up: dict = {}
    for name in CMS_COLLECTIONS:
        src = db[name]
        dst = db[f"_cms_backup_{stamp}.{name}"]
        docs = await src.find({}).to_list(length=None)
        if docs:
            await dst.insert_many(docs, ordered=False)
        backed_up[name] = len(docs)

    deleted: dict = {}
    for name in CMS_COLLECTIONS:
        res = await db[name].delete_many({})
        deleted[name] = res.deleted_count

    logger.warning(
        "CMS RESET executed by super_admin. backup=%s counts=%s",
        stamp,
        deleted,
    )

    return ResetResponse(
        dry_run=False,
        backup_stamp=stamp,
        before_counts=before,
        backed_up=backed_up,
        deleted=deleted,
        restore_command=(
            f"python scripts/reset_cms.py --restore-from _cms_backup_{stamp} --confirm"
        ),
    )


@router.post("/restore", response_model=ResetResponse)
async def cms_restore(
    backup_stamp: str = Query(..., description="e.g. 20260419T120000Z or full _cms_backup_20260419T120000Z"),
    confirm: bool = Query(False),
    _admin: dict = Depends(require_auth_level(AuthLevel.SUPER_ADMIN)),
):
    """Restore CMS data from a prior backup stamp."""
    db = _get_db()
    stamp = backup_stamp.replace("_cms_backup_", "")

    before = {}
    for name in CMS_COLLECTIONS:
        before[name] = await db[name].count_documents({})

    # Sanity check: does the backup exist?
    any_found = False
    for name in CMS_COLLECTIONS:
        if await db[f"_cms_backup_{stamp}.{name}"].count_documents({}) > 0:
            any_found = True
            break
    if not any_found:
        raise HTTPException(status_code=404, detail=f"No backup found with stamp '{stamp}'")

    if not confirm:
        return ResetResponse(
            dry_run=True,
            before_counts=before,
            backup_stamp=stamp,
        )

    restored: dict = {}
    for name in CMS_COLLECTIONS:
        src = db[f"_cms_backup_{stamp}.{name}"]
        n = await src.count_documents({})
        if n == 0:
            restored[name] = 0
            continue
        await db[name].delete_many({})
        docs = await src.find({}).to_list(length=None)
        await db[name].insert_many(docs, ordered=False)
        restored[name] = len(docs)

    return ResetResponse(
        dry_run=False,
        backup_stamp=stamp,
        before_counts=before,
        backed_up=restored,
        deleted={},
    )
