from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import html
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

# Import security middleware
from middleware.security import (
    RateLimitMiddleware, 
    SecurityHeadersMiddleware,
    account_lockout,
    PasswordPolicy,
    AuditLogger,
    get_client_ip
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection - handle missing env vars gracefully
mongo_url = os.environ.get('MONGO_URL', '')
db_name = os.environ.get('DB_NAME', 'vasilisnetshield')

if not mongo_url:
    logger.error("MONGO_URL environment variable is not set!")
    # Use a dummy for startup, will fail on actual DB operations
    mongo_url = "mongodb://localhost:27017"

try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"MongoDB client initialized for database: {db_name}")
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    raise

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'vasilisnetshield-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_HOURS = 24  # Shorter access token lifespan
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7  # Refresh tokens last longer

# Create the main app
app = FastAPI(title="Vasilis NetShield API")

# Initialize audit logger (connected to DB after startup)
audit_logger = AuditLogger()

# ============== INPUT SANITIZATION ==============

def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize input string to prevent XSS and injection attacks"""
    if not value:
        return value
    # Remove null bytes
    value = value.replace('\x00', '')
    # HTML encode potentially dangerous characters
    value = html.escape(value)
    # Truncate to max length
    return value[:max_length]

def sanitize_html_content(value: str) -> str:
    """Sanitize HTML content while preserving safe tags"""
    if not value:
        return value
    # Remove script tags and their content
    value = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', value, flags=re.IGNORECASE)
    # Remove on* event handlers
    value = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', value, flags=re.IGNORECASE)
    # Remove javascript: URLs
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    return value

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
org_router = APIRouter(prefix="/organizations", tags=["Organizations"])
user_router = APIRouter(prefix="/users", tags=["Users"])
campaign_router = APIRouter(prefix="/campaigns", tags=["Campaigns"])
training_router = APIRouter(prefix="/training", tags=["Training"])
ai_router = APIRouter(prefix="/ai", tags=["AI"])

security = HTTPBearer(auto_error=False)

# ============== MODELS ==============

class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    TRAINEE = "trainee"

# Auth Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        is_valid, error = PasswordPolicy.validate(v)
        if not is_valid:
            raise ValueError(error)
        return v
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v):
        return sanitize_string(v, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    organization_id: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(BaseModel):
    organization_id: str
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    user_count: int = 0

# Campaign Models
class CampaignCreate(BaseModel):
    name: str
    organization_id: str
    campaign_type: str  # phishing, ads, social_engineering
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CampaignResponse(BaseModel):
    campaign_id: str
    name: str
    organization_id: str
    campaign_type: str
    description: Optional[str] = None
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime

# Training Models
class TrainingModuleResponse(BaseModel):
    module_id: str
    name: str
    module_type: str
    description: str
    difficulty: str
    duration_minutes: int
    scenarios_count: int

class TrainingSessionCreate(BaseModel):
    module_id: str
    campaign_id: Optional[str] = None

class TrainingSessionResponse(BaseModel):
    session_id: str
    user_id: str
    module_id: str
    campaign_id: Optional[str] = None
    status: str
    score: int
    total_questions: int
    correct_answers: int
    started_at: datetime
    completed_at: Optional[datetime] = None

class ScenarioResponse(BaseModel):
    scenario_id: str
    module_id: str
    scenario_type: str
    title: str
    content: dict
    correct_answer: str
    explanation: str
    difficulty: str

class SubmitAnswerRequest(BaseModel):
    scenario_id: str
    answer: str

class SubmitAnswerResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str
    score: int

# AI Models
class AIGenerateRequest(BaseModel):
    scenario_type: str  # phishing_email, malicious_ad, social_engineering
    difficulty: str  # easy, medium, hard
    context: Optional[str] = None

class AIGenerateResponse(BaseModel):
    content: dict
    correct_answer: str
    explanation: str

# User Management Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.TRAINEE
    organization_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[str] = None
    is_active: Optional[bool] = None

# Analytics Models
class DashboardStats(BaseModel):
    total_organizations: int
    total_users: int
    total_campaigns: int
    active_campaigns: int
    total_training_sessions: int
    average_score: float

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str, email: str, role: str, token_type: str = "access") -> str:
    if token_type == "refresh":
        expiration = datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    else:
        expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_TOKEN_EXPIRE_HOURS)
    
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "type": token_type,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request, credentials=Depends(security)) -> dict:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Validate session from database
        session = await db.user_sessions.find_one(
            {"session_token": session_token},
            {"_id": 0}
        )
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]},
                    {"_id": 0}
                )
                if user:
                    return user
    
    # Try Authorization header (JWT)
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one(
                {"user_id": payload["user_id"]},
                {"_id": 0}
            )
            if user:
                return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

# ============== AUTH ROUTES ==============

@auth_router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": UserRole.SUPER_ADMIN,  # First user is super admin
        "organization_id": None,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if any users exist - if not, make super admin
    user_count = await db.users.count_documents({})
    if user_count > 0:
        user_doc["role"] = UserRole.TRAINEE
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, data.email, user_doc["role"])
    
    user_response = UserResponse(
        user_id=user_id,
        email=data.email,
        name=data.name,
        role=user_doc["role"],
        organization_id=None,
        picture=None,
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )
    
    return TokenResponse(token=token, user=user_response)

@auth_router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    client_ip = get_client_ip(request)
    
    # Check if account is locked
    is_locked, seconds_remaining = account_lockout.is_locked(data.email)
    if is_locked:
        await audit_logger.log(
            action="login_blocked_lockout",
            user_email=data.email,
            ip_address=client_ip,
            severity="warning"
        )
        raise HTTPException(
            status_code=429, 
            detail=f"Account temporarily locked. Try again in {seconds_remaining // 60} minutes."
        )
    
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        # Record failed attempt
        locked = account_lockout.record_failed_attempt(data.email, client_ip)
        await audit_logger.log(
            action="login_failed_user_not_found",
            user_email=data.email,
            ip_address=client_ip,
            severity="warning"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        # Record failed attempt
        locked = account_lockout.record_failed_attempt(data.email, client_ip)
        await audit_logger.log(
            action="login_failed_wrong_password",
            user_email=data.email,
            ip_address=client_ip,
            severity="warning"
        )
        if locked:
            raise HTTPException(
                status_code=429, 
                detail="Too many failed attempts. Account temporarily locked."
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        await audit_logger.log(
            action="login_failed_inactive",
            user_email=data.email,
            ip_address=client_ip,
            severity="warning"
        )
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Clear failed attempts on successful login
    account_lockout.clear_attempts(data.email)
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
    # Log successful login
    await audit_logger.log(
        action="login_success",
        user_id=user["user_id"],
        user_email=user["email"],
        ip_address=client_ip,
        severity="info"
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        organization_id=user.get("organization_id"),
        picture=user.get("picture"),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user_response)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@auth_router.post("/refresh")
async def refresh_access_token(request: Request):
    """Refresh access token using a valid refresh token or existing access token"""
    
    # Get the current token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    old_token = auth_header.split(" ")[1]
    
    try:
        # Decode the token - allow expired tokens for refresh
        try:
            payload = jwt.decode(old_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            # Decode without verification to get user info from expired token
            payload = jwt.decode(old_token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
        
        user_id = payload.get("user_id")
        email = payload.get("sub")
        
        if not user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Verify user still exists and is active
        user = await db.users.find_one({"user_id": user_id, "email": email}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Generate new access token
        new_token = create_jwt_token(user_id, email, user["role"])
        
        # Build user response
        created_at = user.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        user_response = UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            organization_id=user.get("organization_id"),
            picture=user.get("picture"),
            created_at=created_at
        )
        
        return TokenResponse(token=new_token, user=user_response)
        
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@auth_router.post("/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for app session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as http_client:
        try:
            emergent_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if emergent_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = emergent_response.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    emergent_session_token = session_data.get("session_token")
    
    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_count = await db.users.count_documents({})
        role = UserRole.SUPER_ADMIN if user_count == 0 else UserRole.TRAINEE
        
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": None,
            "role": role,
            "organization_id": None,
            "picture": picture,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    
    # Store session
    session_token = emergent_session_token or f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": user.get("role", UserRole.TRAINEE),
        "organization_id": user.get("organization_id"),
        "picture": picture,
        "created_at": created_at.isoformat() if created_at else None
    }

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        organization_id=user.get("organization_id"),
        picture=user.get("picture"),
        created_at=created_at
    )

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# Forgot Password Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        is_valid, error = PasswordPolicy.validate(v)
        if not is_valid:
            raise ValueError(error)
        return v

@auth_router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Request password reset email"""
    client_ip = get_client_ip(request)
    
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        await audit_logger.log(
            action="forgot_password_unknown_email",
            user_email=data.email,
            ip_address=client_ip,
            severity="info"
        )
        return {"message": "If an account exists with this email, a reset link has been sent."}
    
    # Generate reset token
    reset_token = f"reset_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.update_one(
        {"email": data.email},
        {"$set": {
            "email": data.email,
            "user_id": user["user_id"],
            "token": reset_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used": False
        }},
        upsert=True
    )
    
    # Send email
    email_sent = await send_forgot_password_email(
        user_email=data.email,
        user_name=user["name"],
        reset_token=reset_token,
        db=db
    )
    
    await audit_logger.log(
        action="forgot_password_requested",
        user_id=user["user_id"],
        user_email=data.email,
        ip_address=client_ip,
        details={"email_sent": email_sent},
        severity="info"
    )
    
    return {"message": "If an account exists with this email, a reset link has been sent."}

