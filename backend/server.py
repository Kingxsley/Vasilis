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
import pyotp

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
    # Optional two-factor authentication code. Required for admins with 2FA enabled.
    two_factor_code: Optional[str] = None

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

# Two-Factor Auth models
class TwoFactorSetupResponse(BaseModel):
    secret: str
    otp_auth_url: str

class TwoFactorVerifyRequest(BaseModel):
    code: str

# Organization Models
class OrganizationCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    # Optional certificate template to assign by default when creating a new organization.
    certificate_template_id: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # Allow administrators to specify a default certificate template for the organization.
    # When set, this template will be used when generating completion
    # certificates for users belonging to the organization. If omitted,
    # the system will fall back to a module-level template or the global
    # default.
    certificate_template_id: Optional[str] = None
    # Discord webhook URL for organization-specific notifications
    discord_webhook_url: Optional[str] = None

class OrganizationResponse(BaseModel):
    organization_id: str
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    user_count: int = 0
    # The certificate template assigned to this organization.  When present,
    # certificates generated for users in the organization will be rendered
    # using this template.  If null, the platform will choose a module-level
    # template or use the global default.
    certificate_template_id: Optional[str] = None
    # Discord webhook URL for organization notifications
    discord_webhook_url: Optional[str] = None

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
    scenarios_count: int = 0
    scenarios: Optional[List[str]] = None
    questions: Optional[List[dict]] = None
    questions_per_session: Optional[int] = None
    certificate_template_id: Optional[str] = None
    is_active: bool = True

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
    current_scenario_index: int = 0
    answers: Optional[List[dict]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

# --- Additional models for module management and reassigning training ---
class TrainingModuleCreate(BaseModel):
    name: str
    module_type: str
    description: str
    difficulty: str
    duration_minutes: int
    scenarios_count: int = 0
    scenarios: Optional[List[str]] = None
    questions: Optional[List[dict]] = None
    questions_per_session: Optional[int] = None  # Number of questions to show per session (random selection)
    certificate_template_id: Optional[str] = None
    is_active: bool = True

class TrainingModuleUpdate(BaseModel):
    name: Optional[str] = None
    module_type: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    scenarios_count: Optional[int] = None
    scenarios: Optional[List[str]] = None
    questions: Optional[List[dict]] = None
    questions_per_session: Optional[int] = None
    certificate_template_id: Optional[str] = None
    is_active: Optional[bool] = None

class TrainingReassignRequest(BaseModel):
    """
    Payload for reassigning one or more training modules to multiple users.
    When `module_ids` is empty or omitted, all active modules will be
    reassigned.  This is primarily used by super admins or organization
    admins to assign remedial training after phishing campaign clicks.
    """
    user_ids: List[str]
    module_ids: Optional[List[str]] = None

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
    total_scenarios: int = 0
    scenario_types: dict = {}

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

# Added placeholder comment for TOTp integration

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
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Initialize last_login to created_at so new users count as active
        "last_login": datetime.now(timezone.utc).isoformat()
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
            # Send email notification to admins about the lockout
            try:
                from services.email_service import send_account_lockout_notification
                # Get all super_admin emails
                admin_users = await db.users.find(
                    {"role": "super_admin", "is_active": True}, 
                    {"_id": 0, "email": 1}
                ).to_list(50)
                admin_emails = [u["email"] for u in admin_users]
                if admin_emails:
                    await send_account_lockout_notification(
                        admin_emails=admin_emails,
                        locked_email=data.email,
                        ip_address=client_ip,
                        lockout_duration=15,
                        db=db
                    )
            except Exception as e:
                logger.error(f"Failed to send lockout notification: {e}")
            
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
    
    # Clear failed attempts on successful password verification
    account_lockout.clear_attempts(data.email)

    # Fetch global security settings to determine if 2FA is required for all users
    try:
        security_settings = await db.settings.find_one({"type": "security"}, {"force_2fa": 1})
        force_2fa = security_settings.get("force_2fa", False) if security_settings else False
    except Exception:
        force_2fa = False

    # If 2FA is enforced and the user hasn't enabled it, deny access
    if force_2fa and not user.get("two_factor_enabled"):
        await audit_logger.log(
            action="login_failed_2fa_required",
            user_email=data.email,
            ip_address=client_ip,
            severity="warning"
        )
        raise HTTPException(status_code=403, detail="Two-factor authentication is required. Please enable 2FA to continue.")

    # If user has two-factor authentication enabled, verify code
    if user.get("two_factor_enabled"):
        # A two-factor code must be provided
        if not data.two_factor_code:
            await audit_logger.log(
                action="login_failed_missing_2fa",
                user_email=data.email,
                ip_address=client_ip,
                severity="warning"
            )
            raise HTTPException(status_code=403, detail="Two-factor authentication code required")
        secret = user.get("two_factor_secret")
        if not secret:
            logger.error(f"User {user['user_id']} has 2FA enabled but no secret stored")
            raise HTTPException(status_code=500, detail="Two-factor authentication misconfigured")
        try:
            totp = pyotp.TOTP(secret)
            # verify returns True if the code is valid for current window (30s)
            if not totp.verify(data.two_factor_code, valid_window=1):
                await audit_logger.log(
                    action="login_failed_invalid_2fa",
                    user_email=data.email,
                    ip_address=client_ip,
                    severity="warning"
                )
                raise HTTPException(status_code=401, detail="Invalid two-factor authentication code")
        except Exception as e:
            logger.error(f"2FA verification error for {user['user_id']}: {e}")
            raise HTTPException(status_code=500, detail="Two-factor verification failed")
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
    # Log successful login
    await audit_logger.log(
        action="login_success",
        user_id=user["user_id"],
        user_email=user["email"],
        ip_address=client_ip,
        severity="info"
    )

    # Update last_login timestamp
    try:
        now_ts = datetime.now(timezone.utc)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"last_login": now_ts.isoformat()}}
        )
    except Exception as e:
        logger.error(f"Failed to update last_login for user {user['user_id']}: {e}")

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
        # Update user info and last_login timestamp.  If last_login is missing, set it to now
        now_ts = datetime.now(timezone.utc)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_ts.isoformat()}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_count = await db.users.count_documents({})
        role = UserRole.SUPER_ADMIN if user_count == 0 else UserRole.TRAINEE
        now_ts = datetime.now(timezone.utc)
        
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": None,
            "role": role,
            "organization_id": None,
            "picture": picture,
            "is_active": True,
            "created_at": now_ts.isoformat(),
            # Initialize last_login to created time so new users count as active
            "last_login": now_ts.isoformat()
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

# ==================== TWO-FACTOR AUTHENTICATION ====================

@auth_router.post("/two-factor/setup", response_model=TwoFactorSetupResponse)
async def two_factor_setup(current_user: dict = Depends(get_current_user)):
    """
        Setup two-factor authentication (TOTP) for the current user.
        Generates a secret and returns an otpauth URL for scanning. Users must
    complete verification via /two-factor/verify to enable 2FA.
    """
    # If already enabled, don't regenerate
    if current_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled")
    # Generate secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otp_auth_url = totp.provisioning_uri(name=current_user.get("email"), issuer_name="VasilisNetShield")
    # Store secret and disable flag until verified
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"two_factor_secret": secret, "two_factor_enabled": False}}
    )
    return TwoFactorSetupResponse(secret=secret, otp_auth_url=otp_auth_url)


@auth_router.post("/two-factor/verify")
async def two_factor_verify(data: TwoFactorVerifyRequest, current_user: dict = Depends(get_current_user)):
    """
    Verify a TOTP code for two-factor authentication setup.
    After successful verification, 2FA will be enabled for the current user.
    """
    secret = current_user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Two-factor setup not initiated")
    try:
        totp = pyotp.TOTP(secret)
        if not totp.verify(data.code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid two-factor code")
    except Exception:
        raise HTTPException(status_code=500, detail="Two-factor verification failed")
    # Enable 2FA
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"two_factor_enabled": True}}
    )
    return {"message": "Two-factor authentication enabled successfully"}

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
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Assign the provided certificate template if specified; otherwise
        # leave as None so the platform will fall back to module-level or
        # global default templates when generating certificates.
        "certificate_template_id": data.certificate_template_id
    }
    await db.organizations.insert_one(org_doc)
    
    return OrganizationResponse(
        organization_id=org_id,
        name=data.name,
        domain=data.domain,
        description=data.description,
        is_active=True,
        created_at=datetime.fromisoformat(org_doc["created_at"]),
        user_count=0,
        certificate_template_id=org_doc["certificate_template_id"]
    )

