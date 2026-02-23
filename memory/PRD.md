# VasilisNetShield - Product Requirements Document

## Original Problem Statement
User requested modifications to their GitHub repo (Kingxsley/Vasilis) - a security awareness training platform. Multiple iterations of bug fixes and feature enhancements.

## Architecture
- **Frontend**: React + Tailwind CSS + CRACO + Radix UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: JWT-based authentication
- **Deployment**: Vercel (separate frontend + backend projects)

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

## Key Model Changes
- PhishingCampaignCreate: added assigned_module_id
- PhishingCampaignResponse: added assigned_module_id
- TrainingModuleCreate/Update/Response: added questions (List[dict]), module_type becomes changeable

## Backlog
- P0: End-to-end email sending (requires SendGrid API key)
- P1: Credential submission tracking, SMS phishing
- P2: QR code tracking, PDF export, campaign scheduling
- P3: AI-powered phishing email generation
