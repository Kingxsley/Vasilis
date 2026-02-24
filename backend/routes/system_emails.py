"""
System Email Templates API
Allows admins to customize system emails (welcome, password reset, training assignment, etc.)
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/system-emails", tags=["System Emails"])


def get_db():
    from server import db
    return db


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


class SystemEmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    show_icon: Optional[bool] = None
    icon_type: Optional[str] = None  # 'shield', 'mail', 'key', 'alert', 'check', 'none', 'custom'
    custom_icon_url: Optional[str] = None  # URL to custom uploaded icon
    header_title: Optional[str] = None
    header_subtitle: Optional[str] = None
    greeting_template: Optional[str] = None  # e.g., "Hello {user_name},"
    body_template: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url_template: Optional[str] = None  # e.g., "{login_url}"
    show_cta: Optional[bool] = None
    footer_text: Optional[str] = None
    show_security_warning: Optional[bool] = None
    security_warning_text: Optional[str] = None
    primary_color: Optional[str] = None


# Default templates for system emails
DEFAULT_TEMPLATES = {
    "welcome": {
        "id": "welcome",
        "name": "Welcome Email",
        "description": "Sent when a new user account is created",
        "subject": "Welcome to {company_name} - Your Login Credentials",
        "show_icon": True,
        "icon_type": "shield",
        "custom_icon_url": None,
        "header_title": "Welcome to {company_name}!",
        "header_subtitle": "Your account has been created",
        "greeting_template": "Hello {user_name},",
        "body_template": "An administrator has created an account for you.",
        "cta_text": "Login to Your Account",
        "cta_url_template": "{login_url}",
        "show_cta": True,
        "footer_text": "{company_name} Security Training Platform",
        "show_security_warning": True,
        "security_warning_text": "Security: Change your password after first login.",
        "primary_color": "#D4A836",
        "variables": ["user_name", "user_email", "password", "login_url", "company_name"]
    },
    "password_reset": {
        "id": "password_reset",
        "name": "Password Reset",
        "description": "Sent when an admin resets a user's password",
        "subject": "{company_name} - Your Password Has Been Reset",
        "show_icon": True,
        "icon_type": "key",
        "header_title": "Password Reset",
        "header_subtitle": "Your password has been changed",
        "greeting_template": "Hello {user_name},",
        "body_template": "An administrator has reset your password.",
        "cta_text": "Login with New Password",
        "cta_url_template": "{login_url}",
        "show_cta": True,
        "footer_text": "{company_name} Security Training Platform",
        "show_security_warning": True,
        "security_warning_text": "If you didn't request this, contact your administrator.",
        "primary_color": "#D4A836",
        "variables": ["user_name", "user_email", "password", "login_url", "company_name"]
    },
    "forgot_password": {
        "id": "forgot_password",
        "name": "Forgot Password",
        "description": "Sent when a user requests password reset",
        "subject": "{company_name} - Password Reset Request",
        "show_icon": True,
        "icon_type": "key",
        "header_title": "Password Reset Request",
        "header_subtitle": "Click below to reset your password",
        "greeting_template": "Hello {user_name},",
        "body_template": "We received a request to reset your password. Click the button below to create a new password.",
        "cta_text": "Reset Password",
        "cta_url_template": "{reset_url}",
        "show_cta": True,
        "footer_text": "{company_name} Security Training Platform",
        "show_security_warning": True,
        "security_warning_text": "If you didn't request this, you can safely ignore this email.",
        "primary_color": "#D4A836",
        "variables": ["user_name", "user_email", "reset_url", "company_name"]
    },
    "training_assignment": {
        "id": "training_assignment",
        "name": "Training Assignment",
        "description": "Sent when training is assigned to a user",
        "subject": "{company_name} - New Security Training Assigned",
        "show_icon": True,
        "icon_type": "alert",
        "header_title": "Training Required",
        "header_subtitle": "You have been assigned security training",
        "greeting_template": "Hello {user_name},",
        "body_template": "You have been assigned new security training: {module_name}. Please complete it as soon as possible.",
        "cta_text": "Start Training",
        "cta_url_template": "{training_url}",
        "show_cta": True,
        "footer_text": "{company_name} Security Training Platform",
        "show_security_warning": False,
        "security_warning_text": "",
        "primary_color": "#D4A836",
        "variables": ["user_name", "user_email", "module_name", "training_url", "company_name"]
    }
}


@router.get("")
async def get_system_email_templates(request: Request):
    """Get all system email templates with their current customizations"""
    await require_super_admin(request)
    db = get_db()
    
    templates = []
    for template_id, default in DEFAULT_TEMPLATES.items():
        # Check for customizations in database
        custom = await db.system_email_templates.find_one({"template_id": template_id}, {"_id": 0})
        
        if custom:
            # Merge default with customizations
            template = {**default, **custom, "is_customized": True}
        else:
            template = {**default, "is_customized": False}
        
        templates.append(template)
    
    return {"templates": templates}


@router.get("/{template_id}")
async def get_system_email_template(template_id: str, request: Request):
    """Get a specific system email template"""
    await require_super_admin(request)
    db = get_db()
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    default = DEFAULT_TEMPLATES[template_id]
    custom = await db.system_email_templates.find_one({"template_id": template_id}, {"_id": 0})
    
    if custom:
        return {**default, **custom, "is_customized": True}
    return {**default, "is_customized": False}


@router.put("/{template_id}")
async def update_system_email_template(template_id: str, data: SystemEmailTemplateUpdate, request: Request):
    """Update a system email template"""
    await require_super_admin(request)
    db = get_db()
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["template_id"] = template_id
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.system_email_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Return updated template
    custom = await db.system_email_templates.find_one({"template_id": template_id}, {"_id": 0})
    return {**DEFAULT_TEMPLATES[template_id], **custom, "is_customized": True}


@router.post("/{template_id}/reset")
async def reset_system_email_template(template_id: str, request: Request):
    """Reset a system email template to defaults"""
    await require_super_admin(request)
    db = get_db()
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.system_email_templates.delete_one({"template_id": template_id})
    
    return {**DEFAULT_TEMPLATES[template_id], "is_customized": False}


@router.post("/{template_id}/preview")
async def preview_system_email(template_id: str, request: Request):
    """Generate a preview of the system email with sample data"""
    await require_super_admin(request)
    db = get_db()
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get template (default or customized)
    default = DEFAULT_TEMPLATES[template_id]
    custom = await db.system_email_templates.find_one({"template_id": template_id}, {"_id": 0})
    template = {**default, **(custom or {})}
    
    # Sample data for preview
    sample_data = {
        "user_name": "John Doe",
        "user_email": "john.doe@example.com",
        "password": "TempPass123!",
        "login_url": "https://example.com/auth",
        "reset_url": "https://example.com/reset-password?token=abc123",
        "training_url": "https://example.com/training",
        "module_name": "Phishing Awareness Training",
        "company_name": template.get("company_name", "Vasilis NetShield")
    }
    
    # Get branding
    branding = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    if branding:
        sample_data["company_name"] = branding.get("company_name", "Vasilis NetShield")
    
    # Generate HTML preview
    html = generate_email_html(template, sample_data)
    
    return {
        "html": html,
        "subject": template.get("subject", "").format(**sample_data)
    }


def generate_email_html(template: dict, data: dict) -> str:
    """Generate HTML email from template and data"""
    primary_color = template.get("primary_color", "#D4A836")
    show_icon = template.get("show_icon", True)
    icon_type = template.get("icon_type", "shield")
    
    # Icon mapping
    icons = {
        "shield": "🛡️",
        "mail": "📧",
        "key": "🔑",
        "alert": "⚠️",
        "check": "✅",
        "none": ""
    }
    icon = icons.get(icon_type, "🛡️") if show_icon else ""
    
    # Format template strings with data
    def fmt(s):
        if not s:
            return ""
        try:
            return s.format(**data)
        except KeyError:
            return s
    
    header_title = fmt(template.get("header_title", ""))
    header_subtitle = fmt(template.get("header_subtitle", ""))
    greeting = fmt(template.get("greeting_template", ""))
    body = fmt(template.get("body_template", ""))
    cta_text = fmt(template.get("cta_text", ""))
    cta_url = fmt(template.get("cta_url_template", ""))
    footer = fmt(template.get("footer_text", ""))
    security_warning = fmt(template.get("security_warning_text", ""))
    show_cta = template.get("show_cta", True)
    show_security_warning = template.get("show_security_warning", False)
    
    # Credentials section (only for welcome/password_reset)
    credentials_html = ""
    if "password" in data and data.get("password"):
        credentials_html = f"""
