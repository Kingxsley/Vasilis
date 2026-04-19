"""Iteration 28 backend tests.

Covers:
- GET /api/pages/presets — keys news/about/contact/landing/blog/privacy-policy/cookie-policy
  - news preset: first block hero with empty button_text; second block type='news_feed'
  - blog preset: second block type='blog_list'
- POST /api/pages/seed-reserved — idempotent; seeds 4 slugs; privacy/cookie show_in_nav=False
- POST /api/pages/{page_id}/reset-to-preset — replaces blocks; preserves title/slug/published; 404/400 cases
- GET /api/pages/block-templates — blog_list + news_feed templates with full default_content
- GET /api/news/mixed-feed — skip/limit/source/category/tag/sort params; pagination returns different items
- GET /api/settings/cookie-consent — public; default shape with 3 categories
- PATCH /api/settings/cookie-consent — admin-only; 403 for anon; partial update persists via GET
- Regression: GET /api/content/blog; GET /api/pages/custom/{slug} for blog/news/privacy-policy/cookie-policy when published
"""
import os
import pytest
import requests


def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
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


# ---------- Presets (7 keys) -------------------------------------------------

class TestPagePresets:
    def test_presets_requires_admin(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        assert r.status_code in (401, 403)

    def test_presets_has_seven_keys(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        presets = data.get("presets") or data
        expected = {"news", "about", "contact", "landing", "blog",
                    "privacy-policy", "cookie-policy"}
        assert expected.issubset(set(presets.keys())), f"Missing keys: {expected - set(presets.keys())}"
        for key in expected:
            assert isinstance(presets[key], list) and len(presets[key]) > 0

    def test_news_preset_hero_empty_button(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        presets = r.json().get("presets")
        news = presets["news"]
        assert news[0]["type"] == "hero"
        # button_text must be empty (no Subscribe)
        btn = news[0]["content"].get("button_text", "")
        assert btn == "", f"News hero button_text should be empty, got {btn!r}"
        # Second block must be news_feed
        assert news[1]["type"] == "news_feed"
        content = news[1]["content"]
        for k in ("items_per_page", "columns", "source", "sort"):
            assert k in content, f"news_feed missing {k}"

    def test_blog_preset_second_block_blog_list(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/pages/presets", timeout=15)
        presets = r.json().get("presets")
        blog = presets["blog"]
        assert blog[0]["type"] == "hero"
        assert blog[1]["type"] == "blog_list"
        content = blog[1]["content"]
        for k in ("items_per_page", "columns", "layout", "sort", "show_search"):
            assert k in content, f"blog_list missing {k}"


# ---------- Block Templates --------------------------------------------------

class TestBlockTemplates:
    def test_block_templates_include_dynamic(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/pages/block-templates", timeout=15)
        assert r.status_code == 200
        templates = r.json().get("templates", [])
        by_type = {t["type"]: t for t in templates}
        assert "blog_list" in by_type, "blog_list template missing"
        assert "news_feed" in by_type, "news_feed template missing"

        blog = by_type["blog_list"]["default_content"]
        for k in ("items_per_page", "columns", "layout", "category_filter",
                  "tag_filter", "sort", "show_date", "show_author",
                  "show_excerpt", "show_search", "featured_first"):
            assert k in blog, f"blog_list default_content missing {k}"

        feed = by_type["news_feed"]["default_content"]
        for k in ("items_per_page", "columns", "category_filter", "tag_filter",
                  "sort", "show_date", "show_author", "show_excerpt",
                  "show_source_badge"):
            assert k in feed, f"news_feed default_content missing {k}"


# ---------- Seed Reserved ----------------------------------------------------

class TestSeedReserved:
    def test_seed_reserved_idempotent_four_slugs(self, admin_client):
        # Call once to ensure present
        r1 = admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        assert r1.status_code == 200
        d1 = r1.json()
        # Call again — all should now be skipped
        r2 = admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        assert r2.status_code == 200
        d2 = r2.json()
        skipped = set(d2.get("skipped", []))
        assert {"blog", "news", "privacy-policy", "cookie-policy"}.issubset(skipped), \
            f"Expected 4 reserved slugs skipped on 2nd call, got {skipped}"
        assert d2.get("created") == []

    def test_seeded_pages_flags(self, admin_client):
        # After seed, verify metadata on each reserved page
        admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        pages_list = admin_client.get(
            f"{BASE_URL}/api/pages/custom?include_unpublished=true", timeout=15
        ).json().get("pages", [])
        by_slug = {p["slug"]: p for p in pages_list}
        for slug in ("blog", "news", "privacy-policy", "cookie-policy"):
            assert slug in by_slug, f"{slug} not seeded"
        # blog / news show_in_nav=True
        assert by_slug["blog"]["show_in_nav"] is True
        assert by_slug["news"]["show_in_nav"] is True
        # privacy / cookie show_in_nav=False
        assert by_slug["privacy-policy"]["show_in_nav"] is False
        assert by_slug["cookie-policy"]["show_in_nav"] is False


# ---------- Reset to Preset --------------------------------------------------

class TestResetToPreset:
    def test_reset_replaces_blocks_preserves_meta(self, admin_client):
        admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        # Grab blog page
        pages = admin_client.get(
            f"{BASE_URL}/api/pages/custom?include_unpublished=true", timeout=15
        ).json().get("pages", [])
        blog = next((p for p in pages if p["slug"] == "blog"), None)
        assert blog, "blog page missing"
        page_id = blog["page_id"]
        original_title = blog["title"]
        original_slug = blog["slug"]
        original_published = blog["is_published"]

        # Mutate: add a dummy block via PATCH
        patched = admin_client.patch(
            f"{BASE_URL}/api/pages/custom/{page_id}",
            json={"blocks": [{"type": "text", "content": {"text": "TEMP", "align": "left"}}]},
            timeout=15,
        )
        assert patched.status_code == 200
        assert len(patched.json()["blocks"]) == 1

        # Now reset to preset
        rr = admin_client.post(
            f"{BASE_URL}/api/pages/{page_id}/reset-to-preset", timeout=15
        )
        assert rr.status_code == 200
        body = rr.json()
        page = body.get("page") or body
        assert len(page["blocks"]) >= 2
        assert page["blocks"][1]["type"] == "blog_list"
        # Meta preserved
        assert page["title"] == original_title
        assert page["slug"] == original_slug
        assert page["is_published"] == original_published

    def test_reset_404_missing_page(self, admin_client):
        r = admin_client.post(
            f"{BASE_URL}/api/pages/page_doesnotexist123/reset-to-preset",
            timeout=15,
        )
        assert r.status_code == 404

    def test_reset_400_no_preset_for_type(self, admin_client):
        # Create a custom page with a non-preset page_type
        import uuid as _u
        slug = f"test-nopreset-{_u.uuid4().hex[:6]}"
        c = admin_client.post(
            f"{BASE_URL}/api/pages/custom",
            json={
                "title": "No Preset Test",
                "slug": slug,
                "page_type": "unknownzzz",
                "blocks": [],
            },
            timeout=15,
        )
        assert c.status_code == 200
        page_id = c.json()["page_id"]
        try:
            r = admin_client.post(
                f"{BASE_URL}/api/pages/{page_id}/reset-to-preset", timeout=15
            )
            assert r.status_code == 400
        finally:
            admin_client.delete(f"{BASE_URL}/api/pages/custom/{page_id}", timeout=15)

    def test_reset_requires_admin(self, anon_client):
        r = anon_client.post(
            f"{BASE_URL}/api/pages/some_page_id/reset-to-preset", timeout=15
        )
        assert r.status_code in (401, 403)


# ---------- Mixed Feed (pagination, source, sort) ---------------------------

class TestMixedFeedQuery:
    def test_mixed_feed_shape(self, anon_client):
        r = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&limit=5&skip=0",
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        for k in ("items", "total", "skip", "limit"):
            assert k in data, f"mixed-feed missing {k}"
        assert data["skip"] == 0
        assert data["limit"] == 5
        assert isinstance(data["items"], list)

    def test_mixed_feed_pagination_different_pages(self, anon_client):
        # Use source=articles to avoid flaky RSS in sandbox
        r0 = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&skip=0&limit=3",
            timeout=30,
        )
        r1 = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&skip=3&limit=3",
            timeout=30,
        )
        assert r0.status_code == 200 and r1.status_code == 200
        d0, d1 = r0.json(), r1.json()
        total = d0.get("total", 0)
        if total < 4:
            pytest.skip(f"Not enough admin news ({total}) to verify pagination")
        ids0 = {it.get("link") or it.get("title") for it in d0["items"]}
        ids1 = {it.get("link") or it.get("title") for it in d1["items"]}
        assert ids0.isdisjoint(ids1), "skip=0 and skip=3 pages overlap"

    def test_mixed_feed_source_filter(self, anon_client):
        r = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&limit=50", timeout=30
        )
        assert r.status_code == 200
        items = r.json()["items"]
        for it in items:
            assert it["source"] == "article", f"unexpected source {it['source']}"

    def test_mixed_feed_sort_param(self, anon_client):
        r_new = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&sort=newest&limit=20",
            timeout=30,
        )
        r_old = anon_client.get(
            f"{BASE_URL}/api/news/mixed-feed?source=articles&sort=oldest&limit=20",
            timeout=30,
        )
        assert r_new.status_code == 200 and r_old.status_code == 200
        new_items = r_new.json()["items"]
        old_items = r_old.json()["items"]
        if len(new_items) < 2:
            pytest.skip("not enough items to verify sort")
        # Expect order reversed between newest and oldest
        new_dates = [i.get("published_at") for i in new_items if i.get("published_at")]
        old_dates = [i.get("published_at") for i in old_items if i.get("published_at")]
        if len(new_dates) >= 2 and len(old_dates) >= 2:
            assert new_dates == sorted(new_dates, reverse=True)
            assert old_dates == sorted(old_dates)


# ---------- Cookie Consent ---------------------------------------------------

class TestCookieConsent:
    def test_get_cookie_consent_public(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/settings/cookie-consent", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Required shape
        for k in ("enabled", "title", "message", "accept_all_text",
                  "reject_all_text", "customize_text", "save_text",
                  "policy_url", "categories", "position", "theme"):
            assert k in data, f"cookie-consent missing {k}"
        # 3 categories: essential, analytics, marketing
        cats = data["categories"]
        keys = {c.get("key") for c in cats}
        assert {"essential", "analytics", "marketing"}.issubset(keys), \
            f"missing cookie categories: {keys}"
        # essential required=True
        essential = next(c for c in cats if c["key"] == "essential")
        assert essential.get("required") is True

    def test_patch_cookie_consent_rejects_anon(self, anon_client):
        r = anon_client.patch(
            f"{BASE_URL}/api/settings/cookie-consent",
            json={"title": "Anon hack"},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_patch_cookie_consent_admin_partial(self, admin_client, anon_client):
        new_title = "We respect your privacy (test)"
        r = admin_client.patch(
            f"{BASE_URL}/api/settings/cookie-consent",
            json={"title": new_title, "position": "bottom-right"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == new_title
        assert body["position"] == "bottom-right"
        # GET reflects update (merged with defaults)
        g = anon_client.get(f"{BASE_URL}/api/settings/cookie-consent", timeout=15).json()
        assert g["title"] == new_title
        assert g["position"] == "bottom-right"
        # Other defaults still present
        assert "categories" in g and len(g["categories"]) >= 3
        # Cleanup — restore default title
        admin_client.patch(
            f"{BASE_URL}/api/settings/cookie-consent",
            json={"title": "We value your privacy", "position": "bottom"},
            timeout=15,
        )


# ---------- Regression -------------------------------------------------------

class TestRegression:
    def test_blog_list_endpoint(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/content/blog?limit=5", timeout=15)
        # Endpoint should respond 200; shape may vary
        assert r.status_code == 200, f"/api/content/blog returned {r.status_code}: {r.text[:200]}"

    def test_pages_custom_slug_when_published(self, admin_client, anon_client):
        # Ensure seeded
        admin_client.post(f"{BASE_URL}/api/pages/seed-reserved", timeout=30)
        pages = admin_client.get(
            f"{BASE_URL}/api/pages/custom?include_unpublished=true", timeout=15
        ).json().get("pages", [])

        for slug in ("blog", "news", "privacy-policy", "cookie-policy"):
            page = next((p for p in pages if p["slug"] == slug), None)
            assert page, f"{slug} not seeded"
            page_id = page["page_id"]
            # Publish
            admin_client.patch(
                f"{BASE_URL}/api/pages/custom/{page_id}",
                json={"is_published": True},
                timeout=15,
            )
            # Anon GET by slug
            r = anon_client.get(
                f"{BASE_URL}/api/pages/custom/{slug}", timeout=15
            )
            assert r.status_code == 200, f"/pages/custom/{slug} -> {r.status_code}"
            body = r.json()
            assert body.get("slug") == slug
            assert body.get("is_published") is True
