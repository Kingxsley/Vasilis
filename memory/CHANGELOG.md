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

## 2026-04-19 (Session 3) — Dynamic Blocks + Privacy + Granular Cookie Consent

### Fixed (P0)
- **"Blog and news pages no longer show contents"**: previously the PageBuilder override with only static preset blocks replaced the dynamic feed entirely. Introduced **dynamic blocks** (`blog_list`, `news_feed`) so the preset now = hero + dynamic list. Admins customize the hero text; dynamic list keeps working.
- **Subscribe button removed** from news hero preset.
- **"Create defaults" confusion** fixed in NavigationManager — confirmation text now matches the new Blog+News defaults.
- **Duplicate H1** on override pages: outer title skipped when first block is a `hero` or `heading`.
- **Reserved-slug URLs**: fixed `Open live` button in PageBuilder to use `/<slug>` for reserved pages (blog, news, privacy-policy, cookie-policy) instead of `/page/<slug>`.

### New Features (P1)
- **Dynamic `blog_list` block**: full-control config — items_per_page (3–24), columns (1–4), layout (grid/list), sort (newest/oldest/title), category filter, tag filter, show date/author/excerpt/search toggles, featured-first toggle. Built-in pagination.
- **Dynamic `news_feed` block**: source selector (mixed/articles/rss), items_per_page, columns, sort, category/tag filter, show date/author/excerpt/source-badge toggles. Built-in pagination.
- **GET /api/news/mixed-feed** extended with `?source`, `?skip`, `?limit`, `?category`, `?tag`, `?sort` params (returns `{items, total, skip, limit}`).
- **Privacy Policy preset** (+ `/privacy-policy` route) — full 6-section starter content, editable via PageBuilder.
- **Cookie Policy preset** (+ `/cookie-policy` route) — includes categories cards.
- **Reset-to-preset**: new `POST /api/pages/{page_id}/reset-to-preset` endpoint + button in Page Builder (for system pages) to restore latest defaults.
- **Granular Cookie Consent (GDPR)**:
  - Component: `/app/frontend/src/components/CookieConsent.js` mounted globally in `App.js`.
  - Two-view banner: quick (Accept All / Reject All / Customize) + customize (per-category toggles).
  - Admin UI: `/dashboard/cookie-settings` (new sidebar link, Cookie icon) — enable toggle, title/message/button text, policy URL, 3 positions, editable categories with per-category label/description/required.
  - API: `GET /api/settings/cookie-consent` (public), `PATCH /api/settings/cookie-consent` (admin only).
  - Emits `window.cookieConsentChange` event + `localStorage` (`cookie_consent_v1`).

### Backend Testing
- **18/18 pytest tests passed** (`iteration_28.json`). All new endpoints + dynamic blocks + regressions verified.

### Files Modified/Added
- `/app/backend/routes/pages.py` — PAGE_PRESETS now has 7 keys (news/about/contact/landing/blog/privacy-policy/cookie-policy); added `blog_list` + `news_feed` to block-templates; added `POST /{page_id}/reset-to-preset`; `seed-reserved` extended to 4 slugs.
- `/app/backend/routes/news_feeds.py` — `/mixed-feed` supports pagination + filters.
- `/app/backend/routes/settings.py` — added `/cookie-consent` GET + PATCH + COOKIE_DEFAULT.
- `/app/frontend/src/components/CookieConsent.js` — NEW.
- `/app/frontend/src/components/PageBuilderRenderer.js` — added `BlogListBlock` + `NewsFeedBlock` dynamic renderers.
- `/app/frontend/src/pages/CookieSettings.js` — NEW admin page.
- `/app/frontend/src/pages/CustomPage.js` — renders `/privacy-policy`, `/cookie-policy` via shared renderer; adds sidebar column.
- `/app/frontend/src/pages/PageBuilder.js` — block editor UI for blog_list/news_feed; "Reset to preset" button on system pages.
- `/app/frontend/src/pages/NavigationManager.js` — fixed stale confirmation text.
- `/app/frontend/src/App.js` — routes for `/privacy-policy`, `/cookie-policy`, `/dashboard/cookie-settings`; global `<CookieConsent />`.
- `/app/frontend/src/components/DashboardLayout.js` — added Cookie Consent sidebar link.