@auth_router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, request: Request):
    """Reset password using token"""
    client_ip = get_client_ip(request)
    
    # Find reset token
    reset_record = await db.password_resets.find_one(
        {"token": data.token, "used": False},
        {"_id": 0}
    )
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clear any account lockouts
    account_lockout.clear_attempts(reset_record["email"])
    
    await audit_logger.log(
        action="password_reset_completed",
        user_id=reset_record["user_id"],
        user_email=reset_record["email"],
        ip_address=client_ip,
        severity="info"
    )
    
    return {"message": "Password reset successful. You can now login with your new password."}

@auth_router.get("/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_resets.find_one(
        {"token": token, "used": False},
        {"_id": 0}
    )
    
    if not reset_record:
        return {"valid": False, "message": "Invalid or expired reset token"}
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        return {"valid": False, "message": "Reset token has expired"}
    
    return {"valid": True, "email": reset_record["email"]}

# ============== ORGANIZATION ROUTES ==============

@org_router.post("", response_model=OrganizationResponse)
async def create_organization(data: OrganizationCreate, user: dict = Depends(require_admin)):
    org_id = f"org_{uuid.uuid4().hex[:12]}"
    org_doc = {
        "organization_id": org_id,
        "name": data.name,
        "domain": data.domain,
        "description": data.description,
        "is_active": True,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.organizations.insert_one(org_doc)
    
    return OrganizationResponse(
        organization_id=org_id,
        name=data.name,
        domain=data.domain,
        description=data.description,
        is_active=True,
        created_at=datetime.fromisoformat(org_doc["created_at"]),
        user_count=0
    )

@org_router.get("", response_model=List[OrganizationResponse])
async def list_organizations(user: dict = Depends(require_admin)):
    orgs = await db.organizations.find({}, {"_id": 0}).to_list(1000)
    result = []
    for org in orgs:
        user_count = await db.users.count_documents({"organization_id": org["organization_id"]})
        created_at = org.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(OrganizationResponse(
            organization_id=org["organization_id"],
            name=org["name"],
            domain=org.get("domain"),
            description=org.get("description"),
            is_active=org.get("is_active", True),
            created_at=created_at,
            user_count=user_count
        ))
    return result

@org_router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(require_admin)):
    org = await db.organizations.find_one({"organization_id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    user_count = await db.users.count_documents({"organization_id": org_id})
    created_at = org.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return OrganizationResponse(
        organization_id=org["organization_id"],
        name=org["name"],
        domain=org.get("domain"),
        description=org.get("description"),
        is_active=org.get("is_active", True),
        created_at=created_at,
        user_count=user_count
    )

@org_router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: str, data: OrganizationUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.organizations.update_one(
        {"organization_id": org_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return await get_organization(org_id, user)

@org_router.delete("/{org_id}")
async def delete_organization(org_id: str, user: dict = Depends(require_super_admin)):
    result = await db.organizations.delete_one({"organization_id": org_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Unassign users from this org
    await db.users.update_many(
        {"organization_id": org_id},
        {"$set": {"organization_id": None}}
    )
    
    return {"message": "Organization deleted"}

# ============== USER MANAGEMENT ROUTES ==============

from services.email_service import send_welcome_email, send_password_reset_email, send_forgot_password_email

@user_router.post("")
async def create_user(data: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "organization_id": data.organization_id,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Send welcome email with login credentials and branding
    email_sent = await send_welcome_email(
        user_email=data.email,
        user_name=data.name,
        password=data.password,
        db=db
    )
    
    created_at = datetime.fromisoformat(user_doc["created_at"])
    
    return {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "organization_id": data.organization_id,
        "picture": None,
        "created_at": created_at.isoformat(),
        "email_sent": email_sent,
        "message": "User created successfully" + (" and welcome email sent" if email_sent else " (email not sent - check SendGrid config)")
    }

@user_router.get("", response_model=List[UserResponse])
async def list_users(
    organization_id: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {}
    if organization_id:
        query["organization_id"] = organization_id
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    result = []
    for u in users:
        created_at = u.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(UserResponse(
            user_id=u["user_id"],
            email=u["email"],
            name=u["name"],
            role=u["role"],
            organization_id=u.get("organization_id"),
            picture=u.get("picture"),
            created_at=created_at
        ))
    return result

@user_router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        organization_id=user.get("organization_id"),
        picture=user.get("picture"),
        created_at=created_at
    )

@user_router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return await get_user(user_id, admin)

@user_router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_super_admin)):
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# ============== CAMPAIGN ROUTES ==============

@campaign_router.post("", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, user: dict = Depends(require_admin)):
    campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    campaign_doc = {
        "campaign_id": campaign_id,
        "name": data.name,
        "organization_id": data.organization_id,
        "campaign_type": data.campaign_type,
        "description": data.description,
        "status": "draft",
        "start_date": data.start_date.isoformat() if data.start_date else None,
        "end_date": data.end_date.isoformat() if data.end_date else None,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.campaigns.insert_one(campaign_doc)
    
    return CampaignResponse(
        campaign_id=campaign_id,
        name=data.name,
        organization_id=data.organization_id,
        campaign_type=data.campaign_type,
        description=data.description,
        status="draft",
        start_date=data.start_date,
        end_date=data.end_date,
        created_at=datetime.fromisoformat(campaign_doc["created_at"])
    )

@campaign_router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    organization_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {}
    if organization_id:
        query["organization_id"] = organization_id
    if status:
        query["status"] = status
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).to_list(1000)
    result = []
    for c in campaigns:
        created_at = c.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        start_date = c.get("start_date")
        if start_date and isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)
        
        end_date = c.get("end_date")
        if end_date and isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date)
        
        result.append(CampaignResponse(
            campaign_id=c["campaign_id"],
            name=c["name"],
            organization_id=c["organization_id"],
            campaign_type=c["campaign_type"],
            description=c.get("description"),
            status=c.get("status", "draft"),
            start_date=start_date,
            end_date=end_date,
            created_at=created_at
        ))
    return result

@campaign_router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, user: dict = Depends(require_admin)):
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    created_at = campaign.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    start_date = campaign.get("start_date")
    if start_date and isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date)
    
    end_date = campaign.get("end_date")
    if end_date and isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date)
    
    return CampaignResponse(
        campaign_id=campaign["campaign_id"],
        name=campaign["name"],
        organization_id=campaign["organization_id"],
        campaign_type=campaign["campaign_type"],
        description=campaign.get("description"),
        status=campaign.get("status", "draft"),
        start_date=start_date,
        end_date=end_date,
        created_at=created_at
    )

