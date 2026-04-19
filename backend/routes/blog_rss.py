"""
RSS Feed Generation for Blog Posts
Generates XML RSS feed for blog subscriptions
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime
import xml.etree.ElementTree as ET

router = APIRouter(prefix="/blog", tags=["Blog"])


def get_db():
    from server import db
    return db


@router.get("/rss.xml", response_class=Response)
@router.get("/feed", response_class=Response)
async def generate_rss_feed():
    """Generate RSS feed for blog posts"""
    db = get_db()
    
    # Get published blog posts
    posts = await db.blog_posts.find(
        {"published": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Create RSS XML
    rss = ET.Element("rss", version="2.0")
    rss.set("xmlns:atom", "http://www.w3.org/2005/Atom")
    
    channel = ET.SubElement(rss, "channel")
    
    # Channel metadata
    ET.SubElement(channel, "title").text = "Vasilis NetShield Blog"
    ET.SubElement(channel, "link").text = "https://vasilisnetshield.com/blog"
    ET.SubElement(channel, "description").text = "Cybersecurity insights, training tips, and security awareness content for businesses and individuals."
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "lastBuildDate").text = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    
    # Self link
    atom_link = ET.SubElement(channel, "atom:link")
    atom_link.set("href", "https://vasilisnetshield.com/api/blog/rss.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")
    
    # Add blog posts
    for post in posts:
        item = ET.SubElement(channel, "item")
        
        ET.SubElement(item, "title").text = post.get("title", "Untitled")
        ET.SubElement(item, "link").text = f"https://vasilisnetshield.com/blog/{post.get('slug', '')}"
        ET.SubElement(item, "description").text = post.get("excerpt") or post.get("meta_description", "")
        
        # GUID
        guid = ET.SubElement(item, "guid")
        guid.set("isPermaLink", "true")
        guid.text = f"https://vasilisnetshield.com/blog/{post.get('slug', '')}"
        
        # Publication date
        if post.get("created_at"):
            try:
                pub_date = datetime.fromisoformat(post["created_at"].replace("Z", "+00:00"))
                ET.SubElement(item, "pubDate").text = pub_date.strftime("%a, %d %b %Y %H:%M:%S GMT")
            except:
                pass
        
        # Categories/Tags
        for tag in post.get("tags", [])[:5]:
            ET.SubElement(item, "category").text = tag
        
        # Author
        if post.get("author"):
            ET.SubElement(item, "author").text = f"noreply@vasilisnetshield.com ({post['author']})"
    
    # Convert to string
    xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_string += ET.tostring(rss, encoding="unicode")
    
    return Response(
        content=xml_string,
        media_type="application/rss+xml",
        headers={
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
        }
    )


@router.get("/sitemap.xml", response_class=Response)
async def generate_blog_sitemap():
    """Generate sitemap for blog posts"""
    db = get_db()
    
    posts = await db.blog_posts.find(
        {"published": True},
        {"_id": 0, "slug": 1, "updated_at": 1}
    ).to_list(1000)
    
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    for post in posts:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"https://vasilisnetshield.com/blog/{post.get('slug', '')}"
        
        if post.get("updated_at"):
            try:
                lastmod = datetime.fromisoformat(post["updated_at"].replace("Z", "+00:00"))
                ET.SubElement(url, "lastmod").text = lastmod.strftime("%Y-%m-%d")
            except:
                pass
        
        ET.SubElement(url, "changefreq").text = "weekly"
        ET.SubElement(url, "priority").text = "0.7"
    
    xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_string += ET.tostring(urlset, encoding="unicode")
    
    return Response(
        content=xml_string,
        media_type="application/xml",
        headers={"Content-Type": "application/xml; charset=utf-8"}
    )
