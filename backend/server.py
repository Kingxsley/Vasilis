from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'vasilisnetshield-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Create the main app
app = FastAPI(title="VasilisNetShield API")

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

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
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
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
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

@user_router.post("", response_model=UserResponse)
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
    
    return UserResponse(
        user_id=user_id,
        email=data.email,
        name=data.name,
        role=data.role,
        organization_id=data.organization_id,
        picture=None,
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )

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
    """Generate a training scenario using AI or fallback to templates"""
    scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
    
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
    total_campaigns = await db.campaigns.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
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

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "VasilisNetShield API", "version": "1.0.0"}

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(org_router)
api_router.include_router(user_router)
api_router.include_router(campaign_router)
api_router.include_router(training_router)
api_router.include_router(ai_router)

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
