#!/usr/bin/env python3
"""
Create comprehensive enterprise cybersecurity blog posts using Emergent Integrations
2000+ words each with statistics and service offerings
"""
import os
import sys
import asyncio
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Get environment variables
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'vasilisnetshield')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-dB53a9dAbBa03DcC7F')

from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Enterprise blog post topics
BLOG_TOPICS = [
    {
        "title": "The Rising Cost of Data Breaches in 2024: Why Security Awareness Training is Your Best ROI",
        "excerpt": "With the average data breach costing $4.45 million in 2024, discover why investing in employee security awareness training delivers the highest return on investment for enterprise cybersecurity.",
        "tags": ["data breach", "ROI", "security awareness", "enterprise security", "cost analysis"],
        "audience": "manager"
    },
    {
        "title": "Phishing Attacks Are Evolving: How AI-Powered Training Keeps Your Team Ahead",
        "excerpt": "Modern phishing attacks use AI and sophisticated social engineering. Learn how Vasilis NetShield's AI-enhanced training simulations prepare your employees for the latest threats.",
        "tags": ["phishing", "AI", "social engineering", "security training", "threat prevention"],
        "audience": "technical"
    },
    {
        "title": "Building a Security-First Culture: Executive Leadership's Critical Role",
        "excerpt": "Security culture starts at the top. Explore how executive engagement and specialized training transform organizational security posture and reduce risk by up to 70%.",
        "tags": ["security culture", "executive training", "leadership", "risk management", "compliance"],
        "audience": "manager"
    },
    {
        "title": "Zero Trust Architecture: Training Your Workforce for the New Security Paradigm",
        "excerpt": "Zero Trust is reshaping enterprise security. Discover how employee training is essential for successful Zero Trust implementation and maintaining continuous verification.",
        "tags": ["zero trust", "architecture", "workforce training", "access control", "security framework"],
        "audience": "technical"
    },
    {
        "title": "Ransomware Recovery Costs vs. Prevention: The Business Case for Security Training",
        "excerpt": "Ransomware attacks cost businesses an average of $1.85 million per incident. Learn why proactive security awareness training is significantly more cost-effective than reactive recovery.",
        "tags": ["ransomware", "prevention", "business continuity", "cost analysis", "incident response"],
        "audience": "manager"
    },
    {
        "title": "Remote Work Security: Protecting Your Distributed Workforce in 2024",
        "excerpt": "With 58% of professionals working remotely at least part-time, securing distributed teams is critical. Explore comprehensive strategies and training approaches for remote work security.",
        "tags": ["remote work", "distributed teams", "VPN", "endpoint security", "work from home"],
        "audience": "general"
    },
    {
        "title": "Compliance Made Simple: How Security Training Satisfies Regulatory Requirements",
        "excerpt": "Navigate GDPR, HIPAA, SOC 2, and ISO 27001 requirements with comprehensive security awareness training that demonstrates due diligence and protects against regulatory penalties.",
        "tags": ["compliance", "GDPR", "HIPAA", "regulations", "audit", "certification"],
        "audience": "manager"
    },
    {
        "title": "The Human Firewall: Transforming Employees from Security Risk to Security Asset",
        "excerpt": "90% of successful cyber attacks involve human error. Learn how Vasilis NetShield turns your workforce into your strongest security defense through behavioral change training.",
        "tags": ["human firewall", "behavioral security", "employee training", "risk reduction", "security awareness"],
        "audience": "general"
    },
    {
        "title": "Measuring Security Awareness: KPIs and Metrics That Matter for Enterprise Security",
        "excerpt": "Track the effectiveness of your security training program with actionable metrics. Learn which KPIs demonstrate ROI and improve security posture measurably.",
        "tags": ["metrics", "KPIs", "measurement", "training effectiveness", "reporting"],
        "audience": "manager"
    },
    {
        "title": "Supply Chain Security: Training Partners and Vendors on Cybersecurity Best Practices",
        "excerpt": "Third-party breaches account for 61% of data incidents. Discover strategies for extending security awareness training to your entire supply chain ecosystem.",
        "tags": ["supply chain", "third party risk", "vendor management", "partner security", "ecosystem"],
        "audience": "technical"
    },
    {
        "title": "Social Engineering Tactics in 2024: What Your Team Needs to Know",
        "excerpt": "Social engineering attacks have increased 270% in the past year. Understand the latest manipulation techniques and how realistic training simulations build resistance.",
        "tags": ["social engineering", "manipulation", "pretexting", "baiting", "psychological tactics"],
        "audience": "general"
    },
    {
        "title": "Mobile Device Security: Protecting Your Organization's Most Vulnerable Endpoint",
        "excerpt": "With employees accessing corporate data from smartphones and tablets, mobile security training is essential. Learn comprehensive strategies for securing the mobile workforce.",
        "tags": ["mobile security", "BYOD", "mobile devices", "endpoint protection", "MDM"],
        "audience": "technical"
    },
    {
        "title": "Password Security in the Age of Credential Stuffing: Training Best Practices",
        "excerpt": "Credential stuffing attacks use 15 billion stolen credentials. Explore modern password security training, including passkeys, MFA, and password manager adoption.",
        "tags": ["password security", "credentials", "authentication", "MFA", "password managers"],
        "audience": "general"
    },
    {
        "title": "Insider Threats: Detection, Prevention, and the Role of Security Awareness",
        "excerpt": "Insider threats cause 43% of data breaches. Learn how comprehensive training programs identify warning signs and create a culture of security vigilance.",
        "tags": ["insider threat", "employee monitoring", "behavioral analytics", "threat detection", "prevention"],
        "audience": "manager"
    },
    {
        "title": "Cloud Security Training: Preparing Teams for AWS, Azure, and Multi-Cloud Environments",
        "excerpt": "95% of organizations use cloud services, but misconfiguration causes 80% of cloud breaches. Discover essential cloud security training for technical and non-technical staff.",
        "tags": ["cloud security", "AWS", "Azure", "multi-cloud", "configuration management"],
        "audience": "technical"
    },
    {
        "title": "Incident Response Readiness: Why Tabletop Exercises and Simulation Training Work",
        "excerpt": "Organizations with trained incident response teams contain breaches 54 days faster. Learn how realistic simulations and exercises prepare your team for real incidents.",
        "tags": ["incident response", "tabletop exercises", "simulation", "crisis management", "preparedness"],
        "audience": "technical"
    },
    {
        "title": "Security Awareness for Executives: Specialized Training for C-Suite Leaders",
        "excerpt": "Executives are 12 times more likely to be targeted than average employees. Explore specialized security training programs designed for executive protection and risk management.",
        "tags": ["executive protection", "C-suite", "leadership training", "targeted attacks", "whaling"],
        "audience": "manager"
    },
    {
        "title": "Email Security Beyond Spam Filters: Training Employees to Identify Sophisticated Threats",
        "excerpt": "Email remains the #1 attack vector, with 94% of malware delivered via email. Learn advanced email security training that goes far beyond basic spam awareness.",
        "tags": ["email security", "malware", "attachments", "email filtering", "threat identification"],
        "audience": "general"
    },
    {
        "title": "API Security Awareness: Training Developers on Secure Coding Practices",
        "excerpt": "API vulnerabilities increased 681% in 2023. Discover specialized training programs that help development teams build secure APIs and prevent common vulnerabilities.",
        "tags": ["API security", "secure coding", "developer training", "OWASP", "application security"],
        "audience": "technical"
    },
    {
        "title": "Creating a Continuous Security Learning Culture: Beyond Annual Training",
        "excerpt": "Annual security training is no longer sufficient. Learn how Vasilis NetShield's continuous learning approach with micro-training, simulations, and reinforcement creates lasting behavioral change.",
        "tags": ["continuous learning", "training program", "behavioral change", "engagement", "retention"],
        "audience": "manager"
    }
]

