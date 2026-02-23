"""
User Import Routes - CSV bulk import for users
V2: Auto-generates secure passwords and sends welcome emails
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import csv
import io
import uuid
import bcrypt
import secrets
import string
import logging

from models import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/import", tags=["Import"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def generate_secure_password(length: int = 16) -> str:
    """Generate a secure random password"""
    # Ensure at least one of each required character type
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Start with required characters
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill the rest with random characters from all pools
    all_chars = lowercase + uppercase + digits + special
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))
    
    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)


class ImportPreviewRow(BaseModel):
    row_number: int
    name: str
    email: str
    role: str
    organization_name: Optional[str] = None
    valid: bool
    errors: List[str] = []


class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    preview: List[ImportPreviewRow]
    sample_file_url: Optional[str] = None


class ImportResultResponse(BaseModel):
    total_processed: int
    successful: int
    failed: int
    emails_sent: int
    emails_failed: int
    created_users: List[dict]
    errors: List[dict]


@router.get("/users/template")
async def get_import_template(request: Request):
    """Get CSV template for user import V2 - password is now optional (auto-generated)"""
    await require_admin(request)
    
    # Create CSV template - V2 format (password optional)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row - password is now optional
    writer.writerow(['name', 'email', 'role', 'organization_name'])
    
    # Example rows
    writer.writerow(['John Doe', 'john@example.com', 'trainee', 'Acme Corp'])
    writer.writerow(['Jane Smith', 'jane@example.com', 'org_admin', 'Acme Corp'])
    writer.writerow(['Bob Wilson', 'bob@example.com', 'trainee', 'Tech Inc'])
    
    csv_content = output.getvalue()
    
    return {
        "template": csv_content,
        "columns": [
            {"name": "name", "required": True, "description": "User's full name"},
            {"name": "email", "required": True, "description": "User's email address (must be unique)"},
            {"name": "role", "required": True, "description": "Role: trainee, org_admin, manager, or super_admin"},
            {"name": "organization_name", "required": False, "description": "Organization name (will be created if not exists)"},
        ],
        "valid_roles": ["trainee", "org_admin", "manager", "super_admin"],
        "notes": [
            "Passwords are automatically generated and sent via email",
            "Users will receive a welcome email with their login credentials",
            "Org admins can only import users to their own organization"
        ]
    }


@router.post("/users/preview", response_model=ImportPreviewResponse)
async def preview_user_import(request: Request, file: UploadFile = File(...)):
    """Preview CSV import before processing - V2 format (password auto-generated)"""
    admin = await require_admin(request)
    db = get_db()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    
    try:
        decoded = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded = content.decode('latin-1')
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode file. Please use UTF-8 encoding.")
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Get existing emails and organizations
    existing_emails = set()
    async for user in db.users.find({}, {"email": 1}):
        existing_emails.add(user["email"].lower())
    
    existing_orgs = {}
    async for org in db.organizations.find({}, {"organization_id": 1, "name": 1}):
        existing_orgs[org["name"].lower()] = org["organization_id"]
    
    preview_rows = []
    valid_count = 0
    invalid_count = 0
    
    # Roles that different admin types can assign
    if admin.get("role") == UserRole.SUPER_ADMIN:
        valid_roles = {"trainee", "org_admin", "manager", "super_admin", "media_manager", "viewer"}
    else:
        # Org admins cannot create super_admin users
        valid_roles = {"trainee", "org_admin", "manager", "media_manager", "viewer"}
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        errors = []
        
        name = row.get('name', '').strip()
        email = row.get('email', '').strip().lower()
        role = row.get('role', '').strip().lower()
        org_name = row.get('organization_name', '').strip()
        
        # Validate required fields
        if not name:
            errors.append("Name is required")
        
        if not email:
            errors.append("Email is required")
        elif '@' not in email or '.' not in email:
            errors.append("Invalid email format")
        elif email in existing_emails:
            errors.append("Email already exists")
        
        if not role:
            errors.append("Role is required")
        elif role not in valid_roles:
            errors.append(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        # Org admins must import to their own organization
        if admin.get("role") == UserRole.ORG_ADMIN:
            admin_org = await db.organizations.find_one(
                {"organization_id": admin.get("organization_id")},
                {"_id": 0, "name": 1}
            )
            if admin_org:
                if org_name and org_name.lower() != admin_org.get("name", "").lower():
                    errors.append(f"Org admins can only import users to their own organization ({admin_org.get('name')})")
        
        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
            existing_emails.add(email)  # Prevent duplicates in same file
        else:
            invalid_count += 1
        
        preview_rows.append(ImportPreviewRow(
            row_number=row_num,
            name=name,
            email=email,
            role=role,
            organization_name=org_name or None,
            valid=is_valid,
            errors=errors
        ))
    
    return ImportPreviewResponse(
        total_rows=len(preview_rows),
        valid_rows=valid_count,
        invalid_rows=invalid_count,
        preview=preview_rows[:50]  # Limit preview to first 50 rows
    )


@router.post("/users", response_model=ImportResultResponse)
async def import_users(request: Request, file: UploadFile = File(...)):
    """Import users from CSV file - V2: Auto-generates passwords and sends welcome emails"""
    admin = await require_admin(request)
    db = get_db()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    
    try:
        decoded = content.decode('utf-8')
    except UnicodeDecodeError:
        decoded = content.decode('latin-1')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Get existing data
    existing_emails = set()
    async for user in db.users.find({}, {"email": 1}):
        existing_emails.add(user["email"].lower())
    
    existing_orgs = {}
    async for org in db.organizations.find({}, {"organization_id": 1, "name": 1}):
        existing_orgs[org["name"].lower()] = org["organization_id"]
    
    # Roles that different admin types can assign
    if admin.get("role") == UserRole.SUPER_ADMIN:
        valid_roles = {"trainee", "org_admin", "manager", "super_admin", "media_manager", "viewer"}
    else:
        valid_roles = {"trainee", "org_admin", "manager", "media_manager", "viewer"}
    
    # Get org admin's organization for scoping
    admin_org_id = admin.get("organization_id")
    admin_org_name = None
    if admin.get("role") == UserRole.ORG_ADMIN and admin_org_id:
        admin_org = await db.organizations.find_one(
            {"organization_id": admin_org_id},
            {"_id": 0, "name": 1}
        )
        # Note: admin_org info is used only for validation, not stored
    
    created_users = []
    errors = []
    emails_sent = 0
    emails_failed = 0
    
    # Import email service
    from services.email_service import send_welcome_email
    
    for row_num, row in enumerate(reader, start=2):
        try:
            name = row.get('name', '').strip()
            email = row.get('email', '').strip().lower()
            role = row.get('role', '').strip().lower()
            org_name = row.get('organization_name', '').strip()
            
            # Validate required fields
            if not name or not email or not role:
                errors.append({"row": row_num, "error": "Missing required fields (name, email, role)"})
                continue
            
            if email in existing_emails:
                errors.append({"row": row_num, "email": email, "error": "Email already exists"})
                continue
            
            if role not in valid_roles:
                errors.append({"row": row_num, "email": email, "error": f"Invalid role: {role}"})
                continue
            
            # Determine organization
            org_id = None
            
            if admin.get("role") == UserRole.ORG_ADMIN:
                # Org admins always import users to their own organization
                org_id = admin_org_id
            elif org_name:
                # Super admin can specify organization
                org_key = org_name.lower()
                if org_key in existing_orgs:
                    org_id = existing_orgs[org_key]
                else:
                    # Create new organization
                    org_id = f"org_{uuid.uuid4().hex[:12]}"
                    await db.organizations.insert_one({
                        "organization_id": org_id,
                        "name": org_name,
                        "domain": None,
                        "description": "Created via bulk import",
                        "is_active": True,
                        "created_by": admin["user_id"],
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    existing_orgs[org_key] = org_id
            
            # Generate secure password
            password = generate_secure_password(16)
            password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            
            # Create user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            now_ts = datetime.now(timezone.utc)
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "role": role,
                "organization_id": org_id,
                "picture": None,
                "is_active": True,
                "created_at": now_ts.isoformat(),
                # Initialize last_login to created time so newly imported users count as active
                "last_login": now_ts.isoformat(),
                "imported_by": admin["user_id"],
                "password_change_required": True  # Flag to prompt password change on first login
            }
            
            await db.users.insert_one(user_doc)
            existing_emails.add(email)
            
            # Send welcome email with auto-generated password
            try:
                email_sent = await send_welcome_email(
                    user_email=email,
                    user_name=name,
                    password=password,
                    db=db
                )
                if email_sent:
                    emails_sent += 1
                    logger.info(f"Welcome email sent to {email}")
                else:
                    emails_failed += 1
                    logger.warning(f"Failed to send welcome email to {email}")
            except Exception as e:
                emails_failed += 1
                logger.error(f"Error sending welcome email to {email}: {e}")
            
            created_users.append({
                "user_id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "organization_id": org_id,
                "email_sent": email_sent if 'email_sent' in dir() else False
            })
            
        except Exception as e:
            logger.error(f"Error importing row {row_num}: {e}")
            errors.append({"row": row_num, "error": str(e)})
    
    # Log the import action
    try:
        from server import audit_logger
        await audit_logger.log(
            action="users_bulk_imported",
            user_id=admin["user_id"],
            user_email=admin.get("email"),
            details={
                "total_imported": len(created_users),
                "emails_sent": emails_sent,
                "emails_failed": emails_failed,
                "errors": len(errors)
            },
            severity="info"
        )
    except Exception:
        pass
    
    return ImportResultResponse(
        total_processed=len(created_users) + len(errors),
        successful=len(created_users),
        failed=len(errors),
        emails_sent=emails_sent,
        emails_failed=emails_failed,
        created_users=created_users,
        errors=errors
    )
