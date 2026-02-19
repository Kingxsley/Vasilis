import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, TrackingSettings, ClickTracking

logger = logging.getLogger(__name__)


async def get_branding_settings(db):
    """Fetch branding settings from database"""
    try:
        settings = await db.settings.find_one({"type": "branding"}, {"_id": 0})
        if settings:
            return {
                "company_name": settings.get("company_name", "Vasilis NetShield"),
                "logo_url": settings.get("logo_url"),
                "primary_color": settings.get("primary_color", "#D4A836"),
            }
    except Exception as e:
        logger.warning(f"Could not fetch branding settings: {e}")
    
    return {
        "company_name": "Vasilis NetShield",
        "logo_url": None,
        "primary_color": "#D4A836",
    }


def get_login_url():
    """Get the login URL from environment"""
    frontend_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
    return f"{frontend_url}/auth"


async def send_welcome_email(user_email: str, user_name: str, password: str, login_url: str = None, db=None):
    """Send welcome email with login credentials to a new user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping welcome email to {user_email}")
        return False
    
    # Get branding settings
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    
    if not login_url:
        login_url = get_login_url()
    
    # Compact HTML email template (under 102KB to avoid Gmail clipping)
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">🛡️</div>
<h1 style="color:{primary_color};margin:0 0 5px 0;font-size:24px;">Welcome to {company_name}!</h1>
<p style="color:#888;margin:0 0 20px 0;font-size:14px;">Your account has been created</p>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">An administrator has created an account for you.</p>
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};margin-bottom:20px;">
<p style="color:{primary_color};margin:0 0 10px 0;font-weight:bold;">Your Login Credentials:</p>
<p style="color:#888;margin:0 0 5px 0;">Email: <strong style="color:#E8DDB5;">{user_email}</strong></p>
<p style="color:#888;margin:0;">Password: <code style="background:#2a2a34;color:#E8DDB5;padding:3px 8px;border-radius:4px;">{password}</code></p>
</div>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;text-align:center;">
<a href="{login_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;font-size:16px;">Login to Your Account</a>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;">
<div style="background:#2a2a34;border-radius:8px;padding:12px;">
<p style="color:#FF6B6B;margin:0;font-size:13px;"><strong>⚠️ Security:</strong> Change your password after first login.</p>
</div>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name} Security Training Platform</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    plain_text = f"""Welcome to {company_name}!

Hello {user_name},

Your account has been created.

Login Credentials:
- Email: {user_email}
- Password: {password}

Login here: {login_url}

Please change your password after first login.

{company_name}"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"Welcome to {company_name} - Your Login Credentials"
    )
    message.add_content(Content("text/plain", plain_text))
    message.add_content(Content("text/html", html_content))
    
    # DISABLE CLICK TRACKING to prevent URL wrapping
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Welcome email sent to {user_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return False


async def send_password_reset_email(user_email: str, user_name: str, new_password: str, login_url: str = None, db=None):
    """Send password reset email to a user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping password reset email")
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    
    if not login_url:
        login_url = get_login_url()
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">🔐</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">Password Reset</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">Your password has been reset by an administrator.</p>
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};margin-bottom:20px;">
<p style="color:{primary_color};margin:0 0 10px 0;font-weight:bold;">Your New Password:</p>
<code style="display:block;background:#2a2a34;color:#E8DDB5;padding:12px;border-radius:4px;font-size:18px;">{new_password}</code>
</div>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;text-align:center;">
<a href="{login_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">Login Now</a>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;">
<p style="color:#FF6B6B;margin:0;font-size:13px;"><strong>⚠️</strong> Change your password immediately after logging in.</p>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Your Password Has Been Reset"
    )
    message.add_content(Content("text/html", html_content))
    
    # DISABLE CLICK TRACKING
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Password reset email sent to {user_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


async def send_forgot_password_email(user_email: str, user_name: str, reset_token: str, db=None):
    """Send forgot password email with reset link"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping forgot password email")
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
    reset_url = f"{frontend_url}/auth?reset_token={reset_token}"
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">🔐</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">Password Reset Request</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">We received a request to reset your password. Click below to set a new password:</p>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;text-align:center;">
<a href="{reset_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">Reset Password</a>
<p style="color:#888;margin:15px 0 0 0;font-size:13px;">This link expires in 1 hour.</p>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;">
<div style="background:#2a2a34;border-radius:8px;padding:12px;">
<p style="color:#FF6B6B;margin:0;font-size:13px;"><strong>⚠️</strong> Didn't request this? Ignore this email.</p>
</div>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    plain_text = f"""Password Reset Request

Hello {user_name},

We received a request to reset your password. 

Reset your password here: {reset_url}

This link expires in 1 hour.

If you didn't request this, ignore this email.

{company_name}"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Password Reset Request"
    )
    message.add_content(Content("text/plain", plain_text))
    message.add_content(Content("text/html", html_content))
    
    # DISABLE CLICK TRACKING
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Forgot password email sent to {user_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to send forgot password email: {e}")
        return False


async def send_password_expiry_reminder(user_email: str, user_name: str, days_remaining: int, db=None):
    """Send password expiry reminder email"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    login_url = get_login_url()
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">⏰</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">Password Expiring Soon</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">Your password will expire in <strong style="color:#FF6B6B;">{days_remaining} days</strong>.</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">Please log in and change your password to avoid any access issues.</p>
</td></tr>
<tr><td style="padding:0 30px 20px 30px;text-align:center;">
<a href="{login_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">Change Password</a>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Password Expiring in {days_remaining} Days"
    )
    message.add_content(Content("text/html", html_content))
    
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send password expiry reminder: {e}")
        return False


