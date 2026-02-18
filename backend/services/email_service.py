import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)


async def send_welcome_email(user_email: str, user_name: str, password: str, login_url: str = None):
    """Send welcome email with login credentials to a new user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping welcome email to {user_email}")
        return False
    
    # Use frontend URL for login link
    if not login_url:
        login_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com') + '/auth'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid #D4A836;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 50px;">🛡️</span>
            </div>
            <h1 style="color: #D4A836; margin-bottom: 10px; text-align: center;">Welcome to VasilisNetShield!</h1>
            <p style="color: #888; text-align: center; margin-bottom: 30px;">Your account has been created</p>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">An administrator has created an account for you on the VasilisNetShield cybersecurity training platform.</p>
            
            <div style="background: #0f0f15; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #D4A836;">
                <p style="color: #D4A836; margin: 0 0 15px 0; font-weight: bold; font-size: 16px;">Your Login Credentials:</p>
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
                <a href="{login_url}" style="display: inline-block; background: #D4A836; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Login to Your Account</a>
            </div>
            
            <div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #FF6B6B; margin: 0; font-size: 14px;">
                    <strong>⚠️ Security Reminder:</strong> Please change your password after your first login for security purposes.
                </p>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                This email was sent by VasilisNetShield Security Training Platform.<br>
                If you did not expect this email, please contact your administrator.
            </p>
        </div>
    </body>
    </html>
    """
    
    plain_text = f"""
Welcome to VasilisNetShield!

Hello {user_name},

An administrator has created an account for you on the VasilisNetShield cybersecurity training platform.

Your Login Credentials:
- Email: {user_email}
- Password: {password}

Login here: {login_url}

SECURITY REMINDER: Please change your password after your first login.

---
VasilisNetShield Security Training Platform
    """
    
    message = Mail(
        from_email=Email(sender_email, "VasilisNetShield"),
        to_emails=To(user_email),
        subject="Welcome to VasilisNetShield - Your Login Credentials",
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


async def send_password_reset_email(user_email: str, user_name: str, new_password: str, login_url: str = None):
    """Send password reset email to a user"""
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDER_EMAIL')
    
    if not sendgrid_api_key or not sender_email:
        logger.warning(f"Email not configured - skipping password reset email to {user_email}")
        return False
    
    if not login_url:
        login_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com') + '/auth'
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #0f0f15; color: #E8DDB5; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a24; border-radius: 10px; padding: 30px; border: 1px solid #D4A836;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 50px;">🔐</span>
            </div>
            <h1 style="color: #D4A836; margin-bottom: 10px; text-align: center;">Password Reset</h1>
            
            <p style="color: #E8DDB5; line-height: 1.6;">Hello <strong>{user_name}</strong>,</p>
            <p style="color: #E8DDB5; line-height: 1.6;">Your password has been reset by an administrator.</p>
            
            <div style="background: #0f0f15; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #D4A836;">
                <p style="color: #D4A836; margin: 0 0 15px 0; font-weight: bold;">Your New Password:</p>
                <p style="color: #E8DDB5; font-family: monospace; font-size: 18px; background: #2a2a34; padding: 10px 15px; border-radius: 4px; margin: 0;">{new_password}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" style="display: inline-block; background: #D4A836; color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold;">Login Now</a>
            </div>
            
            <p style="color: #FF6B6B; font-size: 14px;">
                <strong>⚠️</strong> Please change your password immediately after logging in.
            </p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; color: #666; font-size: 12px; text-align: center;">
                VasilisNetShield Security Training Platform
            </p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email=Email(sender_email, "VasilisNetShield"),
        to_emails=To(user_email),
        subject="VasilisNetShield - Your Password Has Been Reset",
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
