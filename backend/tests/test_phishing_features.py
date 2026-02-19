"""
Test suite for Phishing Landing Page and Training Failures features
Tests:
1. Phishing landing page shows proper 'Phishing Email Detected' message
2. Landing page has auto-redirect countdown to training
3. Landing page has 'Start Training Now' button
4. Training failures endpoint returns list of failures
5. Training failures stats endpoint returns stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://phishing-sim-1.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "kingsley@vasilisnetshield.com"
SUPER_ADMIN_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if res.status_code == 200:
        data = res.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {res.status_code}")


class TestPhishingLandingPage:
    """Tests for phishing landing page at /api/phishing/track/click/{code}"""
    
    def test_landing_page_returns_html(self):
        """Landing page returns HTML content"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "text/html" in res.headers.get("content-type", "")
    
    def test_landing_page_has_phishing_detected_title(self):
        """Landing page shows 'Phishing Email Detected' message"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "Phishing Email Detected" in res.text
    
    def test_landing_page_has_auto_redirect_countdown(self):
        """Landing page has auto-redirect countdown to training"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "Redirecting to training in" in res.text
        assert "let seconds = 10;" in res.text
        assert '<span id="timer">10</span>' in res.text
    
    def test_landing_page_has_start_training_button(self):
        """Landing page has 'Start Training Now' button linking to /training"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "Start Training Now" in res.text
        assert 'href="/training"' in res.text
    
    def test_landing_page_has_security_training_title(self):
        """Landing page shows 'Security Training Alert' in title"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "Security Training Alert" in res.text
    
    def test_landing_page_has_risk_information(self):
        """Landing page shows risk information about phishing"""
        res = requests.get(f"{BASE_URL}/api/phishing/track/click/test_code")
        assert res.status_code == 200
        assert "What Could Have Happened" in res.text


class TestTrainingFailuresEndpoint:
    """Tests for /api/phishing/training-failures endpoint"""
    
    def test_training_failures_requires_auth(self):
        """Training failures endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/phishing/training-failures")
        assert res.status_code in [401, 403]
    
    def test_training_failures_returns_list(self, auth_token):
        """Training failures endpoint returns list of failures"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = requests.get(f"{BASE_URL}/api/phishing/training-failures", headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        
        assert "failures" in data
        assert "total" in data
        assert "pending" in data
        assert "completed" in data
        assert isinstance(data["failures"], list)
    
    def test_training_failures_supports_pagination(self, auth_token):
        """Training failures endpoint supports skip and limit parameters"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = requests.get(f"{BASE_URL}/api/phishing/training-failures?skip=0&limit=10", headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        
        assert "skip" in data
        assert "limit" in data
        assert data["skip"] == 0
        assert data["limit"] == 10


class TestTrainingFailuresStatsEndpoint:
    """Tests for /api/phishing/training-failures/stats endpoint"""
    
    def test_training_failures_stats_requires_auth(self):
        """Training failures stats endpoint requires authentication"""
        res = requests.get(f"{BASE_URL}/api/phishing/training-failures/stats")
        assert res.status_code in [401, 403]
    
    def test_training_failures_stats_returns_aggregated_data(self, auth_token):
        """Training failures stats endpoint returns aggregated statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = requests.get(f"{BASE_URL}/api/phishing/training-failures/stats", headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        
        assert "by_scenario_type" in data
        assert "by_status" in data
        assert "recent_failures" in data
        assert "repeat_offenders" in data
        
        # Verify types
        assert isinstance(data["by_scenario_type"], dict)
        assert isinstance(data["by_status"], dict)
        assert isinstance(data["recent_failures"], int)
        assert isinstance(data["repeat_offenders"], int)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
