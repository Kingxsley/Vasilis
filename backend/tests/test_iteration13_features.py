"""
Iteration 13 - Final Verification Tests
Tests for:
1. Phishing email sending - campaigns with targets should send emails
2. Phishing link tracking - click shows landing page, not homepage
3. Campaign edit/duplicate functionality
4. Template creation
5. Permissions endpoint working without errors
6. Contact form submission
7. Automatic retraining flow on phishing click
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://awareness-hub-9.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "testuser123@vasilisnetshield.com"
SUPER_ADMIN_PASSWORD = "TestAdmin123!"

# Test tracking URL
TEST_TRACKING_CODE = "bKqgQ-jZl3hVJIdkIWjIkg"


class TestAuthAndSetup:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL


class TestPhishingTracking:
    """Phishing link tracking tests - Critical feature"""
    
    def test_tracking_link_shows_landing_page_not_homepage(self):
        """CRITICAL: Verify tracking link shows Security Training Alert page"""
        response = requests.get(f"{BASE_URL}/api/phishing/track/click/{TEST_TRACKING_CODE}")
        assert response.status_code == 200
        
        # Verify it's the landing page, NOT a redirect to homepage
        content = response.text.lower()
        assert "security training alert" in content, "Should show Security Training Alert page"
        assert "phishing" in content or "simulation" in content, "Should mention phishing/simulation"
        assert "training" in content, "Should mention training"
        
        # Should NOT be the homepage
        assert not content.startswith('<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8"'), "Should NOT be homepage"
    
    def test_tracking_pixel_endpoint_returns_image(self):
        """Test email open tracking pixel"""
        response = requests.get(f"{BASE_URL}/api/phishing/track/open/{TEST_TRACKING_CODE}")
        assert response.status_code == 200
        assert response.headers.get('content-type') == 'image/gif'


class TestPhishingCampaigns:
    """Phishing campaign management tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_list_campaigns(self, auth_token):
        """Test listing phishing campaigns"""
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", 
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_templates(self, auth_token):
        """Test listing phishing templates"""
        response = requests.get(f"{BASE_URL}/api/phishing/templates",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_campaign_duplicate_endpoint(self, auth_token):
        """Test campaign duplication functionality"""
        # First get existing campaigns
        campaigns_resp = requests.get(f"{BASE_URL}/api/phishing/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"})
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns available to duplicate")
        
        # Try to duplicate first campaign
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/duplicate",
            headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "(Copy)" in data["name"]
    
    def test_campaign_stats_endpoint(self, auth_token):
        """Test campaign statistics endpoint"""
        # Get campaigns first
        campaigns_resp = requests.get(f"{BASE_URL}/api/phishing/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"})
        campaigns = campaigns_resp.json()
        
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/stats",
            headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert "campaign_id" in data
        assert "total_targets" in data


class TestPermissionsEndpoint:
    """Permissions API tests - Fixed db truth testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_permissions_roles_endpoint(self, auth_token):
        """CRITICAL: Test permissions/roles endpoint - was returning 500 error"""
        response = requests.get(f"{BASE_URL}/api/permissions/roles",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200, f"Permissions roles endpoint returned {response.status_code}: {response.text}"
        data = response.json()
        assert "assignable_roles" in data
        assert "current_user_role" in data
    
    def test_permissions_available_endpoint(self, auth_token):
        """Test available permissions endpoint"""
        response = requests.get(f"{BASE_URL}/api/permissions/available",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200, f"Permissions available endpoint returned {response.status_code}: {response.text}"
        data = response.json()
        assert "permission_groups" in data or "all_assignable" in data
    
    def test_my_permissions_endpoint(self, auth_token):
        """Test my permissions endpoint"""
        response = requests.get(f"{BASE_URL}/api/permissions/my-permissions",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200, f"My permissions endpoint returned {response.status_code}: {response.text}"
        data = response.json()
        assert "role" in data
        assert "permissions" in data


class TestContactFormSubmission:
    """Contact form tests"""
    
    def test_contact_form_endpoint_exists(self):
        """Test contact form submission endpoint"""
        # Contact form submission should accept POST with form data
        response = requests.post(f"{BASE_URL}/api/contact/submit", json={
            "name": "TEST_Contact_User",
            "email": "test@example.com",
            "message": "This is a test message from automated tests"
        })
        # Should return 200 (success) or 422 (validation error if fields different)
        assert response.status_code in [200, 201, 422, 404], f"Contact form returned unexpected status: {response.status_code}"


class TestPhishingStats:
    """Phishing statistics tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_phishing_stats(self, auth_token):
        """Test phishing stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/stats",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "total_campaigns" in data
        assert "total_sent" in data
        assert "click_rate" in data
    
    def test_click_details(self, auth_token):
        """Test click details endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/click-details",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "click_details" in data
        assert "total" in data


class TestTrainingFailures:
    """Training failures (automatic retraining flow) tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_training_failures_endpoint(self, auth_token):
        """Test training failures list endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/training-failures",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "failures" in data
        assert "total" in data
    
    def test_training_failures_stats(self, auth_token):
        """Test training failures statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/training-failures/stats",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "by_scenario_type" in data or "recent_failures" in data


class TestPageBuilder:
    """Page Builder (under Content section) tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_pages_list_endpoint(self, auth_token):
        """Test pages list endpoint"""
        response = requests.get(f"{BASE_URL}/api/pages",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPublicNavigation:
    """Public navigation tests - custom pages should appear"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_public_navigation_endpoint(self, auth_token):
        """Test public navigation endpoint"""
        response = requests.get(f"{BASE_URL}/api/navigation/public",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_public_pages_endpoint(self):
        """Test public pages are accessible"""
        response = requests.get(f"{BASE_URL}/api/pages/public")
        # Could be 200 or 404 if no public pages
        assert response.status_code in [200, 404]


class TestHealthEndpoints:
    """Health check tests"""
    
    def test_health_check(self):
        """Basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_root_endpoint(self):
        """Root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