@campaign_router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, data: CampaignUpdate, user: dict = Depends(require_admin)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if isinstance(v, datetime):
                update_data[k] = v.isoformat()
            else:
                update_data[k] = v
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return await get_campaign(campaign_id, user)

@campaign_router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, user: dict = Depends(require_admin)):
    result = await db.campaigns.delete_one({"campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}

# ============== TRAINING ROUTES ==============

# Default training modules
DEFAULT_MODULES = [
    {
        "module_id": "mod_phishing_email",
        "name": "Phishing Email Detection",
        "module_type": "phishing",
        "description": "Learn to identify suspicious emails, fraudulent sender addresses, and malicious links.",
        "difficulty": "medium",
        "duration_minutes": 30,
        "scenarios_count": 10
    },
    {
        "module_id": "mod_malicious_ads",
        "name": "Malicious Ad Recognition",
        "module_type": "ads",
        "description": "Spot fake advertisements, clickbait, and potentially harmful ad content.",
        "difficulty": "easy",
        "duration_minutes": 20,
        "scenarios_count": 8
    },
    {
        "module_id": "mod_social_engineering",
        "name": "Social Engineering Defense",
        "module_type": "social_engineering",
        "description": "Recognize manipulation tactics including pretexting, baiting, and impersonation.",
        "difficulty": "hard",
        "duration_minutes": 45,
        "scenarios_count": 12
    }
]

@training_router.get("/modules", response_model=List[TrainingModuleResponse])
async def list_training_modules(user: dict = Depends(get_current_user)):
    return [TrainingModuleResponse(**m) for m in DEFAULT_MODULES]

@training_router.get("/modules/{module_id}", response_model=TrainingModuleResponse)
async def get_training_module(module_id: str, user: dict = Depends(get_current_user)):
    for m in DEFAULT_MODULES:
        if m["module_id"] == module_id:
            return TrainingModuleResponse(**m)
    raise HTTPException(status_code=404, detail="Module not found")

@training_router.post("/sessions", response_model=TrainingSessionResponse)
async def start_training_session(data: TrainingSessionCreate, user: dict = Depends(get_current_user)):
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    
    # Get module info
    module = None
    for m in DEFAULT_MODULES:
        if m["module_id"] == data.module_id:
            module = m
            break
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    session_doc = {
        "session_id": session_id,
        "user_id": user["user_id"],
        "module_id": data.module_id,
        "campaign_id": data.campaign_id,
        "status": "in_progress",
        "score": 0,
        "total_questions": module["scenarios_count"],
        "correct_answers": 0,
        "current_scenario_index": 0,
        "answers": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.training_sessions.insert_one(session_doc)
    
    return TrainingSessionResponse(
        session_id=session_id,
        user_id=user["user_id"],
        module_id=data.module_id,
        campaign_id=data.campaign_id,
        status="in_progress",
        score=0,
        total_questions=module["scenarios_count"],
        correct_answers=0,
        started_at=datetime.fromisoformat(session_doc["started_at"]),
        completed_at=None
    )

@training_router.get("/sessions", response_model=List[TrainingSessionResponse])
async def list_training_sessions(user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if user.get("role") in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        query = {}  # Admins can see all
    
    sessions = await db.training_sessions.find(query, {"_id": 0}).to_list(1000)
    result = []
    for s in sessions:
        started_at = s.get("started_at")
        if isinstance(started_at, str):
            started_at = datetime.fromisoformat(started_at)
        
        completed_at = s.get("completed_at")
        if completed_at and isinstance(completed_at, str):
            completed_at = datetime.fromisoformat(completed_at)
        
        result.append(TrainingSessionResponse(
            session_id=s["session_id"],
            user_id=s["user_id"],
            module_id=s["module_id"],
            campaign_id=s.get("campaign_id"),
            status=s["status"],
            score=s.get("score", 0),
            total_questions=s.get("total_questions", 0),
            correct_answers=s.get("correct_answers", 0),
            started_at=started_at,
            completed_at=completed_at
        ))
    return result

@training_router.get("/sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permission
    if user["role"] == UserRole.TRAINEE and session["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    started_at = session.get("started_at")
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at)
    
    completed_at = session.get("completed_at")
    if completed_at and isinstance(completed_at, str):
        completed_at = datetime.fromisoformat(completed_at)
    
    return TrainingSessionResponse(
        session_id=session["session_id"],
        user_id=session["user_id"],
        module_id=session["module_id"],
        campaign_id=session.get("campaign_id"),
        status=session["status"],
        score=session.get("score", 0),
        total_questions=session.get("total_questions", 0),
        correct_answers=session.get("correct_answers", 0),
        started_at=started_at,
        completed_at=completed_at
    )

@training_router.get("/sessions/{session_id}/scenario", response_model=ScenarioResponse)
async def get_current_scenario(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")
    
    # Check if we have a cached scenario for this index
    scenario_index = session.get("current_scenario_index", 0)
    cached_scenarios = session.get("cached_scenarios", [])
    
    if scenario_index < len(cached_scenarios):
        scenario = cached_scenarios[scenario_index]
    else:
        # Generate new scenario using AI
        module_type = session["module_id"].replace("mod_", "").replace("_", " ")
        scenario = await generate_scenario(module_type, scenario_index)
        
        # Cache it
        await db.training_sessions.update_one(
            {"session_id": session_id},
            {"$push": {"cached_scenarios": scenario}}
        )
    
    return ScenarioResponse(
        scenario_id=scenario["scenario_id"],
        module_id=session["module_id"],
        scenario_type=scenario["scenario_type"],
        title=scenario["title"],
        content=scenario["content"],
        correct_answer=scenario["correct_answer"],
        explanation=scenario["explanation"],
        difficulty=scenario["difficulty"]
    )

@training_router.post("/sessions/{session_id}/answer", response_model=SubmitAnswerResponse)
async def submit_answer(session_id: str, data: SubmitAnswerRequest, user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")
    
    scenario_index = session.get("current_scenario_index", 0)
    cached_scenarios = session.get("cached_scenarios", [])
    
    if scenario_index >= len(cached_scenarios):
        raise HTTPException(status_code=400, detail="No scenario to answer")
    
    scenario = cached_scenarios[scenario_index]
    is_correct = data.answer.lower() == scenario["correct_answer"].lower()
    
    # Update session
    new_correct = session.get("correct_answers", 0) + (1 if is_correct else 0)
    new_index = scenario_index + 1
    total_questions = session.get("total_questions", 10)
    new_score = int((new_correct / total_questions) * 100)
    
    update_data = {
        "correct_answers": new_correct,
        "current_scenario_index": new_index,
        "score": new_score
    }
    
    # Check if session is complete
    if new_index >= total_questions:
        update_data["status"] = "completed"
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.training_sessions.update_one(
        {"session_id": session_id},
        {
            "$set": update_data,
            "$push": {"answers": {
                "scenario_id": data.scenario_id,
                "answer": data.answer,
                "correct": is_correct
            }}
        }
    )
    
    return SubmitAnswerResponse(
        correct=is_correct,
        correct_answer=scenario["correct_answer"],
        explanation=scenario["explanation"],
        score=new_score
    )

async def generate_scenario(module_type: str, index: int) -> dict:
    """Generate a training scenario - tries custom DB scenarios first, then AI, then templates"""
    scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
    
    # Map module types to scenario types
    type_mapping = {
        "phishing email": "phishing_email",
        "malicious ads": "malicious_ads",
        "social engineering": "social_engineering",
    }
    mapped_type = type_mapping.get(module_type.lower(), module_type.replace(" ", "_"))
    
    # First, try to get custom scenarios from database
    try:
        custom_scenarios = await db.scenarios.find(
            {"scenario_type": mapped_type, "is_active": True},
            {"_id": 0}
        ).to_list(100)
        
        if custom_scenarios:
            # Use custom scenario based on index (cycle through them)
            scenario = custom_scenarios[index % len(custom_scenarios)]
            return {
                "scenario_id": scenario.get("scenario_id", scenario_id),
                "scenario_type": scenario["scenario_type"],
                "title": scenario["title"],
                "content": scenario["content"],
                "correct_answer": scenario["correct_answer"],
                "explanation": scenario["explanation"],
                "difficulty": scenario["difficulty"]
            }
    except Exception as e:
        logging.warning(f"Failed to fetch custom scenarios: {e}")
    
    # Try AI generation with OpenAI API (optional - set OPENAI_API_KEY in .env)
    openai_key = os.environ.get('OPENAI_API_KEY')
    if openai_key:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=openai_key)
            
            response = await client.chat.completions.create(
                model=os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
                messages=[
                    {"role": "system", "content": """You are a cybersecurity training content generator. Generate realistic but clearly educational scenarios.
Return JSON with: title, content (object with fields depending on type), correct_answer (safe/unsafe), explanation, difficulty (easy/medium/hard).
For phishing_email: content should have from, to, subject, body, links (array)
For malicious_ads: content should have headline, description, image_url, call_to_action, destination_url
For social_engineering: content should have scenario_description, dialogue (array of messages), requested_action"""},
                    {"role": "user", "content": f"Generate a {module_type} training scenario #{index + 1}. Make it realistic but educational. Return ONLY valid JSON."}
                ],
                temperature=0.8
            )
            
            import json
            content = response.choices[0].message.content
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                scenario_data = json.loads(content[json_start:json_end])
                return {
                    "scenario_id": scenario_id,
                    "scenario_type": module_type.replace(" ", "_"),
                    "title": scenario_data.get("title", f"Scenario {index + 1}"),
                    "content": scenario_data.get("content", {}),
                    "correct_answer": scenario_data.get("correct_answer", "unsafe"),
                    "explanation": scenario_data.get("explanation", "Always verify before clicking."),
                    "difficulty": scenario_data.get("difficulty", "medium")
                }
        except Exception as e:
            logging.warning(f"OpenAI generation failed: {e}")
    
    # Fallback to template scenarios (works without any API key)
    return get_template_scenario(module_type, index, scenario_id)

def get_template_scenario(module_type: str, index: int, scenario_id: str) -> dict:
    """Get a predefined template scenario"""
    templates = {
        "phishing email": [
            {
                "title": "Urgent: Your Account Has Been Compromised",
                "content": {
                    "from": "security@amaz0n-support.com",
                    "to": "user@company.com",
                    "subject": "URGENT: Suspicious Activity Detected - Action Required",
                    "body": "Dear Valued Customer,\n\nWe detected unusual login activity on your account. Your account will be suspended in 24 hours unless you verify your identity.\n\nClick here to verify: http://amaz0n-secure-verify.com/login\n\nAmazon Security Team",
                    "links": ["http://amaz0n-secure-verify.com/login"]
                },
                "correct_answer": "unsafe",
                "explanation": "This is a phishing attempt. Notice: 1) The sender domain 'amaz0n-support.com' uses a zero instead of 'o'. 2) The link goes to a fake domain. 3) Legitimate companies don't threaten immediate account suspension via email.",
                "difficulty": "easy"
            },
            {
                "title": "Invoice Payment Required",
                "content": {
                    "from": "billing@company-invoices.net",
                    "to": "accounting@yourcompany.com",
                    "subject": "Invoice #INV-2024-8823 Payment Due",
                    "body": "Please find attached the invoice for services rendered.\n\nAmount Due: $4,832.00\nDue Date: Immediate\n\nTo avoid late fees, please process payment using the attached form.\n\nBest regards,\nAccounts Receivable",
                    "links": ["attachment: payment_form.exe"]
                },
                "correct_answer": "unsafe",
                "explanation": "This is a Business Email Compromise (BEC) attempt. Red flags: 1) Unknown sender domain. 2) Urgency tactics. 3) Executable file attachment (.exe). Never open executable attachments from unknown sources.",
                "difficulty": "medium"
            },
            {
                "title": "IT Department Password Reset",
                "content": {
                    "from": "it-helpdesk@yourcompany.com",
                    "to": "employee@yourcompany.com",
                    "subject": "Scheduled Password Reset Required",
                    "body": "Hello,\n\nAs part of our quarterly security update, all employees must reset their passwords by Friday.\n\nPlease visit the IT portal at https://intranet.yourcompany.com/password-reset to complete this process.\n\nIf you have questions, contact the help desk at ext. 4500.\n\nIT Security Team",
                    "links": ["https://intranet.yourcompany.com/password-reset"]
                },
                "correct_answer": "safe",
                "explanation": "This appears to be a legitimate internal IT communication. The email comes from the correct company domain, the link points to the company intranet, and it provides a verifiable contact method (extension number).",
                "difficulty": "medium"
            }
        ],
        "malicious ads": [
            {
                "title": "Free iPhone Giveaway",
                "content": {
                    "headline": "CONGRATULATIONS! You're the 1,000,000th Visitor!",
                    "description": "Click NOW to claim your FREE iPhone 15 Pro! Limited time offer - Only 3 remaining!",
                    "image_url": "/placeholder-iphone.jpg",
                    "call_to_action": "CLAIM NOW!!!",
                    "destination_url": "http://free-prizes-winner.xyz/claim"
                },
                "correct_answer": "unsafe",
                "explanation": "Classic scam ad indicators: 1) Too good to be true offer. 2) False urgency ('Only 3 remaining'). 3) Suspicious domain (.xyz). 4) Excessive punctuation and ALL CAPS. Legitimate companies don't give away expensive products this way.",
                "difficulty": "easy"
            },
            {
                "title": "Software Update Available",
                "content": {
                    "headline": "Your Flash Player is Out of Date!",
                    "description": "Critical security update required. Your system may be at risk. Download the latest version now.",
                    "image_url": "/placeholder-warning.jpg",
                    "call_to_action": "Update Now",
                    "destination_url": "http://flashplayer-updates.com/download"
                },
                "correct_answer": "unsafe",
                "explanation": "Fake software update scam. Red flags: 1) Adobe Flash Player was discontinued in 2020. 2) Legitimate updates come through official channels, not ads. 3) The domain is not official. Never download software from ads.",
                "difficulty": "medium"
            },
            {
                "title": "Cloud Storage Upgrade",
                "content": {
                    "headline": "Upgrade Your Google Drive Storage",
                    "description": "Running low on storage? Get 15% off annual Google One plans. Secure cloud backup for all your files.",
                    "image_url": "/google-one-logo.jpg",
                    "call_to_action": "See Plans",
                    "destination_url": "https://one.google.com/storage"
                },
                "correct_answer": "safe",
                "explanation": "This appears to be a legitimate Google advertisement. The link goes to the official Google One domain, the offer is reasonable (not free), and there's no false urgency. Always verify the destination URL before clicking.",
                "difficulty": "hard"
            }
        ],
        "social engineering": [
            {
                "title": "The Helpful IT Technician",
                "content": {
                    "scenario_description": "You receive a phone call at your desk.",
                    "dialogue": [
                        {"speaker": "Caller", "message": "Hi, this is Mike from IT. We're doing emergency maintenance on the email server and need to verify your credentials to restore your mailbox."},
                        {"speaker": "You", "message": "Oh, okay. What do you need?"},
                        {"speaker": "Caller", "message": "I just need your username and password so I can test your account access. It'll only take a minute."}
                    ],
                    "requested_action": "Provide your login credentials"
                },
                "correct_answer": "unsafe",
                "explanation": "This is a pretexting attack. IT departments NEVER ask for passwords over the phone. Legitimate IT can reset passwords or test systems without your credentials. Always verify by calling IT directly using a known number.",
                "difficulty": "easy"
            },
            {
                "title": "The Urgent Executive Request",
                "content": {
                    "scenario_description": "You receive an urgent text message.",
                    "dialogue": [
                        {"speaker": "Message (CEO Name)", "message": "Hey, I'm in a meeting but need you to buy some gift cards for a client appreciation event. Can you get 5x $200 Amazon cards and text me the codes? I'll reimburse you. Very urgent."}
                    ],
                    "requested_action": "Purchase gift cards and send codes"
                },
                "correct_answer": "unsafe",
                "explanation": "This is a CEO fraud/gift card scam - one of the most common social engineering attacks. Red flags: 1) Unusual request via text. 2) Urgency and pressure. 3) Gift cards as payment. Always verify such requests through official channels.",
                "difficulty": "medium"
            },
            {
                "title": "Tailgating Attempt",
                "content": {
                    "scenario_description": "You're entering your office building and someone behind you is carrying multiple boxes.",
                    "dialogue": [
                        {"speaker": "Person", "message": "Hey, could you hold the door? My hands are full and I left my badge in the car. I'm from the 3rd floor - accounting department."}
                    ],
                    "requested_action": "Hold the door open for them"
                },
                "correct_answer": "unsafe",
                "explanation": "This is a tailgating/piggybacking attempt - physical social engineering to bypass security. Even if they seem legitimate, you should: 1) Politely decline. 2) Offer to call security to escort them. 3) Never hold secure doors for unbadged individuals.",
                "difficulty": "medium"
            }
        ]
    }
    
    scenarios = templates.get(module_type, templates["phishing email"])
    scenario = scenarios[index % len(scenarios)]
    
    return {
        "scenario_id": scenario_id,
        "scenario_type": module_type.replace(" ", "_"),
        **scenario
    }

# ============== AI ROUTES ==============

@ai_router.post("/generate", response_model=AIGenerateResponse)
async def generate_ai_content(data: AIGenerateRequest, user: dict = Depends(require_admin)):
    """Generate AI-powered training content"""
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        raise HTTPException(status_code=500, detail="AI not configured. Set OPENAI_API_KEY in .env or use template scenarios.")
    
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=openai_key)
        
        response = await client.chat.completions.create(
            model=os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
            messages=[
                {"role": "system", "content": "You are a cybersecurity training content generator. Create realistic but educational scenarios. Return JSON only with: content (object), correct_answer (safe/unsafe), explanation."},
                {"role": "user", "content": f"Generate a {data.difficulty} difficulty {data.scenario_type} scenario for cybersecurity training. Context: {data.context or 'General corporate environment'}. Return ONLY valid JSON."}
            ],
            temperature=0.8
        )
        
        import json
        content = response.choices[0].message.content
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(content[json_start:json_end])
            return AIGenerateResponse(
                content=result.get("content", {}),
                correct_answer=result.get("correct_answer", "unsafe"),
                explanation=result.get("explanation", "Review the scenario carefully.")
            )
        
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logging.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ============== ANALYTICS ROUTES ==============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(require_admin)):
    total_orgs = await db.organizations.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Count all campaign types
    phishing_campaigns = await db.phishing_campaigns.count_documents({})
    ad_campaigns = await db.ad_campaigns.count_documents({})
    total_campaigns = phishing_campaigns + ad_campaigns
    
    # Active campaigns
    active_phishing = await db.phishing_campaigns.count_documents({"status": "active"})
    active_ads = await db.ad_campaigns.count_documents({"status": "active"})
    active_campaigns = active_phishing + active_ads
    
    total_sessions = await db.training_sessions.count_documents({})
    
    # Calculate average score
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
    ]
    result = await db.training_sessions.aggregate(pipeline).to_list(1)
    avg_score = result[0]["avg_score"] if result else 0
    
    return DashboardStats(
        total_organizations=total_orgs,
        total_users=total_users,
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_training_sessions=total_sessions,
        average_score=round(avg_score, 1) if avg_score else 0
    )

@api_router.get("/analytics/training")
async def get_training_analytics(
    organization_id: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    match_stage = {}
    if organization_id:
        # Get users in org
        users = await db.users.find({"organization_id": organization_id}, {"user_id": 1}).to_list(1000)
        user_ids = [u["user_id"] for u in users]
        match_stage["user_id"] = {"$in": user_ids}
    
    # Sessions by module
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$group": {
            "_id": "$module_id",
            "total_sessions": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "avg_score": {"$avg": {"$cond": [{"$eq": ["$status", "completed"]}, "$score", None]}}
        }}
    ]
    
    by_module = await db.training_sessions.aggregate(pipeline).to_list(100)
    
    # Recent activity
    recent = await db.training_sessions.find(
        match_stage,
        {"_id": 0}
    ).sort("started_at", -1).limit(10).to_list(10)
    
    return {
        "by_module": by_module,
        "recent_sessions": recent
    }

@api_router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = 30,
    user: dict = Depends(require_admin)
):
    """Get comprehensive analytics overview for the Advanced Analytics page"""
    from datetime import timedelta
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Count phishing campaigns
    phishing_campaigns = await db.phishing_campaigns.count_documents({})
    phishing_active = await db.phishing_campaigns.count_documents({"status": "active"})
    
    # Count ad campaigns
    ad_campaigns = await db.ad_campaigns.count_documents({})
    ad_active = await db.ad_campaigns.count_documents({"status": "active"})
    
    # Get phishing stats
    phishing_targets = await db.phishing_targets.find({}).to_list(10000)
    total_sent = len(phishing_targets)
    total_opened = sum(1 for t in phishing_targets if t.get("opened_at"))
    total_clicked = sum(1 for t in phishing_targets if t.get("clicked_at"))
    total_submitted = sum(1 for t in phishing_targets if t.get("submitted_at"))
    
    # Get ad stats
    ad_targets = await db.ad_targets.find({}).to_list(10000)
    ads_viewed = sum(1 for t in ad_targets if t.get("viewed_at"))
    ads_clicked = sum(1 for t in ad_targets if t.get("clicked_at"))
    
    # Training stats
    training_sessions = await db.training_sessions.count_documents({})
    training_completed = await db.training_sessions.count_documents({"status": "completed"})
    
    return {
        "campaigns_launched": phishing_campaigns + ad_campaigns,
        "active_campaigns": phishing_active + ad_active,
        "emails_sent": total_sent,
        "emails_opened": total_opened,
        "links_clicked": total_clicked + ads_clicked,
        "credentials_submitted": total_submitted,
        "ads_viewed": ads_viewed,
        "ads_clicked": ads_clicked,
        "training_sessions": training_sessions,
        "training_completed": training_completed,
        "period_days": days
    }

