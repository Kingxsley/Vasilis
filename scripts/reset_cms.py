#!/usr/bin/env python3
"""
reset_cms.py  —  Phase 1 destructive data migration.

Backs up and then wipes the CMS-related MongoDB collections so the site can
be reseeded from scratch with the new visual-editor-driven content model.

Collections affected (backed up + wiped):
    pages, cms_tiles, news, events, blog_posts,
    contact_submissions, sidebar_configs, navigation_items, landing_layouts

Collections that are NEVER touched:
    users, organizations, user_sessions, campaigns, training,
    certificates, audit_logs, branding_settings, phishing_*

Safety model:
    1. The script is DRY-RUN by default. It only actually deletes when
       you pass both --confirm and the exact --i-understand-data-loss flag.
    2. Before any delete, every affected collection is copied into a
       `_cms_backup_<UTC_TIMESTAMP>.<collection_name>` collection inside
       the same database. To restore, just $out-merge those back.
    3. The script prints a restore command at the end.

Usage:
    # Dry-run (default) — tells you what WOULD happen
    python scripts/reset_cms.py

    # Do it for real (two flags required)
    python scripts/reset_cms.py --confirm --i-understand-data-loss

    # Restore from a prior backup
    python scripts/reset_cms.py --restore-from _cms_backup_20260419T120000Z
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend modules are importable when script is run from /app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

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

PROTECTED_COLLECTIONS = {
    "users",
    "organizations",
    "user_sessions",
    "campaigns",
    "training",
    "certificates",
    "audit_logs",
    "branding_settings",
}


def _now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


async def _get_db():
    mongo_url = os.environ.get("MONGO_URL", "")
    db_name = os.environ.get("DB_NAME", "vasilisnetshield")
    if not mongo_url:
        print("ERROR: MONGO_URL is not set. Aborting.", file=sys.stderr)
        sys.exit(2)
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    return client, client[db_name]


async def count_all(db) -> dict[str, int]:
    counts = {}
    for name in CMS_COLLECTIONS:
        counts[name] = await db[name].count_documents({})
    return counts


async def backup(db, stamp: str) -> dict[str, int]:
    """Copy each CMS collection into a timestamped backup collection.

    Backup naming: `_cms_backup_<stamp>.<collection_name>`
    (Mongo treats the dot as part of the name; it still lists cleanly.)
    """
    copied = {}
    for name in CMS_COLLECTIONS:
        src = db[name]
        backup_name = f"_cms_backup_{stamp}.{name}"
        dst = db[backup_name]
        # Copy all docs. Use an ordered=False insert for speed on large sets.
        docs = await src.find({}).to_list(length=None)
        if docs:
            await dst.insert_many(docs, ordered=False)
        copied[name] = len(docs)
    return copied


async def wipe(db) -> dict[str, int]:
    deleted = {}
    for name in CMS_COLLECTIONS:
        if name in PROTECTED_COLLECTIONS:
            # Double safety — should never happen since CMS_COLLECTIONS is hard-coded.
            continue
        res = await db[name].delete_many({})
        deleted[name] = res.deleted_count
    return deleted


async def restore(db, backup_stamp: str) -> dict[str, int]:
    """Restore from `_cms_backup_<stamp>.*` collections back to originals."""
    restored = {}
    for name in CMS_COLLECTIONS:
        backup_name = f"_cms_backup_{backup_stamp}.{name}"
        src = db[backup_name]
        count = await src.count_documents({})
        if count == 0:
            restored[name] = 0
            continue
        await db[name].delete_many({})
        docs = await src.find({}).to_list(length=None)
        await db[name].insert_many(docs, ordered=False)
        restored[name] = len(docs)
    return restored


async def main_async(args):
    client, db = await _get_db()
    try:
        if args.restore_from:
            stamp = args.restore_from.replace("_cms_backup_", "")
            print(f"Restoring from backup: {args.restore_from}")
            if not args.confirm:
                print("DRY-RUN — pass --confirm to actually restore.")
                return
            result = await restore(db, stamp)
            print("Restored:")
            for k, v in result.items():
                print(f"  {k}: {v}")
            return

        # Standard reset flow
        print("=" * 60)
        print("CMS RESET — Phase 1")
        print("=" * 60)
        counts = await count_all(db)
        total = sum(counts.values())
        print(f"Database: {os.environ.get('DB_NAME', 'vasilisnetshield')}")
        print(f"Collections targeted: {len(CMS_COLLECTIONS)}")
        print(f"Total documents to process: {total}")
        print()
        for name, n in counts.items():
            print(f"  {name:.<30} {n}")
        print()

        if not (args.confirm and args.i_understand_data_loss):
            print("DRY-RUN — no data modified.")
            print("To execute, re-run with:  --confirm --i-understand-data-loss")
            return

        stamp = _now_stamp()
        print(f"→ Backing up to: _cms_backup_{stamp}.<name>")
        copied = await backup(db, stamp)
        print("  Backup complete:")
        for k, v in copied.items():
            print(f"    {k:.<30} {v}")

        print("→ Wiping live collections...")
        deleted = await wipe(db)
        for k, v in deleted.items():
            print(f"    {k:.<30} deleted {v}")

        print()
        print(f"DONE. Backup stamp: {stamp}")
        print(f"To restore:  python scripts/reset_cms.py --restore-from _cms_backup_{stamp} --confirm")
    finally:
        client.close()


def main():
    p = argparse.ArgumentParser(description="Reset/backup CMS data.")
    p.add_argument("--confirm", action="store_true", help="Required to actually modify data.")
    p.add_argument(
        "--i-understand-data-loss",
        dest="i_understand_data_loss",
        action="store_true",
        help="Second required flag for destructive ops.",
    )
    p.add_argument(
        "--restore-from",
        dest="restore_from",
        help="Restore from a prior backup stamp (e.g. _cms_backup_20260419T120000Z)",
    )
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
