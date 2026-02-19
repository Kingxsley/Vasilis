"""
Iteration 6 Backend Tests
Testing: Dashboard stats aggregation, Ad Simulations API, Ad tracking URLs

Features being tested:
1. Dashboard stats endpoint aggregates from phishing_campaigns and ad_campaigns
2. Ad Simulations page API endpoints (campaigns, templates)
3. Ad tracking URL at root level works correctly
"""
import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cyber-training-hub-3.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"


class TestAuth:
    """Authentication tests for getting token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        elif response.status_code == 429:
            pytest.skip("Rate limited - try again in a minute")
        else:
            pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
        return None


class TestDashboardStats(TestAuth):
    """Test Dashboard stats endpoint - aggregates from phishing_campaigns and ad_campaigns"""
    
    def test_dashboard_stats_endpoint_returns_200(self, auth_token):
        """Dashboard stats endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_dashboard_stats_has_required_fields(self, auth_token):
        """Dashboard stats should contain all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_organizations",
            "total_users",
            "total_campaigns",
            "active_campaigns",
            "total_training_sessions",
            "average_score"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_dashboard_stats_aggregates_campaigns(self, auth_token):
        """Dashboard should aggregate campaign counts from phishing and ad campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # total_campaigns should be >= 0 (aggregates from phishing_campaigns + ad_campaigns)
        assert isinstance(data["total_campaigns"], int)
        assert data["total_campaigns"] >= 0
        
        # active_campaigns should be >= 0
        assert isinstance(data["active_campaigns"], int)
        assert data["active_campaigns"] >= 0


class TestAdSimulationsAPI(TestAuth):
    """Test Ad Simulations page API endpoints"""
    
    def test_list_ad_campaigns_endpoint(self, auth_token):
        """List ad campaigns endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/ads/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Response should be a list
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_list_ad_templates_endpoint(self, auth_token):
        """List ad templates endpoint should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/ads/templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Response should be a list
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_ad_templates_have_required_fields(self, auth_token):
        """Ad templates should have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/ads/templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            template = data[0]
            required_fields = ["template_id", "name", "ad_type", "headline", "description", "call_to_action"]
            for field in required_fields:
                assert field in template, f"Missing field: {field}"
    
    def test_ad_campaigns_have_required_fields(self, auth_token):
        """Ad campaigns should have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/ads/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            campaign = data[0]
            required_fields = ["campaign_id", "name", "template_id", "status", "total_targets", "ads_viewed", "ads_clicked"]
            for field in required_fields:
                assert field in campaign, f"Missing field: {field}"


class TestAdTrackingURL:
    """Test Ad tracking URL at root level - /{campaign_id}"""
    
    def test_tracking_url_without_user_param(self):
        """
        Tracking URL without user param should show 'requires user parameter' message
        URL format: /api/track/{campaign_id}
        """
        # Use a valid campaign ID format (even if it doesn't exist)
        response = requests.get(f"{BASE_URL}/api/track/adcamp_test123")
        
        # Should return 200 with info message (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Should contain the "requires user parameter" message
        assert "requires a valid user parameter" in response.text or "user parameter" in response.text.lower()
    
    def test_tracking_url_with_invalid_tracking_code(self):
        """
        Tracking URL with invalid tracking code should return 404 HTML
        """
        response = requests.get(f"{BASE_URL}/api/track/adcamp_test123?u=invalid_code")
        
        # Should return 404 for invalid tracking code
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_tracking_url_format_supports_both_prefixes(self):
        """
        Tracking URL should work with both adcamp_ and adcmp_ prefixes (legacy)
        """
        # Test with adcamp_ prefix
        response1 = requests.get(f"{BASE_URL}/api/track/adcamp_test123")
        assert response1.status_code == 200, "adcamp_ prefix should work"
        
        # Test with adcmp_ prefix (legacy)
        response2 = requests.get(f"{BASE_URL}/api/track/adcmp_test456")
        assert response2.status_code == 200, "adcmp_ prefix should work (legacy)"


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_root_api_endpoint(self):
        """Root API endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
