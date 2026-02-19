import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

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
                "text_color": settings.get("text_color", "#E8DDB5"),
            }
    except Exception as e:
        logger.warning(f"Could not fetch branding settings: {e}")
    
    return {
        "company_name": "Vasilis NetShield",
        "logo_url": None,
        "primary_color": "#D4A836",
        "text_color": "#E8DDB5",
    }


async def send_welcome_email(user_email: str, user_name: str, password: str, login_url: str = None, db=None):
    """Send welcome email with login credentials to a new user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping welcome email to {user_email}")
        return False
    
    # Get branding settings
    branding = {"company_name": "Vasilis NetShield", "logo_url": None, "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding["company_name"]
    logo_url = branding["logo_url"]
    primary_color = branding["primary_color"]
    
    # Use FRONTEND_URL from environment for proper login URL
    if not login_url:
        frontend_url = os.environ.get('FRONTEND_URL', '')
        if not frontend_url:
            # Fallback to REACT_APP_BACKEND_URL pattern
            backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://vasilisnetshield.com')
            frontend_url = backend_url.replace('/api', '')
        login_url = f"{frontend_url}/auth"
    
    # Create logo HTML - use uploaded logo or shield emoji
    if logo_url and logo_url.startswith('data:'):
        logo_html = f'<img src="{logo_url}" alt="{company_name}" style="height: 60px; max-width: 200px; object-fit: contain;" />'
    else:
        logo_html = '<span style="font-size: 50px;">🛡️</span>'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid {primary_color};">
            <div style="text-align: center; margin-bottom: 20px;">
                {logo_html}
            </div>
            <h1 style="color: {primary_color}; margin-bottom: 10px; text-align: center;">Welcome to {company_name}!</h1>
            <p style="color: #888; text-align: center; margin-bottom: 30px;">Your account has been created</p>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">An administrator has created an account for you on the {company_name} cybersecurity training platform.</p>
            
            <div style="background: #0f0f15; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid {primary_color};">
                <p style="color: {primary_color}; margin: 0 0 15px 0; font-weight: bold; font-size: 16px;">Your Login Credentials:</p>
                <table style="width: 100%; color: #E8DDB5;">
                    <tr>
                        <td style="padding: 8px 0; color: #888;">Email:</td>
                        <td style="padding: 8px 0; font-weight: bold;">{user_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #888;">Password:</td>
                        <td style="padding: 8px 0; font-weight: bold; font-family: monospace; background: #2a2a34; padding: 5px 10px; border-radius: 4px;">{password}</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" style="display: inline-block; background: {primary_color}; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Login to Your Account</a>
            </div>
            
            <div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #FF6B6B; margin: 0; font-size: 14px;">
                    <strong>⚠️ Security Reminder:</strong> Please change your password after your first login for security purposes.
                </p>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                This email was sent by {company_name} Security Training Platform.<br>
                If you did not expect this email, please contact your administrator.
            </p>
        </div>
    </body>
    </html>
    """
    
    plain_text = f"""
Welcome to {company_name}!

Hello {user_name},

An administrator has created an account for you on the {company_name} cybersecurity training platform.

Your Login Credentials:
- Email: {user_email}
- Password: {password}

Login here: {login_url}

SECURITY REMINDER: Please change your password after your first login.

---
{company_name} Security Training Platform
    """
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"Welcome to {company_name} - Your Login Credentials",
        plain_text_content=Content("text/plain", plain_text),
        html_content=Content("text/html", html_content)
    )
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Welcome email sent to {user_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code} for welcome email to {user_email}")
            return False
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user_email}: {e}")
        return False


