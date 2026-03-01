import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session WITHOUT auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get authentication token - skip if auth fails"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed ({response.status_code}): {response.text}")

@pytest.fixture(scope="session")
def authenticated_client(auth_token):
    """Separate session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session

@pytest.fixture
def unauthenticated_client():
    """Fresh client without auth for testing auth requirements"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
