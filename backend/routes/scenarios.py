from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import base64

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


def get_db():
    from server import db
    return db


class UserRole:
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    TRAINEE = "trainee"


async def get_current_user(request: Request) -> dict:
    from server import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============== MODELS ==============

class PhishingEmailContent(BaseModel):
    from_email: str
    to_email: str = "employee@company.com"
    subject: str
    body: str
    links: List[str] = []


class MaliciousAdContent(BaseModel):
    headline: str
    description: str
    call_to_action: str
    destination_url: str
    image_url: Optional[str] = None


class SocialEngineeringContent(BaseModel):
    scenario_description: str
    dialogue: List[dict]  # [{"speaker": "Caller", "message": "..."}]
    requested_action: str


class ScenarioCreate(BaseModel):
    title: str
    scenario_type: str  # phishing_email, malicious_ads, social_engineering
    difficulty: str  # easy, medium, hard
    correct_answer: str  # safe, unsafe
    explanation: str
    content: dict  # The actual scenario content based on type


class ScenarioUpdate(BaseModel):
    title: Optional[str] = None
    scenario_type: Optional[str] = None
    difficulty: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    content: Optional[dict] = None
    is_active: Optional[bool] = None


# Valid scenario types including new simulation types
VALID_SCENARIO_TYPES = [
    # Original types
    "phishing_email",
    "malicious_ads",
    "social_engineering",
    # New simulation types
    "qr_code_phishing",
    "usb_drop",
    "mfa_fatigue",
    "bec_scenario",
    "data_handling_trap",
    "ransomware_readiness",
    "shadow_it_detection"
]


class ScenarioResponse(BaseModel):
    scenario_id: str
    title: str
    scenario_type: str
    difficulty: str
    correct_answer: str
    explanation: str
    content: dict
    is_active: bool
    created_at: datetime
    created_by: str


# ============== ROUTES ==============

@router.post("", response_model=ScenarioResponse)
async def create_scenario(data: ScenarioCreate, request: Request):
    """Create a new training scenario"""
    user = await require_admin(request)
    db = get_db()
    
    scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
    scenario_doc = {
        "scenario_id": scenario_id,
        "title": data.title,
        "scenario_type": data.scenario_type,
        "difficulty": data.difficulty,
        "correct_answer": data.correct_answer,
        "explanation": data.explanation,
        "content": data.content,
        "is_active": True,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.scenarios.insert_one(scenario_doc)
    
    return ScenarioResponse(
        scenario_id=scenario_id,
        title=data.title,
        scenario_type=data.scenario_type,
        difficulty=data.difficulty,
        correct_answer=data.correct_answer,
        explanation=data.explanation,
        content=data.content,
        is_active=True,
        created_at=datetime.fromisoformat(scenario_doc["created_at"]),
        created_by=user["user_id"]
    )


@router.get("", response_model=List[ScenarioResponse])
async def list_scenarios(
    scenario_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    request: Request = None
):
    """List all scenarios"""
    user = await require_admin(request)
    db = get_db()
    
    query = {}
    if scenario_type:
        query["scenario_type"] = scenario_type
    if difficulty:
        query["difficulty"] = difficulty
    
    scenarios = await db.scenarios.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for s in scenarios:
        created_at = s.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ScenarioResponse(
            scenario_id=s["scenario_id"],
            title=s["title"],
            scenario_type=s["scenario_type"],
            difficulty=s["difficulty"],
            correct_answer=s["correct_answer"],
            explanation=s["explanation"],
            content=s["content"],
            is_active=s.get("is_active", True),
            created_at=created_at,
            created_by=s.get("created_by", "system")
        ))
    
    return result


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(scenario_id: str, request: Request):
    """Get a specific scenario"""
    user = await require_admin(request)
    db = get_db()
    
    scenario = await db.scenarios.find_one({"scenario_id": scenario_id}, {"_id": 0})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    created_at = scenario.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ScenarioResponse(
        scenario_id=scenario["scenario_id"],
        title=scenario["title"],
        scenario_type=scenario["scenario_type"],
        difficulty=scenario["difficulty"],
        correct_answer=scenario["correct_answer"],
        explanation=scenario["explanation"],
        content=scenario["content"],
        is_active=scenario.get("is_active", True),
        created_at=created_at,
        created_by=scenario.get("created_by", "system")
    )


