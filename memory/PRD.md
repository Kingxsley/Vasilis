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

## What's Been Implemented (Latest Session - Dec 2025)

### User Import V2 (NEW - This Session)
- [x] Auto-generate secure passwords (16 chars, mixed case, numbers, special)
- [x] Send welcome emails via SendGrid with login credentials
- [x] CSV format simplified: name, email, role, organization_name (no password column)
- [x] Org admins can only import users to their own organization
- [x] Import results show emails_sent count

### New Simulation Types (NEW - This Session)
- [x] QR Code Phishing (5 templates)
- [x] USB Drop Simulation (5 templates)
- [x] MFA Fatigue Simulation (5 templates)
- [x] Business Email Compromise (BEC) (5 templates)
- [x] Data Handling Trap (5 templates)
- [x] Ransomware Readiness Drill (5 templates)
- [x] Shadow IT Detection (5 templates)
- [x] Total: 35 new simulation templates seeded via `/api/scenarios/seed-templates`

### Dashboard Integration (NEW - This Session)
- [x] Stats card shows "Simulations" count (replaces Training Sessions)
- [x] New "Simulation Templates by Type" section showing breakdown by simulation type
- [x] Visual icons and colors for each simulation type

### RBAC Enhancements (NEW - This Session)
- [x] Access Requests now super_admin only (org_admin returns 403)
- [x] Sidebar navigation restricted for org_admin (no Access Requests, Settings, Content, Simulations, etc.)
- [x] Backend API endpoints secured with proper `require_super_admin` dependency

### Account Lockout System (NEW - This Session)
- [x] Reduced to 3 failed attempts before lockout (was 5)
- [x] 15-minute lockout duration

### Dynamic Sitemap (NEW - This Session)
- [x] `/api/sitemap.xml` generates dynamic sitemap from database
- [x] Includes static pages, blog posts, news articles, CMS pages
- [x] 1-hour cache for performance

### Previous Session Features
- [x] Dedicated Audit Logs page at `/audit-logs`
- [x] Country filter in audit logs (geo lookup via ip-api.com)
- [x] Permission Management page with user listing and search
- [x] Navigation Access Control (super admin only for sensitive sections)
- [x] Pagination & Search on Blog, News, Videos, Users pages
- [x] Organization-Scoped Access Control
- [x] 30-day audit log retention with cleanup
- [x] SendGrid integration with click tracking DISABLED

## API Endpoints

### New Endpoints (This Session)
- `GET /api/scenarios/types` - Get all scenario types with descriptions
- `POST /api/scenarios/seed-templates` - Seed 35 default templates (super admin)
- `GET /api/import/users/template` - Get V2 CSV template (no password column)
- `POST /api/import/users/preview` - Preview import with validation
- `POST /api/import/users` - Import users with auto-password + email
- `GET /api/sitemap.xml` - Dynamic sitemap generation

### Security Dashboard (Super Admin Only)
- `GET /api/security/dashboard` - Security overview
- `GET /api/security/audit-logs` - Paginated audit logs with filters
- `GET /api/security/audit-logs/export?format=csv|json` - Export logs
- `GET /api/security/rate-limit-status` - Shows 3-attempt lockout config

### Inquiries (Super Admin Only)
- `GET /api/inquiries` - List all access requests (403 for org_admin)
- `GET /api/inquiries/stats` - Inquiry statistics
- `GET /api/inquiries/{id}` - Get specific inquiry
- `PATCH /api/inquiries/{id}` - Update inquiry status

## Role-Based Navigation

| Menu Section | super_admin | org_admin | trainee |
|--------------|-------------|-----------|---------|
| Overview (Dashboard, Analytics) | Yes | Yes | No |
| Management (Users, Import) | Yes | Yes | No |
| Access Requests | Yes | No | No |
| Organizations | Yes | No | No |
| Simulations | Yes | No | No |
| Content (CMS, Editors) | Yes | No | No |
| Training (My Training) | Yes | Yes | Yes |
| Certificates, Cert Templates | Yes | No | No |
| Settings | Yes | No | No |
| Security (Dashboard, Audit Logs) | Yes | No | No |

## Database Collections
- users, user_permissions, audit_logs
- organizations
- campaigns, phishing_campaigns, ad_campaigns
- training_sessions, scenarios (35 templates per type)
- certificates, certificate_templates
- content (blog, news, videos)
- pages, settings, sidebar_configs
- media, inquiries

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] User Import V2 (auto-password, email sending)
- [x] 7 new simulation types with 35 templates
- [x] Dashboard showing simulation metrics
- [x] Access Requests restricted to super_admin
- [x] Account lockout reduced to 3 attempts
- [x] Dynamic sitemap generation

### P1 (High Priority)
- [ ] Complete Media Library UI
- [ ] Certificate signature upload
- [ ] User documentation updates
- [ ] Expandable sidebar navigation default state

### P2 (Medium Priority)
- [ ] Logo display consolidation (two data sources issue)
- [ ] Drag-and-drop for Certificate/Landing Page editors
- [ ] Smishing Simulation (deferred)

## Test Credentials
- Super Admin: `kingsley@vasilisnetshield.com` / `Test123!`
- Org Admin: `orgadmin@test.com` / `Test123!`

## Scenario Types
1. phishing_email - Email phishing detection training
2. malicious_ads - Malicious advertisement recognition
3. social_engineering - Social engineering defense scenarios
4. qr_code_phishing - QR code phishing awareness
5. usb_drop - USB drop attack simulation
6. mfa_fatigue - Multi-factor authentication fatigue attacks
7. bec_scenario - Business email compromise scenarios
8. data_handling_trap - Data handling and privacy traps
9. ransomware_readiness - Ransomware preparedness drills
10. shadow_it_detection - Shadow IT detection training
