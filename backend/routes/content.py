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

VALID_BLOG_STATUSES = {"draft", "published", "archived"}


class BlogPostCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: str = ""
    content: str  # HTML content
    featured_image: Optional[str] = None  # URL or base64
    tags: List[str] = []
    published: bool = False
    status: Optional[str] = None  # draft|published|archived (overrides published if set)
    audience: Optional[str] = "general"
    meta_description: Optional[str] = None
    meta_title: Optional[str] = None


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    status: Optional[str] = None
    audience: Optional[str] = None
    meta_description: Optional[str] = None
    meta_title: Optional[str] = None


class BlogStatusUpdate(BaseModel):
    status: str  # draft|published|archived


class BlogBulkAction(BaseModel):
    post_ids: List[str]
    action: str  # publish|unpublish|archive|restore|delete


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

def _normalize_post(post: dict) -> dict:
    """Backwards-compat: ensure status field is present, derived from published if missing."""
    if not post:
        return post
    if "status" not in post or post.get("status") not in VALID_BLOG_STATUSES:
        post["status"] = "published" if post.get("published") else "draft"
    return post


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

    # Derive status: explicit status wins, else from published flag
    if data.status and data.status in VALID_BLOG_STATUSES:
        status = data.status
    else:
        status = "published" if data.published else "draft"

    published = (status == "published")

    post_doc = {
        "post_id": post_id,
        "title": data.title,
        "slug": slug,
        "excerpt": data.excerpt or "",
        "content": data.content,
        "featured_image": data.featured_image,
        "tags": data.tags or [],
        "audience": data.audience or "general",
        "meta_title": data.meta_title,
        "meta_description": data.meta_description,
        "published": published,
        "status": status,
        "author_id": user.get("user_id"),
        "author_name": user.get("name") or user.get("email", "Unknown"),
        "view_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.blog_posts.insert_one(post_doc)
    post_doc.pop("_id", None)
    return post_doc


@router.get("/blog")
async def list_blog_posts(
    request: Request,
    published_only: bool = True,
    limit: int = 20,
    skip: int = 0,
    search: Optional[str] = None,
    status: Optional[str] = None,  # draft|published|archived|all
    tag: Optional[str] = None,
    sort: str = "newest",  # newest|oldest|title
):
    """List blog posts with pagination, status filter, and search.

    - Public callers (no auth) can only see published posts.
    - Authenticated content managers can pass ``status=all`` or any specific status
      to see drafts/archived posts.
    """
    db = get_db()

    # Determine if caller is an authenticated content manager (so they can see drafts/archived)
    is_manager = False
    try:
        from utils import get_current_user as _get_current_user, security
        credentials = await security(request)
        if credentials:
            user = await _get_current_user(request, credentials)
            if user and user.get("role") in [
                UserRole.SUPER_ADMIN,
                UserRole.ORG_ADMIN,
                UserRole.MEDIA_MANAGER,
            ]:
                is_manager = True
    except Exception:
        is_manager = False

    query: dict = {}

    # Status filter — only managers may filter by non-published status
    if status and status != "all":
        if status not in VALID_BLOG_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(VALID_BLOG_STATUSES)}")
        if not is_manager and status != "published":
            raise HTTPException(status_code=403, detail="Only content managers can filter by non-published status")
        # Match either new status field or legacy published flag for backwards compat
        if status == "published":
            query["$or"] = [{"status": "published"}, {"status": {"$exists": False}, "published": True}]
        elif status == "draft":
            query["$or"] = [{"status": "draft"}, {"status": {"$exists": False}, "published": {"$ne": True}}]
        else:  # archived
            query["status"] = "archived"
    elif status == "all":
        if not is_manager:
            # Non-managers cannot see all
            query["$or"] = [{"status": "published"}, {"status": {"$exists": False}, "published": True}]
    else:
        # No status param: respect legacy published_only behaviour for public callers
        if published_only and not is_manager:
            query["$or"] = [{"status": "published"}, {"status": {"$exists": False}, "published": True}]
        elif published_only and is_manager:
            # Manager hitting default — still default to published unless they ask otherwise
            # (preserve existing behaviour)
            query["$or"] = [{"status": "published"}, {"status": {"$exists": False}, "published": True}]

    # Tag filter
    if tag:
        query["tags"] = tag

    # Search filter (sanitized)
    if search:
        safe_search = sanitize_search_query(search)
        if safe_search:
            search_clauses = [
                {"title": {"$regex": safe_search, "$options": "i"}},
                {"excerpt": {"$regex": safe_search, "$options": "i"}},
                {"content": {"$regex": safe_search, "$options": "i"}},
                {"tags": {"$regex": safe_search, "$options": "i"}},
            ]
            # Combine with existing $or if any
            if "$or" in query:
                query = {"$and": [query, {"$or": search_clauses}]}
            else:
                query["$or"] = search_clauses

    # Sort
    if sort == "oldest":
        sort_spec = [("created_at", 1)]
    elif sort == "title":
        sort_spec = [("title", 1)]
    else:
        sort_spec = [("created_at", -1)]

    # Clamp pagination
    limit = max(1, min(100, limit))
    skip = max(0, skip)

    total = await db.blog_posts.count_documents(query)
    cursor = db.blog_posts.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    posts = [_normalize_post(p) for p in await cursor.to_list(limit)]

    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1

    return {
        "posts": posts,
        "total": total,
        "skip": skip,
        "limit": limit,
        "page": page,
        "total_pages": total_pages,
    }


