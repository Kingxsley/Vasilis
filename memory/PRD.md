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

## Current Status (Feb 2026)

### Training Session UI Fix (Feb 24, 2026) - COMPLETED
- **Removed Empty Email Preview Box** - Fixed `TrainingSession.js` to not show email preview UI for question types that don't need it
- **Dynamic Question Type Rendering** - UI now correctly renders:
  - Multiple Choice questions with A, B, C, D options
  - True/False questions with True/False buttons  
  - Safe/Unsafe questions with Safe/Unsafe buttons
- **Added GenericQuestion Component** - New component for questions without email/scenario content
- **Updated renderScenario Logic** - Only shows EmailSimulation for actual phishing email scenarios with proper email structure
- **Tested and Verified** - All question types display correctly without unnecessary UI elements

### Training Module System Enhancements - COMPLETED
1. **Question Counter Fix** - Added `current_scenario_index` and `answers` fields to TrainingSessionResponse model
2. **Preset Modules Removal** - Removed DEFAULT_MODULES and auto-seeding code completely
3. **Random Question Selection** - Added `questions_per_session` field to randomly select a subset of questions per attempt
4. **Bulk Module Upload** - Created `/api/training/modules/bulk` endpoint for JSON bulk upload
5. **Module Uploader Page** - New visual interface at `/module-uploader` for:
   - Bulk JSON upload (paste or file upload)
   - Export all modules as JSON
   - Visual editing of modules and questions
   - Toggle active/inactive status per module
   - Preview questions in each module

### 10 New Training Modules Created (200 questions total)
1. **Phishing Email Detection** - 20 questions, medium-hard
2. **Social Engineering Defense** - 20 questions, hard
3. **Password Security Best Practices** - 20 questions, medium
4. **Malicious Ads Recognition** - 20 questions, medium
5. **Data Protection & Privacy** - 20 questions, medium-hard
6. **Ransomware Awareness** - 20 questions, hard
7. **USB & Physical Security** - 20 questions, medium
8. **Multi-Factor Authentication (MFA)** - 20 questions, medium
9. **Business Email Compromise (BEC)** - 20 questions, hard
10. **Secure Browsing & Downloads** - 20 questions, medium

All modules configured with:
- 20 questions total
- 15 questions shown per session (randomly selected)
- Each attempt varies questions for each user

## Previous Status (Feb 23, 2026)

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

## Pending Issues (Feb 2026)

### P0 - Critical Blockers
1. **Email Sending Failure** - Campaigns created but no emails sent (SendGrid configuration issue in production)
   - Debug: Check `SENDGRID_API_KEY` and `SENDER_EMAIL` env vars in production
   - Use `/api/phishing/email-config-check` diagnostic endpoint
2. **Phishing Click Tracking** - Links not tracked correctly in production
   - Debug: After email sending is fixed, test full end-to-end in production

### P1 - Important Issues  
3. **Image Upload in Training Questions** - Images not displaying (fix pending testing)
4. **Training Assignment Email Link** - May point to wrong domain

### P3 - Lower Priority
5. **Bulk User Import** - Feature may be broken

### All Completed
- [x] **Phishing Tracking URLs** - All tracking URL generation now uses `API_URL` env var
- [x] **Training Email Links** - Fixed to use `FRONTEND_URL` env var
- [x] **Visual Alert Template Builder** - Full UI to create/edit alert pages without code
- [x] **Alert Template Selection** - Can select which alert to show when users click phishing links
- [x] **Bulk User Import** - Working with auto-generated passwords and welcome emails
- [x] **Visual Email Template Builder** - Full no-code UI for creating custom emails
- [x] **QR Code Custom Preview URL** - Added preview URL field for demonstration purposes
- [x] **CTA Tracking Link Naming** - Added tracking name field for analytics identification
- [x] **Custom Email Template Integration** - Campaign creation can use custom email templates
- [x] **Enhanced Analytics Dashboard** - Added credential submissions stat and improved layout

### User Action Required for Production
- [ ] Set `API_URL=https://api.vasilisnetshield.com` in Vercel backend env vars
- [ ] Set `FRONTEND_URL=https://vasilisnetshield.com` in Vercel backend env vars

### Future Enhancements (Optional)
- [ ] Send custom email templates directly from email builder
- [ ] A/B testing for email templates
- [ ] Scheduled campaign automation improvements

## Recent Changes (Feb 23, 2026)
- **Fixed Stats Accuracy** - Phishing stats now correctly show click rate, submission rate
- **Added Risk Level to Campaigns** - Configurable risk level (low/medium/high/critical) per campaign
- **Vulnerable Users Risk Logic** - Risk level based on campaign + credential submission = critical
- **Removed Risk Assessment Summary** - Simplified Advanced Analytics page
- **QR Code Auto-Generation** - Real QR codes in Simulation Builder
- Fixed phishing tracking - emails now use correct API URL
- Optimized campaign dialog UI
- Email Template Management UI with preview and edit

