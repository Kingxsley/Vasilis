"""
Backend API tests for new features:
- Forgot password flow
- Email templates management  
- Advanced analytics
- Password policy settings
- Security dashboard
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cyber-training-hub-3.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@netshield.com"
TEST_PASSWORD = "AdminTest123!"

# Module-level token cache
_auth_token = None
_token_time = 0


def get_auth_token():
    """Helper to get auth token with caching"""
    global _auth_token, _token_time
    
    # Return cached token if less than 5 minutes old
    if _auth_token and (time.time() - _token_time) < 300:
        return _auth_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        _auth_token = response.json()["token"]
        _token_time = time.time()
        return _auth_token
    elif response.status_code == 429:
        # Rate limited - wait and retry
        time.sleep(60)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            _auth_token = response.json()["token"]
            _token_time = time.time()
            return _auth_token
    return None


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test API health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        token = get_auth_token()
        assert token is not None, "Login failed"
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestForgotPassword:
    """Test forgot password flow"""
    
    def test_forgot_password_request(self):
        """Test forgot password request endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password request successful")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with nonexistent email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        assert response.status_code == 200
        print("✓ Forgot password handles nonexistent email correctly")
    
    def test_verify_reset_token_invalid(self):
        """Test verify reset token with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/invalid_token_123")
        assert response.status_code in [200, 400, 404]
        print(f"✓ Invalid token verification handled: {response.status_code}")


class TestEmailTemplates:
    """Test email templates management"""
    
    def test_get_email_templates(self):
        """Test fetching all email templates"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/email-templates", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        expected_templates = ["welcome", "password_reset", "forgot_password", "password_expiry_reminder"]
        for t in expected_templates:
            assert t in templates, f"Missing template: {t}"
            assert "subject" in templates[t]
            assert "body" in templates[t]
        
        print(f"✓ Email templates fetched: {list(templates.keys())}")
    
    def test_get_single_template(self):
        """Test fetching a single email template"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/email-templates/welcome", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "template_id" in data
        assert "subject" in data
        assert "body" in data
        assert "available_variables" in data
        print(f"✓ Single template fetched with variables")
    
    def test_preview_email_template(self):
        """Test email template preview with sample data"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.post(f"{BASE_URL}/api/email-templates/welcome/preview", 
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert "subject" in data
        assert "body" in data
        print("✓ Email template preview generated")
    
    def test_template_not_found(self):
        """Test fetching nonexistent template"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/email-templates/nonexistent", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 404
        print("✓ Nonexistent template returns 404")


class TestPasswordPolicy:
    """Test password policy settings"""
    
    def test_get_password_policy(self):
        """Test fetching password policy settings"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/settings/password-policy", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "password_expiry_days" in data
        assert "expiry_reminder_days" in data
        print(f"✓ Password policy fetched: {data}")
    
    def test_update_password_policy(self):
        """Test updating password policy"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.patch(f"{BASE_URL}/api/settings/password-policy", 
            json={"password_expiry_days": 90, "expiry_reminder_days": 7},
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/settings/password-policy", headers={
            "Authorization": f"Bearer {token}"
        })
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["password_expiry_days"] == 90
        print("✓ Password policy updated and verified")


class TestSecurityDashboard:
    """Test security dashboard endpoints"""
    
    def test_security_dashboard(self):
        """Test security dashboard endpoint"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/security/dashboard", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        summary = data["summary"]
        assert "successful_logins_24h" in summary
        assert "failed_logins_24h" in summary
        print(f"✓ Security dashboard: {summary}")
    
    def test_audit_logs(self):
        """Test audit logs endpoint"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?limit=10", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✓ Audit logs fetched: {data['total']} total")
    
    def test_login_history(self):
        """Test login history endpoint"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/security/login-history?days=7", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        print(f"✓ Login history: {len(data['history'])} days of data")
    
    def test_rate_limit_status(self):
        """Test rate limit status endpoint"""
        token = get_auth_token()
        assert token is not None, "Failed to get auth token"
        
        response = requests.get(f"{BASE_URL}/api/security/rate-limit-status", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data
        assert "account_lockout" in data
        print(f"✓ Rate limit status retrieved")


class TestBrandingSettings:
    """Test branding settings"""
    
    def test_get_branding_public(self):
        """Test getting branding settings (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/settings/branding")
        assert response.status_code == 200
        data = response.json()
        assert "company_name" in data
        print(f"✓ Branding settings: {data.get('company_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
