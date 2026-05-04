"""
Sitemap Generator for CMS
Generates sitemap.xml for SEO with all public pages, blog posts, and events
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime, timezone

router = APIRouter(prefix="/sitemap", tags=["Sitemap"])


def get_db():
    from server import db
    return db


@router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap for SEO"""
    db = get_db()
    
    # Base URL from environment or default
    import os
    base_url = os.getenv('REACT_APP_BACKEND_URL', 'https://vasilisnetshield.com').replace('/api', '')
    
    sitemap_urls = []
    
    # Homepage
    sitemap_urls.append({
        "loc": base_url,
        "lastmod": datetime.now(timezone.utc).isoformat(),
        "changefreq": "daily",
        "priority": "1.0"
    })
    
    # CMS Pages (tiles)
    tiles = await db.cms_tiles.find({"published": True}, {"_id": 0, "slug": 1, "updated_at": 1}).to_list(100)
    for tile in tiles:
        sitemap_urls.append({
            "loc": f"{base_url}/{tile['slug']}",
            "lastmod": tile.get('updated_at', datetime.now(timezone.utc).isoformat()),
            "changefreq": "weekly",
            "priority": "0.8"
        })
    
    # Blog Posts — use status field (published=True OR status="published")
    posts = await db.blog_posts.find(
        {"$or": [{"published": True}, {"status": "published"}]},
        {"_id": 0, "slug": 1, "updated_at": 1, "created_at": 1, "featured_image": 1, "title": 1, "excerpt": 1}
    ).to_list(1000)
    for post in posts:
        lastmod = post.get('updated_at') or post.get('created_at') or datetime.now(timezone.utc).isoformat()
        sitemap_urls.append({
            "loc": f"{base_url}/blog/{post['slug']}",
            "lastmod": lastmod,
            "changefreq": "monthly",
            "priority": "0.7",
            "image": post.get("featured_image"),
            "image_title": post.get("title")
        })
    
    # Custom CMS pages
    custom_pages = await db.custom_pages.find(
        {"is_published": True},
        {"_id": 0, "slug": 1, "updated_at": 1, "title": 1}
    ).to_list(100)
    for page in custom_pages:
        sitemap_urls.append({
            "loc": f"{base_url}/{page['slug']}",
            "lastmod": page.get('updated_at', datetime.now(timezone.utc).isoformat()),
            "changefreq": "weekly",
            "priority": "0.8"
        })

    # Static routes always worth indexing
    for static in ["/blog", "/news", "/contact", "/about"]:
        sitemap_urls.append({
            "loc": f"{base_url}{static}",
            "lastmod": datetime.now(timezone.utc).isoformat(),
            "changefreq": "weekly",
            "priority": "0.7"
        })

    # Events
    events = await db.events.find({"published": True}, {"_id": 0, "event_id": 1, "updated_at": 1}).to_list(500)
    for event in events:
        sitemap_urls.append({
            "loc": f"{base_url}/events/{event['event_id']}",
            "lastmod": event.get('updated_at', datetime.now(timezone.utc).isoformat()),
            "changefreq": "weekly",
            "priority": "0.6"
        })
    
    # News
    news_items = await db.news.find({"published": True}, {"_id": 0, "news_id": 1, "updated_at": 1}).to_list(500)
    for news in news_items:
        sitemap_urls.append({
            "loc": f"{base_url}/news/{news['news_id']}",
            "lastmod": news.get('updated_at', datetime.now(timezone.utc).isoformat()),
            "changefreq": "weekly",
            "priority": "0.6"
        })
    
    # Generate XML with image sitemap extension
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += (
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    )
    
    for url in sitemap_urls:
        xml_content += '  <url>\n'
        xml_content += f'    <loc>{url["loc"]}</loc>\n'
        xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += f'    <changefreq>{url["changefreq"]}</changefreq>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        if url.get("image"):
            xml_content += '    <image:image>\n'
            xml_content += f'      <image:loc>{url["image"]}</image:loc>\n'
            if url.get("image_title"):
                xml_content += f'      <image:title>{url["image_title"]}</image:title>\n'
            xml_content += '    </image:image>\n'
        xml_content += '  </url>\n'
    
    xml_content += '</urlset>'
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )
