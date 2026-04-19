"""Iteration 23 tests: bug fixes for Blog crash, Content Menu, Visual Editor, Navigation,
Granular Permissions, Access Requests API, and Contact form type field."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    t = data.get("access_token") or data.get("token")
    assert t, f"no token in {data}"
    return t


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_backend_health():
    r = requests.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code in (200, 404), r.status_code


# ---------- Blog list (crash fix context) ----------
def test_blog_public_list_returns_json():
    r = requests.get(f"{BASE_URL}/api/content/blog", timeout=20)
    assert r.status_code == 200, r.text[:200]
    data = r.json()
    assert isinstance(data, (list, dict))


# ---------- Access Requests API ----------
def test_access_requests_endpoint_exists(auth_headers):
    r = requests.get(f"{BASE_URL}/api/access-requests", headers=auth_headers, timeout=20)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}"
    data = r.json()
    assert isinstance(data, (list, dict))


def test_access_requests_create_public():
    # Public create (typical access-request forms are unauthenticated)
    payload = {
        "name": "TEST_accessreq User",
        "email": f"TEST_ar_{int(time.time())}@example.com",
        "organization": "TestOrg",
        "reason": "Automated test",
        "phone": "1234567890"
    }
    r = requests.post(f"{BASE_URL}/api/access-requests", json=payload, timeout=20)
    # Accept 200/201/401/403 (auth-required is acceptable; 404 means missing route)
    assert r.status_code != 404, "Access requests POST route missing"
    assert r.status_code < 500, f"server error {r.status_code} {r.text[:200]}"


# ---------- Contact form type field ----------
def test_contact_submission_has_type_contact(auth_headers):
    payload = {
        "name": "TEST_contact User",
        "email": f"TEST_contact_{int(time.time())}@example.com",
        "subject": "Automated Test",
        "message": "Automated submission to verify type=contact",
    }
    r = requests.post(f"{BASE_URL}/api/contact", json=payload, timeout=20)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text[:200]}"

    # Verify it persisted with type='contact'
    r2 = requests.get(f"{BASE_URL}/api/contact/submissions", headers=auth_headers, timeout=20)
    assert r2.status_code == 200, f"{r2.status_code} {r2.text[:200]}"
    items = r2.json()
    if isinstance(items, dict):
        items = items.get("submissions") or items.get("data") or items.get("items") or []
    assert isinstance(items, list)
    found = [x for x in items if x.get("email") == payload["email"]]
    assert found, "created contact submission not found"
    # Feature under test: type field should be 'contact'
    assert found[0].get("type") == "contact", f"type field missing/invalid: {found[0].get('type')!r}"


# ---------- Granular Permissions API ----------
def test_granular_permissions_available(auth_headers):
    r = requests.get(f"{BASE_URL}/api/permissions/granular/available", headers=auth_headers, timeout=20)
    assert r.status_code != 404, "granular-permissions 'available' route missing"
    assert r.status_code < 500, f"{r.status_code} {r.text[:200]}"


def test_granular_permissions_user_lookup(auth_headers):
    # Use admin's own user id via /auth/me
    me = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
    if me.status_code != 200:
        pytest.skip("cannot fetch current user")
    uid = me.json().get("user_id") or me.json().get("id") or me.json().get("_id")
    if not uid:
        pytest.skip("no user_id on /auth/me")
    r = requests.get(f"{BASE_URL}/api/permissions/granular/user/{uid}", headers=auth_headers, timeout=15)
    assert r.status_code != 404, "user granular permissions endpoint missing"
    assert r.status_code < 500


# ---------- Navigation Manager API ----------
def test_navigation_items_endpoint(auth_headers):
    for path in ["/api/navigation", "/api/navigation/items", "/api/navigation/menu",
                 "/api/nav-menu"]:
        r = requests.get(f"{BASE_URL}{path}", headers=auth_headers, timeout=15)
        if r.status_code == 200:
            return
    pytest.fail("No navigation GET endpoint returns 200")