async def generate_comprehensive_content(title, excerpt, tags):
    """Generate 2000+ word enterprise-level blog post using Emergent LLM"""
    
    prompt = f"""Write a comprehensive, professional blog post for Vasilis NetShield, an enterprise cybersecurity training company.

Title: {title}
Brief Description: {excerpt}
Key Topics: {', '.join(tags)}

Requirements:
1. MINIMUM 2000 words of high-quality, professional content
2. Include REAL statistics, data, and case studies from 2023-2024
3. Enterprise focus - speak to business leaders, CISOs, security managers, and IT professionals
4. Structure with these sections:
   - Introduction with compelling statistics (2-3 paragraphs)
   - Current Threat Landscape with real data and numbers (4-5 paragraphs)
   - Real-World Case Studies or Examples (3-4 paragraphs)
   - Business Impact and Financial Considerations (4-5 paragraphs)
   - Best Practices and Implementation Strategies (5-6 paragraphs)
   - How Vasilis NetShield Addresses These Challenges (4-5 paragraphs)
   - Actionable Takeaways and Recommendations (3-4 paragraphs)
5. Naturally integrate Vasilis NetShield's services throughout:
   - Realistic phishing simulations that mirror real-world attacks
   - AI-enhanced security awareness training with adaptive learning
   - Executive and C-suite specialized training programs
   - Compliance-focused training (GDPR, HIPAA, SOC 2, ISO 27001)
   - Measurable security culture transformation
   - Continuous micro-learning and reinforcement
   - Detailed analytics and reporting dashboards
6. Use authoritative, professional tone with expert insights
7. Include specific percentages, dollar amounts, time savings where relevant
8. Format with proper HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
9. DO NOT include <h1> tags (title is rendered separately)
10. End with a strong call-to-action about Vasilis NetShield services

Write the complete 2000+ word article now:"""

    # Initialize chat with OpenAI GPT-5.1
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"blog_{uuid.uuid4().hex[:8]}",
        system_message="You are an expert cybersecurity thought leader and content writer. You specialize in enterprise security awareness training, risk management, and creating data-driven content for business and technical audiences. You write comprehensive, detailed articles with real statistics, case studies, and actionable insights."
    ).with_model("openai", "gpt-5.1")
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    return response

