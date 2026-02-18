# VasilisNetShield - Cybersecurity Training Platform

## Original Problem Statement
Build a scalable cybersecurity training application with:
- Admin dashboard for managing organizations, users, and campaigns
- Phishing simulations and malicious ad detection training
- Content Management System (CMS) for blog, news, videos, and about pages
- Dynamic branding system (custom logo, favicon, company name)
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
- Campaign management for phishing simulations
- Analytics and training progress tracking

### Training Modules
- Phishing Email Detection (10 scenarios)
- Malicious Ad Recognition (8 scenarios)
- Social Engineering Defense (12 scenarios)
- AI-powered scenario generation (optional, requires OpenAI API)
- Certificate generation on completion

### Content Management System (CMS)
- **Blog** - Create/edit/delete posts with rich text editor
- **News** - Quick news updates with links
- **Videos** - YouTube video embeds with categories
- **About** - Company info, mission, vision, team members
- Rich text editor with formatting (bold, italic, headings, lists, links, images)

### Dynamic Branding
- Upload custom logo and favicon
- Set company name and tagline
- Applied across all pages (landing, auth, dashboard)

### Phishing Simulations
- Email campaign creation
- User targeting and tracking
- Click rate analytics

### Reports & Exports
- Excel/PDF report generation
- Bulk user import via CSV

## Technical Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py          # Main FastAPI app with all routes
├── routes/
│   ├── content.py     # CMS API endpoints
│   ├── scenarios.py   # Training scenario CRUD
│   ├── settings.py    # Branding settings
│   ├── phishing.py    # Phishing campaign routes
│   ├── certificates.py # Certificate generation
│   ├── export.py      # Report generation
│   └── user_import.py # Bulk CSV import
├── services/
│   ├── certificate_service.py
│   ├── phishing_service.py
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
├── pages/
│   ├── ContentManager.js     # CMS management
│   ├── ScenarioManager.js    # Training scenarios
│   ├── Settings.js           # Branding settings
│   ├── Blog.js               # Public blog page
│   ├── VideosPage.js         # Public videos page
│   └── AboutPage.js          # Public about page
└── ...
```

### Database Schema (MongoDB)
- `users` - User accounts with roles
- `organizations` - Organization records
- `campaigns` - Phishing campaigns
- `training_sessions` - User training progress
- `scenarios` - Custom training scenarios
- `content` - Blog/news/video content
- `settings` - Branding configuration

## What's Been Implemented

### December 2025

#### Session 1 - Core Platform
- Complete FastAPI backend with JWT authentication
- React frontend with Tailwind CSS styling
- MongoDB integration
- Training modules with template scenarios
- Basic dashboard and analytics

#### Session 2 - CMS & Branding
- Dynamic branding system (logo, favicon, company name)
- Content Management System (Blog, News, Videos, About)
- `media_manager` role with restricted access
- Custom Rich Text Editor (contentEditable-based)
- Public pages (/blog, /videos, /about)
- Scenario Manager for custom training content

### February 2026 (Current Session)
- **Fixed**: Rich Text Editor (replaced react-quill with custom contentEditable solution)
- **Verified**: media_manager role permissions working correctly
- **Tested**: All CMS features passing (100% test success)
- Removed unused react-quill dependency

## Pending/Upcoming Tasks

### P0 - Critical
- [x] Fix Rich Text Editor crash (react-quill incompatibility) ✅ COMPLETE
- [x] Verify media_manager role permissions ✅ COMPLETE

### P1 - Important  
- [ ] Verify user's Vercel deployment status
- [ ] Test public-facing pages on user's domain (vasilisnetshield.net)
- [ ] Self-hosted Google OAuth setup (requires user's Google Cloud credentials)

### P2 - Nice to Have
- [ ] Configure SMTP for email notifications (requires user's SendPulse credentials)
- [ ] Full end-to-end testing on production domain
- [ ] Accessibility improvements (aria-describedby for dialogs)

### Future Enhancements
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Scheduled campaign automation
- [ ] Mobile app version

## Test Credentials
- **Super Admin**: testadmin@netshield.com / AdminTest123!
- **Media Manager**: media@netshield.com / MediaManager123!

## Deployment
- Preview: https://campaign-manager-pro.preview.emergentagent.com
- Production: vasilisnetshield.net (pending user verification)
- Backend API: /api prefix required for all endpoints

## Third-Party Integrations
- **OpenAI** (optional) - AI scenario generation
- **Google Auth** - Disabled in self-hosted version
- **SendPulse** - Email notifications (requires configuration)
