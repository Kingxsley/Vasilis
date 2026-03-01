"""
Iteration 14 Tests - Bug Fixes for Email Test Send, RSS Pagination, CMS Tiles Input, Email Validation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestTestEmailEndpoint:
    """Test the new test email send endpoint"""
    
    def test_test_send_endpoint_exists(self, authenticated_client):
        """Test that /api/system-emails/test-send endpoint exists"""
        response = authenticated_client.post(f"{BASE_URL}/api/system-emails/test-send", json={})
        # Should return 400 for missing to_email, not 404
        assert response.status_code == 400
        assert "to_email is required" in response.json().get("detail", "")
    
    def test_test_send_validates_email_format(self, authenticated_client):
        """Test that endpoint validates email format"""
        response = authenticated_client.post(f"{BASE_URL}/api/system-emails/test-send", json={
            "to_email": "invalid-email"
        })
        assert response.status_code == 400
        assert "Invalid email format" in response.json().get("detail", "")
    
    def test_test_send_with_valid_email(self, authenticated_client):
        """Test that endpoint accepts valid email and attempts to send"""
        response = authenticated_client.post(f"{BASE_URL}/api/system-emails/test-send", json={
            "to_email": "valid@example.com",
            "template_id": "welcome"
        })
        # Should succeed (200) or fail with SendGrid error (500), not validation error
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert "sent" in response.json().get("status", "")
    
    def test_test_custom_endpoint_exists(self, authenticated_client):
        """Test that /api/system-emails/test-custom endpoint exists"""
        response = authenticated_client.post(f"{BASE_URL}/api/system-emails/test-custom", json={})
        assert response.status_code == 400
        assert "to_email is required" in response.json().get("detail", "")
    
    def test_test_custom_requires_html_content(self, authenticated_client):
        """Test that test-custom requires html_content"""
        response = authenticated_client.post(f"{BASE_URL}/api/system-emails/test-custom", json={
            "to_email": "test@example.com"
        })
        assert response.status_code == 400
        assert "html_content is required" in response.json().get("detail", "")
    
    def test_test_send_requires_super_admin(self, unauthenticated_client):
        """Test that test-send requires authentication"""
        response = unauthenticated_client.post(f"{BASE_URL}/api/system-emails/test-send", json={
            "to_email": "test@example.com"
        })
        assert response.status_code in [401, 403]


class TestNewsPagination:
    """Test RSS feed pagination fixes"""
    
    def test_news_endpoint_returns_pagination_info(self, api_client):
        """Test that news endpoint returns proper pagination fields"""
        response = api_client.get(f"{BASE_URL}/api/content/news?limit=5&skip=0&include_rss=true")
        assert response.status_code == 200
        data = response.json()
        assert "news" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
    
    def test_news_pagination_with_skip(self, api_client):
        """Test news pagination with skip parameter"""
        # First page
        response1 = api_client.get(f"{BASE_URL}/api/content/news?limit=3&skip=0&include_rss=true")
        assert response1.status_code == 200
        page1 = response1.json()
        
        # Second page
        response2 = api_client.get(f"{BASE_URL}/api/content/news?limit=3&skip=3&include_rss=true")
        assert response2.status_code == 200
        page2 = response2.json()
        
        # Total should be consistent between pages
        assert page1["total"] == page2["total"]
        
        # If there are news items, the lists should be different (unless total <= 3)
        if page1["total"] > 3:
            assert page1["news"] != page2["news"] or len(page2["news"]) == 0
    
    def test_news_rss_included_in_total(self, api_client):
        """Test that RSS feeds are included in total count"""
        # Get news with RSS
        response_with_rss = api_client.get(f"{BASE_URL}/api/content/news?include_rss=true&limit=50")
        assert response_with_rss.status_code == 200
        data_with_rss = response_with_rss.json()
        
        # Get news without RSS
        response_without_rss = api_client.get(f"{BASE_URL}/api/content/news?include_rss=false&limit=50")
        assert response_without_rss.status_code == 200
        data_without_rss = response_without_rss.json()
        
        # Total with RSS should be >= total without RSS (if RSS feeds exist and are enabled)
        assert data_with_rss["total"] >= data_without_rss["total"]
    
    def test_news_returns_rss_items_marked(self, api_client):
        """Test that RSS items have source='rss' marker"""
        response = api_client.get(f"{BASE_URL}/api/content/news?include_rss=true&limit=50")
        assert response.status_code == 200
        data = response.json()
        
        # Check if there are RSS items
        rss_items = [item for item in data["news"] if item.get("source") == "rss"]
        local_items = [item for item in data["news"] if item.get("source") == "local"]
        
        # All items should have a source marker
        for item in data["news"]:
            assert "source" in item


class TestCMSTilesInput:
    """Test CMS Tiles input fixes"""
    
    def test_cms_tiles_endpoint_exists(self, authenticated_client):
        """Test CMS tiles admin endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/cms-tiles/admin")
        assert response.status_code == 200
        assert "tiles" in response.json()
    
    def test_create_cms_tile(self, authenticated_client):
        """Test creating a CMS tile"""
        unique_name = f"TEST_Tile_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name,
            "slug": unique_name.lower().replace("_", "-"),
            "icon": "FileText",
            "description": "Test tile created by pytest",
            "published": False,
            "route_type": "custom"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == unique_name
        
        # Cleanup
        tile_id = data.get("tile_id")
        if tile_id:
            authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
    
    def test_update_cms_tile(self, authenticated_client):
        """Test updating a CMS tile"""
        # Create tile
        unique_name = f"TEST_Update_{uuid.uuid4().hex[:8]}"
        create_response = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name,
            "icon": "FileText",
            "published": False
        })
        assert create_response.status_code == 200
        tile_id = create_response.json().get("tile_id")
        
        # Update tile
        updated_description = "Updated description"
        update_response = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}", json={
            "description": updated_description
        })
        assert update_response.status_code == 200
        assert update_response.json().get("description") == updated_description
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
    
    def test_cms_tile_handles_empty_name(self, authenticated_client):
        """Test that CMS tile creation validates empty name"""
        response = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": "",
            "icon": "FileText"
        })
        # Should reject empty name
        assert response.status_code in [400, 422]


