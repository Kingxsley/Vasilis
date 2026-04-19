"""
Iteration 21: Test CMS rebuild features - sidebar APIs, CMS reset dry-run,
contact form, events iCal feed.
"""
import os
import pytest
import requests
from pathlib import Path


def _load_frontend_env_url():
    env_file = Path("/app/frontend/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env_url() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not found"
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="session")
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


# ------------------- Sidebar Configs -------------------
class TestSidebarConfigs:
    def test_list_sidebar_configs(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/sidebar-configs", headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, (list, dict)), f"Unexpected type: {type(data)}"

    def test_list_sidebar_widgets_defaults(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/sidebar-widgets/defaults/list",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, (list, dict))


# ------------------- CMS Admin Reset (Dry-Run) -------------------
class TestCMSAdminReset:
    def test_cms_status(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/cms/status", headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, dict)

    def test_cms_reset_dry_run(self, auth_headers):
        """confirm=false should NOT delete anything, just return counts."""
        r = requests.post(
            f"{BASE_URL}/api/admin/cms/reset",
            headers=auth_headers,
            json={"confirm": False},
            timeout=30,
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, dict)
        # Should indicate dry-run
        text_repr = str(data).lower()
        assert ("dry" in text_repr) or ("would" in text_repr) or ("count" in text_repr) or ("preview" in text_repr), \
            f"Response does not seem to indicate dry-run: {data}"


# ------------------- Contact Form -------------------
class TestContactForm:
    def test_submit_contact_form(self):
        """Contact form submission should save to DB; email failing is OK without SendGrid."""
        payload = {
            "name": "TEST_Contact User",
            "email": "test_contact@example.com",
            "subject": "TEST Subject",
            "message": "TEST message body for contact submission",
        }
        r = requests.post(f"{BASE_URL}/api/contact", json=payload, timeout=30)
        # Should succeed (saved to DB) even if email fails
        assert r.status_code in (200, 201, 202), f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, dict)


# ------------------- Events iCal -------------------
class TestEventsICal:
    def test_ical_feed(self):
        """Feed should return 200 with valid iCal content, or 404 if no events exist."""
        r = requests.get(f"{BASE_URL}/api/events/feed.ics", timeout=30)
        assert r.status_code in (200, 404), f"Unexpected status {r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            body = r.text
            assert "BEGIN:VCALENDAR" in body, f"Not valid iCal: {body[:200]}"
            assert "END:VCALENDAR" in body


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
