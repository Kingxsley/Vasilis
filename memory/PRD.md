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


## Refactoring & Modularization (Latest)

### Navigation Simplification
- Reduced sidebar from **9 groups / 30+ items** to **8 groups / ~20 items**
- Groups: Dashboard, Users & Orgs, Simulations, Training, Content, Analytics & Reports, Administration, Account
- Merged overlapping pages into hub views with tabs

### Page Merging (Hub Pages)
- **AnalyticsHub** (`/analytics`) - Merged Analytics + Advanced Analytics with org filtering tabs
- **SecurityHub** (`/security-hub`) - Merged Security Dashboard + Settings + Password Policy + Audit Logs + Activity Logs (5 tabs)
- **CertificatesHub** (`/certificates`) - Merged Certificates + Certificate Templates (tabbed)
- Old routes redirect to new hub pages automatically

### CMS Public Visibility
- Added `visibility` field to CMS tiles: draft, private, public
- Added `meta_title` and `meta_description` for SEO
- Public pages render at `/{slug}` without authentication
- New `/api/cms-tiles/public/page/{slug}` endpoint (no auth)
- Visibility controls in Content Manager page editor

### Dashboard & Analytics Org Filtering
- Super admins can filter Dashboard and Analytics by organization
- Organization selector dropdown on both pages

### Image Optimization
- `OptimizedImage` component with IntersectionObserver lazy loading
- Skeleton/blur placeholders during load
- Added `loading="lazy"` to LandingPage images

### Backend Modularization
- Extracted 250+ lines of Pydantic models to `/backend/models/schemas.py`
- Clean separation of data models from route logic
- server.py reduced from 4164 to 3915 lines


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

### Credential Harvest Simulations (NEW - Feb 24, 2026)
- [x] **Dedicated Credential Harvest Page** (`/credential-harvest`) - Full campaign management
- [x] **8 Pre-built Templates**:
  - Microsoft 365 Login
  - Google Workspace Security Alert  
  - LinkedIn Connection Request
  - Dropbox Shared File
  - Slack Workspace Invitation
  - DocuSign Document to Sign
  - Zoom Meeting Invitation
  - Adobe Creative Cloud
- [x] **Campaign Management** - Create, launch, view, delete credential harvest campaigns
- [x] **Template Gallery** - Browse templates with "Use Template" quick action
- [x] **Submissions Tab** - View all credential submissions with charts and table
- [x] **Stores Entered Username** - Records what users type (not password) for training
- [x] **Export to CSV** - Download submission data
- [x] **Custom Template Creation** - Create your own credential harvest templates

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

## Current Status (March 2026)

### Session 19 Updates (March 3, 2026) - CMS/CONTENT MANAGER MERGE

#### Merged CMS Pages into Content Manager
1. **Unified Interface** - Content Manager now has a "Pages" tab that includes the visual page builder
2. **Removed duplicate** - Removed separate "CMS Pages" menu item from sidebar
3. **Redirect in place** - `/cms-tiles` now redirects to `/content`
4. **Same functionality** - All visual block editing features preserved

#### Content Manager Tab Structure:
- **Pages** - Visual page builder with blocks (Team, Pricing, FAQ, etc.)
- **Blog** - Blog post management
- **News** - Local news + RSS feed integration (already working!)
- **Videos** - YouTube video management
- **About** - About page content
- **RSS Feeds** - RSS feed source management (super admin)

#### News with RSS (Already Functional)
- 4 RSS feeds configured: Krebs, Hacker News, Schneier, Dark Reading
- 110+ news items aggregated
- Users can add their own news + RSS sources
- Public news page at `/news`

### Session 18 Updates (March 3, 2026) - PAGE BUILDER BLOCKS & FIXES

#### P0 Fix - Events Block Date Display
1. **Fixed start_date field** - Events block now correctly uses `start_date` instead of `start_time`
2. **Proper date format** - Events display dates in readable format (e.g., "Sun, Mar 15, 02:00 PM")

#### P1 Fix - Contact Form Redesign
3. **Removed sidebar** - Contact form now renders without the extra contact info sidebar
4. **Cleaner layout** - Form is centered, max-width 2xl, professional appearance
5. **All fields preserved** - Name, Email, Phone, Organization, Subject, Message

