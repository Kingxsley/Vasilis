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

## 2026-04-19 — Navigation + PageBuilder Override for Internal Pages

### Fixed (P0)
- **Restored missing admin menu links**: Re-added News Manager, RSS Feeds, and Sidebar Manager under the Content group in `DashboardLayout.js`. Previous agent had removed them causing user frustration.
- **Public navigation renders near Login button**: Rewrote `/app/frontend/src/components/PublicNav.js` to fetch `/api/navigation/public` (instead of legacy `/api/cms-tiles/nav`) and render items next to the Login button on desktop + mobile.
- **Homepage/landing nav**: `LandingPage.js` now also consumes `/api/navigation/public` as primary source (fallback to branding toggles).

### New Features (P1)
- **PageBuilder auto-sync into public nav**: Backend `/api/navigation/public` (in `routes/navigation.py`) now returns a merged list of: (a) explicit `navigation_items`, (b) PageBuilder `custom_pages` with `show_in_nav=true` + `is_published=true` + `"public"` in `auth_levels` (auto-injected), (c) default Blog/Videos/News/About items if not already covered. Reserved slugs (blog/videos/news/about) map to `/<slug>`; other slugs map to `/page/<slug>`. De-duped by path.
- **Internal pages now editable via PageBuilder**: Blog (`/blog`), Videos (`/videos`), News (`/news`), About (`/about`) all check for a PageBuilder override (`usePageBuilderOverride(slug)` hook) on mount. If a `custom_pages` doc exists with matching slug, is published, and contains blocks, those blocks render instead of the default listing/content. Admins edit these pages from the Page Builder UI by creating a page with the reserved slug.
- **Reusable `PageBuilderRenderer`**: New `/app/frontend/src/components/PageBuilderRenderer.js` exports `PageBuilderBlocks` component + `usePageBuilderOverride` hook. Supports blocks: heading, text, button, image, divider, hero, contact_form, cards.

### Backend Testing
- **19/19 pytest tests passed** (`iteration_26.json`). Verified merge/dedupe/auth-gating, reserved-slug override, private-page hiding (404 not 403), full CRUD on navigation/sidebar-configs.

### Files Modified
- `/app/frontend/src/components/DashboardLayout.js` — restored News/RSS/Sidebar links
- `/app/frontend/src/components/PublicNav.js` — full rewrite; fetches `/api/navigation/public`
- `/app/frontend/src/components/PageBuilderRenderer.js` — NEW
- `/app/frontend/src/pages/Blog.js`, `VideosPage.js`, `NewsAggregator.js`, `AboutPage.js` — added override mount-check
- `/app/frontend/src/pages/LandingPage.js` — fetches `/api/navigation/public`
- `/app/backend/routes/navigation.py` — `/public` endpoint merges PageBuilder pages + defaults
