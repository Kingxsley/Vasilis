# VasilisNetShield - Product Requirements Document

## Original Problem Statement
User requested modifications to their GitHub repo (Kingxsley/Vasilis) - a security awareness training platform. Multiple iterations of bug fixes and feature enhancements.

## Architecture
- **Frontend**: React + Tailwind CSS + CRACO + Radix UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: JWT-based authentication
- **Deployment**: Vercel (separate frontend + backend projects)

## User Personas
- **Super Admin**: Full platform management, create campaigns/modules, view analytics
- **Org Admin**: Organization-level management
- **Trainee**: Takes training modules, receives phishing simulation emails

## Core Requirements
- Phishing email simulation campaigns with tracking
- Malicious ad simulation campaigns with tracking
- Training module management with rich question types
- Advanced analytics with risk assessment
- Custom branding/theming support
- Certificate generation

## What's Been Implemented

### Iteration 1 (Jan 2026) - Initial Bug Fixes
1. Fixed scenario link tracking (phish_ prefix support in /api/track/)
2. Fixed copy URL to embed link format
3. Fixed risk assessment to aggregate phishing + ad data
4. Fixed browser back button reload (popstate listener)
5. Fixed module designer (added scenarios field to models)
6. Replaced all placeholder SVG icons with custom favicon.svg
7. Fixed Vercel deployment (removed emergentintegrations, CI=false build)

### Iteration 2 (Jan 2026) - Major Enhancements
1. **Rich Module Designer** - Fully rebuilt QuestionModuleDesigner with:
   - Multiple Choice, True/False, Safe/Unsafe, Select Best N, Image Question types
   - Image upload for questions
   - Click-to-mark-correct option selection
   - Edit legacy modules in the designer
   - Questions stored in `questions` field on training module
2. **Removed Module Builder** - Redirects /module-builder to /question-modules
3. **Random Questions** - Training sessions shuffle questions for trainees
4. **Fixed Phishing Tracking** - Fixed {{TRACKING_URL}} vs {{TRACKING_LINK}} placeholder mismatch
5. **Fixed Ad Copy URL** - Now copies per-target embed URL (/api/ads/render/{tracking_code})
6. **Simulation Builder Enhancements**:
   - Email From/Subject fields for explicit control
   - CTA/Button/Link blocks show tracking link info
   - Saved tab loads phishing templates
   - Launch dialog includes training module assignment
7. **Auto-assign Training** - Phishing click handler assigns specific or all modules
8. **Campaign Module Assignment** - Both PhishingSimulations and SimulationBuilder support assigning training modules per campaign

## Backlog / Future Tasks
- P0: End-to-end email sending (requires SendGrid API key)
- P1: Credential submission tracking in phishing stats
- P1: SMS phishing simulation support
- P2: QR code phishing interactive tracking
- P2: Export campaign reports to PDF
- P2: Campaign scheduling with cron
- P3: AI-powered phishing email generation