#### Block Renderers Implemented (Upcoming Tasks Complete)
6. **Team Members Block** - Grid display of team members with image, name, role, bio
7. **Testimonials Block** - Customer quotes with author info and image
8. **Pricing Table Block** - Pricing plans with features, popular badge, CTAs
9. **FAQ Accordion Block** - Expandable Q&A sections
10. **Features Grid Block** - Feature cards with icons, titles, descriptions
11. **Gallery Block** - Image gallery grid with configurable columns
12. **List Block** - Bullet or numbered lists
13. **Map Block** - Google Maps embed by address

#### Block Editors Implemented (VisualBlockEditor.js)
14. **Full CRUD editors** - All block types have complete add/edit/delete functionality
15. **Intuitive UI** - Add team members, testimonials, FAQ items, pricing plans dynamically
16. **Column configuration** - Team, features, gallery support 2/3/4 column layouts

#### Test Coverage
- 12 backend API tests (100% pass)
- 11 frontend E2E tests (100% pass)
- Test files: `/app/tests/e2e/cms-pagebuilder.spec.ts`, `/app/backend/tests/test_cms_pagebuilder.py`

#### Demo Page Created
17. **Page Builder Demo** - Live demo at `/demo` showcasing all block types:
    - Team Members (3 profiles with images)
    - Testimonials (3 customer quotes)
    - Pricing Table (3 plans with features)
    - Features Grid (6 features with icons)
    - FAQ Accordion (5 Q&A items)
    - Image Gallery (6 images)
    - Quote block
    - Call-to-Action block

#### Navigation Fixed
18. **All CMS pages in nav** - Contact us, Events, and Page Builder Demo all visible in navigation

### Session 17 Updates (March 1, 2026) - NAVIGATION & NOTIFICATIONS

#### Navigation Fixes
1. **CMS Tiles on Homepage** - Custom CMS tiles now appear in landing page navigation
2. **Public API Endpoint** - Added `/api/cms-tiles/public` for unauthenticated navigation access
3. **Select Item Fix** - Fixed empty string value error in organization select (changed to "none")

#### Discord Notifications
4. **Access Request Notifications** - Super admins receive Discord alerts for new access requests
5. **Assignment Notifications** - Assigned admins get Discord + email notifications
6. **Contact Form Notifications** - Discord alerts for new contact form submissions
7. **Uses Global Webhook** - Reads from branding settings `discord_webhook_url`

#### Credential Harvest Enhancement
8. **Password Hint Display** - Shows 2 random password characters with positions (e.g., "Position 3: 'a', Position 7: 'x'")

#### Backend Improvements
9. **Organization ID Handling** - Backend properly handles "none" value for no organization
10. **aiohttp Integration** - Added async HTTP client for Discord webhook calls

### Session 16 Updates (March 1, 2026) - SETTINGS & CUSTOMIZATION

#### CMS Tiles in Navigation Settings
1. **Settings Page Integration** - All CMS tiles now visible in Settings > Navigation Menu
2. **Toggle Visibility** - Click to toggle any tile's visibility in the navigation bar
3. **Separated Sections** - Built-in pages (Blog, Videos, News, About) and Custom CMS Pages shown separately

#### Credential Harvest Password Hint
4. **Password Hint Feature** - Displays 2 random characters from submitted passwords with positions
   - Example: "Position 3: 'a', Position 7: 'x'"
   - Helps identify weak password patterns in training
   - Full password NEVER stored

#### Form Submission Email Templates
5. **New Email Templates Added:**
   - Contact Form Notification - Sent to admins when contact form submitted
   - Access Request Notification - Sent to admins when access requested
   - Access Request Approved - Sent to users when their request is approved
6. **Customizable Variables** - Each template supports custom variables like {sender_name}, {message}, etc.

### Session 15 Updates (March 1, 2026) - ACCESS REQUEST WORKFLOW

#### New Access Request Workflow Features
1. **Approve & Create User** - Create user account directly from access request
   - Assign role (trainee, org_admin, media_manager, super_admin)
   - Assign organization (optional)
   - Auto-generate secure password
   - Optional welcome email with credentials
2. **Assign to Admin** - Assign request to specific admin for handling
   - Sends email notification to assigned admin
   - Shows assigned admin name on request card
3. **Resolve Request** - Mark request as resolved/completed
4. **Reject Request** - Reject access request with status update
5. **Delete Request** - Remove access request (super admin only)

