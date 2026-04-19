"""
News RSS Feed Aggregator Backend
Supports up to 10 RSS feeds
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import feedparser
import asyncio
from concurrent.futures import ThreadPoolExecutor

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

class RSSFeedCreate(BaseModel):
    url: HttpUrl

@router.get("/feeds")
async def get_feeds():
    """Get all RSS feeds (public endpoint)"""
    db = get_db()
    feeds = await db.news_feeds.find({}, {"_id": 0}).sort("created_at", 1).to_list(10)
    return {"feeds": feeds}

@router.post("/feeds")
async def add_feed(data: RSSFeedCreate, request: Request):
    """Add a new RSS feed (admin only, max 10 feeds)"""
    await require_admin(request)
    db = get_db()
    
    # Check limit
    count = await db.news_feeds.count_documents({})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 RSS feeds allowed")
    
    # Validate feed by fetching it
    loop = asyncio.get_event_loop()
    try:
        feed_data = await loop.run_in_executor(executor, feedparser.parse, str(data.url))
        if feed_data.get('bozo'):  # Error parsing
            raise ValueError("Invalid RSS feed")
        
        feed_title = feed_data.feed.get('title', 'Untitled Feed')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch RSS feed: {str(e)}")
    
    # Save feed
    feed_id = f"feed_{uuid.uuid4().hex[:12]}"
    feed = {
        "feed_id": feed_id,
        "name": feed_title,
        "url": str(data.url),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.news_feeds.insert_one(feed)
    return {"message": "RSS feed added", "feed_id": feed_id}

@router.delete("/feeds/{feed_id}")
async def delete_feed(feed_id: str, request: Request):
    """Delete an RSS feed"""
    await require_admin(request)
    db = get_db()
    
    result = await db.news_feeds.delete_one({"feed_id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    return {"message": "Feed deleted"}

@router.get("/feed/{feed_id}/articles")
async def get_feed_articles(feed_id: str):
    """Fetch articles from a specific RSS feed"""
    db = get_db()
    
    feed = await db.news_feeds.find_one({"feed_id": feed_id}, {"_id": 0})
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Fetch and parse RSS feed
    loop = asyncio.get_event_loop()
    try:
        feed_data = await loop.run_in_executor(executor, feedparser.parse, feed['url'])
        
        articles = []
        for entry in feed_data.entries[:20]:  # Limit to 20 most recent
            article = {
                "title": entry.get('title', 'Untitled'),
                "link": entry.get('link', ''),
                "description": entry.get('summary', entry.get('description', '')),
                "published_at": entry.get('published', entry.get('updated', datetime.now(timezone.utc).isoformat()))
            }
            articles.append(article)
        
        return {"articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch feed: {str(e)}")

@router.get("/all-articles")
async def get_all_articles():
    """Get articles from all feeds combined"""
    db = get_db()
    
    feeds = await db.news_feeds.find({}, {"_id": 0}).to_list(10)
    
    all_articles = []
    loop = asyncio.get_event_loop()
    
    for feed in feeds:
        try:
            feed_data = await loop.run_in_executor(executor, feedparser.parse, feed['url'])
            
            for entry in feed_data.entries[:10]:
                article = {
                    "title": entry.get('title', 'Untitled'),
                    "link": entry.get('link', ''),
                    "description": entry.get('summary', entry.get('description', '')),
                    "published_at": entry.get('published', entry.get('updated', datetime.now(timezone.utc).isoformat())),
                    "feed_name": feed['name']
                }
                all_articles.append(article)
        except:
            continue
    
    # Sort by date
    all_articles.sort(key=lambda x: x['published_at'], reverse=True)
    
    return {"articles": all_articles[:50]}  # Return top 50 most recent