async def send_access_request_notification(admin_email: str, requester_name: str, requester_email: str, 
                                           organization_name: str = None, message: str = None, db=None):
    """Send notification to admin about new access request"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
    dashboard_url = f"{frontend_url}/access-requests"
    
    org_info = f"<p style='color:#888;margin:5px 0;'>Organization: <strong style='color:#E8DDB5;'>{organization_name}</strong></p>" if organization_name else ""
    msg_info = f"<div style='background:#2a2a34;border-radius:8px;padding:12px;margin-top:15px;'><p style='color:#888;margin:0 0 5px 0;font-size:13px;'>Message:</p><p style='color:#E8DDB5;margin:0;'>{message}</p></div>" if message else ""
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">📬</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">New Access Request</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 20px 0;">A new user has requested access to {company_name}:</p>
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};">
<p style="color:#888;margin:0 0 5px 0;">Name: <strong style="color:#E8DDB5;">{requester_name}</strong></p>
<p style="color:#888;margin:0;">Email: <strong style="color:#E8DDB5;">{requester_email}</strong></p>
{org_info}
</div>
{msg_info}
</td></tr>
<tr><td style="padding:20px 30px;text-align:center;">
<a href="{dashboard_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">Review Request</a>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    message_obj = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(admin_email),
        subject=f"{company_name} - New Access Request from {requester_name}"
    )
    message_obj.add_content(Content("text/html", html_content))
    
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message_obj.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message_obj)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send access request notification: {e}")
        return False


async def send_training_reminder(user_email: str, user_name: str, training_name: str, due_date: str = None, db=None):
    """Send training reminder email"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    login_url = get_login_url()
    
    due_info = f"<p style='color:#FF6B6B;margin:15px 0 0 0;font-size:14px;'><strong>Due:</strong> {due_date}</p>" if due_date else ""
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">📚</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">Training Reminder</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">You have a pending training module to complete:</p>
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};">
<p style="color:{primary_color};margin:0;font-size:18px;font-weight:bold;">{training_name}</p>
{due_info}
</div>
</td></tr>
<tr><td style="padding:20px 30px;text-align:center;">
<a href="{login_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">Start Training</a>
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Training Reminder: {training_name}"
    )
    message.add_content(Content("text/html", html_content))
    
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send training reminder: {e}")
        return False


async def send_certificate_email(user_email: str, user_name: str, certificate_name: str, 
                                  certificate_url: str = None, db=None):
    """Send certificate completion email"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        return False
    
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    login_url = get_login_url()
    
    view_button = f'<a href="{certificate_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">View Certificate</a>' if certificate_url else f'<a href="{login_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;">View in Dashboard</a>'
    
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
<div style="font-size:40px;margin-bottom:10px;">🏆</div>
<h1 style="color:{primary_color};margin:0;font-size:24px;">Congratulations!</h1>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">Hello <strong>{user_name}</strong>,</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">You have successfully completed your training and earned a certificate:</p>
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};text-align:center;">
<p style="color:{primary_color};margin:0;font-size:20px;font-weight:bold;">{certificate_name}</p>
</div>
</td></tr>
<tr><td style="padding:20px 30px;text-align:center;">
{view_button}
</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{company_name}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"🏆 {company_name} - Certificate Earned: {certificate_name}"
    )
    message.add_content(Content("text/html", html_content))
    
    tracking_settings = TrackingSettings()
    tracking_settings.click_tracking = ClickTracking(enable=False, enable_text=False)
    message.tracking_settings = tracking_settings
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send certificate email: {e}")
        return False