#### Backend Endpoints Added
- `POST /api/inquiries/{id}/approve` - Create user from request
- `POST /api/inquiries/{id}/assign` - Assign to admin
- `POST /api/inquiries/{id}/resolve` - Mark resolved
- `GET /api/inquiries/admins/list` - Get admins for assignment dropdown

#### UI Enhancements
- Access Requests tab now default on Forms page
- Action buttons shown based on request status
- Country/location shown on request cards
- Assigned admin name displayed

### Session 14 Updates (March 1, 2026) - COMPREHENSIVE FIXES

#### Email & Campaigns
1. **Email Test Send Feature** - Added `/api/system-emails/test-send` and `/api/system-emails/test-custom` endpoints
2. **Email Preview with Test Send** - Email Templates page now has "Send Test" button in preview dialog
3. **Email Validation** - Added `is_valid_email()` and `validate_email_list()` utilities to email service

#### News & RSS Feeds
4. **RSS Feed Pagination Fixed** - Backend now fetches ALL enabled RSS feeds (up to 10 items per feed) and paginates combined results
5. **Correct Total Count** - News total includes RSS items for proper pagination

#### CMS & Navigation
6. **CMS Tiles Input Fix** - Fixed input bug by using proper handleChange function and autoComplete="off"
7. **Tiles in Navigation** - Published CMS tiles appear in navigation via `/api/navigation/public`

#### Forms & Access Requests
8. **Access Requests Endpoint Fixed** - FormSubmissions page now correctly calls `/api/inquiries` instead of `/api/access-requests`
9. **Separate Tabs** - Contact Forms and Access Requests shown in separate tabs with individual counts

#### Security Improvements
10. **JWT Secret Warning** - Server logs warning if JWT_SECRET not set in environment
11. **Email Validation** - Registration/login reject invalid email formats (using Pydantic EmailStr)
12. **Input Sanitization** - Existing sanitize_string function protects against XSS

### Session 13 Updates (March 1, 2026) - UI/UX IMPROVEMENTS

#### Bug Fixes
1. **RSS Feeds Status Bug Fixed** - Changed field name from `is_active` to `enabled` in RSSFeedManager.js - feeds now show correct Active/Inactive status
2. **Content Manager Enhanced** - Added dynamic CMS tile tabs (non-system only) and RSS Feeds management tab

#### Sidebar Simplification
3. **Removed duplicate content items** - CMS tiles (Blog, News, Videos, About) no longer appear in sidebar navigation
4. **CMS tiles shown in Content Manager** - All content types (built-in + custom CMS) now managed via Content Manager tabs

#### Credential Harvest Email Builder
5. **Improved 2-column layout** - Side-by-side "Add Elements" controls and "Live Preview" panel
6. **Clear All button** - Easy way to reset email content
7. **Better responsive design** - Works on all screen sizes

#### Executive Training
8. **Bulk delete confirmed working** - Checkboxes for selecting multiple presentations
9. **Edit/Update functionality** - Update presentation name and description

### Session 12 Updates (March 1, 2026) - BUG FIXES COMPLETE

#### P0 - Critical Fixes
1. **RSS Feed Bug Fixed** - Corrected API path in RSSFeedManager.js from `/api/content/rss-feeds` to `/api/content/news/rss-feeds`
2. **SendGrid Email Configured** - Added SENDGRID_API_KEY and SENDER_EMAIL to backend .env

#### P1 - Important Features  
3. **Credential Harvest Editor Responsive** - Made dialog responsive with max-width 900px

#### P2 - UX Enhancements
4. **Toast Notifications** - Added closeButton and reduced duration to 3 seconds
5. **CMS Navigation Integration** - Published CMS tiles now auto-appear in navigation menu

#### P3 - Consolidations
6. **Forms Page** - Merged "Access Requests" and "Form Submissions" into single "Forms" page
7. **Certificate Wording** - Changed to "for successfully completing the '[module name]' Training"
8. **PPT Management** - Added edit/update and bulk delete for uploaded presentations

### Session 11 Updates (March 1, 2026) - COMPLETED

#### Credential Harvest Template Editing Fix
- Added data-testid for debugging
- Ensured all template fields are properly initialized when editing
- Visual email builder with drag-drop blocks working