async def send_password_reset_email(user_email: str, user_name: str, new_password: str, login_url: str = None, db=None):
    """Send password reset email to a user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping password reset email to {user_email}")
        return False
    
    # Get branding settings
    branding = {"company_name": "Vasilis NetShield", "logo_url": None, "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding["company_name"]
    logo_url = branding["logo_url"]
    primary_color = branding["primary_color"]
    
    if not login_url:
        frontend_url = os.environ.get('FRONTEND_URL', '')
        if not frontend_url:
            backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://vasilisnetshield.net')
            frontend_url = backend_url.replace('/api', '')
        login_url = f"{frontend_url}/auth"
    
    # Create logo HTML
    if logo_url and logo_url.startswith('data:'):
        logo_html = f'<img src="{logo_url}" alt="{company_name}" style="height: 60px; max-width: 200px; object-fit: contain;" />'
    else:
        logo_html = '<span style="font-size: 50px;">🔐</span>'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid {primary_color};">
            <div style="text-align: center; margin-bottom: 20px;">
                {logo_html}
            </div>
            <h1 style="color: {primary_color}; margin-bottom: 10px; text-align: center;">Password Reset</h1>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">Your password has been reset by an administrator.</p>
            
            <div style="background: #0f0f15; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid {primary_color};">
                <p style="color: {primary_color}; margin: 0 0 15px 0; font-weight: bold;">Your New Password:</p>
                <p style="color: #E8DDB5; font-family: monospace; font-size: 18px; background: #2a2a34; padding: 10px 15px; border-radius: 4px; margin: 0;">{new_password}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" style="display: inline-block; background: {primary_color}; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold;">Login Now</a>
            </div>
            
            <p style="color: #FF6B6B; font-size: 14px;">
                <strong>⚠️</strong> Please change your password immediately after logging in.
            </p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                {company_name} Security Training Platform
            </p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Your Password Has Been Reset",
        html_content=Content("text/html", html_content)
    )
    
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
        logger.error(f"Failed to send password reset email to {user_email}: {e}")
        return False


async def send_forgot_password_email(user_email: str, user_name: str, reset_token: str, db=None):
    """Send forgot password email with reset link"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping forgot password email to {user_email}")
        return False
    
    # Get branding settings
    branding = {"company_name": "Vasilis NetShield", "logo_url": None, "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding["company_name"]
    logo_url = branding["logo_url"]
    primary_color = branding["primary_color"]
    
    frontend_url = os.environ.get('FRONTEND_URL', '')
    if not frontend_url:
        backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://vasilisnetshield.net')
        frontend_url = backend_url.replace('/api', '')
    
    reset_url = f"{frontend_url}/auth?reset_token={reset_token}"
    
    # Create logo HTML
    if logo_url and logo_url.startswith('data:'):
        logo_html = f'<img src="{logo_url}" alt="{company_name}" style="height: 60px; max-width: 200px; object-fit: contain;" />'
    else:
        logo_html = '<span style="font-size: 50px;">🔐</span>'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid {primary_color};">
            <div style="text-align: center; margin-bottom: 20px;">
                {logo_html}
            </div>
            <h1 style="color: {primary_color}; margin-bottom: 10px; text-align: center;">Password Reset Request</h1>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="display: inline-block; background: {primary_color}; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold;">Reset Password</a>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center;">
                This link will expire in 1 hour.
            </p>
            
            <div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #FF6B6B; margin: 0; font-size: 14px;">
                    <strong>⚠️</strong> If you didn't request this password reset, you can safely ignore this email.
                </p>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                {company_name} Security Training Platform
            </p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Password Reset Request",
        html_content=Content("text/html", html_content)
    )
    
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
        logger.error(f"Failed to send forgot password email to {user_email}: {e}")
        return False


async def send_password_expiry_reminder(user_email: str, user_name: str, days_remaining: int, db=None):
    """Send password expiry reminder email"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping password expiry reminder to {user_email}")
        return False
    
    # Get branding settings
    branding = {"company_name": "Vasilis NetShield", "logo_url": None, "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding["company_name"]
    logo_url = branding["logo_url"]
    primary_color = branding["primary_color"]
    
    frontend_url = os.environ.get('FRONTEND_URL', '')
    if not frontend_url:
        backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://vasilisnetshield.net')
        frontend_url = backend_url.replace('/api', '')
    
    login_url = f"{frontend_url}/auth"
    
    # Create logo HTML
    if logo_url and logo_url.startswith('data:'):
        logo_html = f'<img src="{logo_url}" alt="{company_name}" style="height: 60px; max-width: 200px; object-fit: contain;" />'
    else:
        logo_html = '<span style="font-size: 50px;">⏰</span>'
    
    # Urgency color based on days remaining
    urgency_color = "#FF6B6B" if days_remaining <= 3 else "#F59E0B" if days_remaining <= 7 else primary_color
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid {primary_color};">
            <div style="text-align: center; margin-bottom: 20px;">
                {logo_html}
            </div>
            <h1 style="color: {urgency_color}; margin-bottom: 10px; text-align: center;">Password Expiry Reminder</h1>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">Your password will expire in <strong style="color: {urgency_color};">{days_remaining} days</strong>.</p>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Please log in and change your password to maintain uninterrupted access to your account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" style="display: inline-block; background: {primary_color}; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold;">Login & Change Password</a>
            </div>
            
            <div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: {primary_color}; margin: 0; font-size: 14px;">
                    <strong>💡 Tip:</strong> Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                </p>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                {company_name} Security Training Platform
            </p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(user_email),
        subject=f"{company_name} - Password Expires in {days_remaining} Days",
        html_content=Content("text/html", html_content)
    )
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Password expiry reminder sent to {user_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to send password expiry reminder to {user_email}: {e}")
        return False


async def send_admin_notification(subject: str, body: str, db=None):
    """Send notification email to admin (first super_admin in the system)"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    admin_email = os.environ.get('ADMIN_EMAIL')  # Optional dedicated admin email
    
    if not sendgrid_api_key or not sender_email:
        logger.warning("Email not configured - skipping admin notification")
        return False
    
    # Get admin email from database if not set in environment
    if not admin_email and db is not None:
        try:
            admin_user = await db.users.find_one({"role": "super_admin"}, {"email": 1})
            if admin_user:
                admin_email = admin_user.get("email")
        except Exception as e:
            logger.warning(f"Could not fetch admin email: {e}")
    
    if not admin_email:
        logger.warning("No admin email configured - skipping notification")
        return False
    
    # Get branding
    branding = {"company_name": "Vasilis NetShield", "primary_color": "#D4A836"}
    if db is not None:
        branding = await get_branding_settings(db)
    
    company_name = branding.get("company_name", "Vasilis NetShield")
    primary_color = branding.get("primary_color", "#D4A836")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid {primary_color};">
            <h1 style="color: {primary_color}; margin-bottom: 20px;">{subject}</h1>
            <div style="color: #E8DDB5; line-height: 1.6; white-space: pre-wrap;">{body}</div>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                {company_name} Admin Notification
            </p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email=Email(sender_email, company_name),
        to_emails=To(admin_email),
        subject=f"[{company_name}] {subject}",
        html_content=Content("text/html", html_content)
    )
    
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"Admin notification sent to {admin_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
        return False
