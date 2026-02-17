# NetShield Cybersecurity Training Platform - PRD

## Project Overview
A scalable cybersecurity training platform for simulating phishing attacks, malicious ads, and social engineering scenarios. Designed for organizations to train employees on recognizing and avoiding security threats.

**Owner Domain**: vasilisnetshield.net  
**Branding**: "Human + AI Powered Security Training"

## Core Requirements
1. Multi-tenant organization management
2. Admin dashboard for managing clients, users, and campaigns
3. Authentication (email/password + Google OAuth)
4. Modifiable, branded design (teal, gold, cream)
5. Self-hostable using free, open-source tools
6. Phishing simulation with email tracking

## Tech Stack
- **Backend**: FastAPI + Python
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Database**: MongoDB
- **Authentication**: JWT + Emergent-managed Google OAuth

## User Roles
- `super_admin`: Full system access, can manage all organizations
- `org_admin`: Can manage their organization's users and campaigns
- `trainee`: Can access assigned training modules

---

## Implemented Features

### Phase 1: Core Platform (Completed)
- [x] Multi-tenant architecture
- [x] Organization CRUD
- [x] User management (CRUD with role assignment)
- [x] JWT authentication
- [x] Google OAuth integration
- [x] Training modules (phishing, ads, social engineering)
- [x] Training sessions with scoring
- [x] Analytics dashboard

### Phase 2: Branding & Self-Hosting (Completed)
- [x] Custom branding (logos, color scheme)
- [x] Responsive UI with gradient backgrounds
- [x] SELF_HOSTING_GUIDE.md created
- [x] Removed Emergent-specific dependencies
- [x] Optional AI integration (user-provided OpenAI key)

### Phase 3: Phishing Simulation (Completed - Feb 17, 2026)
- [x] **Email Templates**: Create and manage phishing email templates
  - Pre-built default templates (IT Password Reset, HR Benefits, Package Delivery)
  - Custom template creation with HTML editor
  - Placeholder support: `{{USER_NAME}}`, `{{TRACKING_LINK}}`
- [x] **Phishing Campaigns**: Target specific users with simulated attacks
  - Select organization, template, and target users
  - Unique tracking code per recipient
  - Campaign lifecycle: draft → active → paused → completed
- [x] **Click Tracking**: 
  - Track email opens via invisible 1x1 pixel
  - Track link clicks with redirect tracking
  - Record IP and user-agent for forensics
- [x] **Monitoring Dashboard**:
  - Real-time stats (sent, opened, clicked)
  - Per-user tracking status
  - Open rate and click rate calculations
- [x] **Security Awareness Landing Page**:
  - Displayed when user clicks phishing link
  - Educates user about the simulated attack

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/session` - Exchange Google OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Organizations
- `GET/POST /api/organizations` - List/Create organizations
- `GET/PATCH/DELETE /api/organizations/{id}` - CRUD operations

### Users
- `GET/POST /api/users` - List/Create users
- `GET/PATCH/DELETE /api/users/{id}` - CRUD operations

### Campaigns (Training)
- `GET/POST /api/campaigns` - List/Create campaigns
- `GET/PATCH/DELETE /api/campaigns/{id}` - CRUD operations

### Phishing Simulation
- `GET/POST /api/phishing/templates` - List/Create templates
- `GET/DELETE /api/phishing/templates/{id}` - Get/Delete template
- `POST /api/phishing/templates/seed-defaults` - Add default templates
- `GET/POST /api/phishing/campaigns` - List/Create phishing campaigns
- `GET/DELETE /api/phishing/campaigns/{id}` - Get/Delete campaign
- `POST /api/phishing/campaigns/{id}/launch` - Send emails
- `POST /api/phishing/campaigns/{id}/pause` - Pause campaign
- `POST /api/phishing/campaigns/{id}/complete` - Mark complete
- `GET /api/phishing/campaigns/{id}/targets` - List targets with tracking
- `GET /api/phishing/campaigns/{id}/stats` - Get campaign statistics
- `GET /api/phishing/track/open/{code}` - Track email open (public)
- `GET /api/phishing/track/click/{code}` - Track link click (public)

### Training
- `GET /api/training/modules` - List training modules
- `GET/POST /api/training/sessions` - List/Start sessions
- `GET /api/training/sessions/{id}/scenario` - Get current scenario
- `POST /api/training/sessions/{id}/answer` - Submit answer

### Analytics
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/analytics/training` - Training analytics

