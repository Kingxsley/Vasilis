from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


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
    discord_webhook_url: Optional[str] = None  # Discord webhook for organization notifications


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    discord_webhook_url: Optional[str] = None  # Discord webhook for organization notifications
    # Allow administrators to specify a default certificate template for the organization.
    certificate_template_id: Optional[str] = None


class OrganizationResponse(BaseModel):
    organization_id: str
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    user_count: int = 0
    discord_webhook_url: Optional[str] = None  # Discord webhook for organization notifications
    certificate_template_id: Optional[str] = None


# Campaign Models
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


# Training Models
class TrainingModuleResponse(BaseModel):
    module_id: str
    name: str
    module_type: str
    description: str
    difficulty: str
    duration_minutes: int
    # List of scenario IDs associated with this module. When empty, the
    # system will generate scenarios on the fly based on the module type.
    scenarios: Optional[List[str]] = Field(default_factory=list)
    # For backwards compatibility, scenarios_count is retained. When
    # scenarios are provided, this value will be derived from their length.
    scenarios_count: int
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
    started_at: datetime
    completed_at: Optional[datetime] = None

# --- New Schemas for Module Management and Reassignment ---

class TrainingModuleCreate(BaseModel):
    """
    Schema for creating a new training module. Super administrators or
    organization administrators can use this to define custom training
    modules rather than relying on the hard‑coded defaults. Additional
    fields allow administrators to control the availability of the module,
    associate a specific certificate template with it, and specify a
    sequence of predefined scenarios for the module. If `scenarios` is
    provided, the system will use the specified scenario IDs in the
    given order. Otherwise the module will fall back to generating
    scenarios based on its type.
    """
    name: str
    module_type: str
    description: str
    difficulty: str
    duration_minutes: int
    # Optional list of scenario IDs for this module. When provided,
    # scenarios_count will be derived from its length.
    scenarios: Optional[List[str]] = Field(default_factory=list)
    scenarios_count: int
    certificate_template_id: Optional[str] = None
    is_active: bool = True


class TrainingModuleUpdate(BaseModel):
    """
    Schema for updating an existing training module. All fields are
    optional; only the provided values will be updated. Super admins or
    organization administrators can pause/activate modules, change the
    associated certificate template, adjust metadata or provide a new
    sequence of scenarios without affecting other fields. When
    `scenarios` is provided, the `scenarios_count` will be updated
    automatically to match its length.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    scenarios: Optional[List[str]] = None
    scenarios_count: Optional[int] = None
    certificate_template_id: Optional[str] = None
    is_active: Optional[bool] = None


class TrainingReassignRequest(BaseModel):
    """
    Payload for reassigning one or more training modules to multiple
    users. When `module_ids` is omitted or empty, all active modules will
    be reassigned. Only super administrators or organization
    administrators can reassign training. This endpoint is used in
    response to phishing campaigns where employees clicked a malicious
    link and need to repeat training.
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
    scenario_type: str
    difficulty: str
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


# ============== PHISHING SIMULATION MODELS ==============

class PhishingTemplateCreate(BaseModel):
    name: str
    subject: str
    sender_name: str
    sender_email: str
    body_html: str
    body_text: Optional[str] = None


class PhishingTemplateResponse(BaseModel):
    template_id: str
    name: str
    subject: str
    sender_name: str
    sender_email: str
    body_html: str
    body_text: Optional[str] = None
    created_at: datetime
    created_by: str


class PhishingCampaignCreate(BaseModel):
    name: str
    organization_id: str
    template_id: str
    target_user_ids: List[str]
    landing_page_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    assigned_module_id: Optional[str] = None
    click_page_html: Optional[str] = None


class PhishingCampaignResponse(BaseModel):
    campaign_id: str
    name: str
    organization_id: str
    template_id: str
    status: str
    total_targets: int
    emails_sent: int
    emails_opened: int
    links_clicked: int
    assigned_module_id: Optional[str] = None
    click_page_html: Optional[str] = None
    created_at: datetime
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PhishingTargetResponse(BaseModel):
    target_id: str
    campaign_id: str
    user_id: str
    user_email: str
    user_name: str
    tracking_code: str
    email_sent: bool
    email_sent_at: Optional[datetime] = None
    email_opened: bool
    email_opened_at: Optional[datetime] = None
    link_clicked: bool
    link_clicked_at: Optional[datetime] = None
    click_ip: Optional[str] = None
    click_user_agent: Optional[str] = None
    # Credential submission tracking
    credentials_submitted: bool = False
    credentials_submitted_at: Optional[datetime] = None


class PhishingStatsResponse(BaseModel):
    campaign_id: str
    campaign_name: str
    total_targets: int
    emails_sent: int
    emails_opened: int
    links_clicked: int
    credentials_submitted: int = 0  # Track credential submissions
    open_rate: float
    click_rate: float
    submission_rate: float = 0.0  # Credential submission rate
    status: str
