# VasilisNetShield - Cybersecurity Training Platform

## Original Problem Statement
Build a scalable cybersecurity training application with:
- Admin dashboard for managing organizations, users, and campaigns
- Phishing simulations and malicious ad detection training
- Content Management System (CMS) for blog, news, videos, and about pages
- Dynamic branding system (custom logo, favicon, company name, colors)
- Role-based access control including a `media_manager` role
- Self-hosting capabilities for deployment on user's own domain

## Target Users
1. **Super Admin** - Full system access, manage all organizations and users
2. **Org Admin** - Manage users within their organization
3. **Media Manager** - Restricted access to CMS content only
4. **Trainee** - Complete training modules, view certificates

## Core Features

### Authentication & Authorization
- Email/password registration and login
- JWT-based authentication with 7-day expiration
- Role-based access control (RBAC)
- Session management

### Admin Dashboard
- Organization management (CRUD)
- User management with role assignment
- Phishing simulations with campaign management
- Analytics and training progress tracking

### Training Modules
- Phishing Email Detection (10 scenarios)
- Malicious Ad Recognition (8 scenarios)
- Social Engineering Defense (12 scenarios)
- AI-powered scenario generation (optional, requires OpenAI API)
- Certificate generation on completion

### Content Management System (CMS)
- **Blog** - Create/edit/delete posts with rich text editor
- **News** - Quick news updates with links + RSS feed integration
- **Videos** - YouTube video embeds with categories
- **About** - Company info, mission, vision, team members
- Rich text editor with formatting (bold, italic, headings, lists, links, images)

### Dynamic Branding
- Upload custom logo and favicon
- Set company name and tagline
- Customize text colors (body, headings, accent/links)
- Toggle navigation menu items (Blog, Videos, News, About)
- Applied across all pages (landing, auth, dashboard)

### Phishing Simulations
- Email template creation with rich text editor
- Email Preview feature
- Image Library for embedding/attaching images
- Campaign management with status filters (All, Active, Scheduled, Draft, Completed)
- Sender masking (custom From name and Reply-To)
- Scheduled campaign launching
- SendGrid integration for email delivery

### Ad Simulations
- Malicious ad template creation with custom HTML/CSS
- Campaign management with status filters (All, Active, Scheduled, Draft, Completed)
- Scheduled campaign launching
- Target user selection by organization
- View/click tracking and statistics

### Reports & Exports
- Excel/PDF report generation
- Bulk user import via CSV

