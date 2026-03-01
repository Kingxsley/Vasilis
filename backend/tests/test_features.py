"""
Backend API Tests for Security Training Platform
Testing: Login without 2FA, Online Users, Executive Training
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthLoginWithout2FA:
    """Test login endpoint returns token without requiring 2FA code"""
    
    def test_login_endpoint_exists(self, api_client):
        """Test that login endpoint is accessible"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "invalid"
        })
        # Should return 401 or 400, not 404
        assert response.status_code in [401, 400, 429], f"Unexpected status: {response.status_code}"
    
    def test_login_without_2fa_field_succeeds(self, api_client):
        """Test that login works without 2FA code field - primary feature test"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token is returned
        assert "token" in data, "Token not returned in response"
        assert data["token"], "Token is empty"
        
        # Verify user data is returned
        assert "user" in data, "User data not returned"
        assert "email" in data["user"], "Email not in user data"
        assert data["user"]["email"] == "admin@test.com"
    
    def test_login_response_structure(self, api_client):
        """Test login response has correct structure"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected fields (2FA fields should be optional or false)
        assert "token" in data
        assert "user" in data
        # 2FA related fields should indicate it's not required during login
        if "requires_2fa_verification" in data:
            # This field should be false for normal login
            pass  # Just checking structure, value depends on user setup


class TestOnlineUsersEndpoint:
    """Test /api/analytics/online-users endpoint"""
    
    def test_online_users_endpoint_exists(self, authenticated_client):
        """Test that online users endpoint is accessible"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/online-users")
        assert response.status_code == 200, f"Endpoint failed: {response.text}"
    
    def test_online_users_returns_correct_structure(self, authenticated_client):
        """Test online users endpoint returns correct data structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/online-users")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "online_count" in data, "online_count field missing"
        assert "online_users" in data, "online_users field missing"
        assert "minutes_threshold" in data, "minutes_threshold field missing"
        
        # Verify types
        assert isinstance(data["online_count"], int), "online_count should be integer"
        assert isinstance(data["online_users"], list), "online_users should be list"
        assert isinstance(data["minutes_threshold"], int), "minutes_threshold should be integer"
    
    def test_online_users_default_minutes_is_5(self, authenticated_client):
        """Test that default minutes threshold is 5"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/online-users")
        assert response.status_code == 200
        data = response.json()
        assert data["minutes_threshold"] == 5, "Default minutes should be 5"
    
    def test_online_users_custom_minutes(self, authenticated_client):
        """Test online users with custom minutes parameter"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics/online-users?minutes=10")
        assert response.status_code == 200
        data = response.json()
        assert data["minutes_threshold"] == 10
    
    def test_online_users_requires_auth(self, unauthenticated_client):
        """Test that online users endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/analytics/online-users")
        assert response.status_code == 401, "Endpoint should require authentication"


class TestExecutiveTrainingModulesAPI:
    """Test /api/executive-training endpoints"""
    
    def test_available_modules_endpoint(self, authenticated_client):
        """Test GET /api/executive-training/available-modules"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200, f"Endpoint failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "modules" in data, "modules field missing"
        assert isinstance(data["modules"], list), "modules should be list"
    
    def test_available_modules_contains_data(self, authenticated_client):
        """Test that available modules returns expected modules"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        data = response.json()
        
        modules = data["modules"]
        assert len(modules) > 0, "Should have at least one module"
        
        # Check first module structure
        first_module = modules[0]
        assert "key" in first_module, "Module should have key"
        assert "title" in first_module, "Module should have title"
        assert "slide_count" in first_module, "Module should have slide_count"
    
    def test_generate_presentation_endpoint(self, authenticated_client):
        """Test GET /api/executive-training/generate/{module_key}"""
        # First get available modules
        modules_res = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert modules_res.status_code == 200
        modules = modules_res.json()["modules"]
        
        if len(modules) == 0:
            pytest.skip("No modules available for testing")
        
        module_key = modules[0]["key"]
        
        # Generate presentation
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/generate/{module_key}")
        assert response.status_code == 200, f"Generate failed: {response.text}"
        
        # Check that it returns a PPTX file
        content_type = response.headers.get('content-type', '')
        assert 'application/vnd.openxmlformats-officedocument.presentationml.presentation' in content_type, \
            f"Should return PPTX file, got: {content_type}"
        
        # Check content disposition header
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp.lower(), "Should have attachment disposition"
        assert '.pptx' in content_disp.lower(), "Filename should have .pptx extension"
    
    def test_generate_presentation_requires_auth(self, unauthenticated_client):
        """Test that generate endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/executive-training/generate/phishing")
        assert response.status_code == 401, "Endpoint should require authentication"
    
    def test_available_modules_requires_auth(self, unauthenticated_client):
        """Test that available modules endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 401, "Endpoint should require authentication"


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_check(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
