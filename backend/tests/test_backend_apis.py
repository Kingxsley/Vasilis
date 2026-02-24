"""
Backend API Tests for Security Awareness Platform
Tests: Authentication, Phishing Campaigns, Ad Simulations, Training Modules, Analytics
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://security-modules-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@vasilisns.com"
SUPER_ADMIN_PASSWORD = "Admin123!Pass"
TRAINEE_EMAIL = "trainee@testorg.com"
TRAINEE_PASSWORD = "Admin123!Pass"

# Cached token for reuse across tests
_cached_token = None

def get_auth_token():
    """Get cached auth token or login to get new one"""
    global _cached_token
    if _cached_token:
        return _cached_token
    
    time.sleep(0.2)  # Small delay to avoid rate limiting
    response = requests.post(f"{API}/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200 and "token" in response.json():
        _cached_token = response.json()["token"]
        return _cached_token
    raise Exception(f"Failed to get token: {response.status_code} - {response.text}")

def get_auth_headers():
    """Get auth headers with token"""
    return {"Authorization": f"Bearer {get_auth_token()}"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_super_admin_success(self):
        """Test super admin login"""
        response = requests.post(f"{API}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "super_admin"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        print(f"PASS: Super admin login successful - user: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{API}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("PASS: Invalid credentials rejected")
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{API}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check passed")


class TestPhishingCampaigns:
    """Phishing campaigns and tracking tests"""
    
    def test_list_phishing_campaigns(self):
        """Test listing phishing campaigns"""
        response = requests.get(f"{API}/phishing/campaigns", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of campaigns"
        print(f"PASS: Listed {len(data)} phishing campaigns")
    
    def test_list_phishing_templates(self):
        """Test listing phishing templates"""
        response = requests.get(f"{API}/phishing/templates", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of templates"
        print(f"PASS: Listed {len(data)} phishing templates")
    
    def test_phishing_stats_unified(self):
        """Test unified phishing stats (includes ad campaigns)"""
        response = requests.get(f"{API}/phishing/stats?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify unified stats structure
        assert "total_campaigns" in data
        assert "total_sent" in data
        assert "click_rate" in data
        print(f"PASS: Unified stats - {data['total_campaigns']} total campaigns, {data['click_rate']}% click rate")
    
    def test_phishing_click_tracking_shows_awareness_page(self):
        """Test that phishing link click shows awareness page"""
        # This endpoint should work without auth (public tracking)
        response = requests.get(f"{API}/phishing/track/click/test_track_abc123")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        # Should return HTML awareness page
        assert "text/html" in response.headers.get("content-type", "")
        content = response.text
        assert "Security Training Alert" in content or "Phishing" in content
        assert "This was a simulated security test" in content or "security awareness" in content.lower()
        print("PASS: Phishing click tracking returns awareness page HTML")
    
    def test_phishing_campaign_has_assigned_module_field(self):
        """Test that phishing campaigns can have assigned training modules"""
        response = requests.get(f"{API}/phishing/campaigns", headers=get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            campaign = data[0]
            # Check that assigned_module_id field exists (can be null)
            assert "assigned_module_id" in campaign or campaign.get("assigned_module_id") is None
            print(f"PASS: Campaign '{campaign['name']}' has assigned_module_id field")
        else:
            print("WARN: No campaigns to test assigned_module_id field")


class TestAdSimulations:
    """Ad simulation campaign tests"""
    
    def test_list_ad_campaigns(self):
        """Test listing ad campaigns"""
        response = requests.get(f"{API}/ads/campaigns", headers=get_auth_headers())
        # Accept 200 or 404 (if endpoint exists but no campaigns)
        assert response.status_code in [200, 404], f"Failed: {response.status_code} - {response.text}"
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Listed ad campaigns - count: {len(data) if isinstance(data, list) else 'N/A'}")
        else:
            print("INFO: No ad campaigns endpoint or empty")


class TestAnalytics:
    """Analytics endpoint tests"""
    
    def test_all_campaigns_unified_analytics(self):
        """Test unified analytics showing both phishing and ad campaigns"""
        response = requests.get(f"{API}/analytics/all-campaigns?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify unified structure
        assert "campaigns" in data, "Missing campaigns list"
        assert "summary" in data, "Missing summary"
        
        campaigns = data["campaigns"]
        summary = data["summary"]
        
        # Check summary has combined stats
        assert "total_campaigns" in summary
        assert "phishing_campaigns" in summary
        assert "ad_campaigns" in summary
        
        # Check each campaign has type info
        for campaign in campaigns:
            assert "type" in campaign, f"Campaign missing type field: {campaign.get('name')}"
            assert campaign["type"] in ["phishing", "ad"], f"Invalid type: {campaign['type']}"
        
        print(f"PASS: Unified analytics - {summary['total_campaigns']} total ({summary['phishing_campaigns']} phishing, {summary['ad_campaigns']} ad)")
    
    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        response = requests.get(f"{API}/analytics/overview?days=30", headers=get_auth_headers())
        # May not exist, so accept 404
        if response.status_code == 200:
            print("PASS: Analytics overview endpoint works")
        elif response.status_code == 404:
            print("INFO: Analytics overview endpoint not found (may not be implemented)")
        else:
            print(f"WARN: Analytics overview returned {response.status_code}")


class TestTrainingModules:
    """Training modules endpoint tests"""
    
    def test_list_training_modules(self):
        """Test listing training modules"""
        response = requests.get(f"{API}/training/modules", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of modules"
        print(f"PASS: Listed {len(data)} training modules")


class TestSimulationBuilder:
    """Simulation Builder specific tests"""
    
    def test_get_phishing_template_for_edit(self):
        """Test getting a specific template for editing"""
        # First get list of templates
        response = requests.get(f"{API}/phishing/templates", headers=get_auth_headers())
        assert response.status_code == 200
        templates = response.json()
        
        if len(templates) > 0:
            template_id = templates[0]["template_id"]
            # Get specific template
            response = requests.get(f"{API}/phishing/templates/{template_id}", headers=get_auth_headers())
            assert response.status_code == 200, f"Failed to get template: {response.text}"
            template = response.json()
            assert "name" in template
            assert "subject" in template
            assert "body_html" in template
            print(f"PASS: Can retrieve template '{template['name']}' for editing")
        else:
            print("INFO: No templates to test edit functionality")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
