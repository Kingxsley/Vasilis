#!/usr/bin/env python3
"""
Rewrite all blog posts with comprehensive 2000+ word enterprise content
Using OpenAI GPT-4o via Emergent LLM Key
"""
import os
import sys
import json
import asyncio
import aiohttp
from datetime import datetime, timezone

# Get environment variables
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'vasilisnetshield')
EMERGENT_LLM_KEY = "sk-emergent-dB53a9dAbBa03DcC7F"

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

async def get_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

async def generate_comprehensive_content(title, tags, excerpt):
    """Generate 2000+ word enterprise-level blog post using OpenAI"""
    
    prompt = f"""Write a comprehensive, professional blog post for Vasilis NetShield, an enterprise cybersecurity training company.

Title: {title}
Brief Description: {excerpt}
Topics to cover: {', '.join(tags)}

Requirements:
1. MINIMUM 2000 words of high-quality content
2. Include real statistics, data, and case studies from 2023-2024
3. Enterprise focus - speak to business leaders, CISOs, and security managers
4. Include sections on:
   - Current threat landscape with statistics
   - Real-world examples and case studies
   - Business impact and ROI considerations
   - Best practices and implementation strategies
   - How Vasilis NetShield training programs address these challenges
5. Naturally mention Vasilis NetShield's services:
   - Realistic phishing simulations
   - AI-enhanced security awareness training
   - Executive training programs
   - Compliance-focused training
   - Measurable security culture transformation
6. Use professional, authoritative tone
7. Include actionable takeaways
8. Format with HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
9. DO NOT include the main title as <h1> (it's rendered separately)

Write the complete article now:"""

    headers = {
        "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert cybersecurity content writer specializing in enterprise security awareness and training. You write comprehensive, data-driven articles with real statistics and actionable insights."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=120)
        ) as response:
            if response.status == 200:
                data = await response.json()
                content = data['choices'][0]['message']['content']
                return content
            else:
                error_text = await response.text()
                raise Exception(f"OpenAI API error: {response.status} - {error_text}")

async def rewrite_all_posts():
    """Fetch all posts and rewrite them with comprehensive content"""
    db = await get_db()
    
    print("Fetching all blog posts...")
    posts = await db.blog_posts.find({}, {"_id": 0}).to_list(100)
    print(f"Found {len(posts)} blog posts to rewrite\n")
    
    successful = 0
    failed = 0
    
    for i, post in enumerate(posts, 1):
        post_id = post.get('post_id')
        title = post.get('title')
        excerpt = post.get('excerpt', '')
        tags = post.get('tags', [])
        
        print(f"[{i}/{len(posts)}] Rewriting: {title[:60]}...")
        
        try:
            # Generate comprehensive content
            new_content = await generate_comprehensive_content(title, tags, excerpt)
            
            # Update the post
            await db.blog_posts.update_one(
                {"post_id": post_id},
                {
                    "$set": {
                        "content": new_content,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "published": True  # Ensure it's published
                    }
                }
            )
            
            word_count = len(new_content.split())
            print(f"  ✅ Success! ({word_count} words)\n")
            successful += 1
            
            # Rate limiting - wait 2 seconds between requests
            if i < len(posts):
                await asyncio.sleep(2)
            
        except Exception as e:
            print(f"  ❌ Failed: {str(e)}\n")
            failed += 1
            continue
    
    print(f"\n{'='*60}")
    print(f"Rewrite Complete!")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(rewrite_all_posts())