#### CMS Tiles Management (New Feature)
- **Page:** `/cms-tiles` - Full CMS management page
- **Features:**
  - 4 default system tiles: Blog, News, Videos, About
  - Add unlimited custom tiles
  - Publish/unpublish toggle
  - Edit tile name, slug, icon, description
  - Route types: Internal, External, Custom content
  - System tiles protected from deletion

#### RSS Feed Manager (New Feature)
- **Page:** `/rss-feeds` - Multiple RSS feed management
- **Features:**
  - Add multiple RSS feeds from different sources
  - Edit feed settings (name, URL, category, refresh interval)
  - Toggle active/inactive
  - Popular cybersecurity feeds suggestions
  - News page pagination (15 items per page)

#### Form Submissions (New Feature)
- **Page:** `/form-submissions` - View all contact inquiries
- **Features:**
  - View contact form submissions
  - View access requests
  - Stats dashboard (total, pending, resolved)
  - Update status, send replies, delete
  - **Emails sent to:** info@vasilisnetshield.com

#### Executive Training PPT Expansion
- **Phishing module:** Expanded to 33 slides (from 15)
- **New slides added:**
  - Gift Card Scam example
  - Mobile Phishing threats
  - Voice Phishing (Vishing)
  - AI-Powered Phishing
  - URL Analysis Techniques
  - Email Header Analysis
  - Attachment Safety
  - Building Defense
  - Phishing Response Playbook
  - Resources and Tools
  - Quiz: Spot the Phishing
  - Action Items

### Test Credentials
- Admin: `test@admin.com` / `TestAdmin123!`

### Session 10 Updates (March 1, 2026) - COMPLETED

#### Phase 1 - Critical Fixes
1. **2FA Enforcement** - Users with 2FA enabled must now provide code to complete login (returns `requires_2fa: true` if code not provided)
2. **Certificate Fix** - Certificates now show only the completed module name prominently 
3. **Vulnerable Users** - Links now open in new tab with external link indicator

#### Phase 2 - CMS Overhaul
4. **Dynamic CMS Tiles System** - New `/api/cms-tiles` API:
   - 4 default system tiles: Blog, News, Videos, About
   - Add unlimited custom tiles
   - Publish/unpublish toggle for each tile
   - System tiles protected from deletion
   - Auto-updates navigation based on published status

5. **News Pagination** - Changed default to 15 items per page

#### Phase 3 - Credential Harvest Visual Builder
6. **Visual Email Builder** - Added drag-drop visual builder for credential harvest emails:
   - Logo, Header, Text, Button, Alert, Divider, Footer blocks
   - Live preview of email content
   - Toggle between Visual and HTML modes
   - Template edit dialog with visual builder

#### Phase 4 - Executive Training Overhaul
7. **9 Pre-built Training Modules**:
   - Email Phishing Awareness (19 slides)
   - Social Engineering Defense (17 slides)
   - Password Security (16 slides)
   - Data Protection & Privacy (15 slides)
   - Ransomware Awareness (19 slides) - NEW
   - Insider Threat Awareness (16 slides) - NEW
   - Mobile Device Security (16 slides) - NEW
   - Remote Work Security (16 slides) - NEW
   - Business Email Compromise (14 slides) - NEW

8. **Presentation Upload** (Super Admin only):
   - Upload custom PPTX presentations
   - Download uploaded presentations
   - Delete uploaded presentations

### Test Credentials
- Admin: `test@admin.com` / `TestAdmin123!`

### Session 9 Updates (March 1, 2026) - COMPLETED

#### P0 Bug Fixes
1. **2FA Flow Changed** - Removed 2FA field from login page. 2FA is now only prompted AFTER successful login if user has it enabled
2. **Online Users Metric** - Dashboard "Active Users" changed to "Online Now" - shows users active in last 5 minutes via real-time activity tracking

#### P1 Feature Enhancements
3. **Certificate Templates** - Added Copy & Edit functionality for templates with image preview support
4. **Credential Harvest Templates** - Now editable with customizable credential fields:
   - Username, Password, Email, Phone, Authenticator Code
   - Templates can be copied and modified
   - Statistics work for credential submissions
5. **Simulation Builder** - Fixed image/URL fields to properly render images instead of showing URL text

#### P2 New Features
6. **Audit Logging Enhanced** - Added logging for:
   - Certificate downloads
   - Presentation downloads
   - User imports (already existed)
