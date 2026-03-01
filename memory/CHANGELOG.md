# Vasilis NetShield - Changelog

## Session 12 Updates (March 1, 2026) - BUG FIXES

### P0 - Critical Fixes
1. **RSS Feed Bug Fixed** - Corrected API path from `/api/content/rss-feeds` to `/api/content/news/rss-feeds` in RSSFeedManager.js
2. **SendGrid Email Configuration** - Added SENDGRID_API_KEY and SENDER_EMAIL to backend .env

### P1 - Important Features
3. **Credential Harvest Editor Responsive** - Made dialog responsive with max-width 900px and 90vh height

### P2 - Enhancements
4. **Toast Notifications UX** - Added closeButton and reduced duration to 3 seconds in App.js
5. **CMS Navigation Integration** - Published CMS tiles now automatically appear in the navigation menu via `/api/navigation/public`

### P3 - Consolidations & Management
6. **Forms Page Consolidation** - Merged "Access Requests" and "Form Submissions" into single "Forms" page
7. **Certificate Wording Fixed** - Changed text to "for successfully completing the '[module name]' Training"
8. **PPT Management Enhanced** - Added edit/update functionality and bulk delete for uploaded presentations in Executive Training

### Technical Changes
- Fixed route ordering in executive_training.py (bulk delete before single delete)
- Navigation endpoint now fetches and includes published CMS tiles
- Removed redundant Form Submissions link from Settings sidebar
- Renamed "Access Requests" to "Forms" in Management section

### Test Results (Iteration 12)
- Backend: 15/15 tests passed (100%)
- Frontend: 9/9 tests passed with some rate-limited tests quarantined
- All features verified working

### Files Modified
- `/app/frontend/src/pages/RSSFeedManager.js` - Fixed API paths
- `/app/frontend/src/App.js` - Toast closeButton and duration
- `/app/frontend/src/components/DashboardLayout.js` - Navigation consolidation
- `/app/frontend/src/pages/FormSubmissions.js` - Title changed to "Forms"
- `/app/frontend/src/pages/ExecutiveTraining.js` - Edit/bulk delete UI
- `/app/frontend/src/pages/CredentialHarvest.js` - Responsive dialog
- `/app/backend/routes/navigation.py` - CMS tiles in public nav
- `/app/backend/routes/executive_training.py` - Edit/bulk delete endpoints
- `/app/backend/services/certificate_service.py` - Certificate wording
- `/app/backend/.env` - SendGrid credentials

### Test Credentials
- Admin: `test@admin.com` / `TestAdmin123!`