@org_router.get("", response_model=List[OrganizationResponse])
async def list_organizations(user: dict = Depends(require_admin)):
    # Org admins can only see their own organization
    if user.get("role") == "org_admin":
        if not user.get("organization_id"):
            return []
        query = {"organization_id": user["organization_id"]}
    else:
        query = {}
    
    orgs = await db.organizations.find(query, {"_id": 0}).to_list(1000)
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
            user_count=user_count,
            certificate_template_id=org.get("certificate_template_id")
        ))
    return result

@org_router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(require_admin)):
    # Org admins can only view their own organization
    if user.get("role") == "org_admin":
        if user.get("organization_id") != org_id:
            raise HTTPException(status_code=403, detail="You can only view your own organization")
    
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
        user_count=user_count,
        certificate_template_id=org.get("certificate_template_id"),
        discord_webhook_url=org.get("discord_webhook_url")
    )

@org_router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: str, data: OrganizationUpdate, user: dict = Depends(require_admin)):
    # Org admins can only update their own organization
    if user.get("role") == "org_admin":
        if user.get("organization_id") != org_id:
            raise HTTPException(status_code=403, detail="You can only modify your own organization")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    # Normalize empty certificate template ID to None so it clears the setting
    if 'certificate_template_id' in update_data and not update_data['certificate_template_id']:
        update_data['certificate_template_id'] = None
    # Handle discord_webhook_url - allow empty string to clear it
    if 'discord_webhook_url' in update_data:
        if not update_data['discord_webhook_url']:
            update_data['discord_webhook_url'] = None
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    logger.info(f"Updating organization {org_id} with data: {update_data}")
    
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Set last_login equal to creation date so new users count as active
        "last_login": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Send welcome email with login credentials and branding
    email_sent = await send_welcome_email(
        user_email=data.email,
        user_name=data.name,
        password=data.password,
        db=db
    )
    
    # Audit log for user creation
    await audit_logger.log(
        action="user_created",
        user_id=admin["user_id"],
        user_email=admin.get("email"),
        user_name=admin.get("name"),
        details={
            "actor_id": admin["user_id"],
            "actor_email": admin.get("email"),
            "actor_role": admin.get("role"),
            "created_user_id": user_id,
            "created_user_email": data.email,
            "created_user_name": data.name,
            "created_user_role": data.role,
            "organization_id": data.organization_id,
            "welcome_email_sent": email_sent
        },
        severity="info"
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
    
    # Org admins can only see users in their organization
    if user.get("role") == "org_admin":
        if user.get("organization_id"):
            query["organization_id"] = user["organization_id"]
        else:
            # Org admin without org - return empty
            return []
    elif organization_id:
        # Super admin can filter by any org
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
    
    # Org admin can only view users in their organization
    if admin.get("role") == "org_admin":
        if user.get("organization_id") != admin.get("organization_id"):
            raise HTTPException(status_code=403, detail="You can only view users in your organization")
    
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
    # Get target user first
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Org admin can only update users in their organization
    if admin.get("role") == "org_admin":
        if target_user.get("organization_id") != admin.get("organization_id"):
            raise HTTPException(status_code=403, detail="You can only modify users in your organization")
        # Org admin cannot change someone to super_admin
        if data.role == "super_admin":
            raise HTTPException(status_code=403, detail="You cannot assign super_admin role")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Track changes for audit log
    changes = {}
    for key, new_value in update_data.items():
        old_value = target_user.get(key)
        if old_value != new_value:
            changes[key] = {"old": old_value, "new": new_value}
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log the user update with detailed info
    if changes:
        # Determine the action type
        if "role" in changes:
            action = "user_role_changed"
            severity = "warning"
        elif "is_active" in changes:
            action = "user_status_changed"
            severity = "warning"
        else:
            action = "user_updated"
            severity = "info"
        
        await audit_logger.log(
            action=action,
            user_id=admin["user_id"],
            user_email=admin.get("email"),
            user_name=admin.get("name"),
            details={
                "actor_id": admin["user_id"],
                "actor_email": admin.get("email"),
                "actor_role": admin.get("role"),
                "target_user_id": user_id,
                "target_user_email": target_user.get("email"),
                "target_user_name": target_user.get("name"),
                "changes": changes
            },
            severity=severity
        )
    
    return await get_user(user_id, admin)

@user_router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_super_admin)):
    # Get user info before deletion for audit
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Audit log for user deletion
    await audit_logger.log(
        action="user_deleted",
        user_id=admin["user_id"],
        user_email=admin.get("email"),
        user_name=admin.get("name"),
        details={
            "actor_id": admin["user_id"],
            "actor_email": admin.get("email"),
            "actor_role": admin.get("role"),
            "deleted_user_id": user_id,
            "deleted_user_email": target_user.get("email"),
            "deleted_user_name": target_user.get("name"),
            "deleted_user_role": target_user.get("role")
        },
        severity="warning"
    )
    
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
    
    # Org admins can only see campaigns for their organization
    if user.get("role") == "org_admin":
        if user.get("organization_id"):
            query["organization_id"] = user["organization_id"]
        else:
            return []
    elif organization_id:
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

# Passing score threshold for training completion.  If a user finishes a
# session with a score below this threshold, the session will be marked
# as "failed" rather than "completed".  Failed sessions count toward
# certificate eligibility but indicate that remedial training may be
# required.
PASSING_SCORE = 70

# Default training modules seeding has been removed.
# Users should create their own training modules via the Module Designer.

@training_router.get("/modules", response_model=List[TrainingModuleResponse])
async def list_training_modules(user: dict = Depends(get_current_user)):
    """
    List all training modules.  For trainees, only return active modules.
    Super administrators and organization administrators can view
    inactive (paused) modules as well.
    """
    query = {}
    # Trainees only see active modules
    if user.get("role") == UserRole.TRAINEE:
        query["is_active"] = True
    modules_cursor = db.training_modules.find(query, {"_id": 0})
    modules = await modules_cursor.to_list(1000)
    return [TrainingModuleResponse(**m) for m in modules]

# ---------------------------------------------------------------------------
#  Module Management Endpoints
#  These endpoints allow administrators to create, update, delete and
#  reassign training modules.  Only users with the SUPER_ADMIN or ORG_ADMIN
#  role may access these operations.  Trainees should never call these
#  endpoints directly.
#

@training_router.post("/modules", response_model=TrainingModuleResponse)
async def create_training_module(
    data: TrainingModuleCreate,
    user: dict = Depends(get_current_user)
):
    """
    Create a new training module.  Administrators can define custom
    modules with their own metadata.  A unique module_id will be
    generated automatically.  The new module is stored in the
    `training_modules` collection.
    """
    # Only administrators can create modules
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Generate a unique module ID
    module_id = f"mod_{uuid.uuid4().hex[:12]}"

    # Convert Pydantic model to dict and normalize scenarios/scenarios_count
    module_doc = data.model_dump()
    module_doc["module_id"] = module_id

    # If a list of scenarios is provided, derive scenarios_count from its length
    scenarios_list = module_doc.get("scenarios") or []
    questions_list = module_doc.get("questions") or []
    if questions_list:
        module_doc["scenarios_count"] = len(questions_list)
    elif scenarios_list:
        module_doc["scenarios_count"] = len(scenarios_list)
    else:
        # Ensure scenarios is an empty list rather than None for consistency
        module_doc["scenarios"] = []
        module_doc["questions"] = []

    # Insert into DB
    await db.training_modules.insert_one(module_doc)

    return TrainingModuleResponse(**module_doc)


