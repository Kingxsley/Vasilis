"""
Generate 20 SEO-optimized blog posts using Emergent LLM Key
10 posts for end users, 10 posts for business managers/decision makers
"""
import asyncio
import sys
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append('/app/backend')

load_dotenv('/app/backend/.env')

from server import db
from emergentintegrations.llm.chat import LlmChat, UserMessage


# Blog topics for end users (consumer cybersecurity)
END_USER_TOPICS = [
    "How to Spot Phishing Emails: A Complete Guide for 2025",
    "10 Essential Password Security Tips Everyone Should Know",
    "What is Two-Factor Authentication and Why You Need It",
    "Social Engineering Attacks: How Hackers Manipulate People",
    "Securing Your Home Wi-Fi Network: Step-by-Step Guide",
    "Ransomware Explained: How to Protect Your Personal Data",
    "Mobile Security: Protecting Your Smartphone from Threats",
    "Safe Online Shopping: How to Avoid Credit Card Fraud",
    "Privacy Settings Every Social Media User Should Enable",
    "How to Recognize and Avoid Online Scams"
]

# Blog topics for managers/decision makers (business cybersecurity)
MANAGER_TOPICS = [
    "Cybersecurity ROI: Justifying Security Investments to Your Board",
    "Building a Security-First Culture in Your Organization",
    "Incident Response Planning: What Every Business Leader Needs",
    "Third-Party Risk Management: Protecting Your Supply Chain",
    "Cybersecurity Compliance: GDPR, HIPAA, and Beyond",
    "The True Cost of a Data Breach: Beyond the Headlines",
    "Zero Trust Security: A Strategic Approach for Modern Businesses",
    "Employee Security Training: Moving Beyond Annual Checkboxes",
    "Cloud Security: Ensuring Safe Digital Transformation",
    "Cyber Insurance: What It Covers and What It Doesn't"
]


async def generate_blog_post(topic: str, audience: str, llm_key: str) -> dict:
    """Generate a single SEO-optimized blog post"""
    
    system_prompt = f"""You are an expert cybersecurity content writer creating SEO-optimized blog posts for {audience}.

Write engaging, informative content that:
- Uses clear, accessible language (avoid jargon unless explained)
- Includes actionable takeaways
- Has proper structure (intro, body sections, conclusion)
- Is 800-1200 words
- Includes relevant examples and statistics where appropriate
- Has a conversational yet professional tone"""

    user_prompt = f"""Write a complete blog post on: "{topic}"

Target audience: {audience}

Format your response as JSON with these fields:
{{
  "title": "compelling SEO title",
  "excerpt": "2-3 sentence summary (150-200 chars)",
  "content": "full HTML-formatted article with <h2>, <h3>, <p>, <ul>, <li> tags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "meta_description": "SEO meta description (150-160 chars)"
}}

Important: Return ONLY valid JSON, no additional text."""

    chat = LlmChat(
        api_key=llm_key,
        session_id=f"blog_gen_{topic[:30]}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.2")
    
    message = UserMessage(text=user_prompt)
    response = await chat.send_message(message)
    
    # Parse JSON response
    import json
    try:
        # Try to extract JSON from response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            post_data = json.loads(response[json_start:json_end])
        else:
            post_data = json.loads(response)
    except:
        print(f"Failed to parse JSON for topic: {topic}")
        print(f"Response: {response[:500]}")
        raise
    
    return post_data


async def generate_all_posts():
    """Generate all 20 blog posts"""
    
    llm_key = os.getenv('EMERGENT_LLM_KEY')
    if not llm_key:
        print("ERROR: EMERGENT_LLM_KEY not found in environment")
        return
    
    print("🚀 Starting blog post generation...")
    print(f"Using LLM Key: {llm_key[:20]}...")
    
    all_posts = []
    
    # Generate end user posts
    print("\n📝 Generating 10 end-user posts...")
    for i, topic in enumerate(END_USER_TOPICS, 1):
        print(f"  [{i}/10] Generating: {topic}")
        try:
            post = await generate_blog_post(topic, "end users and consumers", llm_key)
            post['audience'] = 'end_user'
            all_posts.append(post)
            print(f"  ✅ Generated: {post['title']}")
            # Small delay to avoid rate limits
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Generate manager posts
    print("\n📊 Generating 10 manager/decision-maker posts...")
    for i, topic in enumerate(MANAGER_TOPICS, 1):
        print(f"  [{i}/10] Generating: {topic}")
        try:
            post = await generate_blog_post(topic, "business managers and decision makers", llm_key)
            post['audience'] = 'manager'
            all_posts.append(post)
            print(f"  ✅ Generated: {post['title']}")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Save to database
    print(f"\n💾 Saving {len(all_posts)} posts to database...")
    
    for post in all_posts:
        # Generate slug from title
        import re
        slug = post['title'].lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = slug[:100]
        
        post_doc = {
            "post_id": f"post_{datetime.now().strftime('%Y%m%d%H%M%S')}_{slug[:20]}",
            "title": post['title'],
            "slug": slug,
            "excerpt": post['excerpt'],
            "content": post['content'],
            "tags": post.get('tags', []),
            "meta_description": post.get('meta_description', post['excerpt']),
            "audience": post.get('audience', 'general'),
            "featured_image": None,
            "published": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "author": "AI Content Generator",
            "views": 0
        }
        
        try:
            await db.blog_posts.insert_one(post_doc)
            print(f"  ✅ Saved: {post['title']}")
        except Exception as e:
            print(f"  ❌ Error saving: {e}")
    
    print(f"\n🎉 Blog generation complete! {len(all_posts)} posts created.")
    print(f"📊 End-user posts: {sum(1 for p in all_posts if p.get('audience') == 'end_user')}")
    print(f"📊 Manager posts: {sum(1 for p in all_posts if p.get('audience') == 'manager')}")


if __name__ == "__main__":
    asyncio.run(generate_all_posts())