@api_router.get("/phishing/stats")
async def get_phishing_stats(
    days: int = 30,
    user: dict = Depends(require_admin)
):
    """Get detailed phishing statistics for analytics"""
    from datetime import timedelta
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Count campaigns
    total_campaigns = await db.phishing_campaigns.count_documents({})
    active_campaigns = await db.phishing_campaigns.count_documents({"status": "active"})
    completed_campaigns = await db.phishing_campaigns.count_documents({"status": "completed"})
    
    # Get all targets for stats calculation
    targets = await db.phishing_targets.find({}).to_list(10000)
    
    total_sent = len(targets)
    total_opened = sum(1 for t in targets if t.get("opened_at"))
    total_clicked = sum(1 for t in targets if t.get("clicked_at"))
    total_submitted = sum(1 for t in targets if t.get("submitted_at"))
    
    # Calculate rates
    open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
    click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0
    submission_rate = (total_submitted / total_sent * 100) if total_sent > 0 else 0
    
    # Click to open rate
    click_to_open_rate = (total_clicked / total_opened * 100) if total_opened > 0 else 0
    
    return {
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "completed_campaigns": completed_campaigns,
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "total_submitted": total_submitted,
        "open_rate": round(open_rate, 2),
        "click_rate": round(click_rate, 2),
        "submission_rate": round(submission_rate, 2),
        "click_to_open_rate": round(click_to_open_rate, 2),
        "period_days": days
    }

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Vasilis NetShield API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    """Check if API and database are working"""
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "message": "Vasilis NetShield API is running"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

