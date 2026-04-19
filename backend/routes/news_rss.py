"""
News RSS Feed Generation
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime
import xml.etree.ElementTree as ET

router = APIRouter(prefix="/news", tags=["News RSS"])


def get_db():
    from server import db
    return db


@router.get("/rss.xml", response_class=Response)
@router.get("/feed", response_class=Response)
async def generate_news_rss():
    """Generate RSS feed for news"""
    db = get_db()
    
    news = await db.news.find(
        {"published": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    rss = ET.Element("rss", version="2.0")
    rss.set("xmlns:atom", "http://www.w3.org/2005/Atom")
    
    channel = ET.SubElement(rss, "channel")
    
    ET.SubElement(channel, "title").text = "Vasilis NetShield News"
    ET.SubElement(channel, "link").text = "https://vasilisnetshield.com/news"
    ET.SubElement(channel, "description").text = "Latest security news, updates, and announcements from Vasilis NetShield."
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "lastBuildDate").text = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    
    atom_link = ET.SubElement(channel, "atom:link")
    atom_link.set("href", "https://vasilisnetshield.com/api/news/rss.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")
    
    for item_data in news:
        item = ET.SubElement(channel, "item")
        
        ET.SubElement(item, "title").text = item_data.get("title", "Untitled")
        ET.SubElement(item, "link").text = f"https://vasilisnetshield.com/news/{item_data.get('slug', '')}"
        ET.SubElement(item, "description").text = item_data.get("excerpt", "")
        
        guid = ET.SubElement(item, "guid")
        guid.set("isPermaLink", "true")
        guid.text = f"https://vasilisnetshield.com/news/{item_data.get('slug', '')}"
        
        if item_data.get("created_at"):
            try:
                pub_date = datetime.fromisoformat(item_data["created_at"].replace("Z", "+00:00"))
                ET.SubElement(item, "pubDate").text = pub_date.strftime("%a, %d %b %Y %H:%M:%S GMT")
            except:
                pass
        
        for tag in item_data.get("tags", [])[:5]:
            ET.SubElement(item, "category").text = tag
        
        if item_data.get("author"):
            ET.SubElement(item, "author").text = f"noreply@vasilisnetshield.com ({item_data['author']})"
    
    xml_string = '<?xml version="1.0" encoding="UTF-8"?>\\n'
    xml_string += ET.tostring(rss, encoding="unicode")
    
    return Response(
        content=xml_string,
        media_type="application/rss+xml",
        headers={"Content-Type": "application/rss+xml; charset=utf-8"}
    )


@router.get("/sitemap.xml", response_class=Response)
async def generate_news_sitemap():
    """Generate sitemap for news"""
    db = get_db()
    
    news = await db.news.find(
        {"published": True},
        {"_id": 0, "slug": 1, "updated_at": 1}
    ).to_list(1000)
    
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    
    for item in news:
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"https://vasilisnetshield.com/news/{item.get('slug', '')}"
        
        if item.get("updated_at"):
            try:
                lastmod = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00"))
                ET.SubElement(url, "lastmod").text = lastmod.strftime("%Y-%m-%d")
            except:
                pass
        
        ET.SubElement(url, "changefreq").text = "weekly"
        ET.SubElement(url, "priority").text = "0.7"
    
    xml_string = '<?xml version="1.0" encoding="UTF-8"?>\\n'
    xml_string += ET.tostring(urlset, encoding="unicode")
    
    return Response(
        content=xml_string,
        media_type="application/xml",
        headers={"Content-Type": "application/xml; charset=utf-8"}
    )