## Technical Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── api/server.py      # Main FastAPI app
├── routes/
│   ├── content.py     # CMS API + RSS feeds
│   ├── scenarios.py   # Training scenario CRUD
│   ├── settings.py    # Branding settings + colors
│   ├── phishing.py    # Phishing campaigns + media library
│   ├── pages.py       # Landing page content
│   ├── certificates.py # Certificate generation
│   ├── export.py      # Report generation
│   └── user_import.py # Bulk CSV import
├── services/
│   ├── certificate_service.py
│   ├── phishing_service.py
│   ├── email_service.py  # SendGrid integration
│   └── report_service.py
└── requirements.txt
```

### Frontend (React + Tailwind CSS)
```
/app/frontend/src/
├── App.js                    # Main app with routing and auth context
├── components/
│   ├── DashboardLayout.js    # Sidebar navigation with RBAC
│   ├── RichTextEditor.js     # Custom contentEditable editor
│   └── ui/                   # Shadcn/UI components
├── hooks/
│   └── useFavicon.js         # Dynamic favicon loading
├── pages/
│   ├── ContentManager.js     # CMS management + RSS feeds
│   ├── PhishingSimulations.js # Email templates, campaigns, image library
│   ├── Settings.js           # Branding + color customization
│   ├── PageEditor.js         # Landing page content editor
│   └── ...
└── ...
```

### Database Schema (MongoDB)
- `users` - User accounts with roles
- `organizations` - Organization records
- `campaigns` - Phishing campaigns with scheduling
- `phishing_templates` - Email templates with attachments
- `phishing_media` - Uploaded images for email templates
- `training_sessions` - User training progress
- `scenarios` - Custom training scenarios
- `content` - Blog/news/video content
- `rss_feeds` - External RSS feed sources
- `page_content` - Dynamic landing page content
- `settings` - Branding configuration + colors

## What's Been Implemented

### December 2025 - Session 1
- Complete FastAPI backend with JWT authentication
- React frontend with Tailwind CSS styling
- MongoDB integration
- Training modules with template scenarios
- Basic dashboard and analytics

### December 2025 - Session 2
- Dynamic branding system (logo, favicon, company name)
- Content Management System (Blog, News, Videos, About)
- `media_manager` role with restricted access
- Custom Rich Text Editor (contentEditable-based)
- Public pages (/blog, /videos, /about)
- Scenario Manager for custom training content
- SendGrid email integration
- Phishing email enhancements (sender masking, scheduling)
- Dynamic Landing Page Editor
- Responsive design improvements

### December 2025 - Session 3 (Current)
- **Email Template Improvements**:
  - Email Preview feature to see template before sending
  - Image Library for managing images in phishing emails
  - Support for embedding images in body + attaching
- **Campaign Management Refactor**:
  - Removed standalone Campaign tab (per user request)
  - Integrated all campaign management into Phishing Sim page
  - Added status filters (All, Active, Scheduled, Draft, Completed)
- **RSS Feed Integration**:
  - News section now supports external RSS feeds
  - Add/manage RSS feed sources via UI
  - Local news and RSS feeds mixed together
- **Text Color Customization**:
  - Body text, headings, and accent/link colors
  - Color picker UI in Settings page
  - Live preview of color changes

### December 2025 - Session 5 (Current)
- **Security Dashboard** (Complete):
  - Summary cards for login metrics (successful, failed, lockouts, resets)
  - Active lockouts panel with manual unlock option
  - Suspicious IPs detection (3+ failed attempts)
  - Login activity chart for last 7 days
  - Paginated audit logs with filters
- **Forgot Password Feature** (Complete):
  - "Forgot password?" link on login page
  - Email with secure reset link (expires in 1 hour)
  - Password reset form with validation
- **Email Templates Customization** (Complete):
  - Admin page at /email-templates
  - 4 customizable templates: Welcome, Password Reset, Forgot Password, Password Expiry
  - Edit and preview functionality
  - Template variables for dynamic content
  - Reset to default option
- **Advanced Analytics Dashboard** (Complete):
  - Time range selector (7, 30, 90, 365 days)
  - Phishing campaign performance metrics
  - Vulnerability breakdown with progress bars
  - User distribution (active/inactive, by role)
  - Risk assessment summary with recommendations
- **Password Expiry Settings** (Complete):
  - Configurable expiry days (0 = never, or custom days)
  - Reminder days before expiry
  - Quick preset buttons (Never, 30, 60, 90, 180 days)
- **Collapsible Sidebar** (Complete):
  - Sidebar collapse/expand button
  - Menu groups expand/collapse independently
- **Favicon Fix** (Complete):
  - Created SVG favicon
  - Updated HTML to use SVG favicon
- **User Creation Fix** (Complete):
  - Improved feedback on email send status

## Documentation

Full user documentation is available at `/app/DOCUMENTATION.md`. This includes:
- Getting started guide
- User management
- Phishing and Ad simulations
- Training modules
- Analytics and reports
- Content management (Blog, Videos, News)
- Settings and configuration
- Security dashboard
- Troubleshooting

## Cron Job Setup (Vercel)

To enable scheduled campaigns and password expiry reminders, add the following to your `vercel.json` file:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-scheduled-campaigns",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/check-password-expiry",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Endpoints:**
- `/api/cron/check-scheduled-campaigns` - Checks and launches scheduled phishing/ad campaigns (run every 15 mins)
- `/api/cron/check-password-expiry` - Checks for expiring passwords and sends reminder emails (run daily at 9 AM)

## Pending/Upcoming Tasks

### P0 - Critical
- [x] ~~Security hardening~~ (Completed)
- [x] ~~Forgot password feature~~ (Completed)
- [x] ~~Email templates customization~~ (Completed)
- [x] ~~Advanced analytics dashboard~~ (Completed)
- [x] ~~Password expiry settings~~ (Completed)
- [x] ~~Collapsible sidebar~~ (Completed)
- [x] ~~Favicon fix~~ (Completed - SVG favicon with proper caching)
- [x] ~~Certificate Template Editor~~ (Completed - drag & drop with signatures/logos)
- [x] ~~Landing Page Layout Editor~~ (Completed - add/reorder/hide sections)
- [x] ~~Mobile menu flash fix~~ (Completed - waits for branding to load)
- [x] ~~Ad Simulation Copy URL feature~~ (Completed - clean URLs at root: /{campaign_id})
- [x] ~~Dashboard/Analytics data aggregation~~ (Completed - aggregates from phishing_campaigns + ad_campaigns)
- [ ] Setup cron job for:
  - Scheduled campaign launching (Vercel Crons)
  - Password expiry reminder emails

### P1 - Important  
- [ ] JWT refresh token implementation (access token lifetime shortened but refresh not implemented)
- [ ] Cron job setup guide for Vercel
- [ ] Certificate signature upload functionality
- [ ] Media Library for storing and compressing images

### P2 - Nice to Have
- [ ] Full end-to-end testing on production domain (vasilisnetshield.net)
- [ ] Drag-and-drop functionality for Certificate/Landing Page editors

### Future Enhancements
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Certificate drag-and-drop resize handles
- [ ] More landing page section templates

## Recent Changes (Feb 18, 2026 - Session 2)

### Certificate Template Editor
- Created `/certificate-templates` page with drag-and-drop canvas
- Support for text, logo, signature, and certifying body elements
- Pre-built templates: Classic Professional, Modern Minimal, Corporate Blue
- Asset management for signatures and certifying bodies
- Backend routes: `/api/certificate-templates/*`

### Landing Page Layout Editor
- Created `/landing-editor` page
- Support for 11 section types: hero, features, stats, testimonials, CTA, FAQ, team, pricing, gallery, text, custom
- Drag reorder, visibility toggle, delete functionality
- Real-time preview link
- Backend routes: `/api/landing-layouts/*`

### Copy Tracking URL (Ad Simulations)
- Added "Copy URL" button to campaign cards
- Uses masked URL format: `{domain}/track/{campaign_id}?u={tracking_code}`
- Clipboard API with fallback
- Visual feedback on copy (green check, "Copied!" text)

### Favicon Flash Fix
- Removed default shield favicon from index.html
- Implemented localStorage caching for instant favicon load
- No more flash of default icon before custom favicon loads

### Mobile Menu Flash Fix
- Added `isReady` state that waits for branding data before rendering nav items
- Hamburger menu only appears after branding is loaded
- Prevents flash of all menu items before visibility settings are applied

### Signup to Inquiry Form Conversion (Feb 18, 2026)
- Removed direct user signup functionality
- Replaced with contact/inquiry form collecting email, phone, and message
- Users must be created by administrators only
- Created `/inquiries` admin page ("Access Requests") to manage access requests
- Status tracking: pending, contacted, approved, rejected
- Backend routes: `/api/inquiries/*`

## Test Credentials
- **Super Admin**: admin@test.com / Admin123!
- **Media Manager**: media@netshield.com / MediaManager123!

## Deployment
- Preview: https://training-platform-12.preview.emergentagent.com
- Production: vasilisnetshield.net (pending user verification)
- Backend API: /api prefix required for all endpoints

## Third-Party Integrations
- **SendGrid** - Email delivery for phishing campaigns and welcome emails
- **OpenAI** (optional) - AI scenario generation
- **Google Auth** - Disabled in self-hosted version (pending user setup)
