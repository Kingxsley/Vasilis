"""
Events Management Routes - Full event system with calendar, RSVP, and ICS support
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY
from dateutil.parser import parse as parse_date
import uuid
import io
import logging
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])


def get_db():
    from server import db
    return db


async def get_current_user(request: Request) -> dict:
    from utils import get_current_user as _get_current_user, security
    credentials = await security(request)
    return await _get_current_user(request, credentials)


async def require_super_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# Pydantic Models
class RecurrenceRule(BaseModel):
    frequency: str  # daily, weekly, monthly, yearly
    interval: int = 1
    end_date: Optional[str] = None
    count: Optional[int] = None


class EventCreate(BaseModel):
    title: str
    description: str  # Rich text HTML content from visual editor
    start_date: str
    end_date: Optional[str] = None
    location: Optional[str] = None
    location_url: Optional[str] = None  # Google Maps link etc
    is_all_day: bool = False
    recurrence: Optional[RecurrenceRule] = None
    max_attendees: Optional[int] = None
    requires_rsvp: bool = False
    reminder_hours: Optional[int] = 24  # Hours before event to send reminder
    photo_url: Optional[str] = None
    published: bool = True


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    location_url: Optional[str] = None
    is_all_day: Optional[bool] = None
    recurrence: Optional[RecurrenceRule] = None
    max_attendees: Optional[int] = None
    requires_rsvp: Optional[bool] = None
    reminder_hours: Optional[int] = None
    photo_url: Optional[str] = None
    published: Optional[bool] = None


class RSVPCreate(BaseModel):
    name: str
    email: EmailStr
    notes: Optional[str] = None


# ============== EVENT CRUD ==============

@router.post("")
async def create_event(data: EventCreate, request: Request):
    """Create a new event (super admin only)"""
    user = await require_super_admin(request)
    db = get_db()
    
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    event_doc = {
        "event_id": event_id,
        "title": data.title,
        "description": data.description,
        "start_date": data.start_date,
        "end_date": data.end_date or data.start_date,
        "location": data.location,
        "location_url": data.location_url,
        "is_all_day": data.is_all_day,
        "recurrence": data.recurrence.dict() if data.recurrence else None,
        "max_attendees": data.max_attendees,
        "requires_rsvp": data.requires_rsvp,
        "reminder_hours": data.reminder_hours,
        "reminder_sent": False,
        "photo_url": data.photo_url,
        "published": data.published,
        "rsvps": [],
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.insert_one(event_doc)
    
    # Remove _id for response
    event_doc.pop("_id", None)
    
    return {"message": "Event created", "event": event_doc}


@router.get("")
async def list_events(
    request: Request,
    start: Optional[str] = None,
    end: Optional[str] = None,
    published_only: bool = True
):
    """List events, optionally filtered by date range"""
    db = get_db()
    
    query = {}
    if published_only:
        query["published"] = True
    
    if start:
        query["start_date"] = {"$gte": start}
    if end:
        if "start_date" in query:
            query["start_date"]["$lte"] = end
        else:
            query["start_date"] = {"$lte": end}
    
    events = await db.events.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    
    # Expand recurring events
    expanded_events = []
    for event in events:
        if event.get("recurrence"):
            expanded = expand_recurring_event(event, start, end)
            expanded_events.extend(expanded)
        else:
            expanded_events.append(event)
    
    # Sort by start date
    expanded_events.sort(key=lambda x: x.get("start_date", ""))
    
    return {"events": expanded_events, "total": len(expanded_events)}


@router.get("/upcoming")
async def get_upcoming_events(limit: int = 10):
    """Get upcoming published events (public endpoint)"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    events = await db.events.find(
        {"published": True, "start_date": {"$gte": now}},
        {"_id": 0}
    ).sort("start_date", 1).limit(limit).to_list(limit)
    
    return {"events": events}


@router.get("/{event_id}")
async def get_event(event_id: str):
    """Get a single event by ID"""
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event


@router.patch("/{event_id}")
async def update_event(event_id: str, data: EventUpdate, request: Request):
    """Update an event (super admin only)"""
    user = await require_super_admin(request)
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "recurrence" in update_data and update_data["recurrence"]:
        update_data["recurrence"] = data.recurrence.dict()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": update_data}
    )
    
    updated = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    return {"message": "Event updated", "event": updated}


