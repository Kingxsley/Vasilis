"""
Pydantic schemas for VasilisNetShield API.
Extracted from server.py for better modularity and reusability.
"""
import html
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from middleware.security import PasswordPolicy


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize input string to prevent XSS and injection attacks"""
    if not value:
        return value
    value = value.replace('\x00', '')
    value = html.escape(value)
    return value[:max_length]


# ============== User Roles ==============
class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    TRAINEE = "trainee"


# ============== Auth Models ==============
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
    requires_2fa_verification: Optional[bool] = False
    two_factor_enabled: Optional[bool] = False


class TwoFactorSetupResponse(BaseModel):
    secret: str
    otp_auth_url: str


class TwoFactorVerifyRequest(BaseModel):
    code: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


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


# ============== Organization Models ==============
class OrganizationCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    certificate_template_id: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    certificate_template_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None


class OrganizationResponse(BaseModel):
    organization_id: str
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    user_count: int = 0
    certificate_template_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None


# ============== Campaign Models ==============
class CampaignCreate(BaseModel):
    name: str
    organization_id: str
    campaign_type: str
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


# ============== Training Models ==============
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
    pass_percentage: Optional[int] = 70
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


class TrainingModuleCreate(BaseModel):
    name: str
    module_type: str
    description: str
    difficulty: str
    duration_minutes: int
    scenarios_count: int = 0
    scenarios: Optional[List[str]] = None
    questions: Optional[List[dict]] = None
    questions_per_session: Optional[int] = None
    pass_percentage: Optional[int] = 70
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
    pass_percentage: Optional[int] = None
    certificate_template_id: Optional[str] = None
    is_active: Optional[bool] = None


class TrainingReassignRequest(BaseModel):
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


# ============== AI Models ==============
class AIGenerateRequest(BaseModel):
    scenario_type: str
    difficulty: str
    context: Optional[str] = None


class AIGenerateResponse(BaseModel):
    content: dict
    correct_answer: str
    explanation: str


# ============== User Management Models ==============
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


# ============== Analytics Models ==============
class DashboardStats(BaseModel):
    total_organizations: int
    total_users: int
    total_campaigns: int
    active_campaigns: int
    total_training_sessions: int
    average_score: float
    total_scenarios: int = 0
    scenario_types: dict = {}