@router.patch("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(scenario_id: str, data: ScenarioUpdate, request: Request):
    """Update a scenario"""
    user = await require_admin(request)
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.scenarios.update_one(
        {"scenario_id": scenario_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return await get_scenario(scenario_id, request)


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str, request: Request):
    """Delete a scenario"""
    user = await require_admin(request)
    db = get_db()
    
    result = await db.scenarios.delete_one({"scenario_id": scenario_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return {"message": "Scenario deleted"}


# ============== BULK IMPORT ==============

@router.post("/import")
async def import_scenarios(request: Request, file: UploadFile = File(...)):
    """
    Import scenarios from CSV file.
    CSV columns: title, scenario_type, difficulty, correct_answer, explanation, content_json
    scenario_type: phishing_email, malicious_ads, social_engineering
    difficulty: easy, medium, hard
    correct_answer: safe, unsafe
    content_json: JSON string with scenario content
    """
    user = await require_admin(request)
    db = get_db()
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    import csv
    import json
    import io
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            # Validate required fields
            required = ['title', 'scenario_type', 'difficulty', 'correct_answer', 'explanation']
            for field in required:
                if not row.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate scenario_type
            valid_types = ['phishing_email', 'malicious_ads', 'social_engineering']
            if row['scenario_type'] not in valid_types:
                raise ValueError(f"Invalid scenario_type. Must be one of: {valid_types}")
            
            # Validate difficulty
            if row['difficulty'] not in ['easy', 'medium', 'hard']:
                raise ValueError("Invalid difficulty. Must be easy, medium, or hard")
            
            # Validate correct_answer
            if row['correct_answer'] not in ['safe', 'unsafe']:
                raise ValueError("Invalid correct_answer. Must be safe or unsafe")
            
            # Parse content JSON
            content = {}
            if row.get('content_json'):
                try:
                    content = json.loads(row['content_json'])
                except json.JSONDecodeError:
                    raise ValueError("Invalid content_json format")
            
            scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
            scenario_doc = {
                "scenario_id": scenario_id,
                "title": row['title'].strip(),
                "scenario_type": row['scenario_type'],
                "difficulty": row['difficulty'],
                "correct_answer": row['correct_answer'],
                "explanation": row['explanation'].strip(),
                "content": content,
                "is_active": True,
                "created_by": user["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.scenarios.insert_one(scenario_doc)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Import completed. {imported} scenarios imported.",
        "imported": imported,
        "errors": errors
    }


@router.get("/export")
async def export_scenarios(request: Request):
    """Export all scenarios as JSON for backup"""
    user = await require_admin(request)
    db = get_db()
    
    scenarios = await db.scenarios.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "scenarios": scenarios,
        "count": len(scenarios),
        "exported_at": datetime.now(timezone.utc).isoformat()
    }



# ============== GET RANDOM SCENARIO FOR TRAINING ==============

@router.get("/training/{scenario_type}/random")
async def get_random_scenario(scenario_type: str, exclude_ids: str = "", request: Request = None):
    """Get a random active scenario for training, excluding already seen ones"""
    db = get_db()
    
    # Map module types to scenario types
    type_mapping = {
        "phishing_email": "phishing_email",
        "phishing email": "phishing_email",
        "malicious_ads": "malicious_ads",
        "malicious ads": "malicious_ads",
        "social_engineering": "social_engineering",
        "social engineering": "social_engineering",
    }
    
    mapped_type = type_mapping.get(scenario_type.lower(), scenario_type)
    
    # Parse excluded IDs
    excluded = [id.strip() for id in exclude_ids.split(",") if id.strip()]
    
    query = {
        "scenario_type": mapped_type,
        "is_active": True
    }
    
    if excluded:
        query["scenario_id"] = {"$nin": excluded}
    
    # Get all matching scenarios and pick random
    scenarios = await db.scenarios.find(query, {"_id": 0}).to_list(100)
    
    if not scenarios:
        # Return None if no custom scenarios, training will use templates
        return {"scenario": None, "source": "templates"}
    
    import random
    scenario = random.choice(scenarios)
    
    return {
        "scenario": scenario,
        "source": "custom"
    }