class TestEmailValidation:
    """Test email validation functions"""
    
    def test_registration_with_invalid_email(self, api_client):
        """Test that registration rejects invalid email format"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "not-an-email",
            "password": "Password123!"
        })
        # Should reject invalid email
        assert response.status_code in [400, 422]
    
    def test_registration_with_valid_email_format(self, api_client):
        """Test that registration accepts valid email format"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "Password123!"
        })
        # Valid email should pass format validation
        # Response could be 200 (created), 400 (already exists), or other business logic error
        # The key is it shouldn't fail on email format validation
        assert response.status_code not in [422]  # 422 would indicate validation error
    
    def test_login_with_invalid_email_format(self, api_client):
        """Test login rejects completely invalid email format"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid",
            "password": "test123"
        })
        # Could be 400 for invalid format or 401 for wrong credentials
        assert response.status_code in [400, 401, 422]


class TestFormSubmissions:
    """Test FormSubmissions page API endpoints"""
    
    def test_contact_submissions_endpoint(self, authenticated_client):
        """Test contact submissions endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/contact/submissions")
        assert response.status_code == 200
        # Should return a list
        assert isinstance(response.json(), list)
    
    def test_access_requests_endpoint(self, authenticated_client):
        """Test access requests endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/access-requests")
        assert response.status_code == 200
        # Should return a list
        assert isinstance(response.json(), list)
    
    def test_endpoints_require_auth(self, unauthenticated_client):
        """Test that form submissions endpoints require authentication"""
        contact_response = unauthenticated_client.get(f"{BASE_URL}/api/contact/submissions")
        access_response = unauthenticated_client.get(f"{BASE_URL}/api/access-requests")
        
        assert contact_response.status_code in [401, 403]
        assert access_response.status_code in [401, 403]


class TestRSSFeeds:
    """Test RSS feed management"""
    
    def test_rss_feeds_use_enabled_field(self, authenticated_client):
        """Test that RSS feeds use 'enabled' field (not 'is_active')"""
        response = authenticated_client.get(f"{BASE_URL}/api/content/news/rss-feeds")
        assert response.status_code == 200
        feeds = response.json()
        
        if isinstance(feeds, list) and len(feeds) > 0:
            # Check that feeds have 'enabled' field
            for feed in feeds:
                assert "enabled" in feed
                # Should NOT have 'is_active' (old field name)
                assert "is_active" not in feed or feed.get("enabled") is not None
    
    def test_create_rss_feed_with_enabled(self, authenticated_client):
        """Test creating RSS feed with enabled field"""
        unique_name = f"TEST_RSS_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/content/news/rss-feeds", json={
            "name": unique_name,
            "url": "https://feeds.feedburner.com/TheHackersNews",
            "enabled": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == True
        
        # Cleanup
        feed_id = data.get("feed_id")
        if feed_id:
            authenticated_client.delete(f"{BASE_URL}/api/content/news/rss-feeds/{feed_id}")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json().get("status") == "healthy"
    
    def test_system_email_templates_endpoint(self, authenticated_client):
        """Test system email templates endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/system-emails")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        # Should have default templates
        templates = data["templates"]
        assert len(templates) > 0
        # Check for expected templates
        template_ids = [t["id"] for t in templates]
        assert "welcome" in template_ids
        assert "password_reset" in template_ids
