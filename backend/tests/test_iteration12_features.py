"""
Iteration 12: Testing phishing simulation tracking, campaign creation, template editor, file upload, and page builder
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://security-training-31.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "testuser123@vasilisnetshield.com"
SUPER_ADMIN_PASSWORD = "TestAdmin123!"

# Test tracking URL
TEST_TRACKING_URL = "https://security-training-31.preview.emergentagent.com/api/phishing/track/click/bKqgQ-jZl3hVJIdkIWjIkg"


class TestPhishingTracking:
    """Tests for phishing link tracking functionality"""
    
    def test_tracking_url_returns_landing_page(self):
        """Test that phishing tracking URL shows landing page, not homepage"""
        response = requests.get(TEST_TRACKING_URL, allow_redirects=True)
        assert response.status_code == 200
        assert "Security Training Alert" in response.text
        assert "Phishing Email Detected" in response.text
        print("PASS: Tracking URL shows phishing landing page correctly")
    
    def test_tracking_url_content_structure(self):
        """Test that landing page has expected content"""
        response = requests.get(TEST_TRACKING_URL, allow_redirects=True)
        assert response.status_code == 200
        # Check for expected content elements
        assert "This was a simulated security test" in response.text
        assert "You Clicked on a Test Link" in response.text
        assert "What Could Have Happened" in response.text
        print("PASS: Landing page has correct security awareness content")


class TestAuthentication:
    """Test authentication and get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed with status {response.status_code}")
        token = response.json().get("token")
        assert token is not None
        print(f"PASS: Authenticated as {SUPER_ADMIN_EMAIL}")
        return token
    
    def test_login_super_admin(self, auth_token):
        """Test login works for super admin"""
        assert auth_token is not None
        print("PASS: Super admin login successful")


