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
1. **Rich Module Designer** - 5 question types
2. **Module Type Selection** - 9 module types
3. **Edit Legacy Modules** - All existing modules editable
4. **Random Questions** - Training sessions shuffle question order
5. **Fixed Phishing Email Tracking** - URL placeholder mismatch fixed
6. **Auto-assign Training** - Phishing click handler assigns linked module
7. **Campaign Module Assignment** - assigned_module_id field added

### Iteration 3 - P0/P1 Bug Fixes & Analytics Unification (VERIFIED)
1. **P0 Fix: Phishing Link Redirection** - Fixed UnboundLocalError
2. **Unified Analytics** - All campaign types in Campaign Overview
3. **Training Assignment Email** - SendGrid integration
4. **Refactoring** - Removed duplicate models/services folders

### Iteration 4 - High Priority Features (2026-02-23) VERIFIED
1. **Credential Submission Tracking**
   - New endpoint: POST /api/phishing/track/credentials/{tracking_code}
   - Tracks when users submit credentials to fake login pages
   - Updates phishing_targets with credentials_submitted flag
   - Records in training_failures with "critical" severity
   - Returns awareness page showing credential submission warning

2. **Discord Webhook Notifications**
   - Real-time Discord alerts for phishing clicks and credential submissions
   - Super admin webhook configurable in Settings page
   - Per-organization webhooks in Organization management
   - Notification service at /app/backend/services/notification_service.py
   - Supports: phishing clicks, credential submissions, campaign launches

3. **Vulnerable Users Dashboard** (/vulnerable-users)
   - Risk level breakdown: Critical, High, Medium, Low
   - Summary stats: Total users, clicks, credential submissions
   - User table with organization, risk level, click count
   - Filters: Time period, risk level, organization
   - Export to CSV and JSON formats
   - Backend: /app/backend/routes/vulnerable_users.py

4. **QR Code Generation**
   - API endpoint: GET /api/phishing/qr-code/{tracking_code}
   - Bulk generation: POST /api/phishing/campaigns/{id}/generate-qr-codes
   - Uses external qrserver.com API

5. **Campaign Scheduling** (Already implemented in previous iterations)
   - scheduled_at field in phishing campaigns
   - Automatic launch check endpoint

6. **Email Template Management** (Already implemented)
   - /email-templates page for managing email templates

## Key Model Changes
- PhishingTargetResponse: added credentials_submitted, credentials_submitted_at
- PhishingStatsResponse: added credentials_submitted, submission_rate
- OrganizationCreate/Update/Response: added discord_webhook_url
- BrandingUpdate: added discord_webhook_url

## Test Credentials
- Super Admin: superadmin@vasilisns.com / Admin123!Pass
- Trainee: trainee@testorg.com / Admin123!Pass

## Key API Endpoints
- POST /api/auth/login - User authentication
- GET /api/vulnerable-users - List vulnerable users with stats
- GET /api/vulnerable-users/export/csv - Export as CSV
- GET /api/vulnerable-users/export/json - Export as JSON
- GET /api/phishing/qr-code/{tracking_code} - Generate QR code
- POST /api/phishing/track/credentials/{tracking_code} - Track credential submission
- GET /api/phishing/track/click/{tracking_code} - Track phishing click

## Environment Variables Required
- MONGO_URL - MongoDB connection string
- DB_NAME - Database name (test_database)
- SENDGRID_API_KEY - For email notifications
- SENDER_EMAIL - Verified sender email for SendGrid
- DISCORD_WEBHOOK_URL - (Optional) Super admin Discord webhook

## New Files Created in Iteration 4
- /app/frontend/src/pages/VulnerableUsers.js
- /app/backend/routes/vulnerable_users.py
- /app/backend/services/notification_service.py

## Backlog (Future)
- P2: PDF export for reports
- P3: AI-powered phishing email generation (requires LLM integration)
- P3: SMS phishing simulations
