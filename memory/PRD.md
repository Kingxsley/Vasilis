# Vasilis NetShield - Cybersecurity Training Platform

## Original Problem Statement
Build a full-featured cybersecurity training platform for vasilisnetshield.com with:
- Phishing simulations
- Ad detection training
- Social engineering scenarios
- Organization & user management
- Certificate generation
- Email campaigns
- Content management system
- Enhanced security with RBAC

## What's Been Implemented

### Authentication & Authorization
- [x] JWT-based authentication with auto-refresh
- [x] Google OAuth integration via Emergent
- [x] Role-based access (super_admin, org_admin, manager, trainee, media_manager, viewer)
- [x] Password reset via email
- [x] Account lockout after failed attempts
- [x] Password policy configuration
- [x] **NEW: Granular RBAC with 28 permissions**
- [x] **NEW: Organization-scoped access control**

### Security Features (NEW)
- [x] Enhanced audit logging with geolocation (country, city, ISP)
- [x] 30-day audit log retention with cleanup
- [x] Audit log export (CSV/JSON)
- [x] IP geolocation tracking for all security events
- [x] HSTS headers enabled by default
- [x] Security headers middleware (X-Frame-Options, XSS Protection, etc.)
- [x] Rate limiting per endpoint
- [x] Account lockout management

### Permission System (NEW)
- [x] 28 granular permissions across 10 categories
- [x] Super admins can assign any role and permission
- [x] Org admins can only manage users in their organization
- [x] Custom permission grants with expiration
- [x] Permission denial (override role defaults)
- [x] Bulk permission management

### Email System (UPDATED)
- [x] SendGrid integration with click tracking DISABLED
- [x] Compact email templates (no Gmail clipping)
- [x] Direct URLs (no tracking URL issues)
- [x] Access request notifications to ALL super admins
- [x] Welcome emails, password reset emails

### User & Organization Management
- [x] CRUD for organizations
- [x] CRUD for users
- [x] Bulk user import from CSV
- [x] Access request/inquiry system with email notifications

### Training System
- [x] Training modules (Phishing, Ads, Social Engineering)
- [x] Training sessions with scoring
- [x] AI-generated scenarios (with OpenAI)
- [x] Template-based fallback scenarios

### Content Management
- [x] Blog posts with rich text editor
- [x] News articles
- [x] Video content management
- [x] Landing page editor
- [x] Sidebar customizer

### Certificate System
- [x] Certificate templates with drag-and-drop elements
- [x] PDF certificate generation

### Settings & Branding
- [x] Company name and tagline
- [x] Logo upload with optimization
- [x] SEO settings with Google Analytics

## API Endpoints

### Permission Management (NEW)
- `GET /api/permissions/roles` - Get assignable roles
- `GET /api/permissions/available` - Get assignable permissions
- `GET /api/permissions/user/{user_id}` - Get user's permissions
- `POST /api/permissions/grant` - Grant permission to user
- `POST /api/permissions/revoke` - Revoke permission from user
- `POST /api/permissions/bulk` - Bulk grant/revoke permissions
- `PUT /api/permissions/role` - Update user's role
- `GET /api/permissions/check/{permission}` - Check if user has permission
- `GET /api/permissions/my-permissions` - Get current user's permissions

### Security Dashboard (UPDATED)
- `GET /api/security/dashboard` - Security overview with countries
- `GET /api/security/audit-logs` - Paginated audit logs with country filter
- `GET /api/security/audit-logs/export` - Export logs as CSV/JSON
- `GET /api/security/audit-logs/stats` - Audit statistics by action, country, severity
- `POST /api/security/cleanup-logs` - Manually cleanup old logs
- `GET /api/security/security-headers` - View security headers config

## Database Collections
- users
- user_permissions (NEW)
- organizations
- campaigns
- training_sessions
- scenarios
- certificates
- certificate_templates
- content (blog, news, videos)
- pages
- settings
- sidebar_configs
- media
- audit_logs (with geolocation)
- inquiries (with geolocation)

## Tech Stack
- **Frontend:** React 18, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Python 3
- **Database:** MongoDB
- **Auth:** JWT + Emergent Google OAuth
- **Email:** SendGrid
- **Geolocation:** ip-api.com (free)

## Prioritized Backlog

### P1 (High Priority)
- [ ] Frontend UI for permission management
- [ ] Complete Media Library UI
- [ ] Certificate signature upload

### P2 (Medium Priority)
- [ ] Frontend security dashboard updates
- [ ] Dynamic sitemap generation
- [ ] User documentation updates

## Vercel Deployment Notes
For your `.com` domain on Vercel:

### Backend Environment Variables:
```
MONGO_URL=your-mongodb-atlas-url
DB_NAME=vasilisnetshield
CORS_ORIGINS=https://vasilisnetshield.com
JWT_SECRET=your-secret-key
FRONTEND_URL=https://vasilisnetshield.com
SENDGRID_API_KEY=your-key
SENDER_EMAIL=info@vasilisnetshield.com
```

### Frontend Environment Variables:
```
REACT_APP_BACKEND_URL=https://vasilis.vercel.app
```

## Role Permissions Reference

| Role | Description | Can Assign |
|------|-------------|------------|
| super_admin | Full access | All roles |
| org_admin | Organization management | manager, trainee, media_manager, viewer |
| manager | Limited management | None |
| trainee | Training only | None |
| media_manager | Content only | None |
| viewer | Read-only | None |
