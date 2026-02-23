# VasilisNetShield - Product Requirements Document

## Original Problem Statement
User requested modifications to their GitHub repo (Kingxsley/Vasilis) - a security training platform. Fixes needed:
1. Scenario links not being tracked (should work like ad simulation)
2. Copy URL feature should copy the embed link
3. Risk assessment logic should be functional and show accurate data
4. Browser back arrow should go to previous page and reload
5. Fix module designer not working
6. Popup messages when users click simulation links
7. Replace placeholder icons with user's custom favicon SVG

## Architecture
- **Frontend**: React + Tailwind CSS + CRACO + Radix UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: JWT-based authentication
- **Deployment**: Supervisor-managed services

## User Personas
- **Super Admin**: Full platform management, create campaigns, view analytics
- **Org Admin**: Organization-level management
- **Trainee**: Takes training modules, receives phishing simulation emails

## Core Requirements
- Phishing email simulation campaigns
- Malicious ad simulation campaigns
- Training module management with scenarios
- Advanced analytics with risk assessment
- Custom branding/theming support
- Certificate generation

## What's Been Implemented (Jan 2026)
1. **Fixed scenario link tracking**: Extended `/api/track/{campaign_id}` to handle both ad (`adcamp_`) and phishing (`phish_`) campaign IDs. Added `_handle_phishing_tracking` handler in server.py. Updated `AdTrackerWrapper` in App.js to recognize `phish_` prefix.

2. **Fixed copy URL to embed link**: Updated `copyTrackingUrl` in AdSimulations.js to copy the API embed URL (`/api/track/{campaign_id}`) instead of the frontend URL. Added copy embed link button to PhishingSimulations page.

3. **Fixed risk assessment logic**: Updated `/api/phishing/stats` endpoint to aggregate data from BOTH phishing campaigns AND ad campaigns, providing complete risk assessment data on the AdvancedAnalytics page.

4. **Fixed browser back button**: Added `popstate` event listener in `AppRouter` component to trigger `window.location.reload()` when users navigate back.

5. **Fixed module designer**: Added `scenarios: Optional[List[str]]` field to `TrainingModuleCreate`, `TrainingModuleUpdate`, and `TrainingModuleResponse` Pydantic models, allowing the QuestionModuleDesigner to properly save modules with scenario IDs.

6. **Popup messages on simulation links**: All simulation types (phishing + ad) already show awareness popups when clicked. The phishing tracking handler shows a detailed awareness page with scenario-specific messaging. The ad click handler shows a malicious ad awareness page.

7. **Custom favicon & icons**: Replaced all inline SVG placeholder shield icons across LandingPage, DashboardLayout, PublicNav, and AuthPage with the user's provided `favicon.svg`. Updated `manifest.json` and `useFavicon` hook.

## Backlog / Future Tasks
- P0: End-to-end email sending (requires SendGrid API key configuration)
- P1: Add credential submission tracking to phishing stats (currently submission_rate = 0)
- P1: Add scenario link click tracking per-user in training sessions
- P2: QR code phishing simulation tracking
- P2: Social engineering scenario interactive tracking
- P2: Export phishing campaign reports to PDF
- P3: AI-powered phishing email generation
