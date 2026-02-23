from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import base64
import re

router = APIRouter(prefix="/content", tags=["Content"])


def sanitize_search_query(query: Optional[str]) -> str:
    """Sanitize search query to prevent NoSQL injection"""
    if query is None:
        return ""
    # Remove special regex characters
    sanitized = re.sub(r'[^\w\s\-@.\']', '', str(query))
    return sanitized[:200]


def get_db():
    from server import db
    return db


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    MEDIA_MANAGER = "media_manager"
    TRAINEE = "trainee"


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_content_access(request: Request) -> dict:
    """Allow super_admin, org_admin, or media_manager"""
    user = await get_current_user(request)
    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MEDIA_MANAGER]
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Content management access required")
    return user


# ============== MODELS ==============

class BlogPostCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: str
    content: str  # HTML content
    featured_image: Optional[str] = None  # URL or base64
    tags: List[str] = []
    published: bool = False


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None


class NewsCreate(BaseModel):
    title: str
    content: str
    link: Optional[str] = None
    published: bool = True


class NewsUpdate(BaseModel):
    """
    Schema for updating an existing news item.  All fields are optional to allow
    partial updates.  The published flag can be toggled to publish/unpublish
    news articles via the content manager.
    """
    title: Optional[str] = None
    content: Optional[str] = None
    link: Optional[str] = None
    published: Optional[bool] = None


class RssFeedCreate(BaseModel):
    name: str
    url: str
    enabled: bool = True


class VideoCreate(BaseModel):
    title: str
    description: str
    youtube_url: str  # Full YouTube URL or video ID
    thumbnail: Optional[str] = None
    category: str = "training"
    published: bool = False


class AboutUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    team_members: Optional[List[dict]] = None
    mission: Optional[str] = None
    vision: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def extract_youtube_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    elif "youtube.com/watch" in url:
        import re
        match = re.search(r'v=([^&]+)', url)
        return match.group(1) if match else url
    elif "youtube.com/embed/" in url:
        return url.split("embed/")[1].split("?")[0]
    return url  # Assume it's already a video ID


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    import re
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


# ============== BLOG ROUTES ==============

@router.post("/blog")
async def create_blog_post(data: BlogPostCreate, request: Request):
    """Create a new blog post"""
    user = await require_content_access(request)
    db = get_db()
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    slug = data.slug or generate_slug(data.title)
    
    # Check slug uniqueness
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    post_doc = {
        "post_id": post_id,
        "title": data.title,
        "slug": slug,
        "excerpt": data.excerpt,
        "content": data.content,
        "featured_image": data.featured_image,
        "tags": data.tags,
        "published": data.published,
        "author_id": user["user_id"],
        "author_name": user.get("name", "Unknown"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blog_posts.insert_one(post_doc)
    post_doc.pop("_id", None)
    return post_doc


@router.get("/blog")
async def list_blog_posts(
    published_only: bool = True, 
    limit: int = 10, 
    skip: int = 0,
    search: str = None
):
    """List blog posts with pagination and search (public endpoint)"""
    db = get_db()
    
    query = {}
    if published_only:
        query["published"] = True
    
    # Add search filter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.blog_posts.count_documents(query)
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"posts": posts, "total": total, "skip": skip, "limit": limit}


@router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    """Get a single blog post by slug (public endpoint)"""
    db = get_db()
    
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return post


@router.patch("/blog/{post_id}")
async def update_blog_post(post_id: str, data: BlogPostUpdate, request: Request):
    """Update a blog post"""
    user = await require_content_access(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})


@router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, request: Request):
    """Delete a blog post"""
    user = await require_content_access(request)
    db = get_db()
    
    result = await db.blog_posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted"}


# ============== NEWS ROUTES ==============

