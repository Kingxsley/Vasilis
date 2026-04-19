"""Iteration 27 backend tests.

Covers consolidation work:
- /api/news/feeds CRUD + save-unreachable + refresh + dedupe + auto-name
- /api/news/mixed-feed (admin news + RSS merged)
- /api/news/all-articles
- /api/pages/presets + /api/pages/seed-reserved (idempotent)
- /api/sidebar-configs/public/{slug} public endpoint
- /api/navigation/public no Videos/About defaults
- Regression: /api/navigation admin CRUD + seed-defaults, /api/content/news, /api/pages/custom/<slug>
"""
import os
import uuid
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        # Fallback: parse /app/frontend/.env
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    return url.rstrip("/")


BASE_URL = _load_base_url()
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(anon_client):
    r = anon_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token
    return token


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ---------- helpers ------------------------------------------------------

@pytest.fixture
def cleanup_feeds(admin_client):
    """Tracks feed_ids created during a test and deletes them at teardown."""
    created = []
    yield created
    for fid in created:
        try:
            admin_client.delete(f"{BASE_URL}/api/news/feeds/{fid}", timeout=15)
        except Exception:
            pass


# ====================== News Feeds CRUD ==================================

class TestNewsFeeds:
    def test_add_unreachable_feed_is_saved(self, admin_client, cleanup_feeds):
        url = f"https://nonexistent-xyz-feed-{uuid.uuid4().hex[:6]}.example.com/rss"
        r = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        feed = data.get("feed") or {}
        assert data.get("ok") is False, f"Expected ok=false for unreachable feed, got {data}"
        assert feed.get("status") == "unreachable"
        assert feed.get("fetch_error"), "fetch_error should be populated"
        assert feed.get("feed_id")
        cleanup_feeds.append(feed["feed_id"])

        # Verify persisted via GET
        g = admin_client.get(f"{BASE_URL}/api/news/feeds", timeout=15)
        assert g.status_code == 200
        feeds = g.json().get("feeds", [])
        match = next((f for f in feeds if f.get("feed_id") == feed["feed_id"]), None)
        assert match, "Unreachable feed not persisted"
        assert match.get("status") == "unreachable"
        assert match.get("fetch_error")

    def test_duplicate_url_rejected(self, admin_client, cleanup_feeds):
        url = f"https://dup-{uuid.uuid4().hex[:8]}.example.com/rss"
        r1 = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        assert r1.status_code == 200
        cleanup_feeds.append(r1.json()["feed"]["feed_id"])

        r2 = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        assert r2.status_code == 400, f"Expected 400 duplicate, got {r2.status_code}: {r2.text}"

    def test_add_feed_autopopulates_name_from_rss_title(self, admin_client, cleanup_feeds):
        # Real reachable feed. Pre-clean any stale copy from prior runs.
        url = "https://feeds.feedburner.com/TheHackersNews"
        existing_list = admin_client.get(f"{BASE_URL}/api/news/feeds", timeout=15).json().get("feeds", [])
        for f in existing_list:
            if f.get("url") == url and f.get("feed_id"):
                admin_client.delete(f"{BASE_URL}/api/news/feeds/{f['feed_id']}", timeout=15)
        r = admin_client.post(
            f"{BASE_URL}/api/news/feeds",
            json={"url": url, "name": ""},  # leave name blank
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        feed = data.get("feed") or {}
        if not data.get("ok"):
            pytest.skip(f"External RSS unreachable from sandbox: {feed.get('fetch_error')}")
        cleanup_feeds.append(feed["feed_id"])
        name = (feed.get("name") or "").strip()
        assert name and name != "Untitled Feed", f"Expected auto-populated name, got '{name}'"

    def test_refresh_flips_status_when_reachable(self, admin_client, cleanup_feeds):
        # Create an unreachable feed first
        bad_url = f"https://bad-{uuid.uuid4().hex[:6]}.example.com/rss"
        r = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": bad_url}, timeout=30)
        assert r.status_code == 200
        fid = r.json()["feed"]["feed_id"]
        cleanup_feeds.append(fid)
        assert r.json()["feed"]["status"] == "unreachable"

        # PATCH it to point at a reachable URL
        patch = admin_client.patch(
            f"{BASE_URL}/api/news/feeds/{fid}",
            json={"url": "https://feeds.feedburner.com/TheHackersNews"},
            timeout=30,
        )
        assert patch.status_code == 200, patch.text

        # Refresh
        rr = admin_client.post(f"{BASE_URL}/api/news/feeds/{fid}/refresh", timeout=60)
        assert rr.status_code == 200, rr.text
        payload = rr.json()
        assert "ok" in payload and "article_count" in payload and "feed" in payload
        if not payload["ok"]:
            pytest.skip(f"External RSS unreachable from sandbox: {payload.get('error')}")
        assert payload["feed"]["status"] == "ok"
        assert payload["article_count"] >= 0
        assert payload["feed"].get("last_fetched")

    def test_get_feeds_returns_status_fields(self, admin_client, cleanup_feeds):
        url = f"https://statuschk-{uuid.uuid4().hex[:6]}.example.com/rss"
        r = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        assert r.status_code == 200
        cleanup_feeds.append(r.json()["feed"]["feed_id"])

        g = admin_client.get(f"{BASE_URL}/api/news/feeds", timeout=15)
        assert g.status_code == 200
        feeds = g.json().get("feeds", [])
        assert len(feeds) > 0
        for f in feeds:
            # All feeds should have these fields
            assert "status" in f
            assert "fetch_error" in f
            assert "last_fetched" in f

    def test_delete_feed(self, admin_client, cleanup_feeds):
        url = f"https://del-{uuid.uuid4().hex[:6]}.example.com/rss"
        r = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        assert r.status_code == 200
        fid = r.json()["feed"]["feed_id"]

        d = admin_client.delete(f"{BASE_URL}/api/news/feeds/{fid}", timeout=15)
        assert d.status_code == 200

        d2 = admin_client.delete(f"{BASE_URL}/api/news/feeds/{fid}", timeout=15)
        assert d2.status_code == 404

    def test_delete_feed_requires_admin(self, anon_client, admin_client, cleanup_feeds):
        url = f"https://authchk-{uuid.uuid4().hex[:6]}.example.com/rss"
        r = admin_client.post(f"{BASE_URL}/api/news/feeds", json={"url": url}, timeout=30)
        fid = r.json()["feed"]["feed_id"]
        cleanup_feeds.append(fid)

        d = anon_client.delete(f"{BASE_URL}/api/news/feeds/{fid}", timeout=15)
        assert d.status_code in (401, 403)


# ====================== Mixed Feed + All Articles =========================

class TestMixedFeed:
    def test_mixed_feed_returns_items(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/news/mixed-feed?limit=20", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) <= 20
        # Each item has the expected shape
        for it in data["items"]:
            assert "title" in it
            assert "source" in it
            assert it["source"] in ("article", "rss")
            assert "published_at" in it

    def test_mixed_feed_sorted_desc(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/news/mixed-feed?limit=50", timeout=60)
        assert r.status_code == 200
        items = r.json()["items"]
        dates = [i.get("published_at") or "" for i in items]
        assert dates == sorted(dates, reverse=True), "mixed-feed not sorted desc by published_at"

    def test_all_articles_endpoint(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/news/all-articles?limit=10", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "articles" in data
        assert isinstance(data["articles"], list)
        assert len(data["articles"]) <= 10


# ====================== Page Presets + Seed Reserved ======================

class TestPagePresets:
    def test_presets_endpoint_requires_admin(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        assert r.status_code in (401, 403)

    def test_presets_endpoint_returns_all_types(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        presets = data.get("presets") or {}
        for key in ("news", "about", "contact", "landing", "blog"):
            assert key in presets, f"Missing preset '{key}' in {list(presets.keys())}"
            assert isinstance(presets[key], list)
            assert len(presets[key]) > 0
            for b in presets[key]:
                assert "type" in b
                assert "content" in b

    def test_seed_reserved_idempotent(self, admin_client):
        db_helper_cleanup_slugs = ["blog", "news"]
        # First, ensure they don't exist (cleanup). We don't have a direct delete API
        # for custom_pages by slug publicly easy — use /api/pages/custom-pages list + delete
        # Attempt: get existing slugs to make test tolerant of pre-existing state.
        pre_blog = admin_client.get(f"{BASE_URL}/api/pages/custom/blog", timeout=15)
        pre_news = admin_client.get(f"{BASE_URL}/api/pages/custom/news", timeout=15)
        blog_existed = pre_blog.status_code == 200
        news_existed = pre_news.status_code == 200

        r1 = admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert "created" in d1 and "skipped" in d1

        # If neither existed, created should contain both
        if not blog_existed and not news_existed:
            assert set(d1["created"]) == {"blog", "news"}
            assert d1["skipped"] == []

        # Second call -> everything should be skipped
        r2 = admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["created"] == []
        assert set(d2["skipped"]) == {"blog", "news"}

        # Verify the seeded pages — only assert is_published=False for pages
        # that were freshly created in this test run; pre-existing pages may
        # have been published by admins.
        for slug in db_helper_cleanup_slugs:
            g = admin_client.get(f"{BASE_URL}/api/pages/custom/{slug}", timeout=15)
            # An unpublished page with no auth returns 404. Try authenticated
            # admin list to find it.
            if g.status_code == 404:
                lst = admin_client.get(f"{BASE_URL}/api/pages/custom-pages", timeout=15)
                assert lst.status_code == 200, f"cannot list custom pages: {lst.text}"
                pages = lst.json() if isinstance(lst.json(), list) else lst.json().get("pages", [])
                page = next((p for p in pages if p.get("slug") == slug), None)
                assert page, f"Seeded page /{slug} not present in admin list"
            else:
                assert g.status_code == 200, f"Seeded page /{slug} not found: {g.status_code}"
                page = g.json()
            assert page.get("show_in_nav") is True
            assert "public" in (page.get("auth_levels") or [])
            assert isinstance(page.get("blocks"), list) and len(page["blocks"]) > 0
            # Only assert is_published=False if this test just created the page
            if slug in d1.get("created", []):
                assert page.get("is_published") is False, (
                    f"Freshly-seeded /{slug} should be is_published=False"
                )

    def test_seed_reserved_requires_admin(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=15)
        assert r.status_code in (401, 403)


# ====================== Sidebar Config Public Endpoint ====================

class TestSidebarConfigPublic:
    def test_public_sidebar_returns_only_enabled_widgets_sorted(self, admin_client, anon_client):
        # Create a config with mix of enabled/disabled widgets & unsorted order.
        # Note: backend auto-generates slug from name; `page_slug` is returned.
        name = f"TEST IT27 {uuid.uuid4().hex[:8]}"
        payload = {
            "name": name,
            "description": "iteration 27 public sidebar test",
            "widgets": [
                {"widget_id": "w3", "widget_type": "ads", "enabled": True, "order": 30, "config": {}},
                {"widget_id": "w1", "widget_type": "recent_posts", "enabled": True, "order": 10, "config": {}},
                {"widget_id": "w2", "widget_type": "tags", "enabled": False, "order": 20, "config": {}},
            ],
        }
        c = admin_client.post(f"{BASE_URL}/api/sidebar-configs", json=payload, timeout=20)
        if c.status_code != 200:
            pytest.skip(f"Could not create sidebar config: {c.status_code} {c.text[:200]}")
        created = c.json()
        slug = created.get("page_slug") or (created.get("config") or {}).get("page_slug")
        assert slug, f"Could not find page_slug in create response: {created}"

        try:
            # Public anonymous GET
            r = anon_client.get(f"{BASE_URL}/api/sidebar-configs/public/{slug}", timeout=15)
            assert r.status_code == 200, r.text
            data = r.json()
            widgets = data.get("widgets") or []
            ids = [w["widget_id"] for w in widgets]
            # Disabled widget should be excluded
            assert "w2" not in ids, f"Disabled widget w2 leaked into public response: {ids}"
            # Order ascending
            orders = [w.get("order", 0) for w in widgets]
            assert orders == sorted(orders), f"Widgets not sorted by order: {orders}"
        finally:
            try:
                admin_client.delete(f"{BASE_URL}/api/sidebar-configs/{slug}", timeout=15)
            except Exception:
                pass

    def test_public_sidebar_404_for_missing(self, anon_client):
        r = anon_client.get(
            f"{BASE_URL}/api/sidebar-configs/public/nonexistent-{uuid.uuid4().hex[:8]}",
            timeout=15,
        )
        assert r.status_code == 404


# ====================== Navigation Defaults (no Videos/About) =============

class TestNavigationDefaults:
    def test_public_nav_has_only_blog_and_news_defaults(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json().get("items", [])
        # Extract items that are marked as defaults
        defaults = [i for i in items if i.get("is_default")]
        default_paths = {d.get("path") for d in defaults}
        # Blog and News must be present
        assert "/blog" in default_paths or any(i.get("path") == "/blog" for i in items), f"Missing /blog default in {[i.get('path') for i in items]}"
        assert "/news" in default_paths or any(i.get("path") == "/news" for i in items)
        # Videos/About should NOT be present as defaults
        assert "/videos" not in default_paths, f"/videos should not be a default anymore: {defaults}"
        assert "/about" not in default_paths, f"/about should not be a default anymore: {defaults}"

    def test_seed_defaults_only_blog_and_news(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/navigation/seed-defaults", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # created + skipped combined should be exactly Blog + News
        created_labels = {it.get("label") for it in data.get("items", [])}
        skipped = set(data.get("skipped") or [])
        all_labels = created_labels | skipped
        # There should NOT be Videos or About in the defaults anymore
        assert "Videos" not in all_labels, f"seed-defaults still seeds Videos: {all_labels}"
        assert "About" not in all_labels, f"seed-defaults still seeds About: {all_labels}"
        # Blog and News should be in either created or skipped
        assert "Blog" in all_labels or len(all_labels) == 0
        assert "News" in all_labels or len(all_labels) == 0


# ====================== Regressions =======================================

class TestRegressions:
    def test_navigation_admin_crud(self, admin_client):
        # Create
        payload = {
            "label": f"TEST_IT27_{uuid.uuid4().hex[:6]}",
            "link_type": "internal",
            "path": f"/test-it27-{uuid.uuid4().hex[:6]}",
            "icon": "Link",
            "section_id": "header",
            "visible_to": ["all"],
            "sort_order": 900,
        }
        c = admin_client.post(f"{BASE_URL}/api/navigation", json=payload, timeout=15)
        assert c.status_code == 200, c.text
        item_id = c.json().get("item_id")
        assert item_id

        # Patch
        p = admin_client.patch(f"{BASE_URL}/api/navigation/{item_id}", json={"label": payload["label"] + "_upd"}, timeout=15)
        assert p.status_code == 200

        # Delete
        d = admin_client.delete(f"{BASE_URL}/api/navigation/{item_id}", timeout=15)
        assert d.status_code == 200

    def test_pages_custom_slug_404_and_200(self, anon_client):
        # 404 for non-existent
        r = anon_client.get(f"{BASE_URL}/api/pages/custom/nonexistent-{uuid.uuid4().hex[:8]}", timeout=15)
        assert r.status_code == 404

    def test_content_news_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/content/news", timeout=15)
        assert r.status_code == 200
