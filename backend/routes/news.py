"""
News Management Routes
Complete CRUD for news articles with RSS feed support
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re

router = APIRouter(prefix="/content/news", tags=["News"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["super_admin", "org_admin", "media_manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class NewsCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    category: str = "general"
    tags: List[str] = []
    featured_image: Optional[str] = None
    published: bool = True


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    featured_image: Optional[str] = None
    published: Optional[bool] = None


@router.get("")
async def get_all_news(
    limit: int = 100,
    skip: int = 0,
    published_only: bool = False,
    user: dict = Depends(require_admin)
):
    """Get all news articles (admin)"""
    db = get_db()
    
    query = {"published": True} if published_only else {}
    
    news = await db.news.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.news.count_documents(query)
    
    return {"news": news, "total": total}


@router.get("/public")
async def get_public_news(limit: int = 50, skip: int = 0):
    """Get published news articles (public)"""
    db = get_db()
    
    news = await db.news.find(
        {"published": True},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"news": news}


@router.get("/{news_id}")
async def get_news_by_id(news_id: str, user: dict = Depends(require_admin)):
    """Get specific news article"""
    db = get_db()
    
    news = await db.news.find_one({"news_id": news_id}, {"_id": 0})
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    return news


@router.get("/slug/{slug}")
async def get_news_by_slug(slug: str):
    """Get news by slug (public)"""
    db = get_db()
    
    news = await db.news.find_one({"slug": slug, "published": True}, {"_id": 0})
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    # Increment views
    await db.news.update_one({"slug": slug}, {"$inc": {"views": 1}})
    
    return news


@router.post("")
async def create_news(data: NewsCreate, user: dict = Depends(require_admin)):
    """Create news article"""
    db = get_db()
    
    # Check if slug exists
    existing = await db.news.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    news_doc = {
        "news_id": str(uuid.uuid4()),
        "title": data.title,
        "slug": data.slug,
        "excerpt": data.excerpt,
        "content": data.content,
        "category": data.category,
        "tags": data.tags,
        "featured_image": data.featured_image,
        "published": data.published,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id"),
        "author": user.get("name", "Admin"),
        "views": 0
    }
    
    await db.news.insert_one(news_doc)
    
    return {"message": "News created", "news_id": news_doc["news_id"], "news": news_doc}


@router.patch("/{news_id}")
async def update_news(news_id: str, data: NewsUpdate, user: dict = Depends(require_admin)):
    """Update news article"""
    db = get_db()
    
    existing = await db.news.find_one({"news_id": news_id})
    if not existing:
        raise HTTPException(status_code=404, detail="News not found")
    
    # Check slug uniqueness if changing
    if data.slug and data.slug != existing.get("slug"):
        slug_exists = await db.news.find_one({"slug": data.slug, "news_id": {"$ne": news_id}})
        if slug_exists:
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.news.update_one({"news_id": news_id}, {"$set": update_data})
    
    return {"message": "News updated", "news_id": news_id}


@router.delete("/{news_id}")
async def delete_news(news_id: str, user: dict = Depends(require_admin)):
    """Delete news article"""
    db = get_db()
    
    result = await db.news.delete_one({"news_id": news_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    
    return {"message": "News deleted", "news_id": news_id}
