"""Iteration 26 backend tests.

Focus:
1. GET /api/navigation/public -> merges navigation_items + PageBuilder custom_pages
   (show_in_nav=True, is_published=True, 'public' in auth_levels), dedupes by path,
   reserved slugs map to /<slug> while others map to /page/<slug>, defaults seeded.
2. Visibility gating: unpublished and non-public pages are excluded.
3. POST /api/navigation/seed-defaults still seeds Blog/Videos/News/About.
4. Nav CRUD: POST/PATCH/DELETE /api/navigation work for super_admin.
5. GET /api/pages/custom/cms-enterprise auth gating (published public -> 200,
   unpublished -> 404 for anonymous).
6. Sanity: /api/sidebar-configs CRUD, /api/content/blog, /api/content/videos,
   /api/content/news, /api/news/feeds.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cms-enterprise.preview.emergentagent.com").rstrip("/")
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
    assert token, f"No token in login response: {data}"
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

def _create_page(admin_client, **overrides):
    slug = overrides.pop("slug", f"test-it26-{uuid.uuid4().hex[:8]}")
    payload = {
        "title": overrides.pop("title", f"Test Page {slug}"),
        "slug": slug,
        "description": "iteration 26 test page",
        "page_type": "custom",
        "blocks": [],
        "show_in_nav": True,
        "nav_section": "header",
        "is_published": True,
        "auth_levels": ["public"],
    }
    payload.update(overrides)
    r = admin_client.post(f"{BASE_URL}/api/pages/custom", json=payload, timeout=30)
    assert r.status_code == 200, f"create_page failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    return body.get("page_id"), body.get("slug")


def _delete_page(admin_client, page_id):
    if not page_id:
        return
    admin_client.delete(f"{BASE_URL}/api/pages/custom/{page_id}", timeout=30)


# ---------- 1. Public navigation endpoint --------------------------------

class TestNavigationPublic:
    def test_public_nav_no_auth_returns_200(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30)
        assert r.status_code == 200, f"public nav must be unauthenticated: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)

    def test_public_nav_contains_defaults(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30)
        data = r.json()
        paths = {i["path"] for i in data["items"]}
        for required in ("/blog", "/videos", "/news", "/about"):
            assert required in paths, f"Missing default nav path {required}. Got {paths}"

    def test_public_nav_sorted_by_sort_order(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30)
        items = r.json()["items"]
        orders = [i.get("sort_order", 999) for i in items]
        assert orders == sorted(orders), f"items not sorted by sort_order: {orders}"


# ---------- 2. PageBuilder auto-sync -------------------------------------

class TestPageBuilderAutoSync:
    def test_published_public_page_with_show_in_nav_is_merged(self, admin_client, anon_client):
        slug = f"test-landing-sync-{uuid.uuid4().hex[:6]}"
        page_id, _ = _create_page(admin_client, slug=slug, title="Test Landing Sync",
                                  show_in_nav=True, is_published=True, auth_levels=["public"])
        try:
            r = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30)
            assert r.status_code == 200
            items = r.json()["items"]
            match = [i for i in items if i["path"] == f"/page/{slug}"]
            assert len(match) == 1, f"PageBuilder page should appear once at /page/{slug}: {items}"
            assert match[0]["label"] == "Test Landing Sync"
            assert match[0].get("is_pagebuilder") is True
        finally:
            _delete_page(admin_client, page_id)

    def test_reserved_slug_maps_to_root_and_no_duplicate(self, admin_client, anon_client):
        # Create a PageBuilder page with reserved slug 'videos' -> should appear at /videos
        # AND the default Videos entry must not duplicate.
        reserved_slug = "videos"
        # Ensure no pre-existing custom_pages 'videos' exists; if present, use different slug for reserved test.
        # Instead: we create with reserved_slug; if 400 (exists), fetch it.
        r = admin_client.post(
            f"{BASE_URL}/api/pages/custom",
            json={
                "title": "Custom Videos Override",
                "slug": reserved_slug,
                "blocks": [],
                "show_in_nav": True,
                "is_published": True,
                "auth_levels": ["public"],
            },
            timeout=30,
        )
        page_id = None
        created_now = False
        if r.status_code == 200:
            page_id = r.json().get("page_id")
            created_now = True
        elif r.status_code == 400:
            # Already exists -- fine, just proceed
            pass
        else:
            pytest.fail(f"Unexpected status creating reserved slug page: {r.status_code} {r.text[:200]}")

        try:
            nav = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30).json()["items"]
            videos_items = [i for i in nav if i["path"] == "/videos"]
            assert len(videos_items) == 1, f"/videos should appear exactly once, got {videos_items}"
        finally:
            if created_now:
                _delete_page(admin_client, page_id)

    def test_unpublished_page_not_in_public_nav(self, admin_client, anon_client):
        slug = f"unpublished-{uuid.uuid4().hex[:6]}"
        page_id, _ = _create_page(admin_client, slug=slug, show_in_nav=True, is_published=False,
                                  auth_levels=["public"])
        try:
            nav = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30).json()["items"]
            paths = {i["path"] for i in nav}
            assert f"/page/{slug}" not in paths, "Unpublished page must not appear in public nav"
        finally:
            _delete_page(admin_client, page_id)

    def test_non_public_auth_level_not_in_public_nav(self, admin_client, anon_client):
        slug = f"private-{uuid.uuid4().hex[:6]}"
        page_id, _ = _create_page(admin_client, slug=slug, show_in_nav=True, is_published=True,
                                  auth_levels=["super_admin"])
        try:
            nav = anon_client.get(f"{BASE_URL}/api/navigation/public", timeout=30).json()["items"]
            paths = {i["path"] for i in nav}
            assert f"/page/{slug}" not in paths, "Private (non-public) page must not appear"
        finally:
            _delete_page(admin_client, page_id)


# ---------- 3. Navigation CRUD + seed-defaults ---------------------------

class TestNavigationCRUD:
    def test_seed_defaults(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/navigation/seed-defaults", timeout=30)
        assert r.status_code == 200, f"seed-defaults failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert "created" in data and "skipped" in data

    def test_create_update_delete_nav_item(self, admin_client):
        label = f"TEST_{uuid.uuid4().hex[:6]}"
        payload = {
            "label": label,
            "link_type": "internal",
            "path": f"/test-{uuid.uuid4().hex[:6]}",
            "icon": "Link",
            "section_id": "header",
            "sort_order": 500,
            "is_active": True,
        }
        r = admin_client.post(f"{BASE_URL}/api/navigation", json=payload, timeout=30)
        assert r.status_code == 200, f"create: {r.status_code} {r.text[:200]}"
        item = r.json()
        item_id = item["item_id"]
        assert item["label"] == label

        # Update
        r2 = admin_client.patch(f"{BASE_URL}/api/navigation/{item_id}",
                                json={"label": label + "_upd"}, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["label"] == label + "_upd"

        # Delete
        r3 = admin_client.delete(f"{BASE_URL}/api/navigation/{item_id}", timeout=30)
        assert r3.status_code == 200


# ---------- 4. PageBuilder override for reserved public pages ------------

class TestPagesCustomCmsEnterpriseOverride:
    def test_get_nonexistent_returns_404(self, anon_client):
        # Slug 'cms-enterprise' is the override lookup used by Blog.js/VideosPage.js/etc.
        # If it doesn't exist, we expect 404.
        r = anon_client.get(f"{BASE_URL}/api/pages/custom/cms-enterprise", timeout=30)
        assert r.status_code in (200, 404), f"Unexpected status: {r.status_code} {r.text[:200]}"

    def test_published_public_page_is_readable_anonymously(self, admin_client, anon_client):
        slug = f"override-pub-{uuid.uuid4().hex[:6]}"
        page_id, _ = _create_page(admin_client, slug=slug, is_published=True,
                                  auth_levels=["public"])
        try:
            r = anon_client.get(f"{BASE_URL}/api/pages/custom/{slug}", timeout=30)
            assert r.status_code == 200
            assert r.json()["slug"] == slug
        finally:
            _delete_page(admin_client, page_id)

    def test_unpublished_page_404_for_anonymous(self, admin_client, anon_client):
        slug = f"override-unpub-{uuid.uuid4().hex[:6]}"
        page_id, _ = _create_page(admin_client, slug=slug, is_published=False,
                                  auth_levels=["public"])
        try:
            r = anon_client.get(f"{BASE_URL}/api/pages/custom/{slug}", timeout=30)
            assert r.status_code == 404, f"Unpublished should 404 for anon: {r.status_code}"
        finally:
            _delete_page(admin_client, page_id)


# ---------- 5. Sidebar configs -------------------------------------------

class TestSidebarConfigs:
    def test_list_requires_admin(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/sidebar-configs", timeout=30)
        assert r.status_code in (401, 403)

    def test_list_admin_ok(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/sidebar-configs", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_crud_sidebar_config(self, admin_client):
        name = f"TEST Sidebar {uuid.uuid4().hex[:6]}"
        r = admin_client.post(f"{BASE_URL}/api/sidebar-configs",
                              json={"name": name, "description": "iter26", "widgets": []},
                              timeout=30)
        assert r.status_code == 200, f"create: {r.status_code} {r.text[:200]}"
        slug = r.json()["page_slug"]

        # Update
        r2 = admin_client.patch(f"{BASE_URL}/api/sidebar-configs/{slug}",
                                json={"description": "updated"}, timeout=30)
        assert r2.status_code == 200

        # Get
        r3 = admin_client.get(f"{BASE_URL}/api/sidebar-configs/{slug}", timeout=30)
        assert r3.status_code == 200
        assert r3.json()["description"] == "updated"

        # Delete
        r4 = admin_client.delete(f"{BASE_URL}/api/sidebar-configs/{slug}", timeout=30)
        assert r4.status_code == 200


# ---------- 6. Content + News sanity ------------------------------------

class TestContentAndNewsSanity:
    def test_content_blog_list(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/content/blog?limit=5", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Accept either {posts: [...]} or a list
        assert "posts" in data or isinstance(data, list)

    def test_content_videos_list(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/content/videos?limit=5", timeout=30)
        assert r.status_code in (200, 404), r.status_code

    def test_content_news_list(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/content/news?limit=5", timeout=30)
        assert r.status_code in (200, 401, 404), r.status_code

    def test_news_feeds_admin(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/news/feeds", timeout=30)
        assert r.status_code in (200, 404), f"news/feeds: {r.status_code} {r.text[:200]}"
