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
    scenario_type: str  # phishing_email, malicious_ads, social_engineering, question_group, etc.
    difficulty: str  # easy, medium, hard
    correct_answer: str  # safe, unsafe
    explanation: str
    # For normal scenarios the content holds the scenario details.  For
    # grouped scenarios (scenario_type == 'question_group'), this may be
    # omitted.  The frontend should send an empty object when using
    # child_scenarios instead of content.
    content: dict  # The actual scenario content based on type
    # Optional list of child scenario IDs.  If provided, this scenario
    # acts as a container for multiple scenarios.  When a training
    # session encounters this scenario, it will be expanded into the
    # referenced child scenarios.
    child_scenarios: Optional[List[str]] = None


class ScenarioUpdate(BaseModel):
    title: Optional[str] = None
    scenario_type: Optional[str] = None
    difficulty: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    content: Optional[dict] = None
    child_scenarios: Optional[List[str]] = None
    is_active: Optional[bool] = None


# Valid scenario types including new simulation types
VALID_SCENARIO_TYPES = [
    # Original types
    "phishing_email",
    "malicious_ads",
    "social_engineering",
    # New simulation types
    "qr_code_phishing",
    "qr_phishing",
    "usb_drop",
    "mfa_fatigue",
    "bec_scenario",
    "bec",
    "credential_harvest",
    "data_handling_trap",
    "ransomware_readiness",
    "shadow_it_detection",
    "smishing",
    "malicious_ad"
    , "question_group"
]


class ScenarioResponse(BaseModel):
    scenario_id: str
    title: str
    scenario_type: str
    difficulty: str
    correct_answer: str
    explanation: str
    content: dict
    # List of child scenario IDs if this is a grouped scenario.  May
    # be None or empty for normal scenarios.
    child_scenarios: Optional[List[str]] = None
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
    # Build scenario document.  Include child_scenarios if provided so
    # group scenarios can reference multiple child scenario IDs.
    scenario_doc = {
        "scenario_id": scenario_id,
        "title": data.title,
        "scenario_type": data.scenario_type,
        "difficulty": data.difficulty,
        "correct_answer": data.correct_answer,
        "explanation": data.explanation,
        "content": data.content,
        "child_scenarios": data.child_scenarios,
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
        child_scenarios=data.child_scenarios,
        is_active=True,
        created_at=datetime.fromisoformat(scenario_doc["created_at"]),
        created_by=user["user_id"]
    )


@router.get("/types")
async def get_scenario_types(request: Request):
    """Get all available scenario types"""
    await require_admin(request)
    
    return {
        "types": VALID_SCENARIO_TYPES,
        "descriptions": {
            "phishing_email": "Email phishing detection training",
            "malicious_ads": "Malicious advertisement recognition",
            "social_engineering": "Social engineering defense scenarios",
            "qr_code_phishing": "QR code phishing awareness",
            "usb_drop": "USB drop attack simulation",
            "mfa_fatigue": "Multi-factor authentication fatigue attacks",
            "bec_scenario": "Business email compromise scenarios",
            "data_handling_trap": "Data handling and privacy traps",
            "ransomware_readiness": "Ransomware preparedness drills",
            "shadow_it_detection": "Shadow IT detection training"
        }
    }


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
            content=s.get("content", {}),
            child_scenarios=s.get("child_scenarios"),
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
        content=scenario.get("content", {}),
        child_scenarios=scenario.get("child_scenarios"),
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



# ============== NEW SIMULATION TYPES ==============

@router.post("/seed-templates")
async def seed_simulation_templates(request: Request):
    """Seed the database with default simulation templates for all types"""
    user = await require_admin(request)
    db = get_db()
    
    # Only super admins can seed templates
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can seed templates")
    
    templates = get_default_simulation_templates()
    
    seeded_count = 0
    skipped_count = 0
    
    for template in templates:
        # Check if a similar template already exists
        existing = await db.scenarios.find_one({
            "title": template["title"],
            "scenario_type": template["scenario_type"]
        })
        
        if existing:
            skipped_count += 1
            continue
        
        scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
        scenario_doc = {
            "scenario_id": scenario_id,
            "title": template["title"],
            "scenario_type": template["scenario_type"],
            "difficulty": template["difficulty"],
            "correct_answer": template["correct_answer"],
            "explanation": template["explanation"],
            "content": template["content"],
            "is_active": True,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_template": True  # Mark as system template
        }
        
        await db.scenarios.insert_one(scenario_doc)
        seeded_count += 1
    
    return {
        "message": "Templates seeded successfully",
        "seeded": seeded_count,
        "skipped": skipped_count,
        "total_templates": len(templates)
    }