# Import phishing routes
from routes.phishing import router as phishing_router
from routes.export import router as export_router
from routes.certificates import router as certificates_router
from routes.user_import import router as import_router
from routes.ads import router as ads_router
from routes.scenarios import router as scenarios_router
from routes.settings import router as settings_router
from routes.content import router as content_router
from routes.pages import router as pages_router
from routes.security import router as security_router, init_security_routes
from routes.email_templates import router as email_templates_router, init_email_templates_routes
from routes.certificate_templates import router as certificate_templates_router
from routes.landing_layouts import router as landing_layouts_router
from routes.inquiries import router as inquiries_router
from routes.media import router as media_router
from routes.sidebar import router as sidebar_router

# Initialize security routes with dependencies
init_security_routes(db, require_super_admin, audit_logger, account_lockout)

# Initialize email templates routes
init_email_templates_routes(db, require_admin)

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(org_router)
api_router.include_router(user_router)
api_router.include_router(campaign_router)
api_router.include_router(training_router)
api_router.include_router(ai_router)
api_router.include_router(phishing_router)
api_router.include_router(export_router)
api_router.include_router(certificates_router)
api_router.include_router(import_router)
api_router.include_router(ads_router)
api_router.include_router(scenarios_router)
api_router.include_router(settings_router)
api_router.include_router(content_router)
api_router.include_router(pages_router)
api_router.include_router(security_router)
api_router.include_router(email_templates_router)
api_router.include_router(certificate_templates_router)
api_router.include_router(landing_layouts_router)
api_router.include_router(inquiries_router)
api_router.include_router(media_router)
api_router.include_router(sidebar_router)