@router.post("/news")
async def create_news(data: NewsCreate, request: Request):
    """Create a news item"""
    user = await require_content_access(request)
    db = get_db()
    
    news_id = f"news_{uuid.uuid4().hex[:12]}"
    
    news_doc = {
        "news_id": news_id,
        "title": data.title,
        "content": data.content,
        "link": data.link,
        "published": data.published,
        "author_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.news.insert_one(news_doc)
    news_doc.pop("_id", None)
    return news_doc


@router.get("/news")
async def list_news(
    limit: int = 10,
    skip: int = 0,
    search: Optional[str] = None,
    include_rss: bool = True,
    published_only: bool = True
) -> dict:
    """
    List news items with pagination and search.  If ``published_only`` is true (default), only
    return locally stored news that are published.  Admins and content managers
    can set ``published_only`` to false to see unpublished news as well.  RSS feed
    articles are always treated as published when included.
    """
    db = get_db()
    import httpx
    import xml.etree.ElementTree as ET

    # Build query for local news
    query = {}
    if published_only:
        query["published"] = True
    if search:
        # Search across title and content
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]

    # Get total count for local news
    local_total = await db.news.count_documents(query)

    # Get local news with pagination
    local_news_cursor = db.news.find(query, {"_id": 0}).sort("created_at", -1)
    local_news = await local_news_cursor.skip(skip).limit(limit).to_list(limit)

    # Add source indicator
    for item in local_news:
        item["source"] = "local"

    combined_news = list(local_news)
    rss_count = 0

    # Fetch RSS feeds if requested and we have room
    if include_rss and len(combined_news) < limit and not search:
        rss_feeds = await db.rss_feeds.find({"enabled": True}, {"_id": 0}).to_list(20)
        for feed in rss_feeds:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(feed["url"])
                    if response.status_code == 200:
                        root = ET.fromstring(response.content)
                        items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
                        for item in items[:3]:
                            title = item.findtext("title") or item.findtext("{http://www.w3.org/2005/Atom}title")
                            description = item.findtext("description") or item.findtext("{http://www.w3.org/2005/Atom}summary")
                            link = item.findtext("link")
                            if not link:
                                link_elem = item.find("{http://www.w3.org/2005/Atom}link")
                                if link_elem is not None:
                                    link = link_elem.get("href")
                            pub_date = item.findtext("pubDate") or item.findtext("{http://www.w3.org/2005/Atom}published")
                            if title:
                                combined_news.append({
                                    "news_id": f"rss_{hash(title + (link or '')) % 10000000}",
                                    "title": title.strip() if title else "No title",
                                    "content": (description[:200] + "..." if description and len(description) > 200 else description) if description else "",
                                    "link": link,
                                    "source": "rss",
                                    "source_name": feed.get("name", "RSS Feed"),
                                    "published": True,
                                    "created_at": pub_date or datetime.now(timezone.utc).isoformat()
                                })
                                rss_count += 1
            except Exception as e:
                # Log the error but continue processing other feeds
                print(f"Failed to fetch RSS feed {feed.get('name')}: {e}")
                continue

    # Sort by date
    try:
        combined_news.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    except Exception:
        pass

    # Limit the results
    combined_news = combined_news[:limit]

    return {
        "news": combined_news,
        "total": local_total + rss_count,
        "skip": skip,
        "limit": limit
    }


@router.post("/news/rss-feeds")
async def add_rss_feed(data: RssFeedCreate, request: Request):
    """Add an RSS feed source"""
    user = await require_content_access(request)
    db = get_db()
    
    feed_id = f"feed_{uuid.uuid4().hex[:12]}"
    
    feed_doc = {
        "feed_id": feed_id,
        "name": data.name,
        "url": data.url,
        "enabled": data.enabled,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rss_feeds.insert_one(feed_doc)
    feed_doc.pop("_id", None)
    return feed_doc


@router.get("/news/rss-feeds")
async def list_rss_feeds(request: Request):
    """List all RSS feed sources"""
    await require_content_access(request)
    db = get_db()
    
    feeds = await db.rss_feeds.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"feeds": feeds}


