import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "test@admin.com"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "TestAdmin123!")

# Viewer credentials
VIEWER_EMAIL = "admin@test.com"
VIEWER_PASSWORD = os.environ.get("TEST_VIEWER_PASSWORD", "Admin123!")


def login_with_retry(session, email, password, max_retries=3):
    """Login with retry logic for rate limiting"""
    for attempt in range(max_retries):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 429:
            retry_after = response.json().get('retry_after', 60)
            if attempt < max_retries - 1:
                time.sleep(min(retry_after, 10))  # Wait max 10 seconds
                continue
        return response
    return response


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session WITHOUT auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_token(api_client):
    """Get super admin authentication token"""
    response = login_with_retry(api_client, ADMIN_EMAIL, ADMIN_PASSWORD)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed ({response.status_code}): {response.text}")


@pytest.fixture(scope="session")
def viewer_token(api_client):
    """Get viewer authentication token"""
    response = login_with_retry(api_client, VIEWER_EMAIL, VIEWER_PASSWORD)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Viewer authentication failed ({response.status_code}): {response.text}")


@pytest.fixture(scope="session")
def authenticated_client(admin_token):
    """Session with super admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="session")
def viewer_client(viewer_token):
    """Session with viewer auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {viewer_token}"
    })
    return session


@pytest.fixture
def unauthenticated_client():
    """Fresh client without auth for testing auth requirements"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# Legacy fixture alias for backward compatibility
@pytest.fixture(scope="session")
def auth_token(admin_token):
    """Alias for admin_token for backward compatibility"""
    return admin_token
