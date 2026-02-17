"""
User Import Routes - CSV bulk import for users
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import csv
import io
import uuid
import bcrypt

from models import UserRole, UserResponse

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
    created_users: List[dict]
    errors: List[dict]


@router.get("/users/template")
async def get_import_template(request: Request):
    """Get CSV template for user import"""
    await require_admin(request)
    
    # Create CSV template
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['name', 'email', 'role', 'organization_name', 'password'])
    
    # Example rows
    writer.writerow(['John Doe', 'john@example.com', 'trainee', 'Acme Corp', 'temppass123'])
    writer.writerow(['Jane Smith', 'jane@example.com', 'org_admin', 'Acme Corp', 'temppass456'])
    writer.writerow(['Bob Wilson', 'bob@example.com', 'trainee', 'Tech Inc', 'temppass789'])
    
    csv_content = output.getvalue()
    
    return {
        "template": csv_content,
        "columns": [
            {"name": "name", "required": True, "description": "User's full name"},
            {"name": "email", "required": True, "description": "User's email address"},
            {"name": "role", "required": True, "description": "Role: trainee, org_admin, or super_admin"},
            {"name": "organization_name", "required": False, "description": "Organization name (will be created if not exists)"},
            {"name": "password", "required": True, "description": "Temporary password for the user"}
        ],
        "valid_roles": ["trainee", "org_admin", "super_admin"]
    }


@router.post("/users/preview", response_model=ImportPreviewResponse)
async def preview_user_import(request: Request, file: UploadFile = File(...)):
    """Preview CSV import before processing"""
    await require_admin(request)
    db = get_db()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    
    try:
        decoded = content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded = content.decode('latin-1')
        except:
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
    
    valid_roles = {"trainee", "org_admin", "super_admin"}
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        errors = []
        
        name = row.get('name', '').strip()
        email = row.get('email', '').strip().lower()
        role = row.get('role', '').strip().lower()
        org_name = row.get('organization_name', '').strip()
        password = row.get('password', '').strip()
        
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
        
        if not password:
            errors.append("Password is required")
        elif len(password) < 6:
            errors.append("Password must be at least 6 characters")
        
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
    """Import users from CSV file"""
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
    
    valid_roles = {"trainee", "org_admin", "super_admin"}
    
    created_users = []
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            name = row.get('name', '').strip()
            email = row.get('email', '').strip().lower()
            role = row.get('role', '').strip().lower()
            org_name = row.get('organization_name', '').strip()
            password = row.get('password', '').strip()
            
            # Validate
            if not name or not email or not role or not password:
                errors.append({"row": row_num, "error": "Missing required fields"})
                continue
            
            if email in existing_emails:
                errors.append({"row": row_num, "email": email, "error": "Email already exists"})
                continue
            
            if role not in valid_roles:
                errors.append({"row": row_num, "email": email, "error": f"Invalid role: {role}"})
                continue
            
            # Get or create organization
            org_id = None
            if org_name:
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
                        "description": f"Created via bulk import",
                        "is_active": True,
                        "created_by": admin["user_id"],
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    existing_orgs[org_key] = org_id
            
            # Create user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "role": role,
                "organization_id": org_id,
                "picture": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "imported_by": admin["user_id"]
            }
            
            await db.users.insert_one(user_doc)
            existing_emails.add(email)
            
            created_users.append({
                "user_id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "organization_id": org_id
            })
            
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
    
    return ImportResultResponse(
        total_processed=len(created_users) + len(errors),
        successful=len(created_users),
        failed=len(errors),
        created_users=created_users,
        errors=errors
    )