@router.delete("/{event_id}")
async def delete_event(event_id: str, request: Request):
    """Delete an event (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    result = await db.events.delete_one({"event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted"}


# ============== RSVP ==============

@router.post("/{event_id}/rsvp")
async def rsvp_to_event(event_id: str, data: RSVPCreate):
    """RSVP to an event (public endpoint)"""
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get("requires_rsvp"):
        raise HTTPException(status_code=400, detail="This event does not require RSVP")
    
    # Check if already RSVPd
    existing_rsvps = event.get("rsvps", [])
    for rsvp in existing_rsvps:
        if rsvp.get("email", "").lower() == data.email.lower():
            raise HTTPException(status_code=400, detail="You have already RSVPd to this event")
    
    # Check max attendees
    if event.get("max_attendees") and len(existing_rsvps) >= event["max_attendees"]:
        raise HTTPException(status_code=400, detail="This event is at full capacity")
    
    rsvp_doc = {
        "rsvp_id": f"rsvp_{uuid.uuid4().hex[:8]}",
        "name": data.name,
        "email": data.email.lower(),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$push": {"rsvps": rsvp_doc}}
    )
    
    # Send confirmation email
    try:
        from services.email_service import send_event_rsvp_confirmation
        await send_event_rsvp_confirmation(
            to_email=data.email,
            event_title=event["title"],
            event_date=event["start_date"],
            event_location=event.get("location"),
            db=db
        )
    except Exception as e:
        logger.error(f"Failed to send RSVP confirmation: {e}")
    
    return {"message": "RSVP successful", "rsvp": rsvp_doc}


@router.get("/{event_id}/rsvps")
async def get_event_rsvps(event_id: str, request: Request):
    """Get RSVPs for an event (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0, "rsvps": 1, "title": 1})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "event_title": event.get("title"),
        "rsvps": event.get("rsvps", []),
        "total": len(event.get("rsvps", []))
    }


