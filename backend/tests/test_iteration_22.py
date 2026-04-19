"""
Iteration 22 - Test News CRUD, News RSS, Navigation Manager endpoints, Blog endpoints
"""
import os
import pytest
import requests
import uuid

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return ""

BASE_URL = _load_backend_url()
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- News CRUD ---
class TestNewsCRUD:
    _created_id = None
    _slug = f"test-news-{uuid.uuid4().hex[:8]}"

    def test_01_list_news(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/content/news", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "news" in data and "total" in data
        assert isinstance(data["news"], list)

    def test_02_public_news(self):
        r = requests.get(f"{BASE_URL}/api/content/news/public", timeout=30)
        assert r.status_code == 200, r.text
        assert "news" in r.json()

    def test_03_create_news(self, auth_headers):
        payload = {
            "title": "TEST_News Iteration 22",
            "slug": TestNewsCRUD._slug,
            "excerpt": "Test excerpt",
            "content": "<p>Test <b>HTML</b> content</p>",
            "category": "announcements",
            "tags": ["test", "iter22"],
            "published": True,
        }
        r = requests.post(
            f"{BASE_URL}/api/content/news", headers=auth_headers, json=payload, timeout=30
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "news_id" in data
        TestNewsCRUD._created_id = data["news_id"]
        # verify returned news has values
        assert data["news"]["title"] == payload["title"]
        assert data["news"]["slug"] == payload["slug"]

    def test_04_get_news_by_id(self, auth_headers):
        assert TestNewsCRUD._created_id
        r = requests.get(
            f"{BASE_URL}/api/content/news/{TestNewsCRUD._created_id}",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["news_id"] == TestNewsCRUD._created_id

    def test_05_get_news_by_slug(self):
        r = requests.get(
            f"{BASE_URL}/api/content/news/slug/{TestNewsCRUD._slug}", timeout=30
        )
        assert r.status_code == 200, r.text
        assert r.json()["slug"] == TestNewsCRUD._slug

    def test_06_update_news(self, auth_headers):
        assert TestNewsCRUD._created_id
        r = requests.patch(
            f"{BASE_URL}/api/content/news/{TestNewsCRUD._created_id}",
            headers=auth_headers,
            json={"title": "TEST_News Updated"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # Verify
        g = requests.get(
            f"{BASE_URL}/api/content/news/{TestNewsCRUD._created_id}",
            headers=auth_headers,
            timeout=30,
        )
        assert g.json()["title"] == "TEST_News Updated"

    def test_07_duplicate_slug_rejected(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/content/news",
            headers=auth_headers,
            json={
                "title": "Duplicate",
                "slug": TestNewsCRUD._slug,
                "content": "x",
            },
            timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_08_delete_news(self, auth_headers):
        assert TestNewsCRUD._created_id
        r = requests.delete(
            f"{BASE_URL}/api/content/news/{TestNewsCRUD._created_id}",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # verify 404 after delete
        g = requests.get(
            f"{BASE_URL}/api/content/news/{TestNewsCRUD._created_id}",
            headers=auth_headers,
            timeout=30,
        )
        assert g.status_code == 404


# --- News RSS ---
class TestNewsRSS:
    def test_rss_xml(self):
        r = requests.get(f"{BASE_URL}/api/news/rss.xml", timeout=30)
        assert r.status_code == 200, r.text
        assert "xml" in r.headers.get("content-type", "").lower()
        assert "<rss" in r.text or "<?xml" in r.text

    def test_sitemap_xml(self):
        r = requests.get(f"{BASE_URL}/api/news/sitemap.xml", timeout=30)
        assert r.status_code == 200, r.text
        assert "<urlset" in r.text or "<?xml" in r.text


# --- Navigation Manager ---
class TestNavigation:
    def test_get_navigation(self, auth_headers):
        # navigation router - try common endpoints
        for path in ["/api/navigation", "/api/navigation/menu", "/api/navigation/items"]:
            r = requests.get(f"{BASE_URL}{path}", headers=auth_headers, timeout=30)
            if r.status_code == 200:
                return
        pytest.fail("No navigation GET endpoint responded 200")


# --- Blog (visual editor stores HTML; just verify CRUD works) ---
class TestBlog:
    def test_list_blog(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/content/blog", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