7. **Executive Training Module** - New feature for generating PowerPoint presentations:
   - 4 Pre-built modules: Email Phishing Awareness (19 slides), Social Engineering Defense (17 slides), Password Security (16 slides), Data Protection & Privacy (15 slides)
   - Downloadable PPTX files with professional dark theme design
   - Access at `/executive-training`

### Test Credentials
- Admin: `test@admin.com` / `TestAdmin123!`

## Previous Status (Feb 2026)

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
~~3. **Image Upload in Training Questions** - Images not displaying (fix pending testing)~~ FIXED
~~4. **Certificate Text Not Rendering** - PDF certificates missing text elements~~ FIXED (Feb 2026)
5. **Training Assignment Email Link** - May point to wrong domain

### P3 - Lower Priority
6. **Bulk User Import** - Feature may be broken

### Completed (Feb 25, 2026)
- [x] **Bulk Actions & Multi-Org Selection** - All simulation pages now support:
  - Bulk campaign deletion via checkboxes
  - Multi-organization selection when creating campaigns
  - Applied to: Ad Simulations, Phishing Simulations, Credential Harvest
- [x] **Image Upload in Training Questions** - GenericQuestion component now properly renders image_question types with uploaded images
- [x] **2FA QR Code Fix** - Fixed broken QR code display for Two-Factor Authentication setup:
  - Replaced deprecated Google Chart API (`chart.googleapis.com`) with `qrcode.react` library
  - Fixed in both `SecurityDashboard.js` and `MySecurity.js`
  - QR codes now render as SVG client-side
- [x] **Campaign Dialog Scrolling** - Fixed "Create Campaign" dialogs being too tall:
  - Added `max-h-[90vh]` and scrollable content area
  - Fixed in PhishingSimulations.js and AdSimulations.js
- [x] **System Email Template Customization** - New visual editor for system emails:
  - New page at `/system-emails` for super admins
  - Customize Welcome Email, Password Reset, Forgot Password, Training Assignment emails
  - Toggle icon visibility and choose icon type (Shield, Mail, Key, Alert, Check, None)
  - Customize subject line, headers, greeting, body, button text, footer
  - Live preview functionality
  - Backend: `/app/backend/routes/system_emails.py`
  - Frontend: `/app/frontend/src/pages/SystemEmailTemplates.js`

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

### Session Changes (Feb 25, 2026 - E1 Fork) - P0/P1 Bug Fixes
- **Bulk Actions & Multi-Org Selection (P0)** - All three simulation pages now support:
  - `AdSimulations.js` - Added `organization_ids[]` array, checkboxes for bulk selection, Delete button when selected, multi-org selection in create dialog
  - `PhishingSimulations.js` - Fixed user selection to work with multi-org (users grouped by organization)
  - `CredentialHarvest.js` - Already had multi-org support, verified working
- **Image Upload in Training Questions (P1)** - Enhanced `TrainingSession.js`:
  - `GenericQuestion` component now checks for `image_question` type
  - Renders uploaded images with proper styling (max-h-64, rounded-lg, object-contain)
  - Also displays question text below the image
- **Testing Agent Verification** - All features verified with 100% pass rate

### Session Changes (Feb 2026 - E1 Fork) - Certificate Bug Fixes
- **Certificate Text Rendering (P0)** - VERIFIED WORKING:
  - PDF certificates now render all text elements correctly (user name, score, date, etc.)
  - Y-coordinate calculation fixed in `certificate_service.py` for proper text positioning
  - Empty template fallback works - templates with no elements use default certificate generator
  - Both `/api/certificates/user/{user_id}` and `/api/certificates/user/{user_id}/module/{module_id}` endpoints working
- **Module-Specific Certificate Templates (P1)** - VERIFIED WORKING:
  - Templates assigned to modules are correctly applied when generating certificates
  - Template lookup priority: Organization > Module > Global Default
  - Added logging to track which template is being used for each certificate

## Key Files Reference
- `/app/backend/server.py` - Main API server with CORS config
- `/app/backend/routes/vulnerable_users.py` - Vulnerable users API
- `/app/backend/services/discord_service.py` - Discord webhook service
- `/app/frontend/src/pages/VulnerableUsers.js` - Vulnerable users UI
- `/app/frontend/src/pages/PhishingSimulations.js` - Campaign management with multi-org support
- `/app/frontend/src/pages/AdSimulations.js` - Ad campaigns with bulk delete and multi-org
- `/app/frontend/src/pages/CredentialHarvest.js` - Credential harvest with bulk delete and multi-org
- `/app/frontend/src/pages/TrainingSession.js` - Training with image_question support
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

