"""
Iteration 29 — Backlog cleanup tests.

Covers:
  - POST /api/news/feeds/refresh-all (admin-only)
  - Background refresh loop startup (log verification)
  - GET /api/pages/block-templates — 'columns' template present
  - PAGE_PRESETS regression — 7 keys
  - Preview flow for unpublished custom page (GET /api/pages/custom/{slug})
  - Regression: POST /api/pages/seed-reserved idempotency
  - Regression: GET /api/navigation/public clean slugs
  - Regression: GET /api/news/mixed-feed pagination+filters
"""
import os
import uuid
import requests
import pytest

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    # Fallback: read from frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


# ---- fixtures --------------------------------------------------------------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token in response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---- 1. refresh-all endpoint ----------------------------------------------

class TestRefreshAll:
    """POST /api/news/feeds/refresh-all — admin only, returns ok/failed/total/details."""

    def test_requires_admin(self):
        r = requests.post(f"{API}/news/feeds/refresh-all", timeout=30)
        # 401 (no auth) or 403 (auth but not admin) both acceptable
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_refresh_all_with_valid_and_invalid(self, admin_headers):
        # Create a valid feed
        valid_payload = {
            "url": "https://www.darkreading.com/rss.xml",
            "name": f"TEST_valid_{uuid.uuid4().hex[:6]}",
            "category": "cybersecurity",
            "is_active": True,
        }
        invalid_payload = {
            "url": f"https://invalid-feed-{uuid.uuid4().hex[:6]}.example.com/rss.xml",
            "name": f"TEST_invalid_{uuid.uuid4().hex[:6]}",
            "category": "cybersecurity",
            "is_active": True,
        }
        created_ids = []
        try:
            r1 = requests.post(f"{API}/news/feeds", json=valid_payload, headers=admin_headers, timeout=30)
            assert r1.status_code == 200, f"valid feed create failed: {r1.status_code} {r1.text}"
            feed_id_1 = r1.json()["feed"]["feed_id"]
            created_ids.append(feed_id_1)

            r2 = requests.post(f"{API}/news/feeds", json=invalid_payload, headers=admin_headers, timeout=30)
            assert r2.status_code == 200, f"invalid feed create failed (should still save): {r2.status_code} {r2.text}"
            feed_id_2 = r2.json()["feed"]["feed_id"]
            created_ids.append(feed_id_2)

            # Call refresh-all
            r = requests.post(f"{API}/news/feeds/refresh-all", headers=admin_headers, timeout=120)
            assert r.status_code == 200, f"refresh-all failed: {r.status_code} {r.text}"
            body = r.json()
            # Keys present
            for k in ("ok", "failed", "total", "details"):
                assert k in body, f"missing key {k} in {body}"
            assert isinstance(body["details"], list)
            # We have at least our two feeds — there may be more pre-existing
            assert body["total"] == body["ok"] + body["failed"]
            assert body["total"] >= 2
            # At least 1 ok (our valid one) and at least 1 failed (our invalid)
            assert body["ok"] >= 1, f"expected at least 1 ok, got {body}"
            assert body["failed"] >= 1, f"expected at least 1 failed, got {body}"
            # Verify our two feeds are in details
            ids_in_details = [d.get("feed_id") for d in body["details"]]
            assert feed_id_1 in ids_in_details
            assert feed_id_2 in ids_in_details
            # Validate per-entry shape
            for d in body["details"]:
                assert "feed_id" in d and "name" in d and "ok" in d
        finally:
            for fid in created_ids:
                requests.delete(f"{API}/news/feeds/{fid}", headers=admin_headers, timeout=20)


# ---- 2. background refresh loop -------------------------------------------

class TestBackgroundLoop:
    """Verify the startup task is wired up (function exported + log phrase)."""

    def test_function_exported(self):
        from routes.news_feeds import refresh_all_feeds_loop
        assert callable(refresh_all_feeds_loop)

    def test_loop_started_log(self):
        import subprocess
        out = subprocess.run(
            ["bash", "-lc", "grep -h 'RSS refresh loop online' /var/log/supervisor/backend.*.log | tail -5"],
            capture_output=True, text=True, timeout=10
        )
        assert "RSS refresh loop online" in out.stdout, f"log phrase missing. stdout={out.stdout} stderr={out.stderr}"


# ---- 3. block-templates: columns present ----------------------------------