---

## Database Collections

### users
```json
{
  "user_id": "user_xxx",
  "email": "string",
  "name": "string",
  "password_hash": "string|null",
  "role": "super_admin|org_admin|trainee",
  "organization_id": "org_xxx|null",
  "picture": "url|null",
  "is_active": true,
  "created_at": "ISO datetime"
}
```

### organizations
```json
{
  "organization_id": "org_xxx",
  "name": "string",
  "domain": "string|null",
  "description": "string|null",
  "is_active": true,
  "created_by": "user_xxx",
  "created_at": "ISO datetime"
}
```

### phishing_templates
```json
{
  "template_id": "tmpl_xxx",
  "name": "string",
  "subject": "string",
  "sender_name": "string",
  "sender_email": "string",
  "body_html": "string",
  "body_text": "string|null",
  "created_by": "user_xxx",
  "created_at": "ISO datetime"
}
```

### phishing_campaigns
```json
{
  "campaign_id": "phish_xxx",
  "name": "string",
  "organization_id": "org_xxx",
  "template_id": "tmpl_xxx",
  "landing_page_url": "url|null",
  "status": "draft|active|paused|completed",
  "total_targets": 0,
  "emails_sent": 0,
  "emails_opened": 0,
  "links_clicked": 0,
  "created_by": "user_xxx",
  "created_at": "ISO datetime",
  "scheduled_at": "ISO datetime|null",
  "started_at": "ISO datetime|null",
  "completed_at": "ISO datetime|null"
}
```

### phishing_targets
```json
{
  "target_id": "tgt_xxx",
  "campaign_id": "phish_xxx",
  "user_id": "user_xxx",
  "user_email": "string",
  "user_name": "string",
  "tracking_code": "unique_string",
  "email_sent": false,
  "email_sent_at": "ISO datetime|null",
  "email_opened": false,
  "email_opened_at": "ISO datetime|null",
  "link_clicked": false,
  "link_clicked_at": "ISO datetime|null",
  "click_ip": "string|null",
  "click_user_agent": "string|null"
}
```

---

## File Structure
```
/app/
├── backend/
│   ├── models/__init__.py      # Pydantic models
│   ├── routes/
│   │   ├── __init__.py
│   │   └── phishing.py         # Phishing simulation routes
│   ├── services/
│   │   ├── __init__.py
│   │   └── phishing_service.py # Email and tracking logic
│   ├── utils/__init__.py       # Auth helpers
│   ├── tests/
│   │   └── test_phishing_simulation.py
│   ├── server.py               # Main FastAPI application
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.js
│   │   ├── pages/
│   │   │   ├── PhishingSimulations.js  # NEW
│   │   │   ├── Dashboard.js
│   │   │   ├── Organizations.js
│   │   │   ├── Users.js
│   │   │   └── ...
│   │   └── App.js
│   └── .env.example
├── SELF_HOSTING_GUIDE.md
└── memory/
    └── PRD.md
```

---

## Known Limitations
1. **Email Sending**: Currently in simulation mode (SMTP not configured). Emails are marked as "sent" but not actually delivered. Configure `SMTP_*` env vars for real sending.
2. **AI Generation**: Optional - requires user-provided `OPENAI_API_KEY`.

---

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Configure SMTP for actual email delivery
- [ ] Add email scheduling functionality
- [ ] CSV import for bulk user creation
- [ ] Export campaign reports (PDF/Excel)

### P2 - Medium Priority
- [ ] Refactor server.py into modular APIRouters (partially done)
- [ ] Add malicious ad simulation campaigns
- [ ] Add social engineering phone call simulations
- [ ] User training completion certificates

### P3 - Low Priority
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Integration with SIEM tools
- [ ] Gamification elements (leaderboards, badges)

---

## Test Credentials
- **Test Admin**: testadmin@netshield.com / test1234
- **Super Admins**: kingsleyihesiene1@gmail.com, kingsley@vasilisnetshield.com

---

## Last Updated
February 17, 2026 - Phishing Simulation feature completed