---

## Session Changes (March 2026 - E1 Fork) - P0-P2 Bug Fixes

### P0 - Critical Issues Fixed
1. **Bulk User Import Function Signature** - VERIFIED WORKING:
   - Fixed `send_welcome_email` call in `inquiries.py` to use correct params (`user_email`, `password` instead of `to_email`, `temp_password`)
   - User import API endpoints working: `/api/import/users/preview` and `/api/import/users`
   
2. **SelectItem Runtime Error** - VERIFIED WORKING:
   - Changed default `organization_id` from empty string `''` to `'none'` in FormSubmissions.js
   - Added filter to remove orgs with empty IDs from Select dropdown
   - Approve & Create User workflow now works without runtime errors

### P1 - High Priority Issues Fixed
3. **News Page Pagination** - VERIFIED WORKING:
   - Increased RSS items per feed from 10 to 50
   - Backend now aggregates ALL RSS entries, sorts by date, then applies pagination
   - Frontend correctly receives total count for pagination
   - API: `/api/content/news?include_rss=true&skip=X&limit=Y`

4. **Credential Harvest Statistics Dashboard** - VERIFIED WORKING:
   - Added organization filtering to CredentialSubmissions page
   - New org filter dropdown alongside campaign filter
   - Backend supports `organization_id` query param on `/api/phishing/credential-submissions/stats`

### P2 - Medium Priority Issues Fixed
5. **CMS Tile Input Bug** - VERIFIED WORKING:
   - Extracted `TileForm` component outside main component (was causing re-render on each keystroke)
   - Wrapped with `React.memo()` and `useCallback` for performance
   - Input now accepts multiple characters without losing focus

6. **Security Vulnerability Scan** - COMPLETED:
   - Added filename sanitization for PPTX uploads (regex to prevent path traversal)
   - Verified CORS configuration is environment-aware
   - Verified JWT secret warns when using default
   - Verified no dangerous `eval`/`exec` calls in backend
   - All sensitive routes have proper authentication

### Testing Results (Iteration 16)
- **Backend**: 100% pass rate (20/20 tests)
- **Frontend**: 83% pass rate (5/6 tests, 1 skipped due to rate limiting)
- **Test Files**: `/app/backend/tests/test_iteration_16.py`, `/app/tests/e2e/iteration-16.spec.ts`

---

## Session Changes (March 2026 - E1 Fork #2) - Events Management System

### New Feature: Events Management System
**Complete event scheduling system with:**
1. **Visual Editor** (TipTap WYSIWYG) - No HTML coding required
   - Bold, italic, strike formatting
   - Headings (H1, H2)
   - Bullet and numbered lists
   - Image insertion via URL
   - Link insertion
   - Blockquotes

2. **Calendar View** (react-big-calendar)
   - Month, week, day, and agenda views
   - Click event to edit
   - Visual event display with gold accent color

3. **RSVP System**
   - Enable/disable per event
   - Max attendees limit
   - Email confirmation on RSVP
   - View RSVPs list (admin)

4. **ICS Support**
   - Import .ics files to create multiple events
   - Export single event as .ics
   - Export all events as .ics

5. **Recurring Events**
   - Daily, weekly, monthly, yearly frequencies
   - Custom interval (e.g., every 2 weeks)
   - End date or count limit

6. **Photo Upload**
   - Optional photo per event
   - Base64 storage
   - Preview in event list

7. **Access Control**
   - Super admin only can create/edit/delete
   - Public can RSVP to events

**Files Created:**
- `/app/backend/routes/events.py` - Full CRUD, RSVP, ICS import/export
- `/app/frontend/src/pages/EventsPage.js` - Calendar view + list view + forms

**API Endpoints:**
- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `PATCH /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/rsvp` - RSVP to event
- `GET /api/events/{id}/rsvps` - View RSVPs
- `GET /api/events/{id}/ics` - Export as ICS
- `POST /api/events/import/ics` - Import ICS file

### Bug Fix: CMS Tile Input Focus Issue
- Converted TileForm to use uncontrolled inputs with `refs`
- Plain HTML `<input>` elements instead of controlled components
- `useImperativeHandle` to expose `getData()` method
- Form data only read on submit, not during typing

