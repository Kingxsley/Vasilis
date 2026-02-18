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

## Pending/Upcoming Tasks

### P0 - Critical
- [ ] Verify user's Vercel deployment status
- [ ] User to add `SENDGRID_API_KEY` and `SENDER_EMAIL` to Vercel env vars
- [ ] Setup cron job for scheduled campaign launching

### P1 - Important  
- [ ] Self-hosted Google OAuth setup (requires user's Google Cloud credentials)
- [ ] SPF/DKIM domain authentication for better email deliverability

### P2 - Nice to Have
- [ ] Full end-to-end testing on production domain
- [ ] Apply dynamic text colors to public pages (landing, blog, etc.)

### Future Enhancements
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile app version

## Test Credentials
- **Super Admin**: testadmin@netshield.com / AdminTest123!
- **Media Manager**: media@netshield.com / MediaManager123!

## Deployment
- Preview: https://campaign-manager-pro.preview.emergentagent.com
- Production: vasilisnetshield.net (pending user verification)
- Backend API: /api prefix required for all endpoints

## Third-Party Integrations
- **SendGrid** - Email delivery for phishing campaigns and welcome emails
- **OpenAI** (optional) - AI scenario generation
- **Google Auth** - Disabled in self-hosted version (pending user setup)