@router.delete("/{event_id}/rsvp/{rsvp_id}")
async def cancel_rsvp(event_id: str, rsvp_id: str, request: Request):
    """Cancel an RSVP (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    result = await db.events.update_one(
        {"event_id": event_id},
        {"$pull": {"rsvps": {"rsvp_id": rsvp_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    return {"message": "RSVP cancelled"}


# ============== ICS IMPORT/EXPORT ==============

@router.get("/{event_id}/ics")
async def export_event_ics(event_id: str):
    """Export a single event as ICS file"""
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    ics_content = generate_ics([event])
    
    return StreamingResponse(
        io.BytesIO(ics_content.encode()),
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={event['title'].replace(' ', '_')}.ics"}
    )


@router.get("/export/all")
async def export_all_events_ics(request: Request):
    """Export all events as ICS file (admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    events = await db.events.find({"published": True}, {"_id": 0}).to_list(500)
    
    ics_content = generate_ics(events)
    
    return StreamingResponse(
        io.BytesIO(ics_content.encode()),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=all_events.ics"}
    )


@router.post("/import/ics")
async def import_events_from_ics(request: Request, file: UploadFile = File(...)):
    """Import events from ICS file (super admin only)"""
    user = await require_super_admin(request)
    db = get_db()
    
    if not file.filename.endswith('.ics'):
        raise HTTPException(status_code=400, detail="File must be an ICS file")
    
    content = await file.read()
    
    try:
        from icalendar import Calendar
        
        cal = Calendar.from_ical(content)
        imported_events = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                # Extract event data
                summary = str(component.get('summary', 'Untitled Event'))
                description = str(component.get('description', ''))
                location = str(component.get('location', '')) if component.get('location') else None
                
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                
                # Handle date/datetime
                start_dt = dtstart.dt if dtstart else datetime.now(timezone.utc)
                end_dt = dtend.dt if dtend else start_dt
                
                # Check if all-day event
                is_all_day = not hasattr(start_dt, 'hour')
                
                if is_all_day:
                    start_date = start_dt.isoformat()
                    end_date = end_dt.isoformat() if end_dt != start_dt else start_date
                else:
                    if start_dt.tzinfo is None:
                        start_dt = start_dt.replace(tzinfo=timezone.utc)
                    if end_dt.tzinfo is None:
                        end_dt = end_dt.replace(tzinfo=timezone.utc)
                    start_date = start_dt.isoformat()
                    end_date = end_dt.isoformat()
                
                event_id = f"evt_{uuid.uuid4().hex[:12]}"
                
                event_doc = {
                    "event_id": event_id,
                    "title": summary,
                    "description": f"<p>{description}</p>" if description else "<p></p>",
                    "start_date": start_date,
                    "end_date": end_date,
                    "location": location,
                    "is_all_day": is_all_day,
                    "requires_rsvp": False,
                    "published": True,
                    "rsvps": [],
                    "created_by": user["user_id"],
                    "imported_from_ics": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.events.insert_one(event_doc)
                event_doc.pop("_id", None)
                imported_events.append(event_doc)
        
        return {
            "message": f"Successfully imported {len(imported_events)} events",
            "events": imported_events
        }
        
    except Exception as e:
        logger.error(f"ICS import failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse ICS file: {str(e)}")


# ============== PHOTO UPLOAD ==============

@router.post("/{event_id}/photo")
async def upload_event_photo(event_id: str, request: Request, file: UploadFile = File(...)):
    """Upload a photo for an event (super admin only)"""
    await require_super_admin(request)
    db = get_db()
    
    event = await db.events.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, WebP, or GIF)")
    
    # Read and encode as base64
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Convert to base64 data URL
    b64_content = base64.b64encode(content).decode()
    photo_url = f"data:{file.content_type};base64,{b64_content}"
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"photo_url": photo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Photo uploaded", "photo_url": photo_url}


# ============== HELPER FUNCTIONS ==============

def expand_recurring_event(event: dict, start_filter: str = None, end_filter: str = None) -> List[dict]:
    """Expand a recurring event into individual occurrences"""
    recurrence = event.get("recurrence")
    if not recurrence:
        return [event]
    
    freq_map = {
        "daily": DAILY,
        "weekly": WEEKLY,
        "monthly": MONTHLY,
        "yearly": YEARLY
    }
    
    freq = freq_map.get(recurrence.get("frequency", "weekly"), WEEKLY)
    interval = recurrence.get("interval", 1)
    
    try:
        start_dt = parse_date(event["start_date"])
    except:
        return [event]
    
    # Determine end of recurrence
    if recurrence.get("end_date"):
        try:
            until = parse_date(recurrence["end_date"])
        except:
            until = start_dt + timedelta(days=365)
    elif recurrence.get("count"):
        until = None
        count = recurrence["count"]
    else:
        until = start_dt + timedelta(days=365)  # Default to 1 year
        count = None
    
    # Generate occurrences
    rule_kwargs = {"dtstart": start_dt, "freq": freq, "interval": interval}
    if until:
        rule_kwargs["until"] = until
    if count:
        rule_kwargs["count"] = count
    
    occurrences = list(rrule(**rule_kwargs))
    
    # Filter by date range if provided
    if start_filter:
        try:
            start_f = parse_date(start_filter)
            occurrences = [o for o in occurrences if o >= start_f]
        except:
            pass
    
    if end_filter:
        try:
            end_f = parse_date(end_filter)
            occurrences = [o for o in occurrences if o <= end_f]
        except:
            pass
    
    # Limit to reasonable number
    occurrences = occurrences[:100]
    
    # Create event copies for each occurrence
    expanded = []
    for i, occ in enumerate(occurrences):
        event_copy = event.copy()
        event_copy["start_date"] = occ.isoformat()
        
        # Calculate end date if original had duration
        if event.get("end_date"):
            try:
                orig_start = parse_date(event["start_date"])
                orig_end = parse_date(event["end_date"])
                duration = orig_end - orig_start
                event_copy["end_date"] = (occ + duration).isoformat()
            except:
                event_copy["end_date"] = occ.isoformat()
        
        event_copy["occurrence_index"] = i
        event_copy["is_recurring_instance"] = True
        expanded.append(event_copy)
    
    return expanded


def generate_ics(events: List[dict]) -> str:
    """Generate ICS calendar content from events"""
    from icalendar import Calendar, Event as ICSEvent
    from datetime import datetime
    
    cal = Calendar()
    cal.add('prodid', '-//Vasilis NetShield//Events//EN')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    
    for event in events:
        ics_event = ICSEvent()
        ics_event.add('summary', event.get('title', 'Untitled'))
        
        # Parse dates
        try:
            start_dt = parse_date(event['start_date'])
            if event.get('is_all_day'):
                ics_event.add('dtstart', start_dt.date())
            else:
                ics_event.add('dtstart', start_dt)
        except:
            continue
        
        if event.get('end_date'):
            try:
                end_dt = parse_date(event['end_date'])
                if event.get('is_all_day'):
                    ics_event.add('dtend', end_dt.date())
                else:
                    ics_event.add('dtend', end_dt)
            except:
                pass
        
        # Description (strip HTML tags for ICS)
        import re
        description = event.get('description', '')
        clean_desc = re.sub('<[^<]+?>', '', description)
        ics_event.add('description', clean_desc)
        
        if event.get('location'):
            ics_event.add('location', event['location'])
        
        ics_event.add('uid', f"{event['event_id']}@vasilisnetshield.com")
        
        cal.add_component(ics_event)
    
    return cal.to_ical().decode()
