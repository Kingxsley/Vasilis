import uuid
import secrets
import logging
from datetime import datetime, timezone
from typing import List, Optional
import os

logger = logging.getLogger(__name__)


def generate_tracking_code() -> str:
    """Generate a unique tracking code for each email recipient"""
    return secrets.token_urlsafe(16)


def generate_tracking_pixel_url(base_url: str, tracking_code: str) -> str:
    """Generate URL for tracking pixel (email opens)"""
    # Ensure HTTPS
    if base_url.startswith('http://') and 'localhost' not in base_url:
        base_url = base_url.replace('http://', 'https://')
    return f"{base_url}/api/phishing/track/open/{tracking_code}"


def generate_tracking_link(base_url: str, tracking_code: str, original_url: str = None) -> str:
    """Generate URL for tracking link clicks"""
    # Ensure HTTPS
    if base_url.startswith('http://') and 'localhost' not in base_url:
        base_url = base_url.replace('http://', 'https://')
    return f"{base_url}/api/phishing/track/click/{tracking_code}"


def inject_tracking_into_email(html_body: str, tracking_code: str, base_url: str) -> str:
    """Inject tracking pixel and replace links in email body"""
    # Add tracking pixel before </body>
    pixel_url = generate_tracking_pixel_url(base_url, tracking_code)
    tracking_pixel = f'<img src="{pixel_url}" width="1" height="1" style="display:none;" alt="" />'
    
    if '</body>' in html_body.lower():
        # Insert before closing body tag
        import re
        html_body = re.sub(
            r'(</body>)',
            f'{tracking_pixel}\\1',
            html_body,
            flags=re.IGNORECASE
        )
    else:
        # Append to end
        html_body += tracking_pixel
    
    # Replace the primary CTA link with tracking link
    click_url = generate_tracking_link(base_url, tracking_code)
    # Look for {{TRACKING_LINK}} placeholder
    html_body = html_body.replace('{{TRACKING_LINK}}', click_url)
    
    return html_body


async def send_phishing_email(
    db,
    target: dict,
    template: dict,
    base_url: str,
    smtp_config: dict = None
) -> bool:
    """Send a phishing simulation email to a target user"""
    try:
        # Prepare email content with tracking
        html_body = inject_tracking_into_email(
            template['body_html'],
            target['tracking_code'],
            base_url
        )
        
        # Replace personalization placeholders
        html_body = html_body.replace('{{USER_NAME}}', target.get('user_name', 'User'))
        html_body = html_body.replace('{{USER_EMAIL}}', target.get('user_email', ''))
        
        subject = template['subject'].replace('{{USER_NAME}}', target.get('user_name', 'User'))
        
        # Check if we have SendGrid configured (preferred method)
        sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
        sender_email = os.environ.get('SENDER_EMAIL')
        
        if sendgrid_api_key and sender_email:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content, ReplyTo, TrackingSettings, ClickTracking, OpenTracking
            
            # Use template's sender_name as display name (e.g., "IT Security Team")
            # The actual email address will be the verified sender
            display_name = template.get('sender_name', 'Security Team')
            
            # Create the email message
            message = Mail(
                from_email=Email(sender_email, display_name),
                to_emails=To(target['user_email']),
                subject=subject,
                html_content=Content("text/html", html_body)
            )
            
            # IMPORTANT: Disable SendGrid's click and open tracking
            # We use our own tracking system for phishing simulations
            tracking_settings = TrackingSettings()
            tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
            tracking_settings.open_tracking = OpenTracking(enable=False)
            message.tracking_settings = tracking_settings
            
            # Set reply-to to the fake email address from template
            fake_sender_email = template.get('sender_email', '')
            if fake_sender_email:
                message.reply_to = ReplyTo(fake_sender_email, display_name)
            
            # Add plain text version if available
            if template.get('body_text'):
                text_body = template['body_text']
                text_body = text_body.replace('{{USER_NAME}}', target.get('user_name', 'User'))
                text_body = text_body.replace('{{TRACKING_LINK}}', generate_tracking_link(base_url, target['tracking_code']))
                message.add_content(Content("text/plain", text_body))
            
            # Send via SendGrid API
            sg = SendGridAPIClient(sendgrid_api_key)
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Phishing email sent to {target['user_email']} via SendGrid (status: {response.status_code})")
                return True
            else:
                logger.error(f"SendGrid returned status {response.status_code} for {target['user_email']}")
                return False
        
        # Fallback to SMTP if SendGrid not configured
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', 465))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_pass = os.environ.get('SMTP_PASSWORD')
        smtp_use_ssl = os.environ.get('SMTP_USE_SSL', 'true').lower() == 'true'
        
        if smtp_host and smtp_user and smtp_pass:
            import smtplib
            import ssl
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{template['sender_name']} <{smtp_user}>"
            msg['To'] = target['user_email']
            msg['Reply-To'] = template['sender_email']
            
            if template.get('body_text'):
                text_body = template['body_text']
                text_body = text_body.replace('{{USER_NAME}}', target.get('user_name', 'User'))
                text_body = text_body.replace('{{TRACKING_LINK}}', generate_tracking_link(base_url, target['tracking_code']))
                msg.attach(MIMEText(text_body, 'plain'))
            
            msg.attach(MIMEText(html_body, 'html'))
            
            if smtp_use_ssl and smtp_port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, target['user_email'], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, target['user_email'], msg.as_string())
            
            logger.info(f"Phishing email sent to {target['user_email']} via SMTP")
            return True
        else:
            # Simulation mode - just mark as sent without actually sending
            logger.warning(f"Email not configured - simulating email send to {target['user_email']}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to send phishing email to {target['user_email']}: {e}")
        return False


