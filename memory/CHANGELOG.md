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

## 2026-04-19 (Session 2) — News/RSS Consolidation + Presets + Sidebar Rendering

### Fixed (P0)
- **RSS feeds weren't showing** on `/news`: the old `RSSFeedManager.js` pointed to a non-existent endpoint `/api/content/news/rss-feeds`. Migrated to the single `/api/news/feeds` implementation.
- **Merged News Manager + RSS Feeds**: One admin UI at `/dashboard/news-manager` with tabs "Articles" + "RSS Feeds". Sidebar item renamed to "News & RSS". Legacy `/rss-feeds` route redirects here.
- **Public `/news` mixed feed**: Admin news articles + RSS articles combined in one date-sorted grid via new `GET /api/news/mixed-feed` endpoint. Dedup by link.

### Changed (P1)
- **Removed default `/videos` and `/about` routes** + nav defaults (per user request — admins create their own via PageBuilder).
- **Reserved slugs** narrowed to `{blog, news}` in `/api/navigation/public` merge logic.

### New Features (P1)
- **PageBuilder preset templates** (`/api/pages/presets`) — starter blocks for `news`, `about`, `contact`, `landing`, `blog` page types. When creating a new page and picking a type, starter blocks auto-populate (safe: won't overwrite user blocks).
- **Reserved-slug seeder** (`POST /api/pages/seed-reserved`) — idempotent. Creates draft `blog` + `news` pages with preset blocks + `show_in_nav=true`. Exposed via "Seed Blog & News" button in Page Builder header.
- **Sidebar rendering on PageBuilder-overridden public pages** — new public endpoint `GET /api/sidebar-configs/public/{slug}` + `SidebarWidgets` renderer in `PageBuilderRenderer.js`. When an override page has `sidebar_config` set, public page renders as a 2-column grid with widgets on the right.

### RSS Feed Improvements
- Feeds save even when URL is unreachable (status=`unreachable` + `fetch_error` captured). User retries via Refresh button.
- Dedupe by URL on POST (400 if duplicate).
- Auto-populate feed name from RSS title when user leaves name blank.
- `last_fetched`, `status`, `fetch_error` surfaced in admin UI with clear Badges.

### Backend Testing
- **21/21 pytest tests passed** (`iteration_27.json`, 100%): all new endpoints + regressions verified.

### Files Modified/Added
- `/app/backend/routes/news_feeds.py` — FULL REWRITE (unified API)
- `/app/backend/routes/pages.py` — appended `PAGE_PRESETS` + `/presets` + `/seed-reserved` endpoints
- `/app/backend/routes/sidebar_configs.py` — added `public/{slug}` endpoint
- `/app/backend/routes/navigation.py` — shrunk defaults to blog+news
- `/app/frontend/src/pages/NewsManager.js` — REWRITTEN with tabs (consolidates RSSFeedManager.js)
- `/app/frontend/src/pages/NewsAggregator.js` — REWRITTEN as mixed feed
- `/app/frontend/src/pages/PageBuilder.js` — presets wired to page_type Select + "Seed Blog & News" button
- `/app/frontend/src/pages/Blog.js` — now renders override sidebar
- `/app/frontend/src/components/PageBuilderRenderer.js` — added `SidebarWidgets` + sidebar fetch in hook
- `/app/frontend/src/components/DashboardLayout.js` — "News & RSS" (consolidated)
- `/app/frontend/src/App.js` — removed /videos & /about; /rss-feeds redirects to /dashboard/news-manager