### Git Push Secret Issue
- Removed SendGrid API key and JWT_SECRET from `.env` file
- Keys should be set in Vercel environment variables for production
- Added JWT_SECRET back for local development only

## Remaining Tasks (P3 - Future)
- Expand PPT modules to 30-50 slides
- Replace credential harvest editor with true drag-and-drop builder
- Add rate limiting bypass for test accounts
- Event reminder email scheduler (background task)

---

## Session Changes (December 2025 - E1 Fork) - Vercel Deployment Fix

### P0 - Critical Fix: Vercel Build Failure
**Root Cause:** `requirements.txt` contained packages that fail to install on Vercel:
- `starkbank-ecdsa==2.2.0` - Fails during `pip install` on Vercel's Python runtime
- `emergentintegrations==0.1.0` - Internal Emergent package, not on PyPI
- `python-jose==3.5.0` - Unused (app uses PyJWT instead), could pull starkbank-ecdsa as dependency

**Fix Applied:**
- Removed all 3 packages from `/app/backend/requirements.txt`
- Backend verified working locally
- Total packages reduced from 141 to 138

**User Action Required:**
1. Push to GitHub via "Save to Github"
2. Redeploy on Vercel with cache cleared

---

## Session Changes (March 2026) - Landing Page Performance & Delete Pages

### P0 - Fixed: Logo and Navigation Loading Delay
**Issue:** The logo and navigation menu items were not appearing until ALL API calls completed, causing a noticeable delay on page load.

**Root Cause:** 
1. The `Logo` component had its own separate API call to fetch branding, causing duplicate requests
2. Navigation items waited for `isReady` flag which required ALL data to load

**Fix Applied:**
- Removed independent API call from `Logo` component - now receives `branding` as prop
- Navigation items now render immediately when `cmsTiles` data is available
- Logo shows fallback (favicon.svg) instantly while branding loads

### P0 - Verified: Delete Custom Pages Functionality  
**Feature:** Ability to delete custom CMS pages from the admin Content Manager

**Status:** Already working - verified via API testing:
- DELETE endpoint: `DELETE /api/cms-tiles/{tile_id}` 
- Only non-system tiles can be deleted
- Confirmation dialog prevents accidental deletion
- Successfully deleted duplicate "Events" page during testing

### Files Modified:
- `/app/frontend/src/pages/LandingPage.js` - Optimized Logo and navigation loading

---

## Session Changes (March 2026) - Dynamic Training Names on Certificates

### P0 - Feature: Dynamic Training Module Names on Certificates
**User Request:** Certificates should carry the specific training module name dynamically. E.g., "has completed the Phishing Email Detection training" instead of generic text.

**Implementation:**
1. **New `{training_name}` Placeholder** - Added to certificate rendering system:
   - Single module: Shows exact module name (e.g., "Phishing Email Detection")
   - Multiple modules: Joins with " & " (e.g., "Phishing Email Detection & Social Engineering Defense")

2. **Backend Changes:**
   - `/app/backend/routes/certificates.py` (Lines 144-160): Added `training_name` to placeholders dict
   - `/app/backend/routes/certificates.py` (Lines 311-322): Module-specific route passes `training_name`
   - `/app/backend/services/certificate_service.py` (Line 305): Added `training_name` to extended_placeholders

3. **Template Updates:**
   - All 8 preset templates updated to use `{training_name}` placeholder in completion text
   - Templates: Classic Professional, Modern Minimal, Corporate Blue, Executive Gold, Cyber Shield, Official Compliance, Tech Academy, Elegant Serif

4. **Frontend Enhancement:**
   - Added placeholder documentation hint in text element editor: "Use {training_name} for dynamic training module name"

**Testing Results (Iteration 18):**
- 100% backend pass rate (15/15 tests)
- Single module certificate: Shows "Phishing Email Detection" ✅
- Multi-module certificate: Shows "Phishing Email Detection & Social Engineering Defense" ✅
- PDF filename includes module name ✅
- All preset templates verified ✅

### Files Modified:
- `/app/backend/routes/certificates.py` - Added training_name placeholder
- `/app/backend/routes/certificate_templates.py` - Updated 8 preset templates with {training_name}
- `/app/backend/services/certificate_service.py` - Added training_name to extended_placeholders
- `/app/frontend/src/pages/CertificateTemplates.js` - Added placeholder documentation hints