@router.patch("/news/rss-feeds/{feed_id}")
async def update_rss_feed(feed_id: str, data: dict, request: Request):
    """Update an RSS feed"""
    await require_content_access(request)
    db = get_db()
    
    allowed_fields = ["name", "url", "enabled"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.rss_feeds.update_one({"feed_id": feed_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    return await db.rss_feeds.find_one({"feed_id": feed_id}, {"_id": 0})


@router.delete("/news/rss-feeds/{feed_id}")
async def delete_rss_feed(feed_id: str, request: Request):
    """Delete an RSS feed source"""
    await require_content_access(request)
    db = get_db()
    
    result = await db.rss_feeds.delete_one({"feed_id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    return {"message": "Feed deleted"}


@router.delete("/news/{news_id}")
async def delete_news(news_id: str, request: Request):
    """Delete a news item"""
    user = await require_content_access(request)
    db = get_db()
    
    result = await db.news.delete_one({"news_id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    
    return {"message": "News deleted"}


# ============== NEWS UPDATE ==============

@router.patch("/news/{news_id}")
async def update_news(news_id: str, data: NewsUpdate, request: Request):
    """
    Update a news item.  Content managers can modify the title, content,
    link, and published status of a news article.  An error will be raised
    if the news_id does not exist or if no fields are provided for update.
    """
    user = await require_content_access(request)
    db = get_db()
    # Build update document from provided fields
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.news.update_one({"news_id": news_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    # Return updated news item (excluding internal ID)
    return await db.news.find_one({"news_id": news_id}, {"_id": 0})


# ============== VIDEO ROUTES ==============

@router.post("/videos")
async def create_video(data: VideoCreate, request: Request):
    """Add a YouTube video"""
    user = await require_content_access(request)
    db = get_db()
    
    video_id = f"vid_{uuid.uuid4().hex[:12]}"
    youtube_id = extract_youtube_id(data.youtube_url)
    
    # Auto-generate thumbnail from YouTube
    thumbnail = data.thumbnail or f"https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg"
    
    video_doc = {
        "video_id": video_id,
        "title": data.title,
        "description": data.description,
        "youtube_id": youtube_id,
        "youtube_url": f"https://www.youtube.com/embed/{youtube_id}",
        "thumbnail": thumbnail,
        "category": data.category,
        "published": data.published,
        "author_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.videos.insert_one(video_doc)
    video_doc.pop("_id", None)
    return video_doc


@router.get("/videos")
async def list_videos(
    category: Optional[str] = None, 
    published_only: bool = True, 
    limit: int = 10,
    skip: int = 0,
    search: str = None
):
    """List videos with pagination and search (public endpoint)"""
    db = get_db()
    
    query = {}
    if published_only:
        query["published"] = True
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.videos.count_documents(query)
    videos = await db.videos.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"videos": videos, "total": total, "skip": skip, "limit": limit}


@router.patch("/videos/{video_id}")
async def update_video(video_id: str, data: dict, request: Request):
    """Update a video"""
    user = await require_content_access(request)
    db = get_db()
    
    allowed_fields = ["title", "description", "category", "published"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.videos.update_one(
        {"video_id": video_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return await db.videos.find_one({"video_id": video_id}, {"_id": 0})


@router.delete("/videos/{video_id}")
async def delete_video(video_id: str, request: Request):
    """Delete a video"""
    user = await require_content_access(request)
    db = get_db()
    
    result = await db.videos.delete_one({"video_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"message": "Video deleted"}


# ============== ABOUT PAGE ==============

@router.get("/about")
async def get_about():
    """Get about page content (public endpoint)"""
    db = get_db()
    
    about = await db.settings.find_one({"type": "about"}, {"_id": 0})
    if not about:
        return {
            "title": "About Us",
            "content": "Welcome to Vasilis NetShield - your trusted partner in cybersecurity training.",
            "mission": "To empower organizations with the knowledge and skills to defend against cyber threats.",
            "vision": "A world where every employee is a cybersecurity asset.",
            "team_members": []
        }
    return about


@router.patch("/about")
async def update_about(data: AboutUpdate, request: Request):
    """Update about page content"""
    user = await require_content_access(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["type"] = "about"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.settings.update_one(
        {"type": "about"},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_about()


# ============== MEDIA UPLOAD ==============

@router.post("/upload")
async def upload_media(request: Request, file: UploadFile = File(...)):
    """Upload an image for use in blog posts"""
    user = await require_content_access(request)
    db = get_db()
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPEG, WebP, GIF")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")
    
    media_id = f"media_{uuid.uuid4().hex[:12]}"
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    media_doc = {
        "media_id": media_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "data_url": data_url,
        "size": len(contents),
        "uploaded_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.media.insert_one(media_doc)
    
    return {
        "media_id": media_id,
        "url": data_url,
        "filename": file.filename
    }


@router.get("/media")
async def list_media(request: Request, limit: int = 50):
    """List uploaded media"""
    user = await require_content_access(request)
    db = get_db()
    
    media = await db.media.find({}, {"_id": 0, "data_url": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"media": media}


@router.get("/media/{media_id}")
async def get_media(media_id: str):
    """Get a media item"""
    db = get_db()
    
    media = await db.media.find_one({"media_id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return media


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, request: Request):
    """Delete a media item"""
    user = await require_content_access(request)
    db = get_db()
    
    result = await db.media.delete_one({"media_id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"message": "Media deleted"}