### Session Changes (Feb 23, 2026 - E1 Fork)
- **Fixed Training Email Links** - Training assignment emails now correctly link to FRONTEND_URL instead of API URL
- **Fixed EmailTemplates.js JSX** - Repaired malformed JSX with orphan closing tags that was breaking the UI
- **Added Alert Template Selection** - Campaign creation dialog now includes "Alert Page Template" selector
- **Added alert_template_id to Campaigns** - Backend model updated to support storing alert template selection
- **Integrated Alert Templates with Click Tracking** - When a user clicks a phishing link, the system checks for an alert_template_id and displays the corresponding HTML
- **Fixed alert_templates.py Route** - Added proper `Request` type import to fix FastAPI parameter validation

### Session Changes (Feb 23, 2026 - E1 Fork Part 2)
- **Visual Alert Template Builder** - Complete no-code UI for creating alert pages:
  - Icon selector with 18 options (warning, alert, phishing, lock, shield, etc.)
  - Color picker with 8 accent color presets
  - Editable title and subtitle fields
  - Customizable greeting and message body with template variables
  - Configurable safety tips section
  - **Optional** Call-to-action button (hidden by default)
  - **Live preview** showing changes in real-time
- **Fixed All Tracking URL Generation** - QR code and tracking URL endpoints now properly use `API_URL` env var
- **Alert Template Config Storage** - Visual builder settings are saved with templates for future editing
- **Fixed Vulnerable Users Credential Tracking** - Credential submissions now properly count and mark users as Critical risk
- **Removed Default Button from Alerts** - The "Start Training Now" button is now optional and disabled by default

### Session Changes (Feb 23, 2026 - E1 Fork Part 3)
- **Visual Email Template Builder** - Complete no-code UI for creating custom emails (like ads builder):
  - Icon OR Logo URL toggle
  - Icon selector with 18 options
  - Primary color and header title color pickers
  - Editable header title
  - Greeting with {{USER_NAME}} variable support
  - Main message and additional message fields
  - **Highlight Box** with customizable icon, background color, text color, and message
  - Optional CTA button with customizable text, URL, and color
  - Optional safety tips section
  - Footer text customization
  - **Live preview** showing email exactly as it will appear
- **New Backend Route** - `/api/custom-email-templates` for CRUD operations on custom email templates
- **Three-Tab Interface** - System Emails | Custom Emails | Alert Pages

### Session Changes (Feb 23, 2026 - E1 Fork Part 4) - P2 & Backlog Fixes
- **QR Code Custom Preview URL** - Added optional "Preview URL" field in QR code block for showing different URL in preview mode
- **CTA Tracking Link Naming** - Added "Tracking Link Name" field for buttons/links to help identify clicks in analytics
- **Custom Email Template Selection** - Campaign creation dialog now shows "Custom Email Override" dropdown when custom templates exist
- **Enhanced Analytics Dashboard** - Added 5th stat card for "Credential Submissions" with submission rate percentage
- **Vulnerability Breakdown** - Shows opened/clicked/submitted data with progress bars

### Session Changes (Feb 23, 2026 - E1 Fork Part 5) - Custom Email Template Integration
- **Custom Email Template Selection in Campaign Creation (DONE)** - When creating a phishing campaign, users can now select a custom email template to override the default template
- **Backend Integration for Custom Email Templates** - Modified `/api/phishing/campaigns` endpoint to accept and store `custom_email_template_id`
- **Launch Campaign Uses Custom Template** - Modified `launch_campaign` and `check_scheduled_campaigns` functions to fetch and use custom email template content when `custom_email_template_id` is set
- **Fixed custom_email_templates.py Auth** - Fixed authentication import issue that was causing 500 errors
- **Testing Verified**: 100% backend test pass rate, all UI elements working

### Session Changes (Feb 23, 2026 - E1 Fork Part 6) - Credential Harvest Feature
- **Fixed Training URL in Alert Page** - The "Start Training Now" button now correctly links to `{FRONTEND_URL}/training` instead of the API domain
- **Credential Harvest Landing Page** - When campaign `scenario_type` is `credential_harvest`, users see a professional fake login form before the awareness page
- **Scenario Type Selection** - Added new "Scenario Type" dropdown in campaign creation with options:
  - Phishing Email (default) - Shows awareness page on click
  - Credential Harvest - Shows fake login form → tracks submission → shows awareness
  - QR Code Phishing
  - Business Email Compromise
- **Credential Tracking Flow** - Form posts to `/api/phishing/track/credentials/{tracking_code}` then redirects to awareness page
- **URL Handling Fix** - Fixed `x-forwarded-host` header detection for proper URL generation in proxied environments

### Production Environment Variables (Vercel Backend)
- `API_URL=https://api.vasilisnetshield.com` ✅ (Confirmed set by user)
- `FRONTEND_URL=https://vasilisnetshield.com` ✅ (Confirmed set by user)
- `CORS_ORIGINS=https://vasilisnetshield.com,https://www.vasilisnetshield.com`
- `MONGO_URL=<your-mongodb-atlas-url>`
- `DB_NAME=vasilisnetshield`
- `JWT_SECRET=<your-secret>`

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
