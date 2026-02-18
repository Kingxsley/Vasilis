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

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://threat-simulator-5.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@netshield.com"
TEST_PASSWORD = "AdminTest123!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test API health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["token"]


class TestForgotPassword:
    """Test forgot password flow"""
    
    def test_forgot_password_request(self):
        """Test forgot password request endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_EMAIL
        })
        # Should return 200 even for unknown emails (security best practice)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password request: {data}")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with nonexistent email (should still return 200)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        # Security best practice: don't reveal if email exists
        assert response.status_code == 200
        print("✓ Forgot password correctly handles nonexistent email")
    
    def test_verify_reset_token_invalid(self):
        """Test verify reset token with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/invalid_token_123")
        # Should return 200 with valid=false or 400/404
        assert response.status_code in [200, 400, 404]
        print(f"✓ Invalid token verification handled: {response.status_code}")


class TestEmailTemplates:
    """Test email templates management"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth failed")
    
    def test_get_email_templates(self, auth_token):
        """Test fetching all email templates"""
        response = requests.get(f"{BASE_URL}/api/email-templates", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        # Should have 4 default templates
        expected_templates = ["welcome", "password_reset", "forgot_password", "password_expiry_reminder"]
        for t in expected_templates:
            assert t in templates, f"Missing template: {t}"
            assert "subject" in templates[t]
            assert "body" in templates[t]
            assert "description" in templates[t]
        
        print(f"✓ Email templates fetched: {list(templates.keys())}")
    
    def test_get_single_template(self, auth_token):
        """Test fetching a single email template"""
        response = requests.get(f"{BASE_URL}/api/email-templates/welcome", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "template_id" in data
        assert "subject" in data
        assert "body" in data
        assert "available_variables" in data
        print(f"✓ Single template fetched with variables: {data.get('available_variables')}")
    
    def test_preview_email_template(self, auth_token):
        """Test email template preview with sample data"""
        response = requests.post(f"{BASE_URL}/api/email-templates/welcome/preview", 
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert "subject" in data
        assert "body" in data
        # Preview should have variables replaced
        assert "{user_name}" not in data["body"]
        print("✓ Email template preview generated with sample data")
    
    def test_update_email_template(self, auth_token):
        """Test updating an email template"""
        new_subject = "TEST - Welcome to {company_name}"
        response = requests.put(f"{BASE_URL}/api/email-templates/welcome", 
            json={"subject": new_subject},
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/email-templates/welcome", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert get_response.status_code == 200
        assert get_response.json()["is_customized"] == True
        print("✓ Email template updated and verified")
        
        # Reset to default
        reset_response = requests.post(f"{BASE_URL}/api/email-templates/welcome/reset",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert reset_response.status_code == 200
        print("✓ Email template reset to default")
    
    def test_template_not_found(self, auth_token):
        """Test fetching nonexistent template"""
        response = requests.get(f"{BASE_URL}/api/email-templates/nonexistent", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 404
        print("✓ Nonexistent template returns 404")


class TestPasswordPolicy:
    """Test password policy settings"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth failed")
    
    def test_get_password_policy(self, auth_token):
        """Test fetching password policy settings"""
        response = requests.get(f"{BASE_URL}/api/settings/password-policy", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "password_expiry_days" in data
        assert "expiry_reminder_days" in data
        print(f"✓ Password policy fetched: {data}")
    
    def test_update_password_policy(self, auth_token):
        """Test updating password policy"""
        response = requests.patch(f"{BASE_URL}/api/settings/password-policy", 
            json={"password_expiry_days": 90, "expiry_reminder_days": 7},
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/settings/password-policy", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["password_expiry_days"] == 90
        print("✓ Password policy updated and verified")


class TestSecurityDashboard:
    """Test security dashboard endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Auth failed")
    
    def test_security_dashboard(self, auth_token):
        """Test security dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/dashboard", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        summary = data["summary"]
        assert "successful_logins_24h" in summary
        assert "failed_logins_24h" in summary
        assert "account_lockouts_24h" in summary
        assert "password_resets_24h" in summary
        assert "active_lockouts" in summary
        print(f"✓ Security dashboard: {summary}")
    
    def test_audit_logs(self, auth_token):
        """Test audit logs endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?limit=10", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✓ Audit logs fetched: {data['total']} total, {len(data['logs'])} returned")
    
    def test_audit_logs_filter_by_action(self, auth_token):
        """Test audit logs filtering by action"""
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?action=login_success&limit=5", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        # All returned logs should have action=login_success
        for log in data["logs"]:
            assert log["action"] == "login_success"
        print(f"✓ Audit logs filtered by action: {len(data['logs'])} logs")
    
    def test_login_history(self, auth_token):
        """Test login history endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/login-history?days=7", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        print(f"✓ Login history: {len(data['history'])} days of data")
    
    def test_rate_limit_status(self, auth_token):
        """Test rate limit status endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/rate-limit-status", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data
        assert "account_lockout" in data
        print(f"✓ Rate limit status: {data}")


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
