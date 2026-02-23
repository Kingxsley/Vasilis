# VasilisNetShield - Product Requirements Document

## Original Problem Statement
A comprehensive security awareness and training platform that helps organizations protect their workforce through:
- Realistic phishing simulations
- Malicious ad detection training
- Social engineering defense training
- AI-powered content generation
- Real-time admin notifications via Discord webhooks
- Vulnerable users tracking and reporting

## Architecture
- **Frontend**: React with Tailwind CSS, deployed on Vercel
- **Backend**: FastAPI (Python), deployed on Vercel Serverless
- **Database**: MongoDB Atlas
- **Integrations**: SendGrid (email), Discord (webhooks), ReportLab (PDF generation)

## Core Features Implemented

### Authentication & User Management
- [x] JWT-based authentication with login/register
- [x] Google OAuth via Emergent Auth
- [x] Two-Factor Authentication (TOTP)
- [x] Password reset flow with email
- [x] Role-based access control (super_admin, org_admin, trainee)
- [x] Account lockout after failed attempts

### Organization Management
- [x] Create/update/delete organizations
- [x] Assign users to organizations
- [x] Certificate templates per organization
- [x] Discord webhook per organization

### Phishing Campaigns
- [x] Campaign creation and management
- [x] Phishing email templates
- [x] Tracking link generation
- [x] Click tracking with timestamps
- [x] Credential submission tracking
- [x] Real-time Discord notifications on events

### Training System
- [x] Training modules (phishing, ads, social engineering)
- [x] Interactive scenarios with quizzes
- [x] Score tracking and completion certificates
- [x] Module reassignment for remedial training
- [x] Progress tracking per user

### Vulnerable Users Dashboard
- [x] List users who clicked phishing links
- [x] List users who submitted credentials
- [x] Risk level classification (Medium/Critical)
- [x] Export to CSV, JSON, PDF
- [x] Filtering by organization, risk level, date

### Admin Dashboard
- [x] Organization statistics
- [x] User activity metrics
- [x] Campaign performance
- [x] Recent training activity
- [x] Audit logging

### System Settings
- [x] Branding customization (logo, colors, company name)
- [x] SendGrid email configuration
- [x] System-wide Discord webhook
- [x] Security settings (force 2FA)

## Current Status (Feb 23, 2026)

### Production CORS Issue - RESOLVED
- Added missing dependencies (`python-multipart`, `pillow`, `openpyxl`)
- CORS headers now correctly returning for production domains
- Backend API working at `api.vasilisnetshield.com`

### Visual Editor for Custom Awareness Page - IMPLEMENTED
- Rich text editor with formatting toolbar
- Quick template buttons (Alert Template, Phishing Template)
- Template variables: `{{USER_NAME}}`, `{{USER_EMAIL}}`, `{{CAMPAIGN_NAME}}`, `{{SCENARIO_TYPE}}`

### Favicon - UPDATED
- Using user's custom favicon.svg

### Environment Variables Required on Vercel Backend
```
CORS_ORIGINS=https://vasilisnetshield.com,https://www.vasilisnetshield.com
MONGO_URL=<mongodb-atlas-connection-string>
DB_NAME=vasilisnetshield
JWT_SECRET=<secure-random-string>
```

## Pending Tasks

### P1 - Upcoming
- [ ] Email Template Management UI

### P2 - Future/Backlog
- [ ] Simulation Builder CTA Enhancement (tracking link naming)
- [ ] Advanced analytics dashboard
- [ ] Bulk user import (CSV)
- [ ] Scheduled campaign automation

## Recent Changes (Feb 23, 2026)
- Fixed phishing tracking - emails now use correct API URL for tracking links
- Optimized campaign dialog UI - collapsible custom awareness page section
- Reduced rich text editor height
- Added PUT endpoint for phishing templates (fixes "Method Not Allowed" error)
- Added delete button to Saved Simulations
- Added visual editor for Custom Awareness Page
- Fixed production CORS issues
- Updated favicon

### Production Environment Variables (Vercel Backend)
```
API_URL=https://api.vasilisnetshield.com
CORS_ORIGINS=https://vasilisnetshield.com,https://www.vasilisnetshield.com
MONGO_URL=<your-mongodb-atlas-url>
DB_NAME=vasilisnetshield
JWT_SECRET=<your-secret>
```

## Key Files Reference
- `/app/backend/server.py` - Main API server with CORS config
- `/app/backend/routes/vulnerable_users.py` - Vulnerable users API
- `/app/backend/services/discord_service.py` - Discord webhook service
- `/app/frontend/src/pages/VulnerableUsers.js` - Vulnerable users UI
- `/app/frontend/src/pages/PhishingSimulations.js` - Campaign management
- `/app/frontend/public/favicon.svg` - Site favicon

## Database Collections
- `users` - User accounts with roles
- `organizations` - Organization records
- `campaigns` - Phishing campaigns
- `phishing_targets` - Campaign targets with click/submit tracking
- `training_modules` - Training content
- `training_sessions` - User training progress
- `settings` - System configuration
- `audit_logs` - Security audit trail
