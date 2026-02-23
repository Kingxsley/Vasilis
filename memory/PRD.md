# VasilisNetShield - Product Requirements Document

## Original Problem Statement
User requested modifications to their GitHub repo (Kingxsley/Vasilis) - a security awareness training platform. Multiple iterations of bug fixes and feature enhancements.

## Architecture
- **Frontend**: React + Tailwind CSS + CRACO + Radix UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: JWT-based authentication
- **Deployment**: Vercel (separate frontend + backend projects)
- **Database**: MongoDB (DB_NAME=test_database in production)

## What's Been Implemented

### Iteration 1 - Initial Bug Fixes
- Fixed scenario link tracking, copy URL, risk assessment, back button reload
- Replaced placeholder SVG icons with custom favicon.svg
- Fixed Vercel deployment (removed emergentintegrations, CI=false)

### Iteration 2 - Major Enhancements (VERIFIED)
1. **Rich Module Designer** - 5 question types: Multiple Choice, True/False, Safe/Unsafe, Select Best N, Image Question
2. **Module Type Selection** - 9 module types (phishing, malicious_ad, social_engineering, password_security, data_handling, ransomware, usb_security, mfa_awareness, general)
3. **Edit Legacy Modules** - All existing modules editable in the designer
4. **Module Builder Removed** - /module-builder redirects to /question-modules
5. **Random Questions** - Training sessions shuffle question order (verified with DB check)
6. **Fixed Phishing Email Tracking** - Root cause: {{TRACKING_URL}} vs {{TRACKING_LINK}} placeholder mismatch. Both now replaced in phishing_service.py
7. **Fixed Ad Copy URL** - Copies per-target embed URL (/api/ads/render/{tracking_code})
8. **Email Headers in SimulationBuilder** - From/Subject fields for explicit control
9. **CTA Tracking Links** - Button/Link blocks show {{TRACKING_URL}} info
10. **Saved Simulations** - Saved tab loads phishing templates from API
11. **Auto-assign Training** - Phishing click handler assigns the campaign's linked module
12. **Campaign Module Assignment** - assigned_module_id field in PhishingCampaignCreate/Response
13. **PhishingCampaignResponse** fixed in both /app/backend/models/__init__.py AND /app/backend/models/models/__init__.py

### Iteration 3 - P0/P1 Bug Fixes & Analytics Unification (2026-02-23) VERIFIED
1. **P0 Fix: Phishing Link Redirection** - Fixed UnboundLocalError in /app/backend/routes/phishing.py (line 991) where `campaign` variable was referenced before initialization. Now properly initializes `campaign = None` before the conditional block.
2. **Unified Analytics** - AdvancedAnalytics.js now displays all campaign types (phishing + ad) in a single "Campaign Overview" section with combined stats
3. **Campaign Overview renamed** - Changed "Phishing Campaign Performance" to "Campaign Overview" throughout the UI
4. **Training Assignment Email** - Updated send_training_assignment_email in phishing_service.py to use SENDER_EMAIL from environment variables instead of hardcoded domain
5. **Refactoring: Removed duplicate folders**:
   - Deleted /app/backend/models/models/ (duplicate Pydantic models causing confusion)
   - Deleted /app/backend/services/services/ (duplicate service files)

## Key Model Changes
- PhishingCampaignCreate: added assigned_module_id, click_page_html
- PhishingCampaignResponse: added assigned_module_id, click_page_html
- TrainingModuleCreate/Update/Response: added questions (List[dict]), module_type becomes changeable

## Test Credentials
- Super Admin: superadmin@vasilisns.com / Admin123!Pass
- Trainee: trainee@testorg.com / Admin123!Pass

## Key API Endpoints
- POST /api/auth/login - User authentication
- GET /api/phishing/track/click/{tracking_code} - Phishing click handler (returns awareness page)
- GET /api/analytics/all-campaigns - Unified campaign analytics (phishing + ad)
- GET /api/phishing/stats - Phishing campaign statistics
- POST /api/phishing/campaigns - Create phishing campaign
- GET /api/training-modules - List training modules

## Environment Variables Required
- MONGO_URL - MongoDB connection string
- DB_NAME - Database name (test_database)
- SENDGRID_API_KEY - For email notifications
- SENDER_EMAIL - Verified sender email for SendGrid

## Backlog
- P1: Credential submission tracking, SMS phishing
- P2: QR code tracking, PDF export, campaign scheduling, Simulation Builder CTA enhancements
- P3: AI-powered phishing email generation, Email Template Management system