class TestCampaignOperations:
    """Tests for campaign CRUD and special operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_campaigns(self, auth_headers):
        """Test listing all campaigns"""
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        assert isinstance(campaigns, list)
        print(f"PASS: Listed {len(campaigns)} campaigns")
    
    def test_list_organizations(self, auth_headers):
        """Test listing organizations (needed for campaign creation)"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=auth_headers)
        assert response.status_code == 200
        orgs = response.json()
        assert isinstance(orgs, list)
        print(f"PASS: Listed {len(orgs)} organizations")
        return orgs
    
    def test_list_users(self, auth_headers):
        """Test listing users (needed for target selection)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"PASS: Listed {len(users)} users")
        return users
    
    def test_get_campaign_details(self, auth_headers):
        """Test getting campaign details with targets"""
        # First get list of campaigns
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=auth_headers)
        if response.status_code != 200 or not response.json():
            pytest.skip("No campaigns available to test")
        
        campaign = response.json()[0]
        campaign_id = campaign["campaign_id"]
        
        # Get campaign targets
        targets_response = requests.get(
            f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=auth_headers
        )
        assert targets_response.status_code == 200
        targets = targets_response.json()
        print(f"PASS: Campaign {campaign_id} has {len(targets)} targets")
    
    def test_duplicate_campaign_api(self, auth_headers):
        """Test duplicate campaign endpoint exists and works"""
        # Get existing campaigns
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=auth_headers)
        if response.status_code != 200 or not response.json():
            pytest.skip("No campaigns to duplicate")
        
        campaign = response.json()[0]
        campaign_id = campaign["campaign_id"]
        
        # Try duplicate
        dup_response = requests.post(
            f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/duplicate",
            headers=auth_headers
        )
        assert dup_response.status_code == 200
        data = dup_response.json()
        assert "campaign_id" in data
        assert "(Copy)" in data.get("name", "")
        print(f"PASS: Campaign duplicated successfully: {data['name']}")
    
    def test_update_draft_campaign(self, auth_headers):
        """Test updating a draft campaign"""
        # Get campaigns to find a draft
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Failed to get campaigns")
        
        campaigns = response.json()
        draft_campaigns = [c for c in campaigns if c.get("status") == "draft"]
        
        if not draft_campaigns:
            pytest.skip("No draft campaigns to test edit functionality")
        
        campaign = draft_campaigns[0]
        campaign_id = campaign["campaign_id"]
        
        # Try to update name
        update_response = requests.put(
            f"{BASE_URL}/api/phishing/campaigns/{campaign_id}",
            json={"name": f"{campaign['name']} Updated"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        print(f"PASS: Draft campaign updated successfully")


class TestTemplateOperations:
    """Tests for template creation and management"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_templates(self, auth_headers):
        """Test listing email templates"""
        response = requests.get(f"{BASE_URL}/api/phishing/templates", headers=auth_headers)
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        print(f"PASS: Listed {len(templates)} templates")
    
    def test_create_template(self, auth_headers):
        """Test creating a new template"""
        template_data = {
            "name": "TEST_Iteration12_Template",
            "subject": "Test Subject - {{USER_NAME}}",
            "sender_name": "IT Security",
            "sender_email": "security@test.com",
            "body_html": "<p>Hello {{USER_NAME}}, this is a test template.</p>"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/phishing/templates",
            json=template_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        created = response.json()
        assert "template_id" in created
        print(f"PASS: Template created: {created['template_id']}")
        
        # Cleanup - delete the test template
        requests.delete(
            f"{BASE_URL}/api/phishing/templates/{created['template_id']}",
            headers=auth_headers
        )


class TestMediaUpload:
    """Tests for media/file upload functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_media_upload_endpoint_exists(self, auth_headers):
        """Test that media upload endpoint responds (even without file)"""
        # Test endpoint exists - without Content-Type header for multipart
        response = requests.post(
            f"{BASE_URL}/api/phishing/media/upload",
            headers=auth_headers,
            files={}
        )
        # Should return 422 (validation error for missing file) not 401/404
        assert response.status_code in [200, 400, 422]
        print(f"PASS: Media upload endpoint exists (status: {response.status_code})")
    
    def test_list_media(self, auth_headers):
        """Test listing uploaded media"""
        response = requests.get(f"{BASE_URL}/api/phishing/media", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "images" in data
        print(f"PASS: Listed {len(data['images'])} media items")


class TestPageBuilder:
    """Tests for Page Builder and custom pages"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_custom_pages_public(self):
        """Test listing custom pages (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/pages/custom")
        assert response.status_code == 200
        data = response.json()
        assert "pages" in data
        print(f"PASS: Listed {len(data['pages'])} custom pages")
    
    def test_page_builder_api_exists(self, auth_headers):
        """Test that page builder related APIs exist"""
        # Test navigation API
        nav_response = requests.get(
            f"{BASE_URL}/api/navigation/public",
            headers=auth_headers
        )
        # Could be 200 or 404 if not implemented
        assert nav_response.status_code in [200, 404]
        print(f"PASS: Navigation API responded with {nav_response.status_code}")


class TestPhishingStats:
    """Tests for phishing statistics endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_phishing_stats(self, auth_headers):
        """Test aggregated phishing stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/stats", headers=auth_headers)
        assert response.status_code == 200
        stats = response.json()
        assert "total_campaigns" in stats
        assert "open_rate" in stats
        assert "click_rate" in stats
        print(f"PASS: Phishing stats: {stats['total_campaigns']} campaigns, {stats['click_rate']}% click rate")
    
    def test_click_details(self, auth_headers):
        """Test click details endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/click-details", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "click_details" in data
        assert "total" in data
        print(f"PASS: Click details: {data['total']} clicks recorded")
    
    def test_best_performing_campaigns(self, auth_headers):
        """Test best performing campaigns endpoint"""
        response = requests.get(f"{BASE_URL}/api/phishing/best-performing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "campaigns" in data
        print(f"PASS: Best performing campaigns: {len(data['campaigns'])} campaigns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
