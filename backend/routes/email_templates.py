"""
Email Templates Routes
Allows admins to customize email templates
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/email-templates", tags=["Email Templates"])

# Will be set by server.py
db = None
require_admin = None

def init_email_templates_routes(database, admin_dep):
    global db, require_admin
    db = database
    require_admin = admin_dep


# Default templates
DEFAULT_TEMPLATES = {
    "welcome": {
        "subject": "Welcome to {company_name} - Your Login Credentials",
        "body": """<p>Hello <strong>{user_name}</strong>,</p>
<p>An administrator has created an account for you on the {company_name} cybersecurity training platform.</p>

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

<div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="color: #FF6B6B; margin: 0; font-size: 14px;">
        <strong>⚠️ Security Reminder:</strong> Please change your password after your first login for security purposes.
    </p>
</div>""",
        "description": "Sent when an admin creates a new user account"
    },
    "password_reset": {
        "subject": "{company_name} - Your Password Has Been Reset",
        "body": """<p>Hello <strong>{user_name}</strong>,</p>
<p>Your password has been reset by an administrator.</p>

<div style="background: #0f0f15; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid {primary_color};">
    <p style="color: {primary_color}; margin: 0 0 15px 0; font-weight: bold;">Your New Password:</p>
    <p style="color: #E8DDB5; font-family: monospace; font-size: 18px; background: #2a2a34; padding: 10px 15px; border-radius: 4px; margin: 0;">{new_password}</p>
</div>

<p style="color: #FF6B6B; font-size: 14px;">
    <strong>⚠️</strong> Please change your password immediately after logging in.
</p>""",
        "description": "Sent when an admin resets a user's password"
    },
    "forgot_password": {
        "subject": "{company_name} - Password Reset Request",
        "body": """<p>Hello <strong>{user_name}</strong>,</p>
<p>We received a request to reset your password. Click the button below to set a new password:</p>

<p style="color: #888; font-size: 14px; text-align: center;">
    This link will expire in 1 hour.
</p>

<div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="color: #FF6B6B; margin: 0; font-size: 14px;">
        <strong>⚠️</strong> If you didn't request this password reset, you can safely ignore this email.
    </p>
</div>""",
        "description": "Sent when a user requests to reset their password"
    },
    "password_expiry_reminder": {
        "subject": "{company_name} - Password Expiry Reminder",
        "body": """<p>Hello <strong>{user_name}</strong>,</p>
<p>Your password will expire in <strong>{days_remaining} days</strong>.</p>

<p>Please log in and change your password to maintain access to your account.</p>

<div style="background: #2a2a34; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <p style="color: #D4A836; margin: 0; font-size: 14px;">
        <strong>💡 Tip:</strong> Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
    </p>
</div>""",
        "description": "Sent before a user's password expires"
    }
}


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


@router.get("")
async def get_email_templates(user: dict = Depends(lambda: require_admin)):
    """Get all email templates"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    templates = {}
    
    for template_id, default in DEFAULT_TEMPLATES.items():
        # Check if custom template exists
        custom = await db.email_templates.find_one(
            {"template_id": template_id},
            {"_id": 0}
        )
        
        if custom:
            templates[template_id] = {
                "template_id": template_id,
                "subject": custom.get("subject", default["subject"]),
                "body": custom.get("body", default["body"]),
                "description": default["description"],
                "is_customized": True,
                "updated_at": custom.get("updated_at"),
                "available_variables": get_template_variables(template_id)
            }
        else:
            templates[template_id] = {
                "template_id": template_id,
                "subject": default["subject"],
                "body": default["body"],
                "description": default["description"],
                "is_customized": False,
                "updated_at": None,
                "available_variables": get_template_variables(template_id)
            }
    
    return {"templates": templates}


@router.get("/{template_id}")
async def get_email_template(template_id: str, user: dict = Depends(lambda: require_admin)):
    """Get a specific email template"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    default = DEFAULT_TEMPLATES[template_id]
    custom = await db.email_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    
    if custom:
        return {
            "template_id": template_id,
            "subject": custom.get("subject", default["subject"]),
            "body": custom.get("body", default["body"]),
            "description": default["description"],
            "is_customized": True,
            "updated_at": custom.get("updated_at"),
            "available_variables": get_template_variables(template_id)
        }
    
    return {
        "template_id": template_id,
        "subject": default["subject"],
        "body": default["body"],
        "description": default["description"],
        "is_customized": False,
        "updated_at": None,
        "available_variables": get_template_variables(template_id)
    }


@router.put("/{template_id}")
async def update_email_template(
    template_id: str, 
    data: EmailTemplateUpdate,
    user: dict = Depends(lambda: require_admin)
):
    """Update an email template"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {
        "template_id": template_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    if data.subject is not None:
        update_data["subject"] = data.subject
    if data.body is not None:
        update_data["body"] = data.body
    
    await db.email_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Template updated", "template_id": template_id}


@router.post("/{template_id}/reset")
async def reset_email_template(template_id: str, user: dict = Depends(lambda: require_admin)):
    """Reset an email template to default"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.email_templates.delete_one({"template_id": template_id})
    
    return {"message": "Template reset to default", "template_id": template_id}


@router.post("/{template_id}/preview")
async def preview_email_template(
    template_id: str,
    user: dict = Depends(lambda: require_admin)
):
    """Preview an email template with sample data"""
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get template (custom or default)
    custom = await db.email_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    ) if db is not None else None
    
    default = DEFAULT_TEMPLATES[template_id]
    subject = custom.get("subject", default["subject"]) if custom else default["subject"]
    body = custom.get("body", default["body"]) if custom else default["body"]
    
    # Sample data for preview
    sample_data = {
        "company_name": "Vasilis NetShield",
        "user_name": "John Doe",
        "user_email": "john.doe@example.com",
        "password": "TempPass123!",
        "new_password": "NewPass456!",
        "primary_color": "#D4A836",
        "login_url": "https://example.com/auth",
        "reset_url": "https://example.com/auth?reset_token=sample_token",
        "days_remaining": "7"
    }
    
    # Render template with sample data
    rendered_subject = subject
    rendered_body = body
    for key, value in sample_data.items():
        rendered_subject = rendered_subject.replace(f"{{{key}}}", value)
        rendered_body = rendered_body.replace(f"{{{key}}}", value)
    
    return {
        "subject": rendered_subject,
        "body": rendered_body,
        "raw_subject": subject,
        "raw_body": body
    }


def get_template_variables(template_id: str) -> list:
    """Get available variables for a template"""
    common = ["company_name", "user_name", "user_email", "primary_color", "login_url"]
    
    variables = {
        "welcome": common + ["password"],
        "password_reset": common + ["new_password"],
        "forgot_password": common + ["reset_url"],
        "password_expiry_reminder": common + ["days_remaining"]
    }
    
    return variables.get(template_id, common)


async def get_rendered_template(db, template_id: str, data: dict) -> tuple:
    """Get rendered email template for sending"""
    if template_id not in DEFAULT_TEMPLATES:
        return None, None
    
    default = DEFAULT_TEMPLATES[template_id]
    custom = None
    
    if db is not None:
        custom = await db.email_templates.find_one(
            {"template_id": template_id},
            {"_id": 0}
        )
    
    subject = custom.get("subject", default["subject"]) if custom else default["subject"]
    body = custom.get("body", default["body"]) if custom else default["body"]
    
    # Render with provided data
    for key, value in data.items():
        if value is not None:
            subject = subject.replace(f"{{{key}}}", str(value))
            body = body.replace(f"{{{key}}}", str(value))
    
    return subject, body