def get_default_simulation_templates():
    """Get all default simulation templates for new simulation types"""
    templates = []
    
    # QR Code Phishing Templates (5)
    templates.extend([
        {
            "title": "Free WiFi QR Code",
            "scenario_type": "qr_code_phishing",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "QR codes on random flyers promising free WiFi are often used to redirect users to malicious websites or harvest credentials. Always verify the source before scanning.",
            "content": {
                "location": "Coffee shop bulletin board",
                "qr_description": "FREE HIGH-SPEED WIFI - Scan to Connect!",
                "visual_cues": ["Handwritten flyer", "No business branding", "Generic design"],
                "claimed_destination": "wifi-connect.com",
                "actual_destination": "kredential-harvest.xyz/wifi"
            }
        },
        {
            "title": "Parking Ticket QR Code",
            "scenario_type": "qr_code_phishing",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Fake parking tickets with QR codes are a common scam. Legitimate parking tickets typically have official government branding and don't require scanning random QR codes for payment.",
            "content": {
                "location": "Car windshield",
                "qr_description": "PARKING VIOLATION - Scan to pay fine and avoid towing",
                "visual_cues": ["Looks official but no city logo", "Urgency language", "No ticket number"],
                "claimed_destination": "city-parking-pay.com",
                "actual_destination": "payment-scam.ru/parking"
            }
        },
        {
            "title": "Restaurant Menu QR Code",
            "scenario_type": "qr_code_phishing",
            "difficulty": "hard",
            "correct_answer": "safe",
            "explanation": "This QR code is on the official restaurant table tent with proper branding and leads to the legitimate restaurant website. QR menus became common post-pandemic.",
            "content": {
                "location": "Restaurant table tent",
                "qr_description": "Scan for Digital Menu",
                "visual_cues": ["Official restaurant branding", "Professionally printed", "Staff confirms it"],
                "claimed_destination": "menu.joes-diner.com",
                "actual_destination": "menu.joes-diner.com"
            }
        },
        {
            "title": "Cryptocurrency Giveaway QR",
            "scenario_type": "qr_code_phishing",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "Cryptocurrency giveaway scams are extremely common. No legitimate company gives away crypto for free via random QR codes. This is designed to steal your wallet credentials.",
            "content": {
                "location": "Social media post / Street poster",
                "qr_description": "ELON MUSK BITCOIN GIVEAWAY! Scan & receive 0.5 BTC FREE!",
                "visual_cues": ["Too good to be true", "Celebrity endorsement", "Urgency timer"],
                "claimed_destination": "tesla-crypto-giveaway.com",
                "actual_destination": "wallet-stealer.xyz"
            }
        },
        {
            "title": "Package Delivery QR Code",
            "scenario_type": "qr_code_phishing",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Unexpected package delivery notices with QR codes are often phishing attempts. Legitimate carriers provide tracking numbers and don't require QR code scanning for redelivery.",
            "content": {
                "location": "Door notice",
                "qr_description": "MISSED DELIVERY - Scan to reschedule",
                "visual_cues": ["Generic carrier branding", "No tracking number", "Requires personal info"],
                "claimed_destination": "fedex-redelivery.com",
                "actual_destination": "delivery-scam.net/info"
            }
        }
    ])
    
    # USB Drop Simulation Templates (5)
    templates.extend([
        {
            "title": "Parking Lot USB Drive",
            "scenario_type": "usb_drop",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "USB drives found in parking lots are a classic social engineering attack vector. They may contain malware that executes automatically when plugged in.",
            "content": {
                "location": "Company parking lot near entrance",
                "usb_appearance": "Plain black USB drive",
                "label": "None",
                "files_visible": ["Confidential_Salaries.xlsx", "Layoff_List.pdf"],
                "lure_type": "curiosity"
            }
        },
        {
            "title": "Conference Swag USB",
            "scenario_type": "usb_drop",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Even USB drives from conferences can be compromised. If you didn't receive it directly from a trusted vendor, don't plug it in.",
            "content": {
                "location": "Conference registration desk (unattended)",
                "usb_appearance": "Branded USB with tech company logo",
                "label": "TECH SUMMIT 2024 - Presentation Files",
                "files_visible": ["Keynote_Slides.pptx", "Attendee_List.xlsx"],
                "lure_type": "trust/branding"
            }
        },
        {
            "title": "HR Department USB",
            "scenario_type": "usb_drop",
            "difficulty": "hard",
            "correct_answer": "unsafe",
            "explanation": "USB drives labeled with sensitive department names are designed to exploit curiosity. Even if it looks internal, found USB drives should be reported to IT, not plugged in.",
            "content": {
                "location": "Break room table",
                "usb_appearance": "USB with company logo sticker",
                "label": "HR - CONFIDENTIAL - Performance Reviews Q4",
                "files_visible": ["Review_Summary.docx", "Bonus_Structure.xlsx"],
                "lure_type": "internal trust + curiosity"
            }
        },
        {
            "title": "Returned Equipment USB",
            "scenario_type": "usb_drop",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "USB drives in returned equipment should always go through IT for sanitization. Never plug in drives from unknown sources.",
            "content": {
                "location": "IT equipment return bin",
                "usb_appearance": "Generic USB in laptop bag pocket",
                "label": "Backup - John's Files",
                "files_visible": ["Photos", "Documents", "Work_Projects"],
                "lure_type": "helpfulness"
            }
        },
        {
            "title": "IT Department Issued USB",
            "scenario_type": "usb_drop",
            "difficulty": "hard",
            "correct_answer": "safe",
            "explanation": "This USB was directly handed to you by a verified IT staff member for a specific purpose. Following proper procedure, it's safe to use for the intended task.",
            "content": {
                "location": "IT help desk - handed directly by technician",
                "usb_appearance": "Company-branded secure USB",
                "label": "IT DEPT - Software Update v2.1",
                "files_visible": ["Update_Instructions.txt", "Installer.exe"],
                "lure_type": "legitimate",
                "verification": "IT technician confirmed identity, logged in asset management"
            }
        }
    ])
    
    # MFA Fatigue Templates (5)
    templates.extend([
        {
            "title": "Late Night Push Notifications",
            "scenario_type": "mfa_fatigue",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Multiple MFA requests at unusual hours (especially when you're not trying to log in) indicate an attacker has your password. Never approve unexpected MFA requests.",
            "content": {
                "time": "2:47 AM",
                "notification_count": 5,
                "request_source": "Microsoft 365",
                "location_shown": "Unknown location - Russia",
                "user_action": "You were sleeping, not attempting login",
                "attacker_tactic": "Hoping user approves to stop notifications"
            }
        },
        {
            "title": "Rapid Fire Authentication Requests",
            "scenario_type": "mfa_fatigue",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "When you receive many MFA requests in quick succession without initiating them, an attacker is trying to fatigue you into approving. Report to IT immediately.",
            "content": {
                "time": "During work hours",
                "notification_count": 12,
                "request_source": "Corporate VPN",
                "location_shown": "Your city (spoofed)",
                "user_action": "You're not trying to connect to VPN",
                "attacker_tactic": "Overwhelming user with requests"
            }
        },
        {
            "title": "Followed by Phone Call",
            "scenario_type": "mfa_fatigue",
            "difficulty": "hard",
            "correct_answer": "unsafe",
            "explanation": "Attackers often combine MFA fatigue with social engineering calls claiming to be IT support. Legitimate IT will never ask you to approve an MFA request they initiated.",
            "content": {
                "time": "Business hours",
                "notification_count": 3,
                "request_source": "Okta SSO",
                "follow_up": "Phone call from 'IT Support' asking you to approve",
                "caller_claim": "We're testing the authentication system, please approve the request",
                "attacker_tactic": "Social engineering + MFA fatigue combo"
            }
        },
        {
            "title": "Single Legitimate Request",
            "scenario_type": "mfa_fatigue",
            "difficulty": "easy",
            "correct_answer": "safe",
            "explanation": "You just entered your password and immediately received one MFA request from the expected service. This is normal authentication flow.",
            "content": {
                "time": "Just now",
                "notification_count": 1,
                "request_source": "Gmail",
                "location_shown": "Your current location",
                "user_action": "You just entered your Gmail password",
                "context": "Expected single request after password entry"
            }
        },
        {
            "title": "Push After Password Reset",
            "scenario_type": "mfa_fatigue",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "If you didn't request a password reset, receiving MFA notifications means someone else did. This is a sign your account may be compromised.",
            "content": {
                "time": "Morning",
                "notification_count": 2,
                "request_source": "Password Reset - Corporate Email",
                "location_shown": "Different country",
                "user_action": "You did NOT request a password reset",
                "attacker_tactic": "Triggered password reset, hoping user approves MFA"
            }
        }
    ])
    
    # BEC (Business Email Compromise) Templates (5)
    templates.extend([
        {
            "title": "Urgent Wire Transfer Request",
            "scenario_type": "bec_scenario",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "CEO fraud is a common BEC attack. Real executives don't request urgent wire transfers via email, especially to new accounts. Always verify through a known phone number.",
            "content": {
                "from_display": "CEO Name",
                "from_email": "ceo.name@company-corp.com",
                "real_domain": "company.com",
                "subject": "Urgent & Confidential - Wire Transfer Needed",
                "body": "I need you to process a wire transfer immediately for a confidential acquisition. This is time-sensitive - I'm in meetings all day so email only. Send $45,000 to the account details attached.",
                "red_flags": ["Urgency", "Secrecy", "Cannot call", "Wrong email domain"]
            }
        },
        {
            "title": "Vendor Payment Update",
            "scenario_type": "bec_scenario",
            "difficulty": "hard",
            "correct_answer": "unsafe",
            "explanation": "Attackers often compromise vendor email accounts or spoof them to redirect payments. Always verify banking changes through established phone numbers, not ones in the email.",
            "content": {
                "from_display": "Accounts Receivable - Regular Vendor",
                "from_email": "ar@vendor-company.com",
                "subject": "Updated Banking Information for Future Payments",
                "body": "Due to our bank transition, please update our payment details for all future invoices. Our new account details are attached. Please confirm receipt.",
                "red_flags": ["Banking change request", "No prior notice", "Different contact person"]
            }
        },
        {
            "title": "Legitimate Internal Request",
            "scenario_type": "bec_scenario",
            "difficulty": "medium",
            "correct_answer": "safe",
            "explanation": "This request follows normal procedures: correct email domain, reasonable request, proper authorization chain, and verifiable through internal systems.",
            "content": {
                "from_display": "Finance Manager",
                "from_email": "finance.manager@yourcompany.com",
                "subject": "Q4 Budget Approval - Your Department",
                "body": "Please review and approve your department's Q4 budget in the finance portal by Friday. Let me know if you have questions - I'm available at ext. 4521.",
                "verification": ["Correct domain", "Normal process", "Verifiable contact", "No urgency pressure"]
            }
        },
        {
            "title": "Gift Card Request",
            "scenario_type": "bec_scenario",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "Gift card requests from executives are almost always scams. Legitimate business expenses never involve purchasing gift cards and sending photos of codes.",
            "content": {
                "from_display": "HR Director",
                "from_email": "hr.director@company-hr.net",
                "subject": "Employee Appreciation - Need Your Help",
                "body": "I need you to purchase 10 Amazon gift cards ($100 each) for employee appreciation. Keep this confidential. Buy them, scratch off the codes, and email me photos of the backs. I'll reimburse you.",
                "red_flags": ["Gift cards", "Secrecy", "Wrong domain", "Photo of codes"]
            }
        },
        {
            "title": "Payroll Direct Deposit Change",
            "scenario_type": "bec_scenario",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Attackers target payroll to redirect employee salaries. Legitimate direct deposit changes require going through official HR channels and identity verification.",
            "content": {
                "from_display": "Employee Name",
                "from_email": "employeename@gmail.com",
                "subject": "Update My Direct Deposit Information",
                "body": "Hi HR, please update my direct deposit to my new bank account. I've attached the new routing and account numbers. Please process before the next pay period.",
                "red_flags": ["Personal email", "No verification", "Pressure for timing"]
            }
        }
    ])
    
    # Data Handling Trap Templates (5)
    templates.extend([
        {
            "title": "USB Data Transfer Request",
            "scenario_type": "data_handling_trap",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Copying customer data to personal USB drives violates data protection policies. Data should only be transferred through approved secure channels.",
            "content": {
                "scenario": "Coworker asks to copy customer database to their personal USB drive 'for working from home'",
                "data_type": "Customer PII including addresses and payment info",
                "requestor": "Colleague from different department",
                "justification": "VPN is too slow, need to work on reports at home",
                "policy_violation": "Unauthorized data transfer, PII exposure risk"
            }
        },
        {
            "title": "Cloud Upload for Collaboration",
            "scenario_type": "data_handling_trap",
            "difficulty": "hard",
            "correct_answer": "unsafe",
            "explanation": "Using personal cloud storage for company data violates security policies. Use approved file sharing systems like SharePoint or approved cloud storage.",
            "content": {
                "scenario": "Team lead suggests uploading project files to personal Google Drive for easier collaboration with contractors",
                "data_type": "Confidential project plans and customer requirements",
                "requestor": "Team lead with good intentions",
                "justification": "It's easier than requesting contractor access to our systems",
                "policy_violation": "Data stored on unauthorized systems, no access controls"
            }
        },
        {
            "title": "Proper Data Request Process",
            "scenario_type": "data_handling_trap",
            "difficulty": "easy",
            "correct_answer": "safe",
            "explanation": "This follows proper data handling procedures: formal request, manager approval, documented purpose, and use of secure approved systems.",
            "content": {
                "scenario": "Analyst requests sales data through official data request portal with manager approval",
                "data_type": "Aggregated sales figures (no PII)",
                "requestor": "Authorized analyst with documented need",
                "justification": "Quarterly report preparation - approved by manager",
                "process": "Official request form, approval workflow, data delivered via secure portal"
            }
        },
        {
            "title": "Emailing Sensitive Documents",
            "scenario_type": "data_handling_trap",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Emailing spreadsheets with PII to personal email addresses violates data protection policies. Use secure file transfer methods and only to authorized recipients.",
            "content": {
                "scenario": "Manager asks you to email employee salary spreadsheet to their personal Gmail for 'backup'",
                "data_type": "Employee salaries, SSN last 4 digits, addresses",
                "requestor": "Your direct manager",
                "justification": "Company email might have issues over the weekend",
                "policy_violation": "PII sent to unauthorized external email"
            }
        },
        {
            "title": "Disposing of Old Hard Drives",
            "scenario_type": "data_handling_trap",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "Old hard drives must be properly sanitized or destroyed through IT, not thrown in regular trash. Data on 'deleted' drives can often be recovered.",
            "content": {
                "scenario": "IT asks you to throw away old hard drives from decommissioned computers in the regular trash",
                "data_type": "Unknown - drives are 'wiped'",
                "requestor": "IT intern handling e-waste",
                "justification": "Drives were reformatted so they're safe to trash",
                "policy_violation": "Improper disposal, data recovery risk"
            }
        }
    ])
    
    # Ransomware Readiness Templates (5)
    templates.extend([
        {
            "title": "Suspicious Email Attachment",
            "scenario_type": "ransomware_readiness",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "Unexpected invoice attachments, especially ZIP files from unknown senders, are a primary ransomware delivery method. Never open attachments you weren't expecting.",
            "content": {
                "scenario": "You receive an email with 'Invoice_12345.zip' attachment from an unknown company",
                "sender": "billing@unknown-vendor.com",
                "subject": "URGENT: Overdue Invoice Requires Immediate Payment",
                "attachment": "Invoice_12345.zip (contains Invoice.exe)",
                "red_flags": ["Unknown sender", "ZIP attachment", "Urgency", ".exe inside ZIP"]
            }
        },
        {
            "title": "Pop-up Warning Message",
            "scenario_type": "ransomware_readiness",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Fake virus warnings that prompt you to download 'cleaning' software are a social engineering tactic to install ransomware. Use only official antivirus tools.",
            "content": {
                "scenario": "Browser pop-up claims 'Your computer is infected! Download security scan now!'",
                "appearance": "Looks like official Microsoft warning",
                "action_prompted": "Click to download 'Microsoft Security Scanner'",
                "actual_result": "Downloads ransomware disguised as security tool",
                "red_flags": ["Browser pop-up", "Urgency", "Download request", "Unofficial source"]
            }
        },
        {
            "title": "Legitimate Security Update",
            "scenario_type": "ransomware_readiness",
            "difficulty": "hard",
            "correct_answer": "safe",
            "explanation": "This is a legitimate Windows Update notification from the official system settings. Regular patching is essential for ransomware prevention.",
            "content": {
                "scenario": "Windows Settings shows available security updates requiring restart",
                "source": "Windows Update in Settings app",
                "update_type": "KB5034441 - Security Update",
                "verification": "Accessed through Start > Settings > Windows Update",
                "action": "Install updates during approved maintenance window"
            }
        },
        {
            "title": "Remote Desktop Attack Attempt",
            "scenario_type": "ransomware_readiness",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Unexpected remote access requests should never be granted. Legitimate IT support will contact you through official channels first.",
            "content": {
                "scenario": "Pop-up asking to allow remote connection from 'IT Support'",
                "source": "Unexpected Remote Desktop connection request",
                "caller_claim": "I'm from Microsoft/IT, we detected issues on your computer",
                "actual_intent": "Attacker attempting to install ransomware",
                "red_flags": ["Unsolicited contact", "Remote access request", "Urgency"]
            }
        },
        {
            "title": "Macro-Enabled Document",
            "scenario_type": "ransomware_readiness",
            "difficulty": "easy",
            "correct_answer": "unsafe",
            "explanation": "Documents requesting you to 'Enable Content' or 'Enable Macros' can execute malicious code. Never enable macros in documents from external sources.",
            "content": {
                "scenario": "Word document from unknown sender shows 'Enable Content' warning",
                "sender": "External email from 'shipping company'",
                "document": "Delivery_Details.docm",
                "warning_shown": "SECURITY WARNING: Macros have been disabled",
                "red_flags": ["Macro-enabled document", "External sender", "'Enable Content' prompt"]
            }
        }
    ])
    
    # Shadow IT Detection Templates (5)
    templates.extend([
        {
            "title": "Unauthorized Cloud Storage",
            "scenario_type": "shadow_it_detection",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Using personal Dropbox for work files is shadow IT. It bypasses security controls and data loss prevention. Use approved company storage systems.",
            "content": {
                "scenario": "Team member suggests using personal Dropbox to share large project files",
                "tool": "Personal Dropbox account",
                "data_involved": "Project documentation and client files",
                "justification": "Company file share is too slow",
                "risks": ["No DLP", "No audit trail", "Data exposure", "Compliance violation"]
            }
        },
        {
            "title": "Using Approved Collaboration Tool",
            "scenario_type": "shadow_it_detection",
            "difficulty": "easy",
            "correct_answer": "safe",
            "explanation": "Microsoft Teams is an IT-approved collaboration tool with proper security controls. This is the correct way to share files and collaborate.",
            "content": {
                "scenario": "Colleague invites you to a Teams channel for project collaboration",
                "tool": "Microsoft Teams (company approved)",
                "data_involved": "Project discussions and file sharing",
                "verification": "Tool listed in company approved software list",
                "security": "SSO enabled, DLP active, audit logging"
            }
        },
        {
            "title": "Personal Communication App",
            "scenario_type": "shadow_it_detection",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Using WhatsApp for work communications creates security and compliance risks. Business communications should use approved channels for record-keeping and security.",
            "content": {
                "scenario": "Manager creates WhatsApp group for 'quick team updates'",
                "tool": "Personal WhatsApp accounts",
                "data_involved": "Work discussions, customer names, project details",
                "justification": "Faster than email, everyone already has it",
                "risks": ["No company control", "Personal device mixing", "No archiving", "GDPR issues"]
            }
        },
        {
            "title": "Unauthorized AI Tool",
            "scenario_type": "shadow_it_detection",
            "difficulty": "hard",
            "correct_answer": "unsafe",
            "explanation": "Using unauthorized AI tools with company data can expose sensitive information to third parties. Only use IT-approved AI services with proper data handling agreements.",
            "content": {
                "scenario": "Colleague recommends pasting customer support tickets into free AI tool to draft responses",
                "tool": "Free online AI chatbot (not approved)",
                "data_involved": "Customer names, account numbers, issue details",
                "justification": "It makes writing responses so much faster!",
                "risks": ["Data sent to third party", "No privacy agreement", "Customer data exposure", "Compliance violation"]
            }
        },
        {
            "title": "Personal Project Management Tool",
            "scenario_type": "shadow_it_detection",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "Setting up team projects in personal Trello accounts circumvents security and creates data sprawl. Request proper tools through IT channels.",
            "content": {
                "scenario": "Team lead sets up personal Trello board for tracking department projects",
                "tool": "Personal Trello account",
                "data_involved": "Project timelines, task assignments, client deliverables",
                "justification": "Our official PM tool is too complicated",
                "risks": ["Data outside company control", "Access management issues", "No backup policy", "Employee departure risks"]
            }
        }
    ])
    
    return templates