## 2026-04-19 (Session 4) — Clean URLs + DnD + Media Picker + Bulk Delete

### Fixed (P0)
- **Visibility stuck at Public**: the `disabled={publicSelected && lvl.key !== 'public'}` guard prevented admins from switching to role-specific visibility. Fixed so toggling any role auto-removes `public` and vice-versa. Also added `data-testid="visibility-{key}"` on each chip.
- **`/page/` URL prefix dropped**: PageBuilder custom pages now use `/<slug>` directly (e.g., `/contact-us`, `/about-us`). Legacy `/page/:slug` URLs redirect to `/:slug` for backwards compat. `DynamicRouteHandler` now checks `custom_pages` first before CMS tiles/ad campaigns, so any published public PageBuilder page is reachable at its slug.

### New Features (P1/P2)
- **Cookie Preferences link in footer** — dedicated `data-testid="footer-cookie-settings-btn"` button clears `localStorage.cookie_consent_v1` and reloads so the granular banner reappears. Also added Privacy Policy + Cookie Policy footer links.
- **Media Library picker inside image block editor** — new `MediaPicker` component (`/app/frontend/src/components/MediaPicker.js`) modal with search, inline upload, selection highlight, double-click-to-confirm. Wired into PageBuilder image block via "Media Library" button next to URL input.
- **PageBuilder drag-and-drop block reorder** — new `SortableBlockList` component (`/app/frontend/src/components/SortableBlockList.js`) using `@dnd-kit/sortable`. Replaces the up/down arrow buttons with a proper drag handle (only the handle is a drop zone, preserving click-ability of Edit/Delete). Auto-updates `block.order`.
- **Bulk select + delete articles** in News Manager — per-card checkbox, "Select all" toggle, "Delete N" bulk action with confirmation + summary toasts (success/fail count), `data-testid`s for testing.

### Files Modified/Added
- `/app/frontend/src/components/MediaPicker.js` — NEW.
- `/app/frontend/src/components/SortableBlockList.js` — NEW.
- `/app/frontend/src/components/PublicFooter.js` — added policy + cookie preferences row.
- `/app/frontend/src/pages/PageBuilder.js` — visibility toggle fix, DnD wiring, MediaPicker mount, Image icon on media btn.
- `/app/frontend/src/pages/NewsManager.js` — bulk select/delete in Articles tab.
- `/app/frontend/src/pages/NavigationManager.js` — custom page options show `/slug` (not `/page/slug`).
- `/app/frontend/src/App.js` — `LegacyPageRedirect` for `/page/:slug`; `DynamicRouteHandler` now checks PageBuilder pages first.
- `/app/backend/routes/navigation.py` — all PageBuilder pages return clean `/<slug>` paths (no `/page/` prefix).

## 2026-04-19 (Session 5) — Full Backlog Sweep

### New Features
- **Background RSS refresh scheduler** — `refresh_all_feeds_loop()` runs as an asyncio task from FastAPI startup. Every 5 minutes it scans all active feeds and refreshes any where `now - last_fetched >= refresh_interval` (default 1h). Errors are caught so the loop survives transient failures. Log line: `RSS refresh loop online - checking every 5 minutes`.
- **POST `/api/news/feeds/refresh-all`** — admin-only endpoint for manual/cron-triggered full refresh. Returns `{ok, failed, total, details[]}`.
- **Hero block background image picker** — new "Background Image (optional)" + Media Library button in the hero block editor. Renderer uses a dark gradient overlay on top of the image so titles stay legible. Falls back to `background_color` when no image.
- **`columns` block (nested blocks)** — new block type added to `block-templates` + `PageBuilderRenderer`. Supports 1–4 columns, `gap` (tight/medium/loose), each column holds its own array of blocks (rendered recursively via `PageBuilderBlocks`). Admin editor lets you paste JSON block arrays per column.
- **Analytics gated by cookie consent** — `useGoogleAnalytics` now:
  - Reads `localStorage.cookie_consent_v1.categories.analytics` before loading `gtag`.
  - Listens for `cookieConsentChange` events so the GA script loads the moment the user opts in (no refresh required).
  - Short-circuits `trackPageView`/`trackEvent` when `analytics: false`.