class TestBlockTemplates:
    def test_columns_template_present(self, admin_headers):
        r = requests.get(f"{API}/pages/block-templates", headers=admin_headers, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        templates = r.json().get("templates", [])
        types = [t["type"] for t in templates]
        assert "columns" in types, f"columns missing; types={types}"
        col = next(t for t in templates if t["type"] == "columns")
        dc = col["default_content"]
        assert dc.get("columns_count") == 2
        assert isinstance(dc.get("columns"), list)
        assert len(dc["columns"]) == 2
        for c in dc["columns"]:
            assert "blocks" in c and isinstance(c["blocks"], list)


# ---- 4. PAGE_PRESETS regression -------------------------------------------

class TestPagePresets:
    def test_seven_presets(self, admin_headers):
        r = requests.get(f"{API}/pages/presets", headers=admin_headers, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        presets = r.json().get("presets", {})
        expected = {"news", "about", "contact", "landing", "blog", "privacy-policy", "cookie-policy"}
        assert set(presets.keys()) == expected, f"presets keys mismatch: got={set(presets.keys())}"


# ---- 5. Preview unpublished page flow -------------------------------------

class TestUnpublishedPreview:
    def test_preview_flow(self, admin_headers):
        # Create a draft page
        slug = f"cms-enterprise-{uuid.uuid4().hex[:6]}"
        payload = {
            "title": "CMS Enterprise Test",
            "slug": slug,
            "description": "draft test",
            "page_type": "custom",
            "blocks": [],
            "is_published": False,
            "auth_levels": ["public"],
        }
        r = requests.post(f"{API}/pages/custom", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
        page_id = r.json().get("page_id")
        created_slug = r.json().get("slug", slug)

        try:
            # (a) unpublished + no auth → 404
            r1 = requests.get(f"{API}/pages/custom/{created_slug}", timeout=20)
            assert r1.status_code == 404, f"expected 404 for unpublished+noauth, got {r1.status_code}"

            # (b) unpublished + admin auth → 200
            r2 = requests.get(f"{API}/pages/custom/{created_slug}", headers=admin_headers, timeout=20)
            assert r2.status_code == 200, f"expected 200 for unpublished+admin, got {r2.status_code} {r2.text}"
            assert r2.json().get("slug") == created_slug

            # Publish the page
            r3 = requests.patch(
                f"{API}/pages/custom/{page_id}",
                json={"is_published": True},
                headers=admin_headers,
                timeout=20,
            )
            assert r3.status_code == 200

            # (c) published + no auth → 200
            r4 = requests.get(f"{API}/pages/custom/{created_slug}", timeout=20)
            assert r4.status_code == 200, f"expected 200 for published+noauth, got {r4.status_code}"
            assert r4.json().get("slug") == created_slug
        finally:
            # cleanup
            requests.delete(f"{API}/pages/custom/{page_id}", headers=admin_headers, timeout=20)


# ---- 6. seed-reserved idempotency -----------------------------------------

class TestSeedReserved:
    def test_idempotent_seed_four_pages(self, admin_headers):
        # Call once — may create up to 4 (if none exist), or skip all (if already seeded)
        r1 = requests.post(f"{API}/pages/seed-reserved", headers=admin_headers, timeout=30)
        assert r1.status_code == 200, f"{r1.status_code} {r1.text}"
        b1 = r1.json()
        assert "created" in b1 and "skipped" in b1
        total_1 = len(b1["created"]) + len(b1["skipped"])
        assert total_1 == 4, f"expected 4 reserved slugs, got {total_1}: {b1}"

        # Second call — must be fully idempotent: all skipped
        r2 = requests.post(f"{API}/pages/seed-reserved", headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        b2 = r2.json()
        assert len(b2["created"]) == 0, f"second call should create nothing, got {b2}"
        assert len(b2["skipped"]) == 4, f"second call should skip 4, got {b2}"
        assert set(b2["skipped"]) == {"blog", "news", "privacy-policy", "cookie-policy"}


# ---- 7. navigation/public clean slugs -------------------------------------

class TestNavigationPublic:
    def test_clean_slugs(self):
        r = requests.get(f"{API}/navigation/public", timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # The navigation may be under "items" or "navigation"; check whichever
        items = data.get("items") or data.get("navigation") or data.get("nav") or data
        # Flatten if it's a dict with sections
        flat = []
        def _walk(x):
            if isinstance(x, dict):
                for v in x.values():
                    _walk(v)
            elif isinstance(x, list):
                for v in x:
                    _walk(v)
                    if isinstance(v, dict) and "url" in v:
                        flat.append(v)
            elif isinstance(x, str):
                pass
        _walk(data)
        # Check no url contains '/page/' prefix
        bad = [i for i in flat if isinstance(i.get("url"), str) and "/page/" in i["url"]]
        assert not bad, f"found items with /page/ prefix: {bad}"


# ---- 8. mixed-feed pagination + filters -----------------------------------

class TestMixedFeed:
    def test_pagination_and_filters(self):
        r = requests.get(f"{API}/news/mixed-feed?limit=5&skip=0&source=articles&sort=newest", timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        for k in ("items", "total", "skip", "limit"):
            assert k in body, f"missing {k} in {body}"
        assert body["limit"] == 5
        assert body["skip"] == 0
        assert isinstance(body["items"], list)
        assert len(body["items"]) <= 5

    def test_mixed_source_works(self):
        r = requests.get(f"{API}/news/mixed-feed?limit=3&source=mixed", timeout=60)
        assert r.status_code == 200
        assert isinstance(r.json().get("items"), list)
