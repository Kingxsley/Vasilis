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

### Dynamic Navigation Menu Manager (NEW - This Session)
- [x] Menu Manager tab in CMS for super_admins
- [x] Add custom navigation items (internal links, external URLs, CMS pages)
- [x] Role-based visibility (super_admin, org_admin, media_manager, trainee, all)
- [x] Section placement (Overview, Management, Simulations, Content, Training, Settings, Security)
- [x] Icon selection from 57 available icons
- [x] Open in new tab option for external links
- [x] Sort order for custom ordering
- [x] Active/Inactive toggle
- [x] Edit and delete functionality
- [x] Custom items appear in sidebar dynamically

### Media Manager Role Permissions (NEW - This Session)
- [x] media_manager role can access: Content, SEO, Email Templates, Settings
- [x] Sidebar navigation properly shows/hides based on media_manager role

### Password Policy Page (NEW - This Session)
- [x] Moved from Settings to Security section
- [x] Dedicated `/password-policy` page
- [x] Password Requirements: min length, uppercase, lowercase, numbers, special chars
- [x] Account Security: password expiry, prevent reuse
- [x] Account Lockout Settings: failed attempts (3), lockout duration (15 min)
- [x] Policy Summary card showing all active settings

### Blog & News Pagination (NEW - This Session)
- [x] Blog posts: 10 per page with pagination controls
- [x] News items: 10 per page with pagination controls
- [x] Search functionality for blog and news
- [x] Page counter and "Showing X-Y of Z" indicator

### User Import V2 (This Session)
- [x] Auto-generate secure passwords (16 chars, mixed case, numbers, special)
- [x] Send welcome emails via SendGrid with login credentials
- [x] CSV format simplified: name, email, role, organization_name (no password column)
- [x] Org admins can only import users to their own organization

### New Simulation Types (This Session)
- [x] QR Code Phishing, USB Drop, MFA Fatigue, BEC, Data Handling Trap, Ransomware Readiness, Shadow IT Detection
- [x] 35 new simulation templates (5 per type)

## API Endpoints

### Navigation Menu Management (NEW)
- `GET /api/navigation` - List all custom nav items (admin only)
- `GET /api/navigation/public` - Get nav items for current user based on role
- `GET /api/navigation/options` - Get available icons, sections, roles, CMS pages
- `POST /api/navigation` - Create custom nav item (super admin)
- `PATCH /api/navigation/{item_id}` - Update nav item (super admin)
- `DELETE /api/navigation/{item_id}` - Delete nav item (super admin)

### Password Policy (Updated)
- `GET /api/settings/password-policy` - Returns full policy settings
- `PATCH /api/settings/password-policy` - Update policy settings

## Role-Based Navigation

| Menu Section | super_admin | org_admin | media_manager | trainee |
|--------------|-------------|-----------|---------------|---------|
| Overview (Dashboard, Analytics) | Yes | Yes | No | No |
| Management (Users, Import) | Yes | Yes | No | No |
| Access Requests | Yes | No | No | No |
| Organizations | Yes | No | No | No |
| Simulations | Yes | No | No | No |
| Content (CMS, Editors) | Yes | No | **Yes** | No |
| Training (My Training) | Yes | Yes | Yes | Yes |
| Certificates, Cert Templates | Yes | No | No | No |
| Settings | Yes | No | **Yes** | No |
| Security (Dashboard, Audit, **Password Policy**) | Yes | No | No | No |

## Database Collections (Updated)
- navigation_items (NEW) - Custom menu items
- users, user_permissions, audit_logs
- organizations
- campaigns, phishing_campaigns, ad_campaigns
- training_sessions, scenarios
- certificates, certificate_templates
- content (blog, news, videos)
- pages, settings, sidebar_configs
- media, inquiries

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] Dynamic Menu Manager (no-code navigation)
- [x] Media Manager role permissions
- [x] Password Policy moved to Security
- [x] Blog & News pagination with search
- [x] User Import V2
- [x] New simulation types

### P1 (High Priority)
- [ ] Complete Media Library UI
- [ ] Certificate signature upload
- [ ] User documentation updates

### P2 (Medium Priority)
- [ ] Logo display consolidation (two data sources)
- [ ] Drag-and-drop for editors
- [ ] Smishing Simulation (deferred)

## Test Credentials
- Super Admin: `kingsley@vasilisnetshield.com` / `Test123!`
- Org Admin: `orgadmin@test.com` / `Test123!`

## Navigation Item Structure
```json
{
  "item_id": "nav_xxxxx",
  "label": "Custom Link",
  "link_type": "internal|external|cms_page",
  "path": "/path-or-url",
  "icon": "Globe",
  "section_id": "content",
  "visible_to": ["super_admin", "media_manager"],
  "open_in_new_tab": false,
  "sort_order": 100,
  "is_active": true,
  "is_custom": true
}
```