async def create_blog_posts():
    """Create all comprehensive blog posts"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Creating {len(BLOG_TOPICS)} comprehensive enterprise blog posts...")
    print(f"{'='*60}\n")
    
    successful = 0
    failed = 0
    
    for i, topic in enumerate(BLOG_TOPICS, 1):
        title = topic['title']
        print(f"[{i}/{len(BLOG_TOPICS)}] Generating: {title[:60]}...")
        
        try:
            # Generate comprehensive content
            content = await generate_comprehensive_content(
                topic['title'],
                topic['excerpt'],
                topic['tags']
            )
            
            # Create slug from title
            slug = title.lower()
            slug = ''.join(c if c.isalnum() or c.isspace() else '' for c in slug)
            slug = '-'.join(slug.split()[:12])
            
            # Create post document
            post = {
                "post_id": f"post_{uuid.uuid4().hex[:12]}",
                "title": title,
                "slug": slug,
                "excerpt": topic['excerpt'],
                "content": content,
                "tags": topic['tags'],
                "author_name": "Vasilis NetShield Team",
                "author_id": "admin",
                "audience": topic['audience'],
                "published": True,
                "featured_image": "",
                "meta_description": topic['excerpt'][:155],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert into database
            await db.blog_posts.insert_one(post)
            
            word_count = len(content.split())
            char_count = len(content)
            print(f"  ✅ Created! ({word_count} words, {char_count} characters, slug: {slug})\n")
            successful += 1
            
            # Rate limiting - wait 2 seconds between requests
            if i < len(BLOG_TOPICS):
                await asyncio.sleep(2)
            
        except Exception as e:
            print(f"  ❌ Failed: {str(e)}\n")
            failed += 1
            # Don't stop on error, continue with next post
            continue
    
    print(f"\n{'='*60}")
    print(f"Blog Post Creation Complete!")
    print(f"  Successful: {successful}/{len(BLOG_TOPICS)}")
    print(f"  Failed: {failed}/{len(BLOG_TOPICS)}")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_blog_posts())