@training_router.patch("/modules/{module_id}", response_model=TrainingModuleResponse)
async def update_training_module(
    module_id: str,
    data: TrainingModuleUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update an existing training module.  Only provided fields will be
    modified; omitted fields remain unchanged.  Administrators may
    pause/activate modules, change the associated certificate template
    or adjust descriptive metadata.
    """
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Build update dictionary from provided fields
    update_dict = {}
    # If a new list of scenarios is provided, update both the list and the count
    if data.scenarios is not None:
        update_dict["scenarios"] = data.scenarios
        update_dict["scenarios_count"] = len(data.scenarios)
    # If questions are provided, update questions and scenarios_count
    if data.questions is not None:
        update_dict["questions"] = data.questions
        update_dict["scenarios_count"] = len(data.questions)
    if data.module_type is not None:
        update_dict["module_type"] = data.module_type

    if data.name is not None:
        update_dict["name"] = data.name
    if data.description is not None:
        update_dict["description"] = data.description
    if data.difficulty is not None:
        update_dict["difficulty"] = data.difficulty
    if data.duration_minutes is not None:
        update_dict["duration_minutes"] = data.duration_minutes
    if data.questions_per_session is not None:
        update_dict["questions_per_session"] = data.questions_per_session
    # Allow direct updates to scenarios_count when scenarios list is not provided
    if data.scenarios_count is not None and data.scenarios is None:
        update_dict["scenarios_count"] = data.scenarios_count
    if data.certificate_template_id is not None:
        update_dict["certificate_template_id"] = data.certificate_template_id
    if data.is_active is not None:
        update_dict["is_active"] = data.is_active

    if not update_dict:
        # Nothing to update
        module = await db.training_modules.find_one({"module_id": module_id}, {"_id": 0})
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        return TrainingModuleResponse(**module)

    # Perform the update
    result = await db.training_modules.update_one(
        {"module_id": module_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")

    # Fetch updated module and return
    module = await db.training_modules.find_one({"module_id": module_id}, {"_id": 0})
    return TrainingModuleResponse(**module)


@training_router.delete("/modules/{module_id}")
async def delete_training_module(
    module_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a training module.  This will remove the module from the
    `training_modules` collection.  Use with caution; deleting a module
    will not remove existing training sessions associated with it.
    """
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.training_modules.delete_one({"module_id": module_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"message": "Module deleted"}


class BulkModuleUpload(BaseModel):
    modules: List[dict]

@training_router.post("/modules/bulk", response_model=dict)
async def bulk_upload_modules(
    data: BulkModuleUpload,
    user: dict = Depends(get_current_user)
):
    """
    Bulk upload training modules from JSON.
    Each module should have: name, module_type, description, difficulty,
    duration_minutes, questions (list), and optionally questions_per_session.
    """
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    created = 0
    updated = 0
    errors = []
    
    for idx, module_data in enumerate(data.modules):
        try:
            name = module_data.get("name")
            if not name:
                errors.append(f"Module {idx}: Missing name")
                continue
            
            # Check if module with same name exists
            existing = await db.training_modules.find_one({"name": name})
            
            questions = module_data.get("questions", [])
            questions_per_session = module_data.get("questions_per_session", 15)
            
            module_doc = {
                "name": name,
                "module_type": module_data.get("module_type", "general"),
                "description": module_data.get("description", ""),
                "difficulty": module_data.get("difficulty", "medium"),
                "duration_minutes": module_data.get("duration_minutes", 30),
                "scenarios_count": len(questions),
                "questions": questions,
                "questions_per_session": questions_per_session,
                "certificate_template_id": module_data.get("certificate_template_id"),
                "is_active": module_data.get("is_active", True)
            }
            
            if existing:
                # Update existing module
                await db.training_modules.update_one(
                    {"name": name},
                    {"$set": module_doc}
                )
                updated += 1
            else:
                # Create new module
                module_doc["module_id"] = f"mod_{uuid.uuid4().hex[:12]}"
                await db.training_modules.insert_one(module_doc)
                created += 1
                
        except Exception as e:
            errors.append(f"Module {idx} ({module_data.get('name', 'unknown')}): {str(e)}")
    
    return {
        "created": created,
        "updated": updated,
        "errors": errors,
        "message": f"Bulk upload complete: {created} created, {updated} updated, {len(errors)} errors"
    }


@training_router.get("/modules/export", response_model=List[dict])
async def export_modules(user: dict = Depends(get_current_user)):
    """
    Export all training modules as JSON for editing/backup.
    """
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    modules = await db.training_modules.find({}, {"_id": 0}).to_list(1000)
    return modules


@training_router.post("/reassign", response_model=dict)
async def reassign_training_modules(
    data: TrainingReassignRequest,
    user: dict = Depends(get_current_user)
):
    """
    Reassign training modules to one or more users.  This endpoint is
    intended for administrators to bulk-assign remedial training after
    phishing campaign clicks or other failures.  When `module_ids` is
    provided, only those modules are reassigned.  Otherwise, all
    currently active modules are reassigned.  New training session
    documents are created with the status "reassigned".  Existing
    sessions are not modified.
    """
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Determine modules to assign
    module_ids = data.module_ids or []
    if not module_ids:
        # Fetch all active modules
        active_modules = await db.training_modules.find(
            {"is_active": True}, {"_id": 0, "module_id": 1, "scenarios_count": 1}
        ).to_list(1000)
        module_info = {m["module_id"]: m.get("scenarios_count", 0) for m in active_modules}
    else:
        # Validate provided module IDs and get scenarios_count for each
        docs = await db.training_modules.find(
            {"module_id": {"$in": module_ids}}, {"_id": 0, "module_id": 1, "scenarios_count": 1}
        ).to_list(len(module_ids))
        if len(docs) != len(module_ids):
            found_ids = {d["module_id"] for d in docs}
            missing = [mid for mid in module_ids if mid not in found_ids]
            raise HTTPException(status_code=400, detail=f"Modules not found: {missing}")
        module_info = {d["module_id"]: d.get("scenarios_count", 0) for d in docs}

    created_sessions = []

    # Create sessions for each user and module combination
    for uid in data.user_ids:
        for mid, scen_count in module_info.items():
            session_id = f"sess_{uuid.uuid4().hex[:12]}"
            session_doc = {
                "session_id": session_id,
                "user_id": uid,
                "module_id": mid,
                "campaign_id": None,
                "status": "reassigned",
                "score": 0,
                "total_questions": scen_count,
                "correct_answers": 0,
                "current_scenario_index": 0,
                "answers": [],
                "started_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None
            }
            await db.training_sessions.insert_one(session_doc)
            created_sessions.append(session_id)

    return {
        "message": "Training reassigned",
        "created_sessions": created_sessions,
        "user_count": len(data.user_ids),
        "module_count": len(module_info)
    }

@training_router.get("/modules/{module_id}", response_model=TrainingModuleResponse)
async def get_training_module(module_id: str, user: dict = Depends(get_current_user)):
    """Retrieve a single training module by ID"""
    module = await db.training_modules.find_one({"module_id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    # Trainees cannot view inactive modules
    if user.get("role") == UserRole.TRAINEE and not module.get("is_active", True):
        raise HTTPException(status_code=404, detail="Module not found")
    return TrainingModuleResponse(**module)

@training_router.post("/sessions", response_model=TrainingSessionResponse)
async def start_training_session(data: TrainingSessionCreate, user: dict = Depends(get_current_user)):
    session_id = f"sess_{uuid.uuid4().hex[:12]}"

    # Fetch module from database and ensure it's active
    module = await db.training_modules.find_one({"module_id": data.module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    if not module.get("is_active", True):
        raise HTTPException(status_code=400, detail="Module is currently paused")

    # Determine questions for this session.  If the module has a list of
    # predefined scenarios, preload them into cached_scenarios.  Otherwise,
    # the session will generate scenarios on demand based on module type.
    cached_scenarios = []
    questions_list = module.get("questions") or []
    scenarios_list = module.get("scenarios") or []
    
    # Get the number of questions to show per session (default: all questions)
    # If questions_per_session is set, randomly select that many questions
    questions_per_session = module.get("questions_per_session", 0)
    
    if questions_list:
        # Use the rich questions from the module designer
        import random as _rand
        shuffled = list(questions_list)
        _rand.shuffle(shuffled)
        
        # If questions_per_session is set, limit the questions
        if questions_per_session > 0 and questions_per_session < len(shuffled):
            shuffled = shuffled[:questions_per_session]
        
        for i, q in enumerate(shuffled):
            cached_scenarios.append({
                "scenario_id": q.get("id", f"q_{i}"),
                "scenario_type": q.get("type", "multiple_choice"),
                "title": q.get("title", f"Question {i+1}"),
                "content": q,
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "difficulty": q.get("difficulty", module.get("difficulty", "medium"))
            })
        total_questions = len(cached_scenarios)
    elif scenarios_list:
        # Fetch each scenario document and transform into the training format
        for sid in scenarios_list:
            scen = await db.scenarios.find_one({"scenario_id": sid}, {"_id": 0})
            if not scen:
                continue
            # If this scenario references child scenarios (question group),
            # expand them into individual cached scenarios.  Otherwise, add
            # the scenario itself.
            child_ids = scen.get("child_scenarios") or []
            if child_ids:
                for child_id in child_ids:
                    child = await db.scenarios.find_one({"scenario_id": child_id}, {"_id": 0})
                    if not child:
                        continue
                    cached_scenarios.append({
                        "scenario_id": child["scenario_id"],
                        "scenario_type": child["scenario_type"],
                        "title": child["title"],
                        "content": child.get("content", {}),
                        "correct_answer": child["correct_answer"],
                        "explanation": child["explanation"],
                        "difficulty": child["difficulty"]
                    })
            else:
                cached_scenarios.append({
                    "scenario_id": scen["scenario_id"],
                    "scenario_type": scen["scenario_type"],
                    "title": scen["title"],
                    "content": scen.get("content", {}),
                    "correct_answer": scen["correct_answer"],
                    "explanation": scen["explanation"],
                    "difficulty": scen["difficulty"]
                })
        total_questions = len(cached_scenarios)
        # Randomize question order for trainees
        import random as _rand
        _rand.shuffle(cached_scenarios)

    session_doc = {
        "session_id": session_id,
        "user_id": user["user_id"],
        "module_id": data.module_id,
        "campaign_id": data.campaign_id,
        "status": "in_progress",
        "score": 0,
        "total_questions": total_questions,
        "correct_answers": 0,
        "current_scenario_index": 0,
        "answers": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    # Only store cached_scenarios if we actually loaded them
    if cached_scenarios:
        session_doc["cached_scenarios"] = cached_scenarios

    await db.training_sessions.insert_one(session_doc)

    return TrainingSessionResponse(
        session_id=session_id,
        user_id=user["user_id"],
        module_id=data.module_id,
        campaign_id=data.campaign_id,
        status="in_progress",
        score=0,
        total_questions=total_questions,
        correct_answers=0,
        current_scenario_index=0,
        answers=[],
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
            current_scenario_index=s.get("current_scenario_index", 0),
            answers=s.get("answers", []),
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
        current_scenario_index=session.get("current_scenario_index", 0),
        answers=session.get("answers", []),
        started_at=started_at,
        completed_at=completed_at
    )

@training_router.get("/sessions/{session_id}/scenario", response_model=ScenarioResponse)
async def get_current_scenario(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Completed and failed sessions cannot progress further.  A new session
    # should be started instead.  Reassigned sessions are treated as
    # in-progress until completion.
    if session["status"] in ["completed", "failed"]:
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
        # Determine pass/fail based on score threshold
        if new_score >= PASSING_SCORE:
            update_data["status"] = "completed"
        else:
            update_data["status"] = "failed"
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
    # Org admins only see stats for their organization
    org_filter = {}
    if user.get("role") == "org_admin" and user.get("organization_id"):
        org_filter = {"organization_id": user["organization_id"]}
    
    if user.get("role") == "super_admin":
        total_orgs = await db.organizations.count_documents({})
        total_users = await db.users.count_documents({})
    else:
        total_orgs = 1 if user.get("organization_id") else 0
        total_users = await db.users.count_documents(org_filter)
    
    # Count all campaign types (org-scoped for org_admins)
    phishing_campaigns = await db.phishing_campaigns.count_documents(org_filter)
    ad_campaigns = await db.ad_campaigns.count_documents(org_filter)
    total_campaigns = phishing_campaigns + ad_campaigns
    
    # Active campaigns
    active_filter = {**org_filter, "status": "active"}
    active_phishing = await db.phishing_campaigns.count_documents(active_filter)
    active_ads = await db.ad_campaigns.count_documents(active_filter)
    active_campaigns = active_phishing + active_ads
    
    # Training sessions - need to join with users for org filtering
    if org_filter:
        # Get user IDs in this org
        org_users = await db.users.find(org_filter, {"user_id": 1}).to_list(10000)
        org_user_ids = [u["user_id"] for u in org_users]
        session_filter = {"user_id": {"$in": org_user_ids}}
    else:
        session_filter = {}
    
    total_sessions = await db.training_sessions.count_documents(session_filter)
    
    # Calculate average score
    pipeline = [
        {"$match": {**session_filter, "status": "completed"}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
    ]
    result = await db.training_sessions.aggregate(pipeline).to_list(1)
    avg_score = result[0]["avg_score"] if result else 0
    
    # Get scenario/simulation stats
    total_scenarios = await db.scenarios.count_documents({"is_active": True})
    
    # Get breakdown by scenario type
    scenario_type_pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$scenario_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    scenario_type_results = await db.scenarios.aggregate(scenario_type_pipeline).to_list(20)
    scenario_types = {r["_id"]: r["count"] for r in scenario_type_results if r["_id"]}
    
    return DashboardStats(
        total_organizations=total_orgs,
        total_users=total_users,
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_training_sessions=total_sessions,
        average_score=round(avg_score, 1) if avg_score else 0,
        total_scenarios=total_scenarios,
        scenario_types=scenario_types
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
    
    # Get module names for by_module results
    module_ids = [m["_id"] for m in by_module if m["_id"]]
    modules = await db.training_modules.find(
        {"module_id": {"$in": module_ids}},
        {"_id": 0, "module_id": 1, "name": 1}
    ).to_list(100)
    module_name_map = {m["module_id"]: m["name"] for m in modules}
    
    # Filter out deleted modules and add module names to remaining
    filtered_by_module = []
    for m in by_module:
        module_id = m["_id"]
        # Skip sessions for deleted modules (not in module_name_map)
        if module_id and module_id not in module_name_map:
            continue
        m["module_name"] = module_name_map.get(module_id, "Unknown Module") if module_id else "Unknown"
        # Calculate completion percentage
        m["completion_rate"] = round((m["completed"] / m["total_sessions"] * 100) if m["total_sessions"] > 0 else 0, 1)
        filtered_by_module.append(m)
    
    # Recent activity with module names
    recent = await db.training_sessions.find(
        match_stage,
        {"_id": 0}
    ).sort("started_at", -1).limit(10).to_list(10)
    
    # Add module names to recent sessions, filter out deleted modules
    filtered_recent = []
    for session in recent:
        module_id = session.get("module_id")
        # Skip sessions for deleted modules
        if module_id and module_id not in module_name_map:
            continue
        session["module_name"] = module_name_map.get(module_id, "Unknown Module") if module_id else "Unknown"
        filtered_recent.append(session)
    
    return {
        "by_module": filtered_by_module,
        "recent_sessions": filtered_recent
    }

# New endpoint to provide user analytics including active/inactive counts
@api_router.get("/analytics/users")
async def get_user_analytics(
    organization_id: Optional[str] = None,
    days_inactive: int = 3,
    user: dict = Depends(require_admin)
):
    """
    Return statistics about users across the system or within a specific organization.

    Active users are defined as those with a last_login timestamp within the past ``days_inactive`` days.
    Inactive users have not logged in during that period.
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_inactive)

    query: dict = {}
    if organization_id:
        query["organization_id"] = organization_id

    # Count total users
    total_users = await db.users.count_documents(query)

    # Active users: last_login >= cutoff
    active_query = query.copy()
    active_query["last_login"] = {"$gte": cutoff.isoformat()}
    active_users = await db.users.count_documents(active_query)

    inactive_users = total_users - active_users

    # Breakdown by role
    pipeline = [
        {"$match": query if query else {}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    role_counts = await db.users.aggregate(pipeline).to_list(10)
    roles = {rc["_id"]: rc["count"] for rc in role_counts}

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "role_distribution": roles,
        "days_inactive_threshold": days_inactive
    }

@api_router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = 30,
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(require_admin)
):
    """
    Get a comprehensive analytics overview for the Advanced Analytics page.

    Accepts either a number of days or an explicit ISO date range. When
    `start_date` and `end_date` are provided, metrics are calculated only
    for events occurring within that range. Otherwise, the last `days`
    period is used.
    """
    from datetime import timedelta

    # Determine cutoff range
    cutoff_start: datetime
    cutoff_end: datetime
    if start_date and end_date:
        # Parse ISO formatted strings; allow trailing 'Z' from frontend
        try:
            cutoff_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            cutoff_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except Exception:
            # Fall back to days if parsing fails
            cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
            cutoff_end = datetime.now(timezone.utc)
    else:
        cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_end = datetime.now(timezone.utc)

    # Count phishing campaigns launched within range
    phishing_campaigns = await db.phishing_campaigns.count_documents({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    })
    phishing_active = await db.phishing_campaigns.count_documents({
        "status": "active",
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    })

    # Count ad campaigns launched within range
    ad_campaigns = await db.ad_campaigns.count_documents({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    })
    ad_active = await db.ad_campaigns.count_documents({
        "status": "active",
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    })

    # Fetch phishing target events within the cutoff range.  We select only
    # targets where any relevant timestamp falls within the range, or where
    # the target itself was created within the range.  Note that for large
    # datasets the list may be truncated by Mongo's to_list limit, but this
    # still yields accurate relative counts.
    phishing_targets = await db.phishing_targets.find({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"sent_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"opened_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"clicked_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"submitted_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    }, {"_id": 0}).to_list(100000)

    total_sent = sum(1 for t in phishing_targets if t.get("email_sent"))
    total_opened = sum(1 for t in phishing_targets if t.get("email_opened") or t.get("opened_at"))
    total_clicked = sum(1 for t in phishing_targets if t.get("link_clicked") or t.get("clicked_at"))
    total_submitted = sum(1 for t in phishing_targets if t.get("credentials_submitted") or t.get("submitted_at"))

    # Fetch ad target events within range
    ad_targets = await db.ad_targets.find({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"viewed_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"clicked_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    }, {"_id": 0}).to_list(100000)

    ads_viewed = sum(1 for t in ad_targets if t.get("ad_viewed"))
    ads_clicked = sum(1 for t in ad_targets if t.get("ad_clicked"))

    # Training sessions within range
    training_sessions = await db.training_sessions.count_documents({
        "created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}
    })
    training_completed = await db.training_sessions.count_documents({
        "status": "completed",
        "created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}
    })

    # Return aggregated statistics
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
        "period_days": days,
        "start_date": cutoff_start.isoformat(),
        "end_date": cutoff_end.isoformat()
    }

@api_router.get("/phishing/stats")
async def get_phishing_stats(
    days: int = 30,
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(require_admin)
):
    """
    Get detailed phishing statistics for analytics.

    Supports either a relative period defined by `days` or a specific
    `start_date`/`end_date` range. Only events within the range are
    considered when counting sent, opened, clicked, and submitted events.
    """
    from datetime import timedelta
    # Determine date range
    if start_date and end_date:
        try:
            cutoff_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            cutoff_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except Exception:
            cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
            cutoff_end = datetime.now(timezone.utc)
    else:
        cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_end = datetime.now(timezone.utc)

    # Get all campaigns (we'll filter targets based on campaigns in date range)
    campaign_query = {
        "created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}
    }
    
    campaigns = await db.phishing_campaigns.find(campaign_query, {"_id": 0, "campaign_id": 1, "status": 1}).to_list(1000)
    campaign_ids = [c["campaign_id"] for c in campaigns]
    
    total_campaigns = len(campaigns)
    active_campaigns = sum(1 for c in campaigns if c.get("status") in ("active", "running"))
    completed_campaigns = sum(1 for c in campaigns if c.get("status") == "completed")

    # Get all targets for these campaigns
    targets = []
    if campaign_ids:
        targets = await db.phishing_targets.find(
            {"campaign_id": {"$in": campaign_ids}},
            {"_id": 0}
        ).to_list(100000)

    # Count events - use actual field names from the database
    total_sent = len(targets)  # All targets are considered "sent"
    total_opened = sum(1 for t in targets if t.get("email_opened"))
    total_clicked = sum(1 for t in targets if t.get("link_clicked"))
    total_submitted = sum(1 for t in targets if t.get("credentials_submitted"))

    # Calculate rates
    open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
    click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0
    submission_rate = (total_submitted / total_sent * 100) if total_sent > 0 else 0
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
        "period_days": days,
        "start_date": cutoff_start.isoformat(),
        "end_date": cutoff_end.isoformat()
    }

@api_router.get("/analytics/all-campaigns")
async def get_all_campaigns_analytics(
    days: int = 30,
    start_date: str = None,
    end_date: str = None,
    campaign_type: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    """Get all simulation campaigns (phishing + ad) for analytics"""
    from datetime import timedelta
    
    # Determine date range
    if start_date and end_date:
        try:
            cutoff_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            cutoff_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
            cutoff_end = datetime.now(timezone.utc)
    else:
        cutoff_start = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_end = datetime.now(timezone.utc)
    
    all_campaigns = []
    
    # Get phishing campaigns
    # Only include phishing campaigns whose created_at or launched_at falls within the range
    phishing_campaigns = await db.phishing_campaigns.find({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    }, {"_id": 0}).to_list(1000)
    for camp in phishing_campaigns:
        targets = await db.phishing_targets.find(
            {"campaign_id": camp["campaign_id"]},
            {"_id": 0}
        ).to_list(10000)
        
        total = len(targets)
        # Count sent/opened/clicked using consistent event flags.  Fallback to older
        # fields when necessary for backwards compatibility.
        sent = sum(1 for t in targets if t.get("email_sent"))
        opened = sum(1 for t in targets if t.get("email_opened") or t.get("opened_at"))
        clicked = sum(1 for t in targets if t.get("link_clicked") or t.get("clicked_at"))
        
        all_campaigns.append({
            "campaign_id": camp["campaign_id"],
            "name": camp.get("name", "Unnamed"),
            "type": "phishing",
            "type_label": "Phishing Email",
            "status": camp.get("status", "draft"),
            "created_at": camp.get("created_at"),
            "launched_at": camp.get("launched_at"),
            "total_targets": total,
            "sent": sent,
            "opened": opened,
            "clicked": clicked,
            "open_rate": round((opened / sent * 100), 1) if sent > 0 else 0,
            "click_rate": round((clicked / sent * 100), 1) if sent > 0 else 0,
            "organization_id": camp.get("organization_id")
        })
    
    # Get ad campaigns
    # Only include ad campaigns within date range
    ad_campaigns = await db.ad_campaigns.find({
        "$or": [
            {"created_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}},
            {"launched_at": {"$gte": cutoff_start.isoformat(), "$lte": cutoff_end.isoformat()}}
        ]
    }, {"_id": 0}).to_list(1000)
    for camp in ad_campaigns:
        targets = await db.ad_targets.find(
            {"campaign_id": camp["campaign_id"]},
            {"_id": 0}
        ).to_list(10000)
        
        total = len(targets)
        viewed = sum(1 for t in targets if t.get("ad_viewed"))
        clicked = sum(1 for t in targets if t.get("ad_clicked"))
        
        all_campaigns.append({
            "campaign_id": camp["campaign_id"],
            "name": camp.get("name", "Unnamed"),
            "type": "ad",
            "type_label": "Malicious Ad",
            "status": camp.get("status", "draft"),
            "created_at": camp.get("created_at"),
            "launched_at": camp.get("launched_at"),
            "total_targets": total,
            "sent": total,  # All targets receive the ad
            "opened": viewed,
            "clicked": clicked,
            "open_rate": round((viewed / total * 100), 1) if total > 0 else 0,
            "click_rate": round((clicked / total * 100), 1) if total > 0 else 0,
            "organization_id": camp.get("organization_id")
        })
    
    # Sort by created_at descending
    all_campaigns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    # Apply optional filters
    if campaign_type in {"phishing", "ad"}:
        all_campaigns = [c for c in all_campaigns if c["type"] == campaign_type]
    if status:
        all_campaigns = [c for c in all_campaigns if c.get("status") == status]
    
    # Calculate summary stats
    total_campaigns = len(all_campaigns)
    phishing_count = sum(1 for c in all_campaigns if c["type"] == "phishing")
    ad_count = sum(1 for c in all_campaigns if c["type"] == "ad")
    
    total_sent = sum(c["sent"] for c in all_campaigns)
    total_opened = sum(c["opened"] for c in all_campaigns)
    total_clicked = sum(c["clicked"] for c in all_campaigns)
    
    return {
        "campaigns": all_campaigns,
        "summary": {
            "total_campaigns": total_campaigns,
            "phishing_campaigns": phishing_count,
            "ad_campaigns": ad_count,
            "total_sent": total_sent,
            "total_opened": total_opened,
            "total_clicked": total_clicked,
            "overall_open_rate": round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0,
            "overall_click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0
        }
    }


# New endpoint: detailed analytics for a specific campaign including organization breakdown
@api_router.get("/analytics/campaign/{campaign_id}")
async def get_campaign_analytics(
    campaign_id: str,
    user: dict = Depends(require_admin)
):
    """
    Retrieve detailed analytics for a single campaign, including breakdown by organization.

    For phishing campaigns, statistics include sent, opened, clicked, and submitted counts.
    For ad campaigns, statistics include impressions (sent), views, and clicks.
    The endpoint returns the overall campaign summary and a list of organizations with their respective metrics.
    """
    # Try to find the campaign in phishing or ad collections
    campaign = await db.phishing_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    campaign_type = "phishing"
    if not campaign:
        campaign = await db.ad_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign_type = "ad"

    result = {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name", "Unnamed"),
        "campaign_type": campaign_type,
        "created_at": campaign.get("created_at"),
        "launched_at": campaign.get("launched_at"),
        "status": campaign.get("status", "draft"),
        "organization_id": campaign.get("organization_id")
    }

    # Fetch all targets and join with users to get organization_id
    if campaign_type == "phishing":
        targets = await db.phishing_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100000)
        # Map user_id to organization_id and name
        user_ids = {t["user_id"] for t in targets if t.get("user_id")}
        users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "user_id": 1, "organization_id": 1}).to_list(len(user_ids))
        user_org_map = {u["user_id"]: u.get("organization_id") for u in users}
        # Map organization_id to org name
        org_ids = {u.get("organization_id") for u in users if u.get("organization_id")}
        orgs = await db.organizations.find({"organization_id": {"$in": list(org_ids)}}, {"_id": 0, "organization_id": 1, "name": 1}).to_list(len(org_ids))
        org_name_map = {o["organization_id"]: o.get("name") for o in orgs}

        # Aggregate overall counts
        # Use email_sent flag to determine actual sent count, not just total targets
        total_sent = sum(1 for t in targets if t.get("email_sent"))
        total_opened = sum(1 for t in targets if t.get("email_opened") or t.get("opened_at"))
        total_clicked = sum(1 for t in targets if t.get("link_clicked") or t.get("clicked_at"))
        total_submitted = sum(1 for t in targets if t.get("credentials_submitted") or t.get("submitted_at"))

        # Group by organization
        org_stats = {}
        for t in targets:
            org_id = user_org_map.get(t.get("user_id")) or "unassigned"
            if org_id not in org_stats:
                org_stats[org_id] = {
                    "organization_id": org_id,
                    "organization_name": org_name_map.get(org_id, "Unassigned"),
                    "sent": 0,
                    "opened": 0,
                    "clicked": 0,
                    "submitted": 0
                }
            # Increment sent only if the email was actually sent
            if t.get("email_sent"):
                org_stats[org_id]["sent"] += 1
            # Count using consistent field names with backwards compatibility
            if t.get("email_opened") or t.get("opened_at"):
                org_stats[org_id]["opened"] += 1
            if t.get("link_clicked") or t.get("clicked_at"):
                org_stats[org_id]["clicked"] += 1
            if t.get("credentials_submitted") or t.get("submitted_at"):
                org_stats[org_id]["submitted"] += 1

        # Build response
        result.update({
            "summary": {
                "sent": total_sent,
                "opened": total_opened,
                "clicked": total_clicked,
                "submitted": total_submitted,
                "open_rate": round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0,
                "click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0,
                "submission_rate": round((total_submitted / total_sent * 100), 1) if total_sent > 0 else 0,
            },
            "organizations": list(org_stats.values())
        })

    else:
        # ad campaign statistics
        targets = await db.ad_targets.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100000)
        user_ids = {t["user_id"] for t in targets if t.get("user_id")}
        users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "user_id": 1, "organization_id": 1}).to_list(len(user_ids))
        user_org_map = {u["user_id"]: u.get("organization_id") for u in users}
        org_ids = {u.get("organization_id") for u in users if u.get("organization_id")}
        orgs = await db.organizations.find({"organization_id": {"$in": list(org_ids)}}, {"_id": 0, "organization_id": 1, "name": 1}).to_list(len(org_ids))
        org_name_map = {o["organization_id"]: o.get("name") for o in orgs}

        total_sent = len(targets)
        total_viewed = sum(1 for t in targets if t.get("ad_viewed"))
        total_clicked = sum(1 for t in targets if t.get("ad_clicked"))

        org_stats = {}
        for t in targets:
            org_id = user_org_map.get(t.get("user_id"))
            if not org_id:
                org_id = "unassigned"
            if org_id not in org_stats:
                org_stats[org_id] = {
                    "organization_id": org_id,
                    "organization_name": org_name_map.get(org_id, "Unassigned"),
                    "sent": 0,
                    "viewed": 0,
                    "clicked": 0
                }
            org_stats[org_id]["sent"] += 1
            if t.get("ad_viewed"):
                org_stats[org_id]["viewed"] += 1
            if t.get("ad_clicked"):
                org_stats[org_id]["clicked"] += 1

        result.update({
            "summary": {
                "sent": total_sent,
                "viewed": total_viewed,
                "clicked": total_clicked,
                "view_rate": round((total_viewed / total_sent * 100), 1) if total_sent > 0 else 0,
                "click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0
            },
            "organizations": list(org_stats.values())
        })

    return result

# ===============================================
# Simulation Analytics
# These endpoints provide high-level and drill-down analytics across all
# simulation campaigns (phishing and ads).  They allow the frontend to
# display summary metrics by simulation type and then drill into
# organization and user-level performance.

@api_router.get("/analytics/simulations")
async def get_simulation_overview(
    user: dict = Depends(require_admin)
):
    """
    Return high-level simulation analytics grouped by campaign type.  Each
    entry includes the number of campaigns of that type and aggregated
    metrics such as total targets, opens/views, clicks and submissions.
    """
    results = []

    # Phishing campaigns
    phishing_campaigns = await db.phishing_campaigns.find({}, {"_id": 0, "campaign_id": 1}).to_list(10000)
    phishing_ids = [c["campaign_id"] for c in phishing_campaigns]
    phishing_targets = []
    if phishing_ids:
        phishing_targets = await db.phishing_targets.find({"campaign_id": {"$in": phishing_ids}}, {"_id": 0}).to_list(100000)
    # Count using event flags rather than simply counting targets.  This ensures
    # only emails that were actually sent are included in the totals.
    total_sent = sum(1 for t in phishing_targets if t.get("email_sent"))
    total_opened = sum(1 for t in phishing_targets if t.get("email_opened") or t.get("opened_at"))
    total_clicked = sum(1 for t in phishing_targets if t.get("link_clicked") or t.get("clicked_at"))
    total_submitted = sum(1 for t in phishing_targets if t.get("credentials_submitted") or t.get("submitted_at"))
    results.append({
        "type": "phishing",
        "label": "Phishing Campaigns",
        "total_campaigns": len(phishing_campaigns),
        "sent": total_sent,
        "opened": total_opened,
        "clicked": total_clicked,
        "submitted": total_submitted,
        "open_rate": round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0.0,
        "click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0.0,
        "submission_rate": round((total_submitted / total_sent * 100), 1) if total_sent > 0 else 0.0
    })

    # Ad campaigns
    ad_campaigns = await db.ad_campaigns.find({}, {"_id": 0, "campaign_id": 1}).to_list(10000)
    ad_ids = [c["campaign_id"] for c in ad_campaigns]
    ad_targets = []
    if ad_ids:
        ad_targets = await db.ad_targets.find({"campaign_id": {"$in": ad_ids}}, {"_id": 0}).to_list(100000)
    total_sent_ad = len(ad_targets)  # All ad targets receive the ad by definition
    total_viewed_ad = sum(1 for t in ad_targets if t.get("ad_viewed"))
    total_clicked_ad = sum(1 for t in ad_targets if t.get("ad_clicked"))
    results.append({
        "type": "ad",
        "label": "Ad Simulations",
        "total_campaigns": len(ad_campaigns),
        "sent": total_sent_ad,
        "opened": total_viewed_ad,  # For ads, views are equivalent to opens
        "clicked": total_clicked_ad,
        "submitted": 0,
        "open_rate": round((total_viewed_ad / total_sent_ad * 100), 1) if total_sent_ad > 0 else 0.0,
        "click_rate": round((total_clicked_ad / total_sent_ad * 100), 1) if total_sent_ad > 0 else 0.0,
        "submission_rate": 0.0
    })

    return {"types": results}


@api_router.get("/analytics/simulations/{sim_type}")
async def get_simulation_type_detail(
    sim_type: str,
    user: dict = Depends(require_admin)
):
    """
    Return detailed analytics for a given simulation type ("phishing" or "ad").
    The response includes summary metrics and a breakdown by organization.
    """
    sim_type = sim_type.lower()
    if sim_type not in {"phishing", "ad"}:
        raise HTTPException(status_code=400, detail="Invalid simulation type")

    result = {"type": sim_type}
    org_stats = {}

    if sim_type == "phishing":
        # Get all phishing targets and map to organizations via user_id
        targets = await db.phishing_targets.find({}, {"_id": 0}).to_list(100000)
        # Build user -> org map
        user_ids = {t.get("user_id") for t in targets if t.get("user_id")}
        users = []
        if user_ids:
            users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "user_id": 1, "organization_id": 1}).to_list(len(user_ids))
        user_org_map = {u["user_id"]: u.get("organization_id") for u in users}
        # Map org_id to name
        org_ids = {u.get("organization_id") for u in users if u.get("organization_id")}
        orgs = []
        if org_ids:
            orgs = await db.organizations.find({"organization_id": {"$in": list(org_ids)}}, {"_id": 0, "organization_id": 1, "name": 1}).to_list(len(org_ids))
        org_name_map = {o["organization_id"]: o.get("name") for o in orgs}
        # Aggregate per organization
        total_sent = 0
        total_opened = 0
        total_clicked = 0
        total_submitted = 0
        for t in targets:
            # Only count sent emails
            if t.get("email_sent"):
                total_sent += 1
            org_id = user_org_map.get(t.get("user_id")) or "unassigned"
            if org_id not in org_stats:
                org_stats[org_id] = {
                    "organization_id": org_id,
                    "organization_name": org_name_map.get(org_id, "Unassigned"),
                    "sent": 0,
                    "opened": 0,
                    "clicked": 0,
                    "submitted": 0
                }
            # Sent count is incremented only if the email was actually sent
            if t.get("email_sent"):
                org_stats[org_id]["sent"] += 1
            if t.get("email_opened") or t.get("opened_at"):
                org_stats[org_id]["opened"] += 1
                total_opened += 1
            if t.get("link_clicked") or t.get("clicked_at"):
                org_stats[org_id]["clicked"] += 1
                total_clicked += 1
            if t.get("credentials_submitted") or t.get("submitted_at"):
                org_stats[org_id]["submitted"] += 1
                total_submitted += 1
        summary = {
            "sent": total_sent,
            "opened": total_opened,
            "clicked": total_clicked,
            "submitted": total_submitted,
            "open_rate": round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0.0,
            "click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0.0,
            "submission_rate": round((total_submitted / total_sent * 100), 1) if total_sent > 0 else 0.0
        }
    else:
        # Ad simulations: metrics are ad_viewed (open) and ad_clicked (click)
        targets = await db.ad_targets.find({}, {"_id": 0}).to_list(100000)
        user_ids = {t.get("user_id") for t in targets if t.get("user_id")}
        users = []
        if user_ids:
            users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "user_id": 1, "organization_id": 1}).to_list(len(user_ids))
        user_org_map = {u["user_id"]: u.get("organization_id") for u in users}
        org_ids = {u.get("organization_id") for u in users if u.get("organization_id")}
        orgs = []
        if org_ids:
            orgs = await db.organizations.find({"organization_id": {"$in": list(org_ids)}}, {"_id": 0, "organization_id": 1, "name": 1}).to_list(len(org_ids))
        org_name_map = {o["organization_id"]: o.get("name") for o in orgs}
        total_sent = len(targets)
        total_opened = 0
        total_clicked = 0
        for t in targets:
            org_id = user_org_map.get(t.get("user_id")) or "unassigned"
            if org_id not in org_stats:
                org_stats[org_id] = {
                    "organization_id": org_id,
                    "organization_name": org_name_map.get(org_id, "Unassigned"),
                    "sent": 0,
                    "opened": 0,
                    "clicked": 0,
                    "submitted": 0
                }
            org_stats[org_id]["sent"] += 1
            if t.get("ad_viewed"):
                org_stats[org_id]["opened"] += 1
                total_opened += 1
            if t.get("ad_clicked"):
                org_stats[org_id]["clicked"] += 1
                total_clicked += 1
        summary = {
            "sent": total_sent,
            "opened": total_opened,
            "clicked": total_clicked,
            "submitted": 0,
            "open_rate": round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0.0,
            "click_rate": round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0.0,
            "submission_rate": 0.0
        }

    result.update({
        "summary": summary,
        "organizations": list(org_stats.values())
    })
    return result


@api_router.get("/analytics/simulations/{sim_type}/organization/{org_id}")
async def get_simulation_user_detail(
    sim_type: str,
    org_id: str,
    user: dict = Depends(require_admin)
):
    """
    Return user-level analytics for a given simulation type within a specific organization.
    Each entry includes the user's name and counts of sent, opened/viewed, clicked and
    submitted (for phishing).  Users without any events are still listed if they
    were targeted.
    """
    sim_type = sim_type.lower()
    if sim_type not in {"phishing", "ad"}:
        raise HTTPException(status_code=400, detail="Invalid simulation type")

    # Get users in the organization
    users_cursor = db.users.find({"organization_id": org_id}, {"_id": 0, "user_id": 1, "name": 1})
    users = await users_cursor.to_list(10000)
    user_id_map = {u["user_id"]: u for u in users}
    # Initialize stats for each user
    user_stats = {uid: {"user_id": uid, "name": user_id_map[uid]["name"], "sent": 0, "opened": 0, "clicked": 0, "submitted": 0} for uid in user_id_map}

    if sim_type == "phishing":
        targets = await db.phishing_targets.find({"user_id": {"$in": list(user_id_map.keys())}}, {"_id": 0}).to_list(100000)
        for t in targets:
            uid = t.get("user_id")
            if uid not in user_stats:
                continue
            user_stats[uid]["sent"] += 1
            if t.get("email_opened") or t.get("opened_at"):
                user_stats[uid]["opened"] += 1
            if t.get("link_clicked") or t.get("clicked_at"):
                user_stats[uid]["clicked"] += 1
            if t.get("credentials_submitted") or t.get("submitted_at"):
                user_stats[uid]["submitted"] += 1
    else:
        targets = await db.ad_targets.find({"user_id": {"$in": list(user_id_map.keys())}}, {"_id": 0}).to_list(100000)
        for t in targets:
            uid = t.get("user_id")
            if uid not in user_stats:
                continue
            user_stats[uid]["sent"] += 1
            if t.get("ad_viewed"):
                user_stats[uid]["opened"] += 1
            if t.get("ad_clicked"):
                user_stats[uid]["clicked"] += 1
    # Convert to list and sort by sent count descending
    users_list = list(user_stats.values())
    users_list.sort(key=lambda x: x["sent"], reverse=True)
    return {"type": sim_type, "organization_id": org_id, "users": users_list}

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Vasilis NetShield API", "version": "1.0.0"}

@app.get("/health")
async def root_health():
    """
    Provide a simple health check at the root path.  This mirrors the
    /api/health endpoint but avoids confusion when users or monitoring
    tools query /health directly.  It returns the API status and verifies
    the database connection.
    """
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
from routes.permissions import router as permissions_router, init_permission_routes
from routes.navigation import router as navigation_router
from routes.activity_logs import router as activity_logs_router
from routes.vulnerable_users import router as vulnerable_users_router
from routes.alert_templates import router as alert_templates_router
from routes.custom_email_templates import router as custom_email_templates_router

# Import RBAC manager
from middleware.rbac import rbac_manager

# Initialize RBAC with database
rbac_manager.db = db

# Initialize security routes with dependencies
init_security_routes(db, require_super_admin, audit_logger, account_lockout)

# Initialize permission routes
init_permission_routes(db, get_current_user, rbac_manager, audit_logger)

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
api_router.include_router(permissions_router)
api_router.include_router(navigation_router)
api_router.include_router(activity_logs_router)
api_router.include_router(vulnerable_users_router)
api_router.include_router(alert_templates_router)
api_router.include_router(custom_email_templates_router)


async def _handle_phishing_tracking(campaign_id: str, u: str = None, request: Request = None):
    """Handle phishing campaign tracking via masked URL."""
    if not u:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head><title>Security Training</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0f0f15; color: #E8DDB5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
            .container { padding: 40px; border: 1px solid #D4A83633; border-radius: 8px; background: #161B22; }
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
    
    # Find phishing target by tracking code
    target = await db.phishing_targets.find_one({"tracking_code": u}, {"_id": 0})
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
    if target.get("campaign_id") != campaign_id:
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
    
    # Record link click by redirecting to the phishing track/click endpoint
    # This will handle click recording and show the awareness page
    from starlette.responses import RedirectResponse as StarletteRedirect
    return StarletteRedirect(url=f"/api/phishing/track/click/{u}", status_code=302)


# ============== PUBLIC TRACKING ROUTE (Masked URL) ==============
# This route provides a clean, masked URL for ad and phishing tracking
# URL format: /api/track/{campaign_id}?u={user_tracking_code}

@api_router.get("/track/{campaign_id}")
async def public_masked_tracking(campaign_id: str, u: str = None, request: Request = None):
    """
    Public-facing masked tracking URL for ad and phishing campaigns.
    Routes to the correct handler based on campaign_id prefix.
    """
    # Handle phishing campaigns (prefix: phish_)
    if campaign_id.startswith("phish_"):
        return await _handle_phishing_tracking(campaign_id, u, request)

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


# ============== DYNAMIC SITEMAP ==============
@api_router.get("/sitemap.xml", response_class=Response)
async def generate_sitemap_api():
    """Generate dynamic sitemap.xml based on public content"""
    
    # Get base URL from environment or use default
    frontend_url = os.environ.get('FRONTEND_URL', 'https://vasilisnetshield.com')
    
    # Start XML
    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/auth", "priority": "0.8", "changefreq": "monthly"},
        {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/news", "priority": "0.6", "changefreq": "weekly"},
        {"loc": "/videos", "priority": "0.6", "changefreq": "weekly"},
        {"loc": "/request-access", "priority": "0.5", "changefreq": "monthly"},
    ]
    
    for pg in static_pages:
        xml_parts.append(f"""  <url>
    <loc>{frontend_url}{pg['loc']}</loc>
    <changefreq>{pg['changefreq']}</changefreq>
    <priority>{pg['priority']}</priority>
  </url>""")
    
    # Get dynamic content - blog posts
    try:
        blog_posts = await db.blog_posts.find(
            {"status": "published"},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(100).to_list(100)
        
        for post in blog_posts:
            if post.get("slug"):
                lastmod = post.get("updated_at", "")[:10] if post.get("updated_at") else ""
                xml_parts.append(f"""  <url>
    <loc>{frontend_url}/blog/{post['slug']}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    {f'<lastmod>{lastmod}</lastmod>' if lastmod else ''}
  </url>""")
    except Exception as e:
        logger.warning(f"Failed to fetch blog posts for sitemap: {e}")
    
    # Get dynamic content - news articles
    try:
        news_articles = await db.news.find(
            {"status": "published"},
            {"_id": 0, "slug": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(100).to_list(100)
        
        for article in news_articles:
            if article.get("slug"):
                lastmod = article.get("updated_at", "")[:10] if article.get("updated_at") else ""
                xml_parts.append(f"""  <url>
    <loc>{frontend_url}/news/{article['slug']}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    {f'<lastmod>{lastmod}</lastmod>' if lastmod else ''}
  </url>""")
    except Exception as e:
        logger.warning(f"Failed to fetch news articles for sitemap: {e}")
    
    # Close XML
    xml_parts.append('</urlset>')
    
    xml_content = '\n'.join(xml_parts)
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}  # Cache for 1 hour
    )


app.include_router(api_router)

# ============== ROOT HEALTH ROUTE ==============
# Provide a root-level health check.  Some deployment platforms and
# monitoring tools probe the `/health` path without the `/api` prefix.
# This handler calls the existing API health check to ensure a
# consistent response whether accessed via `/health` or `/api/health`.
@app.get("/health")
async def root_health_check():
    # Delegate to the API health check.  Because health_check is defined
    # below and returns a JSON dict, we simply await it here.
    return await health_check()

# CORS - Tighten origins for production
# Production domains - always allowed
PRODUCTION_ORIGINS = [
    "https://vasilisnetshield.com",
    "https://www.vasilisnetshield.com",
    "https://api.vasilisnetshield.com"
]

cors_origins = os.environ.get('CORS_ORIGINS', '')
logger.info(f"CORS_ORIGINS env var: '{cors_origins}'")

if cors_origins == '*':
    # Allow all for development - no credentials
    logger.warning("CORS is set to allow all origins (*). Tighten this in production!")
    allow_origins = ["*"]
    allow_credentials = False
elif cors_origins:
    # Custom origins from environment
    allow_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
    # Add production origins to ensure they're always allowed
    for prod_origin in PRODUCTION_ORIGINS:
        if prod_origin not in allow_origins:
            allow_origins.append(prod_origin)
    allow_credentials = True
    logger.info(f"CORS configured with origins: {allow_origins}")
else:
    # No CORS_ORIGINS set - use production defaults
    # This is the fallback for Vercel deployments where env vars might not be properly set
    allow_origins = PRODUCTION_ORIGINS.copy()
    allow_credentials = True
    logger.info(f"CORS using production defaults: {allow_origins}")

# Add Rate Limiting Middleware (added first, runs last)
app.add_middleware(RateLimitMiddleware)

# Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware - MUST be added last so it runs first
app.add_middleware(
    CORSMiddleware,
    allow_credentials=allow_credentials,
    allow_origins=allow_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

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
    
    # Get password policy.  Support both legacy and new field names.
    policy = await db.settings.find_one({"type": "password_policy"}, {"_id": 0})
    expiry_days = 0
    reminder_days = 7
    if policy:
        expiry_days = policy.get("password_expiry_days") or policy.get("max_age_days", 0)
        reminder_days = policy.get("expiry_reminder_days", reminder_days)

    if not expiry_days or expiry_days <= 0:
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