@router.get("/blog/stats")
async def blog_stats(request: Request):
    """Counts of posts by status (managers only)."""
    await require_content_access(request)
    db = get_db()

    total = await db.blog_posts.count_documents({})
    archived = await db.blog_posts.count_documents({"status": "archived"})
    # Use legacy-aware queries to count published/draft
    published = await db.blog_posts.count_documents(
        {"$or": [{"status": "published"}, {"status": {"$exists": False}, "published": True}]}
    )
    draft = await db.blog_posts.count_documents(
        {"$or": [{"status": "draft"}, {"status": {"$exists": False}, "published": {"$ne": True}}]}
    )
    return {
        "total": total,
        "published": published,
        "draft": draft,
        "archived": archived,
    }


@router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    """Get a single blog post by slug (public endpoint)"""
    db = get_db()

    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post = _normalize_post(post)
    # Public endpoint: only show published
    if post.get("status") != "published":
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/blog/id/{post_id}")
async def get_blog_post_by_id(post_id: str, request: Request):
    """Get blog post by ID (managers only — can fetch drafts/archived)."""
    await require_content_access(request)
    db = get_db()

    post = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _normalize_post(post)


@router.patch("/blog/{post_id}")
async def update_blog_post(post_id: str, data: BlogPostUpdate, request: Request):
    """Update a blog post"""
    await require_content_access(request)
    db = get_db()

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    # If status was sent, validate and keep `published` flag in sync
    if "status" in update_data:
        if update_data["status"] not in VALID_BLOG_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(VALID_BLOG_STATUSES)}")
        update_data["published"] = (update_data["status"] == "published")
    elif "published" in update_data:
        # Legacy: published toggle => set status accordingly (only if not archived)
        existing = await db.blog_posts.find_one({"post_id": post_id}, {"status": 1})
        if existing and existing.get("status") != "archived":
            update_data["status"] = "published" if update_data["published"] else "draft"

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")

    post = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    return _normalize_post(post)