async def record_email_open(db, tracking_code: str, request_info: dict = None) -> bool:
    """Record when a phishing email is opened (tracking pixel loaded)"""
    try:
        result = await db.phishing_targets.update_one(
            {
                "tracking_code": tracking_code,
                "email_opened": False
            },
            {
                "$set": {
                    "email_opened": True,
                    "email_opened_at": datetime.now(timezone.utc).isoformat(),
                    "open_ip": request_info.get('ip') if request_info else None,
                    "open_user_agent": request_info.get('user_agent') if request_info else None
                }
            }
        )
        
        if result.modified_count > 0:
            # Update campaign stats
            target = await db.phishing_targets.find_one({"tracking_code": tracking_code}, {"_id": 0})
            if target:
                await db.phishing_campaigns.update_one(
                    {"campaign_id": target['campaign_id']},
                    {"$inc": {"emails_opened": 1}}
                )
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to record email open: {e}")
        return False


async def record_link_click(db, tracking_code: str, request_info: dict = None) -> dict:
    """Record when a phishing link is clicked"""
    try:
        target = await db.phishing_targets.find_one(
            {"tracking_code": tracking_code},
            {"_id": 0}
        )
        
        if not target:
            return None
        
        # Only count first click
        if not target.get('link_clicked'):
            await db.phishing_targets.update_one(
                {"tracking_code": tracking_code},
                {
                    "$set": {
                        "link_clicked": True,
                        "link_clicked_at": datetime.now(timezone.utc).isoformat(),
                        "click_ip": request_info.get('ip') if request_info else None,
                        "click_user_agent": request_info.get('user_agent') if request_info else None
                    }
                }
            )
            
            # Update campaign stats
            await db.phishing_campaigns.update_one(
                {"campaign_id": target['campaign_id']},
                {"$inc": {"links_clicked": 1}}
            )
        
        # Get campaign for landing page redirect
        campaign = await db.phishing_campaigns.find_one(
            {"campaign_id": target['campaign_id']},
            {"_id": 0}
        )
        
        return {
            "target": target,
            "campaign": campaign
        }
    except Exception as e:
        logger.error(f"Failed to record link click: {e}")
        return None


async def get_campaign_stats(db, campaign_id: str) -> dict:
    """Get detailed statistics for a phishing campaign"""
    campaign = await db.phishing_campaigns.find_one(
        {"campaign_id": campaign_id},
        {"_id": 0}
    )
    
    if not campaign:
        return None
    
    targets = await db.phishing_targets.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(10000)
    
    total = len(targets)
    sent = sum(1 for t in targets if t.get('email_sent'))
    opened = sum(1 for t in targets if t.get('email_opened'))
    clicked = sum(1 for t in targets if t.get('link_clicked'))
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get('name'),
        "status": campaign.get('status'),
        "total_targets": total,
        "emails_sent": sent,
        "emails_opened": opened,
        "links_clicked": clicked,
        "open_rate": round((opened / sent * 100), 1) if sent > 0 else 0,
        "click_rate": round((clicked / sent * 100), 1) if sent > 0 else 0,
        "targets": targets
    }
