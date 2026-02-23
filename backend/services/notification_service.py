"""
Notification Service - Handles Discord webhooks and real-time notifications
"""
import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Super admin webhook URL from environment (fallback)
SUPER_ADMIN_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")


async def get_super_admin_webhook(db) -> Optional[str]:
    """Get Discord webhook URL from settings or environment"""
    # First try to get from database settings
    if db:
        try:
            settings = await db.settings.find_one(
                {"type": "branding"},
                {"_id": 0, "discord_webhook_url": 1}
            )
            if settings and settings.get("discord_webhook_url"):
                return settings.get("discord_webhook_url")
        except Exception as e:
            logger.error(f"Error getting webhook from settings: {e}")
    
    # Fallback to environment variable
    return SUPER_ADMIN_WEBHOOK_URL


async def send_discord_notification(
    webhook_url: str,
    title: str,
    description: str,
    color: int = 0xFF6B6B,  # Red by default for security alerts
    fields: list = None,
    thumbnail_url: str = None
):
    """Send a notification to Discord via webhook"""
    if not webhook_url:
        logger.warning("No Discord webhook URL provided")
        return False
    
    try:
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {
                "text": "Vasilis NetShield Security Platform"
            }
        }
        
        if fields:
            embed["fields"] = fields
        
        if thumbnail_url:
            embed["thumbnail"] = {"url": thumbnail_url}
        
        payload = {
            "embeds": [embed]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code in (200, 204):
                logger.info(f"Discord notification sent successfully")
                return True
            else:
                logger.error(f"Discord webhook failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending Discord notification: {e}")
        return False


async def notify_phishing_click(
    user_name: str,
    user_email: str,
    organization_name: str,
    campaign_name: str,
    click_ip: str = None,
    user_agent: str = None,
    org_webhook_url: str = None,
    db = None
):
    """Send notification when a user clicks a phishing link"""
    
    logger.info(f"notify_phishing_click called for {user_email}, org_webhook: {bool(org_webhook_url)}")
    
    title = "🚨 Phishing Link Clicked!"
    description = f"A user has clicked on a simulated phishing link."
    
    fields = [
        {"name": "👤 User", "value": f"{user_name}\n{user_email}", "inline": True},
        {"name": "🏢 Organization", "value": organization_name or "Unknown", "inline": True},
        {"name": "📧 Campaign", "value": campaign_name or "Unknown", "inline": True},
    ]
    
    if click_ip:
        fields.append({"name": "🌐 IP Address", "value": click_ip, "inline": True})
    
    if user_agent:
        # Truncate user agent if too long
        ua_display = user_agent[:100] + "..." if len(user_agent) > 100 else user_agent
        fields.append({"name": "💻 Device", "value": ua_display, "inline": False})
    
    notifications_sent = 0
    
    # Get super admin webhook from settings or env
    super_admin_webhook = await get_super_admin_webhook(db)
    logger.info(f"Super admin webhook available: {bool(super_admin_webhook)}")
    
    # Send to super admin webhook
    if super_admin_webhook:
        result = await send_discord_notification(
            webhook_url=super_admin_webhook,
            title=title,
            description=description,
            color=0xFF6B6B,  # Red
            fields=fields
        )
        if result:
            notifications_sent += 1
            logger.info("Sent notification to super admin webhook")
    
    # Send to organization webhook if provided
    if org_webhook_url and org_webhook_url != super_admin_webhook:
        result = await send_discord_notification(
            webhook_url=org_webhook_url,
            title=title,
            description=description,
            color=0xFF6B6B,
            fields=fields
        )
        if result:
            notifications_sent += 1
            logger.info("Sent notification to organization webhook")
    
    if notifications_sent == 0:
        logger.warning(f"No webhooks configured - notification not sent for {user_email}")
    
    return notifications_sent > 0


async def notify_credential_submission(
    user_name: str,
    user_email: str,
    organization_name: str,
    campaign_name: str,
    org_webhook_url: str = None,
    db = None
):
    """Send notification when a user submits credentials to a fake login page"""
    
    title = "CRITICAL: Credentials Submitted!"
    description = f"**CRITICAL**: A user has submitted credentials to a simulated phishing page."
    
    fields = [
        {"name": "User", "value": f"{user_name}\n{user_email}", "inline": True},
        {"name": "Organization", "value": organization_name or "Unknown", "inline": True},
        {"name": "Campaign", "value": campaign_name or "Unknown", "inline": True},
        {"name": "Risk Level", "value": "HIGH - User entered credentials", "inline": False},
    ]
    
    # Get super admin webhook from settings or env
    super_admin_webhook = await get_super_admin_webhook(db)
    
    # Send to super admin webhook
    if super_admin_webhook:
        await send_discord_notification(
            webhook_url=super_admin_webhook,
            title=title,
            description=description,
            color=0xDC2626,  # Darker red for critical
            fields=fields
        )
    
    # Send to organization webhook
    if org_webhook_url and org_webhook_url != super_admin_webhook:
        await send_discord_notification(
            webhook_url=org_webhook_url,
            title=title,
            description=description,
            color=0xDC2626,
            fields=fields
        )


async def notify_campaign_launched(
    campaign_name: str,
    organization_name: str,
    total_targets: int,
    launched_by: str,
    org_webhook_url: str = None
):
    """Send notification when a campaign is launched"""
    
    title = "🚀 Campaign Launched"
    description = f"A new phishing simulation campaign has been launched."
    
    fields = [
        {"name": "📧 Campaign", "value": campaign_name, "inline": True},
        {"name": "🏢 Organization", "value": organization_name or "All", "inline": True},
        {"name": "👥 Targets", "value": str(total_targets), "inline": True},
        {"name": "👤 Launched By", "value": launched_by, "inline": True},
    ]
    
    # Send to super admin webhook
    if SUPER_ADMIN_WEBHOOK_URL:
        await send_discord_notification(
            webhook_url=SUPER_ADMIN_WEBHOOK_URL,
            title=title,
            description=description,
            color=0x22C55E,  # Green
            fields=fields
        )
    
    # Send to organization webhook
    if org_webhook_url:
        await send_discord_notification(
            webhook_url=org_webhook_url,
            title=title,
            description=description,
            color=0x22C55E,
            fields=fields
        )


async def get_org_webhook(db, organization_id: str) -> Optional[str]:
    """Get Discord webhook URL for an organization"""
    if not organization_id or not db:
        return None
    
    try:
        org = await db.organizations.find_one(
            {"organization_id": organization_id},
            {"_id": 0, "discord_webhook_url": 1}
        )
        return org.get("discord_webhook_url") if org else None
    except Exception as e:
        logger.error(f"Error getting org webhook: {e}")
        return None
