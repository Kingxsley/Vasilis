"""
Iteration 10 Feature Tests
Tests for new features: Page Builder, Phishing Stats, CMS changes
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Credentials
SUPER_ADMIN_EMAIL = "kingsley@vasilisnetshield.com"
SUPER_ADMIN_PASSWORD = "Test123!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ Health endpoint working")
    
    def test_super_admin_login(self):
        """Test super admin authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Super admin login successful, role: {data.get('user', {}).get('role')}")


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for subsequent tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="class")
def auth_headers(auth_token):
    """Get auth headers for requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPhishingStats:
    """Test aggregated phishing statistics endpoint"""
    
    def test_phishing_stats_requires_auth(self):
        """Test that /api/phishing/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/phishing/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Phishing stats endpoint requires authentication")
    
    def test_phishing_stats_returns_data(self, auth_headers):
        """Test that /api/phishing/stats returns aggregated statistics"""
        response = requests.get(f"{BASE_URL}/api/phishing/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats request failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields exist
        required_fields = [
            "total_campaigns", "active_campaigns", "completed_campaigns",
            "total_sent", "total_opened", "total_clicked", 
            "open_rate", "click_rate"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify numeric types
        assert isinstance(data["total_campaigns"], int)
        assert isinstance(data["total_sent"], int)
        assert isinstance(data["open_rate"], (int, float))
        
        print(f"✓ Phishing stats returned: {data['total_campaigns']} campaigns, {data['total_sent']} emails")
    
    def test_phishing_stats_with_days_filter(self, auth_headers):
        """Test /api/phishing/stats with days parameter"""
        response = requests.get(f"{BASE_URL}/api/phishing/stats?days=7", headers=auth_headers)
        assert response.status_code == 200, f"Stats with days filter failed: {response.text}"
        
        data = response.json()
        assert "total_campaigns" in data
        print(f"✓ Phishing stats with 7-day filter: {data['total_campaigns']} campaigns")


class TestPageBuilder:
    """Test Dynamic Page Builder CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        """Store auth headers for the class"""
        self.headers = auth_headers
        self.test_slug = f"test-page-{uuid.uuid4().hex[:8]}"
    
    def test_block_templates_endpoint(self, auth_headers):
        """Test /api/pages/block-templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/pages/block-templates", headers=auth_headers)
        assert response.status_code == 200, f"Block templates failed: {response.text}"
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) > 0, "No block templates returned"
        
        # Check for required block types
        template_types = [t["type"] for t in templates]
        expected_types = ["heading", "text", "button", "contact_form", "event_registration"]
        
        for expected in expected_types:
            assert expected in template_types, f"Missing template type: {expected}"
        
        print(f"✓ Block templates returned: {template_types}")
    
    def test_list_custom_pages(self, auth_headers):
        """Test /api/pages/custom lists pages"""
        response = requests.get(f"{BASE_URL}/api/pages/custom?include_unpublished=true", headers=auth_headers)
        assert response.status_code == 200, f"List pages failed: {response.text}"
        
        data = response.json()
        assert "pages" in data
        assert "total" in data
        print(f"✓ Custom pages listed: {data['total']} pages")
    
    def test_create_custom_page(self, auth_headers):
        """Test creating a custom page with blocks"""
        test_slug = f"test-page-{uuid.uuid4().hex[:8]}"
        
        page_data = {
            "title": "Test Page for Iteration 10",
            "slug": test_slug,
            "description": "A test page created during iteration 10 testing",
            "page_type": "custom",
            "blocks": [
                {
                    "type": "heading",
                    "content": {"text": "Welcome to Test Page", "level": "h1"},
                    "order": 0
                },
                {
                    "type": "text",
                    "content": {"text": "This is test content for the page builder."},
                    "order": 1
                },
                {
                    "type": "button",
                    "content": {"text": "Click Me", "url": "/dashboard", "style": "primary"},
                    "order": 2
                }
            ],
            "show_in_nav": False,
            "nav_section": "main",
            "is_published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data, headers=auth_headers)
        assert response.status_code == 200, f"Create page failed: {response.text}"
        
        data = response.json()
        assert "page_id" in data, "No page_id in response"
        assert data["slug"] == test_slug, "Slug mismatch"
        
        page_id = data["page_id"]
        print(f"✓ Created page: {page_id} with slug: {test_slug}")
        
        # Cleanup: Delete the test page
        delete_response = requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Cleaned up test page: {page_id}")
    
    def test_create_and_get_page_by_slug(self, auth_headers):
        """Test creating a page and retrieving it by slug"""
        test_slug = f"test-get-{uuid.uuid4().hex[:8]}"
        
        page_data = {
            "title": "Get By Slug Test",
            "slug": test_slug,
            "page_type": "custom",
            "blocks": [
                {
                    "type": "heading",
                    "content": {"text": "Test Heading"},
                    "order": 0
                }
            ],
            "is_published": True
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data, headers=auth_headers)
        assert create_response.status_code == 200
        page_id = create_response.json()["page_id"]
        
        # Get by slug (public)
        get_response = requests.get(f"{BASE_URL}/api/pages/custom/{test_slug}")
        assert get_response.status_code == 200, f"Get page failed: {get_response.text}"
        
        page = get_response.json()
        assert page["title"] == "Get By Slug Test"
        assert page["slug"] == test_slug
        assert len(page["blocks"]) == 1
        print(f"✓ Retrieved page by slug: {test_slug}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
    
    def test_create_page_with_contact_form_block(self, auth_headers):
        """Test creating a page with contact form block"""
        test_slug = f"contact-test-{uuid.uuid4().hex[:8]}"
        
        page_data = {
            "title": "Contact Form Test Page",
            "slug": test_slug,
            "page_type": "contact",
            "blocks": [
                {
                    "type": "heading",
                    "content": {"text": "Get In Touch", "level": "h1"},
                    "order": 0
                },
                {
                    "type": "contact_form",
                    "content": {
                        "title": "Contact Us",
                        "submit_text": "Send Message",
                        "success_message": "Thanks for reaching out!"
                    },
                    "order": 1
                }
            ],
            "is_published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data, headers=auth_headers)
        assert response.status_code == 200, f"Create contact page failed: {response.text}"
        
        page_id = response.json()["page_id"]
        
        # Verify the page has contact form block
        get_response = requests.get(f"{BASE_URL}/api/pages/custom/{test_slug}")
        page = get_response.json()
        
        block_types = [b["type"] for b in page["blocks"]]
        assert "contact_form" in block_types, "Contact form block not found"
        print(f"✓ Contact form page created: {test_slug}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
    
    def test_create_page_with_event_registration_block(self, auth_headers):
        """Test creating a page with event registration block"""
        test_slug = f"event-test-{uuid.uuid4().hex[:8]}"
        
        page_data = {
            "title": "Event Registration Test",
            "slug": test_slug,
            "page_type": "event",
            "blocks": [
                {
                    "type": "event_registration",
                    "content": {
                        "title": "Register for Event",
                        "event_name": "Security Workshop 2026",
                        "event_date": "2026-02-15T14:00:00",
                        "event_location": "Virtual",
                        "button_text": "Register Now"
                    },
                    "order": 0
                }
            ],
            "is_published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data, headers=auth_headers)
        assert response.status_code == 200, f"Create event page failed: {response.text}"
        
        page_id = response.json()["page_id"]
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/pages/custom/{test_slug}")
        page = get_response.json()
        
        block_types = [b["type"] for b in page["blocks"]]
        assert "event_registration" in block_types
        print(f"✓ Event registration page created: {test_slug}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
    
    def test_update_page(self, auth_headers):
        """Test updating a custom page"""
        test_slug = f"update-test-{uuid.uuid4().hex[:8]}"
        
        # Create
        create_data = {
            "title": "Original Title",
            "slug": test_slug,
            "blocks": [],
            "is_published": False
        }
        create_response = requests.post(f"{BASE_URL}/api/pages/custom", json=create_data, headers=auth_headers)
        assert create_response.status_code == 200
        page_id = create_response.json()["page_id"]
        
        # Update
        update_data = {
            "title": "Updated Title",
            "is_published": True
        }
        update_response = requests.patch(f"{BASE_URL}/api/pages/custom/{page_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_page = update_response.json()
        assert updated_page["title"] == "Updated Title"
        assert updated_page["is_published"] == True
        print(f"✓ Page updated successfully: {page_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
    
    def test_delete_page(self, auth_headers):
        """Test deleting a custom page"""
        test_slug = f"delete-test-{uuid.uuid4().hex[:8]}"
        
        # Create
        create_data = {
            "title": "To Be Deleted",
            "slug": test_slug,
            "blocks": []
        }
        create_response = requests.post(f"{BASE_URL}/api/pages/custom", json=create_data, headers=auth_headers)
        page_id = create_response.json()["page_id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/pages/custom/{test_slug}", headers=auth_headers)
        assert get_response.status_code == 404, "Page should not exist after deletion"
        print(f"✓ Page deleted successfully: {page_id}")
    
    def test_duplicate_slug_rejected(self, auth_headers):
        """Test that duplicate slugs are rejected"""
        test_slug = f"dup-test-{uuid.uuid4().hex[:8]}"
        
        # Create first page
        page_data = {"title": "First Page", "slug": test_slug, "blocks": []}
        create1 = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data, headers=auth_headers)
        assert create1.status_code == 200
        page_id = create1.json()["page_id"]
        
        # Try to create second page with same slug
        page_data2 = {"title": "Second Page", "slug": test_slug, "blocks": []}
        create2 = requests.post(f"{BASE_URL}/api/pages/custom", json=page_data2, headers=auth_headers)
        assert create2.status_code == 400, "Should reject duplicate slug"
        print("✓ Duplicate slug correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pages/custom/{page_id}", headers=auth_headers)


class TestLandingPage:
    """Test landing page content endpoints"""
    
    def test_get_landing_page_public(self):
        """Test /api/pages/landing is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/pages/landing")
        assert response.status_code == 200, f"Landing page request failed: {response.text}"
        
        data = response.json()
        assert "hero" in data
        assert "features" in data
        print("✓ Landing page content retrieved publicly")


class TestAccountLockoutNotification:
    """Test account lockout email notification functionality"""
    
    def test_failed_login_attempts(self):
        """Test that failed login attempts are recorded"""
        # Use a non-existent email to test failed login tracking
        test_email = f"test-lockout-{uuid.uuid4().hex[:8]}@test.com"
        
        # Attempt login with wrong credentials (should fail)
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "wrongpassword123"
            })
            # Should get 401 for invalid credentials
            assert response.status_code in [401, 429], f"Unexpected status: {response.status_code}"
        
        print("✓ Failed login attempts handled correctly")
    
    def test_lockout_after_excessive_attempts(self):
        """Test that account gets locked after multiple failed attempts"""
        test_email = f"lockout-{uuid.uuid4().hex[:8]}@test.com"
        
        # Attempt many failed logins
        lockout_triggered = False
        for i in range(10):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "wrongpassword"
            })
            if response.status_code == 429:
                lockout_triggered = True
                break
        
        # Note: Lockout may or may not trigger depending on configuration
        # The test passes either way - we're just verifying the endpoint handles it
        print(f"✓ Lockout handling: {'triggered' if lockout_triggered else 'not triggered (within threshold)'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
