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
- Enhanced security with RBAC and organization-scoped access control

## What's Been Implemented (Latest Session - Feb 2025)

### Pagination & Search (NEW)
- [x] Blog page with pagination, search, and configurable page size (default 10)
- [x] News page with pagination, search, and configurable page size
- [x] Videos page with pagination, search, and configurable page size
- [x] Users admin page with pagination
- [x] Reusable Pagination component for admin and public pages
- [x] URL-based pagination state (bookmarkable, shareable)

### Permission Management UI (NEW)
- [x] Dedicated Permissions Management page (`/permissions`)
- [x] View all users and their roles
- [x] Change user roles (with restrictions)
- [x] Grant/revoke individual permissions
- [x] Bulk permission management
- [x] Super admin only access to permissions page

### Organization-Scoped Access Control (NEW/FIXED)
- [x] Org admins can ONLY see users in their organization
- [x] Org admins can ONLY see their own organization
- [x] Org admins can ONLY see campaigns for their organization
- [x] Dashboard stats are org-scoped for org admins
- [x] Org admins cannot assign super_admin role
- [x] Org admins cannot modify users outside their org

### Security Features
- [x] Audit logging with geolocation (country, city, ISP)
- [x] 30-day audit log retention with cleanup
- [x] Audit log export (CSV/JSON)
- [x] HSTS headers enabled by default
- [x] Security headers middleware
- [x] Rate limiting per endpoint
- [x] Account lockout management
- [x] 28 granular permissions across 10 categories

### Email System
- [x] SendGrid integration with click tracking DISABLED
- [x] Compact email templates (no Gmail clipping)
- [x] Direct URLs (no tracking URL issues)
- [x] Access request notifications to ALL super admins
- [x] Welcome emails, password reset emails

## API Endpoints

### Content with Pagination
- `GET /api/content/blog?skip=0&limit=10&search=query` - Paginated blog posts
- `GET /api/content/news?skip=0&limit=10&search=query` - Paginated news
- `GET /api/content/videos?skip=0&limit=10&search=query` - Paginated videos

### Permission Management
- `GET /api/permissions/roles` - Get assignable roles
- `GET /api/permissions/available` - Get assignable permissions
- `GET /api/permissions/user/{user_id}` - Get user's permissions
- `POST /api/permissions/grant` - Grant permission
- `POST /api/permissions/revoke` - Revoke permission
- `POST /api/permissions/bulk` - Bulk permission updates
- `PUT /api/permissions/role` - Update user's role
- `GET /api/permissions/my-permissions` - Current user's permissions

### Security Dashboard
- `GET /api/security/dashboard` - Security overview
- `GET /api/security/audit-logs` - Paginated audit logs
- `GET /api/security/audit-logs/export` - Export logs
- `GET /api/security/audit-logs/stats` - Statistics

## Role Hierarchy

| Role | Access Level | Can Manage |
|------|--------------|------------|
| super_admin | Full system | All users, all orgs |
| org_admin | Organization only | Users in their org |
| manager | Limited | Read campaigns, training |
| media_manager | Content only | Blog, news, videos |
| trainee | Training only | Take training |
| viewer | Read-only | View only |

## Database Collections
- users, user_permissions
- organizations
- campaigns, phishing_campaigns, ad_campaigns
- training_sessions, scenarios
- certificates, certificate_templates
- content (blog, news, videos)
- pages, settings, sidebar_configs
- media, audit_logs, inquiries

## Prioritized Backlog

### P1 (High Priority)
- [ ] Complete Media Library UI
- [ ] Certificate signature upload

### P2 (Medium Priority)
- [ ] Security dashboard UI updates
- [ ] User documentation updates

## Vercel Deployment

### Backend Environment Variables:
```
MONGO_URL=mongodb+srv://...
DB_NAME=vasilisnetshield
CORS_ORIGINS=https://vasilisnetshield.com
JWT_SECRET=your-secret
FRONTEND_URL=https://vasilisnetshield.com
SENDGRID_API_KEY=your-key
SENDER_EMAIL=info@vasilisnetshield.com
```

### Frontend Environment Variables:
```
REACT_APP_BACKEND_URL=https://vasilis.vercel.app
```