@router.patch("/blog/{post_id}/status")
async def update_blog_post_status(post_id: str, data: BlogStatusUpdate, request: Request):
    """Change a blog post's status (draft/published/archived)."""
    await require_content_access(request)
    db = get_db()

    if data.status not in VALID_BLOG_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(VALID_BLOG_STATUSES)}")

    update = {
        "status": data.status,
        "published": (data.status == "published"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.blog_posts.update_one({"post_id": post_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")

    post = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    return _normalize_post(post)


@router.post("/blog/bulk")
async def bulk_blog_action(data: BlogBulkAction, request: Request):
    """Perform a bulk action on multiple blog posts."""
    await require_content_access(request)
    db = get_db()

    if not data.post_ids:
        raise HTTPException(status_code=400, detail="post_ids cannot be empty")

    action = data.action
    now = datetime.now(timezone.utc).isoformat()
    affected = 0

    if action == "publish":
        result = await db.blog_posts.update_many(
            {"post_id": {"$in": data.post_ids}},
            {"$set": {"status": "published", "published": True, "updated_at": now}},
        )
        affected = result.modified_count
    elif action == "unpublish":
        result = await db.blog_posts.update_many(
            {"post_id": {"$in": data.post_ids}},
            {"$set": {"status": "draft", "published": False, "updated_at": now}},
        )
        affected = result.modified_count
    elif action == "archive":
        result = await db.blog_posts.update_many(
            {"post_id": {"$in": data.post_ids}},
            {"$set": {"status": "archived", "published": False, "updated_at": now}},
        )
        affected = result.modified_count
    elif action == "restore":
        result = await db.blog_posts.update_many(
            {"post_id": {"$in": data.post_ids}, "status": "archived"},
            {"$set": {"status": "draft", "published": False, "updated_at": now}},
        )
        affected = result.modified_count
    elif action == "delete":
        result = await db.blog_posts.delete_many({"post_id": {"$in": data.post_ids}})
        affected = result.deleted_count
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid action. Allowed: publish, unpublish, archive, restore, delete",
        )

    return {"action": action, "affected": affected, "post_ids": data.post_ids}


@router.post("/blog/{post_id}/duplicate")
async def duplicate_blog_post(post_id: str, request: Request):
    """Duplicate a blog post as a new draft."""
    user = await require_content_access(request)
    db = get_db()

    original = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")

    new_id = f"post_{uuid.uuid4().hex[:12]}"
    base_slug = (original.get("slug") or "post") + "-copy"
    new_slug = base_slug
    while await db.blog_posts.find_one({"slug": new_slug}):
        new_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    duplicate = {
        **original,
        "post_id": new_id,
        "title": f"{original.get('title', 'Untitled')} (Copy)",
        "slug": new_slug,
        "status": "draft",
        "published": False,
        "author_id": user.get("user_id"),
        "author_name": user.get("name") or user.get("email", "Unknown"),
        "view_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.blog_posts.insert_one(duplicate)
    duplicate.pop("_id", None)
    return duplicate


@router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, request: Request, permanent: bool = False):
    """Delete a blog post.

    By default this is a soft-delete (marks status='archived'). Pass ``permanent=true``
    to actually remove the document.
    """
    await require_content_access(request)
    db = get_db()

    if permanent:
        result = await db.blog_posts.delete_one({"post_id": post_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post permanently deleted", "permanent": True}

    # Soft delete -> archive
    result = await db.blog_posts.update_one(
        {"post_id": post_id},
        {
            "$set": {
                "status": "archived",
                "published": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post archived", "permanent": False}


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
        "author_id": user.get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.news.insert_one(news_doc)
    news_doc.pop("_id", None)
    return news_doc


@router.get("/news")
async def list_news(
    limit: int = 15,
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

    # Fetch ALL RSS feeds regardless of local news count
    if include_rss and not search:
        rss_feeds = await db.rss_feeds.find({"enabled": True}, {"_id": 0}).to_list(50)
        for feed in rss_feeds:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(feed["url"])
                    if response.status_code == 200:
                        root = ET.fromstring(response.content)
                        items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
                        # Get all items from each feed (up to 50)
                        for item in items[:50]:
                            title = item.findtext("title") or item.findtext("{http://www.w3.org/2005/Atom}title")
                            description = item.findtext("description") or item.findtext("{http://www.w3.org/2005/Atom}summary")
                            link = item.findtext("link")
                            if not link:
                                link_elem = item.find("{http://www.w3.org/2005/Atom}link")
                                if link_elem is not None:
                                    link = link_elem.get("href")
                            pub_date = item.findtext("pubDate") or item.findtext("{http://www.w3.org/2005/Atom}published") or item.findtext("{http://www.w3.org/2005/Atom}updated")
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

    # Sort all items by date
    try:
        combined_news.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    except Exception:
        pass

    # Calculate total before pagination
    total_items = len(combined_news)
    
    # Apply pagination to combined results
    paginated_news = combined_news[skip:skip + limit]

    return {
        "news": paginated_news,
        "total": total_items,
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
        "created_by": user.get("user_id"),
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
    await require_content_access(request)
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
    await require_content_access(request)
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
        "author_id": user.get("user_id"),
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
    await require_content_access(request)
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
    await require_content_access(request)
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
    update_data["updated_by"] = user.get("user_id")
    
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
        "uploaded_by": user.get("user_id"),
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
    await require_content_access(request)
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
    await require_content_access(request)
    db = get_db()
    
    result = await db.media.delete_one({"media_id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"message": "Media deleted"}
