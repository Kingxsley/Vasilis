"""
News RSS Feed Aggregator Backend (consolidated)
- Save feeds even if URL unreachable (mark fetch_error)
- Retry/refresh endpoint
- Supports up to 10 RSS feeds per site
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import feedparser
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["News Aggregator"])

executor = ThreadPoolExecutor(max_workers=5)


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---- Models ----------------------------------------------------------------

class RSSFeedCreate(BaseModel):
    url: str
    name: Optional[str] = None
    category: Optional[str] = "cybersecurity"
    is_active: bool = True
    refresh_interval: int = 3600  # seconds


class RSSFeedUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    refresh_interval: Optional[int] = None


# ---- Helpers ---------------------------------------------------------------

def _parse_feed_sync(url: str):
    """Run feedparser in a thread. Returns (ok, title, entries, error)."""
    try:
        fd = feedparser.parse(url)
        if fd.get("bozo") and not fd.entries:
            return False, None, [], str(fd.get("bozo_exception") or "Invalid RSS feed")
        title = fd.feed.get("title") if fd.feed else None
        return True, title, list(fd.entries)[:20], None
    except Exception as e:  # noqa: BLE001 - surface to caller
        return False, None, [], str(e)


async def _parse_feed(url: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, _parse_feed_sync, url)


def _public_feed(doc: dict) -> dict:
    """Strip Mongo _id and unify feed shape."""
    doc.pop("_id", None)
    return doc


# ---- Feed CRUD -------------------------------------------------------------

@router.get("/feeds")
async def get_feeds():
    """Get all RSS feeds (public endpoint, used by admin UI + /news)."""
    db = get_db()
    feeds = await db.news_feeds.find({}, {"_id": 0}).sort("created_at", 1).to_list(20)
    return {"feeds": feeds}


@router.post("/feeds")
async def add_feed(data: RSSFeedCreate, request: Request):
    """Add a new RSS feed. Saves even if unreachable (marked fetch_error)."""
    await require_admin(request)
    db = get_db()

    count = await db.news_feeds.count_documents({})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 RSS feeds allowed")

    # Dedupe by URL — refuse to add the same URL twice
    if await db.news_feeds.find_one({"url": str(data.url)}):
        raise HTTPException(status_code=400, detail="A feed with this URL already exists")

    # Try to parse once; save regardless so user doesn't lose the config
    ok, parsed_title, _, err = await _parse_feed(str(data.url))

    feed_id = f"feed_{uuid.uuid4().hex[:12]}"
    feed = {
        "feed_id": feed_id,
        "name": (data.name or parsed_title or "Untitled Feed").strip(),
        "url": str(data.url),
        "category": data.category or "cybersecurity",
        "is_active": data.is_active,
        "refresh_interval": int(data.refresh_interval or 3600),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_fetched": datetime.now(timezone.utc).isoformat() if ok else None,
        "fetch_error": None if ok else err,
        "status": "ok" if ok else "unreachable",
    }
    await db.news_feeds.insert_one(feed)
    feed.pop("_id", None)
    return {"message": "RSS feed saved", "feed": feed, "ok": ok}


@router.patch("/feeds/{feed_id}")
async def update_feed(feed_id: str, data: RSSFeedUpdate, request: Request):
    """Update a feed (name, url, category, active flag, refresh interval)."""
    await require_admin(request)
    db = get_db()

    existing = await db.news_feeds.find_one({"feed_id": feed_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Feed not found")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "url" in update:
        update["url"] = str(update["url"])
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.news_feeds.update_one({"feed_id": feed_id}, {"$set": update})
    updated = await db.news_feeds.find_one({"feed_id": feed_id}, {"_id": 0})
    return {"message": "Feed updated", "feed": updated}


@router.delete("/feeds/{feed_id}")
async def delete_feed(feed_id: str, request: Request):
    """Delete an RSS feed."""
    await require_admin(request)
    db = get_db()
    result = await db.news_feeds.delete_one({"feed_id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"message": "Feed deleted"}


@router.post("/feeds/{feed_id}/refresh")
async def refresh_feed(feed_id: str, request: Request):
    """Force-fetch the feed now. Updates last_fetched/fetch_error/status."""
    await require_admin(request)
    db = get_db()
    feed = await db.news_feeds.find_one({"feed_id": feed_id}, {"_id": 0})
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    ok, parsed_title, entries, err = await _parse_feed(feed["url"])
    update = {
        "last_fetched": datetime.now(timezone.utc).isoformat() if ok else feed.get("last_fetched"),
        "fetch_error": None if ok else err,
        "status": "ok" if ok else "unreachable",
    }
    # Auto-correct name if user left it empty and feed has a title
    if ok and parsed_title and (not feed.get("name") or feed["name"] == "Untitled Feed"):
        update["name"] = parsed_title
    await db.news_feeds.update_one({"feed_id": feed_id}, {"$set": update})
    updated = await db.news_feeds.find_one({"feed_id": feed_id}, {"_id": 0})
    return {"ok": ok, "feed": updated, "article_count": len(entries), "error": err}


# ---- Article fetching ------------------------------------------------------

@router.get("/feed/{feed_id}/articles")
async def get_feed_articles(feed_id: str):
    """Fetch articles from a specific RSS feed (live, not cached)."""
    db = get_db()
    feed = await db.news_feeds.find_one({"feed_id": feed_id}, {"_id": 0})
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    ok, _, entries, err = await _parse_feed(feed["url"])
    if not ok:
        return {"articles": [], "error": err}

    articles = []
    for entry in entries:
        articles.append({
            "title": entry.get("title", "Untitled"),
            "link": entry.get("link", ""),
            "description": entry.get("summary", entry.get("description", "")),
            "published_at": entry.get("published", entry.get("updated", datetime.now(timezone.utc).isoformat())),
            "feed_name": feed.get("name"),
            "feed_id": feed.get("feed_id"),
            "source": "rss",
        })
    return {"articles": articles}


@router.get("/all-articles")
async def get_all_articles(limit: int = 50):
    """Fetch and merge articles from ALL active RSS feeds (live)."""
    db = get_db()
    feeds = await db.news_feeds.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(20)

    all_articles: List[dict] = []
    for feed in feeds:
        ok, _, entries, _ = await _parse_feed(feed["url"])
        if not ok:
            continue
        for entry in entries[:15]:
            all_articles.append({
                "title": entry.get("title", "Untitled"),
                "link": entry.get("link", ""),
                "description": entry.get("summary", entry.get("description", "")),
                "published_at": entry.get("published", entry.get("updated", datetime.now(timezone.utc).isoformat())),
                "feed_name": feed.get("name"),
                "feed_id": feed.get("feed_id"),
                "source": "rss",
            })

    all_articles.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return {"articles": all_articles[:limit]}


@router.get("/mixed-feed")
async def get_mixed_feed(
    limit: int = 50,
    skip: int = 0,
    source: str = "mixed",  # mixed | articles | rss
    category: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = "newest",  # newest | oldest
):
    """Public mixed feed: admin-authored news articles + RSS feeds, sorted by date.

    Supports pagination (skip+limit), source filter, category+tag filter,
    and sort. Used by the public /news page and the PageBuilder `news_feed`
    dynamic block.
    """
    db = get_db()

    # Admin news
    items: List[dict] = []
    if source in ("mixed", "articles"):
        query: dict = {"published": True}
        if category:
            query["category"] = category
        if tag:
            query["tags"] = tag
        admin_news = await db.news.find(
            query,
            {"_id": 0, "title": 1, "slug": 1, "excerpt": 1, "featured_image": 1,
             "tags": 1, "category": 1, "created_at": 1, "author": 1}
        ).sort("created_at", -1).limit(200).to_list(200)
        for n in admin_news:
            items.append({
                "title": n.get("title") or "Untitled",
                "link": f"/news/{n.get('slug')}" if n.get("slug") else None,
                "description": n.get("excerpt") or "",
                "published_at": n.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "featured_image": n.get("featured_image"),
                "tags": n.get("tags") or [],
                "category": n.get("category"),
                "author": n.get("author"),
                "feed_name": "Our News",
                "source": "article",
            })

    # RSS articles
    if source in ("mixed", "rss"):
        feed_query: dict = {"is_active": {"$ne": False}}
        if category:
            feed_query["category"] = category
        feeds = await db.news_feeds.find(feed_query, {"_id": 0}).to_list(20)
        for feed in feeds:
            ok, _, entries, _ = await _parse_feed(feed["url"])
            if not ok:
                continue
            for entry in entries[:15]:
                items.append({
                    "title": entry.get("title", "Untitled"),
                    "link": entry.get("link", ""),
                    "description": entry.get("summary", entry.get("description", "")),
                    "published_at": entry.get("published", entry.get("updated", datetime.now(timezone.utc).isoformat())),
                    "featured_image": None,
                    "tags": [],
                    "category": feed.get("category"),
                    "author": None,
                    "feed_name": feed.get("name") or "RSS",
                    "source": "rss",
                })

    reverse = sort != "oldest"
    items.sort(key=lambda x: x.get("published_at") or "", reverse=reverse)

    # Dedupe by link (same article can appear in multiple feeds)
    seen = set()
    deduped = []
    for it in items:
        key = it.get("link") or it.get("title")
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        deduped.append(it)

    total = len(deduped)
    paged = deduped[skip: skip + limit]
    return {"items": paged, "total": total, "skip": skip, "limit": limit}


# ---- Background Refresh Scheduler ------------------------------------------

async def refresh_all_feeds_loop(db):
    """Background task that periodically refreshes all active RSS feeds.

    Runs forever. Every feed is refreshed according to its own
    `refresh_interval` seconds (default 3600). Checks every 5 minutes to see
    which feeds are due. Safe to run alongside the manual Refresh button in
    the admin UI — they update the same `last_fetched` / `status` fields.
    """
    import asyncio as _asyncio
    logger.info("RSS refresh loop online - checking every 5 minutes")
    # Initial small delay so app startup isn't blocked on network I/O
    await _asyncio.sleep(30)
    while True:
        try:
            now = datetime.now(timezone.utc)
            feeds = await db.news_feeds.find(
                {"is_active": {"$ne": False}},
                {"_id": 0, "feed_id": 1, "url": 1, "refresh_interval": 1,
                 "last_fetched": 1, "name": 1}
            ).to_list(50)
            for feed in feeds:
                interval = int(feed.get("refresh_interval") or 3600)
                last = feed.get("last_fetched")
                last_dt = None
                if last:
                    try:
                        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                    except Exception:
                        last_dt = None
                due = (last_dt is None) or (now - last_dt).total_seconds() >= interval
                if not due:
                    continue
                ok, parsed_title, _entries, err = await _parse_feed(feed["url"])
                update = {
                    "last_fetched": now.isoformat() if ok else feed.get("last_fetched"),
                    "fetch_error": None if ok else err,
                    "status": "ok" if ok else "unreachable",
                }
                if ok and parsed_title and (not feed.get("name") or feed["name"] == "Untitled Feed"):
                    update["name"] = parsed_title
                await db.news_feeds.update_one({"feed_id": feed["feed_id"]}, {"$set": update})
                logger.info("RSS refresh %s -> %s", feed.get("name"), "ok" if ok else "fail")
        except Exception as e:
            logger.warning("RSS refresh loop error: %s", e)
        # Sleep 5 minutes between passes
        await _asyncio.sleep(300)


@router.post("/feeds/refresh-all")
async def refresh_all_feeds(request: Request):
    """Cron/trigger endpoint: refresh every active feed once."""
    await require_admin(request)
    db = get_db()
    feeds = await db.news_feeds.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(50)
    results = {"ok": 0, "failed": 0, "total": len(feeds), "details": []}
    for feed in feeds:
        ok, parsed_title, _entries, err = await _parse_feed(feed["url"])
        update = {
            "last_fetched": datetime.now(timezone.utc).isoformat() if ok else feed.get("last_fetched"),
            "fetch_error": None if ok else err,
            "status": "ok" if ok else "unreachable",
        }
        if ok and parsed_title and (not feed.get("name") or feed["name"] == "Untitled Feed"):
            update["name"] = parsed_title
        await db.news_feeds.update_one({"feed_id": feed["feed_id"]}, {"$set": update})
        if ok:
            results["ok"] += 1
        else:
            results["failed"] += 1
        results["details"].append({
            "feed_id": feed["feed_id"],
            "name": feed.get("name"),
            "ok": ok,
            "error": err,
        })
    return results