# ============== PUBLIC TRACKING ROUTE (Masked URL) ==============
# This route provides a clean, masked URL for ad tracking
# URL format: /api/track/{campaign_id}?u={user_tracking_code}

@api_router.get("/track/{campaign_id}")
async def public_masked_tracking(campaign_id: str, u: str = None, request: Request = None):
    """
    Public-facing masked tracking URL for ad campaigns.
    Renders the ad directly or shows info page if no tracking code.
    """
    if not u:
        # For direct campaign links without user tracking, show a generic page
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Security Training</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #0f0f15;
                    color: #E8DDB5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .container {
                    padding: 40px;
                    border: 1px solid #D4A83633;
                    border-radius: 8px;
                    background: #161B22;
                }
                h1 { color: #D4A836; margin-bottom: 16px; }
                p { color: #9CA3AF; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Security Awareness Training</h1>
                <p>This tracking link requires a valid user parameter.</p>
                <p>Please use the link provided in your campaign email.</p>
            </div>
        </body>
        </html>
        """)
    
    # Find target by tracking code
    target = await db.ad_targets.find_one({"tracking_code": u}, {"_id": 0})
    if not target:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Link</title>
        <style>
            body { font-family: Arial; background: #0f0f15; color: #E8DDB5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { padding: 40px; background: #161B22; border-radius: 8px; text-align: center; }
            h1 { color: #D4A836; }
        </style>
        </head>
        <body><div class="container"><h1>Invalid Tracking Link</h1><p>This link is no longer valid.</p></div></body>
        </html>
        """, status_code=404)
    
    # Verify campaign matches
    if target["campaign_id"] != campaign_id:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Link</title>
        <style>
            body { font-family: Arial; background: #0f0f15; color: #E8DDB5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { padding: 40px; background: #161B22; border-radius: 8px; text-align: center; }
            h1 { color: #D4A836; }
        </style>
        </head>
        <body><div class="container"><h1>Invalid Tracking Link</h1><p>This link does not match the campaign.</p></div></body>
        </html>
        """, status_code=404)
    
    # Get campaign and template
    campaign = await db.ad_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    template = await db.ad_templates.find_one({"template_id": campaign["template_id"]}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Record view (only first time)
    if not target.get("ad_viewed"):
        await db.ad_targets.update_one(
            {"tracking_code": u},
            {
                "$set": {
                    "ad_viewed": True,
                    "ad_viewed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        await db.ad_campaigns.update_one(
            {"campaign_id": campaign_id},
            {"$inc": {"ads_viewed": 1}}
        )
    
    # Generate click URL
    click_url = f"/api/ads/track/click/{u}"
    style = template.get("style_css", "background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #E8DDB5;")
    
    # Render the ad
    ad_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{template.get('headline', 'Special Offer')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: Arial, sans-serif;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #0f0f15;
                padding: 20px;
            }}
            .ad-container {{
                {style}
                padding: 40px;
                text-align: center;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                cursor: pointer;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                transition: transform 0.2s ease;
            }}
            .ad-container:hover {{
                transform: scale(1.02);
            }}
            .ad-headline {{ 
                font-size: 28px; 
                font-weight: bold; 
                margin-bottom: 15px;
                line-height: 1.3;
            }}
            .ad-description {{ 
                font-size: 16px; 
                margin-bottom: 25px;
                opacity: 0.9;
                line-height: 1.5;
            }}
            .ad-cta {{
                display: inline-block;
                padding: 15px 35px;
                background: #D4A836;
                color: #000;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                text-decoration: none;
                transition: background 0.2s ease;
            }}
            .ad-cta:hover {{ 
                background: #C49A30;
            }}
        </style>
    </head>
    <body>
        <div class="ad-container" onclick="window.location.href='{click_url}'">
            <div class="ad-headline">{template.get('headline', 'Special Offer!')}</div>
            <div class="ad-description">{template.get('description', 'Click to learn more about this special offer.')}</div>
            <a href="{click_url}" class="ad-cta">{template.get('call_to_action', 'Learn More')}</a>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=ad_html)

app.include_router(api_router)

# CORS - Tighten origins for production
cors_origins = os.environ.get('CORS_ORIGINS', '*')
if cors_origins == '*':
    # Allow all for development, but log warning
    logger.warning("CORS is set to allow all origins (*). Tighten this in production!")
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize audit logger with database connection"""
    global audit_logger
    audit_logger.db = db
    logger.info("Audit logger initialized with database connection")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============== CRON ENDPOINTS ==============
# These endpoints are designed to be called by Vercel Cron Jobs or similar schedulers

@api_router.get("/cron/check-scheduled-campaigns")
async def cron_check_scheduled_campaigns():
    """
    Cron endpoint to check and launch scheduled phishing/ad campaigns.
    Call this endpoint every 5-15 minutes via a cron job.
    
    Vercel Cron example (vercel.json):
    {
      "crons": [{
        "path": "/api/cron/check-scheduled-campaigns",
        "schedule": "*/15 * * * *"
      }]
    }
    """
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc)
    launched_campaigns = []
    
    # Check phishing campaigns
    phishing_campaigns = await db.phishing_campaigns.find({
        "status": "scheduled",
        "scheduled_at": {"$lte": now.isoformat()}
    }).to_list(100)
    
    for campaign in phishing_campaigns:
        await db.phishing_campaigns.update_one(
            {"campaign_id": campaign["campaign_id"]},
            {"$set": {"status": "active", "started_at": now.isoformat()}}
        )
        launched_campaigns.append({"type": "phishing", "id": campaign["campaign_id"], "name": campaign.get("name")})
    
    # Check ad campaigns
    ad_campaigns = await db.ad_campaigns.find({
        "status": "scheduled",
        "scheduled_at": {"$lte": now.isoformat()}
    }).to_list(100)
    
    for campaign in ad_campaigns:
        await db.ad_campaigns.update_one(
            {"campaign_id": campaign["campaign_id"]},
            {"$set": {"status": "active", "started_at": now.isoformat()}}
        )
        launched_campaigns.append({"type": "ad", "id": campaign["campaign_id"], "name": campaign.get("name")})
    
    return {
        "message": f"Checked scheduled campaigns at {now.isoformat()}",
        "launched": len(launched_campaigns),
        "campaigns": launched_campaigns
    }


@api_router.get("/cron/check-password-expiry")
async def cron_check_password_expiry():
    """
    Cron endpoint to check for expiring passwords and send reminder emails.
    Call this endpoint daily via a cron job.
    
    Vercel Cron example (vercel.json):
    {
      "crons": [{
        "path": "/api/cron/check-password-expiry",
        "schedule": "0 9 * * *"
      }]
    }
    """
    from datetime import datetime, timezone, timedelta
    from services.email_service import send_password_expiry_reminder
    
    # Get password policy
    policy = await db.settings.find_one({"type": "password_policy"}, {"_id": 0})
    expiry_days = policy.get("password_expiry_days", 0) if policy else 0
    reminder_days = policy.get("expiry_reminder_days", 7) if policy else 7
    
    if expiry_days == 0:
        return {"message": "Password expiry is disabled", "reminders_sent": 0}
    
    now = datetime.now(timezone.utc)
    reminder_threshold = now + timedelta(days=reminder_days)
    
    # Find users whose passwords are about to expire
    users_to_notify = []
    
    # Get all users and check their password_changed_at
    users = await db.users.find(
        {"is_active": True},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "password_changed_at": 1, "created_at": 1}
    ).to_list(1000)
    
    for user in users:
        # Use password_changed_at or created_at as the base date
        base_date_str = user.get("password_changed_at") or user.get("created_at")
        if not base_date_str:
            continue
        
        try:
            base_date = datetime.fromisoformat(base_date_str.replace('Z', '+00:00'))
            if base_date.tzinfo is None:
                base_date = base_date.replace(tzinfo=timezone.utc)
            
            expiry_date = base_date + timedelta(days=expiry_days)
            days_until_expiry = (expiry_date - now).days
            
            # Send reminder if within reminder window and not already expired
            if 0 < days_until_expiry <= reminder_days:
                users_to_notify.append({
                    "user": user,
                    "days_remaining": days_until_expiry
                })
        except Exception as e:
            logger.error(f"Error processing user {user.get('email')}: {e}")
            continue
    
    # Send reminder emails
    reminders_sent = 0
    for item in users_to_notify:
        try:
            sent = await send_password_expiry_reminder(
                user_email=item["user"]["email"],
                user_name=item["user"]["name"],
                days_remaining=item["days_remaining"],
                db=db
            )
            if sent:
                reminders_sent += 1
        except Exception as e:
            logger.error(f"Failed to send expiry reminder to {item['user']['email']}: {e}")
    
    return {
        "message": f"Password expiry check completed at {now.isoformat()}",
        "policy": {"expiry_days": expiry_days, "reminder_days": reminder_days},
        "users_checked": len(users),
        "reminders_sent": reminders_sent
    }



# ============== SITEMAP ENDPOINT ==============
@api_router.get("/sitemap.xml")
async def get_sitemap():
    """Generate dynamic sitemap.xml for SEO"""
    from datetime import datetime
    
    base_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
    now = datetime.now().strftime("%Y-%m-%d")
    
    # Static pages
    pages = [
        {"url": "/", "priority": "1.0", "changefreq": "weekly"},
        {"url": "/blog", "priority": "0.8", "changefreq": "daily"},
        {"url": "/news", "priority": "0.8", "changefreq": "daily"},
        {"url": "/videos", "priority": "0.7", "changefreq": "weekly"},
        {"url": "/about", "priority": "0.6", "changefreq": "monthly"},
    ]
    
    # Get blog posts
    try:
        blog_posts = await db.blog_posts.find(
            {"published": True},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).to_list(100)
        
        for post in blog_posts:
            pages.append({
                "url": f"/blog/{post['slug']}",
                "priority": "0.7",
                "changefreq": "monthly",
                "lastmod": post.get("updated_at", now)[:10] if post.get("updated_at") else now
            })
    except:
        pass
    
    # Build XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for page in pages:
        xml_content += "  <url>\n"
        xml_content += f"    <loc>{base_url}{page['url']}</loc>\n"
        xml_content += f"    <lastmod>{page.get('lastmod', now)}</lastmod>\n"
        xml_content += f"    <changefreq>{page['changefreq']}</changefreq>\n"
        xml_content += f"    <priority>{page['priority']}</priority>\n"
        xml_content += "  </url>\n"
    
    xml_content += "</urlset>"
    
    return Response(content=xml_content, media_type="application/xml")