<div style="background:#0f0f15;border-radius:8px;padding:20px;border-left:4px solid {primary_color};margin-bottom:20px;">
<p style="color:{primary_color};margin:0 0 10px 0;font-weight:bold;">Your Login Credentials:</p>
<p style="color:#888;margin:0 0 5px 0;">Email: <strong style="color:#E8DDB5;">{data.get('user_email', '')}</strong></p>
<p style="color:#888;margin:0;">Password: <code style="background:#2a2a34;color:#E8DDB5;padding:3px 8px;border-radius:4px;">{data.get('password', '')}</code></p>
</div>"""
    
    # CTA button
    cta_html = ""
    if show_cta and cta_text and cta_url:
        cta_html = f"""
<tr><td style="padding:0 30px 20px 30px;text-align:center;">
<a href="{cta_url}" style="display:inline-block;background:{primary_color};color:#000;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;font-size:16px;">{cta_text}</a>
</td></tr>"""
    
    # Security warning
    warning_html = ""
    if show_security_warning and security_warning:
        warning_html = f"""
<tr><td style="padding:0 30px 20px 30px;">
<div style="background:#2a2a34;border-radius:8px;padding:12px;">
<p style="color:#FF6B6B;margin:0;font-size:13px;"><strong>⚠️ {security_warning}</strong></p>
</div>
</td></tr>"""
    
    # Icon section
    icon_html = ""
    if icon:
        icon_html = f'<div style="font-size:40px;margin-bottom:10px;">{icon}</div>'
    
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f15;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f15;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:10px;border:1px solid {primary_color};">
<tr><td style="padding:30px;text-align:center;">
{icon_html}
<h1 style="color:{primary_color};margin:0 0 5px 0;font-size:24px;">{header_title}</h1>
<p style="color:#888;margin:0 0 20px 0;font-size:14px;">{header_subtitle}</p>
</td></tr>
<tr><td style="padding:0 30px;">
<p style="color:#E8DDB5;margin:0 0 15px 0;">{greeting}</p>
<p style="color:#E8DDB5;margin:0 0 20px 0;">{body}</p>
{credentials_html}
</td></tr>
{cta_html}
{warning_html}
<tr><td style="padding:20px 30px;border-top:1px solid #333;text-align:center;">
<p style="color:#666;margin:0;font-size:12px;">{footer}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    
    return html


async def get_system_email_template_config(db, template_id: str) -> dict:
    """Helper function for email service to get template config"""
    if template_id not in DEFAULT_TEMPLATES:
        return DEFAULT_TEMPLATES.get("welcome", {})
    
    default = DEFAULT_TEMPLATES[template_id]
    custom = await db.system_email_templates.find_one({"template_id": template_id}, {"_id": 0})
    
    if custom:
        return {**default, **custom}
    return default