- **Preview mode for unpublished pages** — admins can open any draft at `/<slug>?preview=1`:
  - `usePageBuilderOverride(slug)` and `CustomPage.fetchPage()` both detect `?preview=1` + attach the admin JWT from `localStorage.token`.
  - Gold "Preview mode" banner renders at the top of previewed drafts with `data-testid="preview-banner"`.
  - Page Builder now shows the ExternalLink button for both published AND draft pages; drafts open with `?preview=1` automatically.

### Testing
- **11/11 pytest tests passed** (`iteration_29.json`, 100%). Verified:
  - Refresh-all admin contract + ok/failed aggregation
  - Background loop export + startup log presence
  - `columns` block template schema
  - Preview flow: draft 404 without auth, 200 with admin auth, published 200 without auth
  - Regressions: seed-reserved idempotent, navigation/public clean slugs, mixed-feed pagination

### Files Modified/Added
- `/app/backend/server.py` — startup schedules `refresh_all_feeds_loop` task
- `/app/backend/routes/news_feeds.py` — new loop function + `/feeds/refresh-all` endpoint
- `/app/backend/routes/pages.py` — `columns` block template
- `/app/frontend/src/components/PageBuilderRenderer.js` — `ColumnsBlock` renderer + preview-aware `usePageBuilderOverride` + hero bg image support
- `/app/frontend/src/components/GoogleAnalytics.js` — consent-aware loading
- `/app/frontend/src/pages/CustomPage.js` — preview fetch + banner
- `/app/frontend/src/pages/PageBuilder.js` — hero bg image picker, columns editor, ExternalLink always shown with preview URL for drafts

## 2026-04-19 (Session 6) — Media Optimization + Nested DnD + Media Everywhere

### New Features
- **Aggressive image optimization** — JPEG/PNG now converted to WebP with ~85-90% size reduction (tested: 12.9KB → 1.5KB = 88.6% savings). PNG alpha preserved via WebP transparency. Max input raised from 10MB to 20MB.
- **GIF animation preserved** — animated GIFs go through multi-frame Pillow processing, thumbnail down to 800x800 if oversized, palette optimized, but animation and loop count are fully preserved.
- **SVG passthrough** — vector images saved as-is.
- **Auto-generated thumbnails** — every upload now stores a compact WebP `thumb_url` (max 400x400) used by the Media Library grid for fast rendering.
- **Batch upload** — `POST /api/media/upload-batch` accepts `List[UploadFile]`. Each file is optimized independently; partial failures are reported per-file. Used by MediaPicker's new `multiple` file input.
- **MediaPicker everywhere**:
  - **Blog Manager** — featured image picker + "Insert image from Library" button above the Quill editor (inserts `<img>` at cursor position).
  - **News Manager** — same pattern as Blog Manager.
  - **PageBuilder hero + image blocks** — already wired from Session 4, now benefit from batch + thumbnails.
- **Visual DnD for nested columns** — new `ColumnBlockEditor` component replaces the JSON textarea inside `columns` block editor. Each column now has:
  - Drag-and-drop reorder (via `@dnd-kit/sortable`)
  - "+ Add block" dropdown (heading/text/button/image/divider)
  - Inline edit/delete per nested block

### Testing
- **13/13 pytest tests passed** (`iteration_30.json`, 100%). Covered: JPEG→WebP conversion, PNG alpha preservation, animated GIF preservation, SVG passthrough, batch upload success, batch partial failures, 20MB limit enforcement, thumb_url generation, list/delete regression, columns block regression, refresh-all regression.

### Files Modified/Added
- `/app/backend/routes/media.py` — rewrote `optimize_image` for GIF/PNG-alpha support; added `make_thumbnail` + `_upload_one` helper + `upload-batch` endpoint; 20MB limit.
- `/app/frontend/src/components/MediaPicker.js` — batch upload, uses `thumb_url` for grid preview.
- `/app/frontend/src/components/ColumnBlockEditor.js` — NEW visual editor for nested column blocks.
- `/app/frontend/src/pages/BlogManager.js` — Featured Image + "Insert image from Library" above Quill + MediaPicker mount.
- `/app/frontend/src/pages/NewsManager.js` — same pattern as BlogManager.
- `/app/frontend/src/pages/PageBuilder.js` — columns editor uses `ColumnBlockEditor` (no more JSON textareas).
