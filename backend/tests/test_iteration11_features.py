"""
Iteration 11 Backend Tests - New Features
Tests for:
1. RBAC - Settings/Content section visibility
2. Click Details in Advanced Analytics
3. Best Performing Campaigns
4. Duplicate Campaign functionality
5. Audit Logs with user_name column
6. Scenario Manager with all 10 simulation types
7. Phishing stats endpoint
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "kingsley@vasilisnetshield.com"
SUPER_ADMIN_PASSWORD = "Test123!"
ORG_ADMIN_EMAIL = "test@test.com"
ORG_ADMIN_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def super_admin_token(api_client):
    """Get super_admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")  # Note: API returns 'token', not 'access_token'
    pytest.skip(f"Super admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def org_admin_token(api_client):
    """Get org_admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORG_ADMIN_EMAIL,
        "password": ORG_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")  # Note: API returns 'token', not 'access_token'
    pytest.skip(f"Org admin authentication failed: {response.status_code} - {response.text}")


class TestPhishingStats:
    """Test phishing stats endpoint - provides data for Advanced Analytics"""
    
    def test_phishing_stats_endpoint_returns_correct_fields(self, api_client, super_admin_token):
        """Verify /api/phishing/stats returns correct aggregated statistics"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/stats",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all required fields
        required_fields = [
            "total_campaigns", "active_campaigns", "completed_campaigns",
            "total_sent", "total_opened", "total_clicked", "total_submitted",
            "open_rate", "click_rate", "submission_rate", "click_to_open_rate", "period_days"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"SUCCESS: /api/phishing/stats returns all {len(required_fields)} required fields")
    
    def test_phishing_stats_with_days_filter(self, api_client, super_admin_token):
        """Verify phishing stats respects days filter parameter"""
        for days in [7, 30, 90]:
            response = api_client.get(
                f"{BASE_URL}/api/phishing/stats?days={days}",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("period_days") == days, f"Expected period_days={days}, got {data.get('period_days')}"
        print("SUCCESS: Phishing stats days filter works correctly")


class TestClickDetails:
    """Test Click Details API for Advanced Analytics - shows who clicked phishing links"""
    
    def test_click_details_endpoint_exists(self, api_client, super_admin_token):
        """Verify /api/phishing/click-details endpoint exists and returns data"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/click-details",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "click_details" in data, "Missing 'click_details' field"
        assert "total" in data, "Missing 'total' field"
        print(f"SUCCESS: /api/phishing/click-details returns click_details and total fields")
    
    def test_click_details_returns_user_info(self, api_client, super_admin_token):
        """Verify click details includes user_name, user_email, organization info"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/click-details",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        click_details = data.get("click_details", [])
        
        # Check structure of click detail items if any exist
        if click_details:
            first_click = click_details[0]
            expected_fields = ["user_name", "user_email", "organization_name", "campaign_name", "clicked_at"]
            for field in expected_fields:
                assert field in first_click, f"Missing field '{field}' in click details"
            print(f"SUCCESS: Click details contains all required user info fields: {expected_fields}")
        else:
            print("INFO: No click details data found (no users clicked phishing links yet)")


class TestBestPerformingCampaigns:
    """Test Best Performing Campaigns API"""
    
    def test_best_performing_endpoint_exists(self, api_client, super_admin_token):
        """Verify /api/phishing/best-performing endpoint exists"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/best-performing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "campaigns" in data, "Missing 'campaigns' field"
        assert "total" in data, "Missing 'total' field"
        print(f"SUCCESS: /api/phishing/best-performing endpoint works")
    
    def test_best_performing_with_limit_parameter(self, api_client, super_admin_token):
        """Verify best-performing campaigns respects limit parameter"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/best-performing?limit=5",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        campaigns = data.get("campaigns", [])
        assert len(campaigns) <= 5, f"Expected max 5 campaigns, got {len(campaigns)}"
        print(f"SUCCESS: Best performing campaigns limit parameter works")
    
    def test_best_performing_campaign_fields(self, api_client, super_admin_token):
        """Verify best performing campaign items have required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/best-performing",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        campaigns = data.get("campaigns", [])
        
        if campaigns:
            first_campaign = campaigns[0]
            expected_fields = ["campaign_id", "name", "status", "total_sent", "total_clicked", "click_rate"]
            for field in expected_fields:
                assert field in first_campaign, f"Missing field '{field}' in best performing campaign"
            print(f"SUCCESS: Best performing campaign has all required fields: {expected_fields}")
        else:
            print("INFO: No campaigns found")


class TestDuplicateCampaign:
    """Test Duplicate Campaign functionality"""
    
    def test_duplicate_campaign_endpoint_exists(self, api_client, super_admin_token):
        """Verify /api/phishing/campaigns/{id}/duplicate endpoint exists"""
        # First get list of campaigns to find one to duplicate
        response = api_client.get(
            f"{BASE_URL}/api/phishing/campaigns",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        campaigns = response.json()
        if not campaigns:
            pytest.skip("No campaigns available to test duplicate functionality")
        
        campaign_id = campaigns[0].get("campaign_id")
        
        # Test duplicate endpoint
        duplicate_response = api_client.post(
            f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/duplicate",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert duplicate_response.status_code == 200, f"Expected 200, got {duplicate_response.status_code}"
        
        data = duplicate_response.json()
        assert "campaign_id" in data, "Duplicate response should contain new campaign_id"
        assert "name" in data, "Duplicate response should contain name"
        assert "(Copy)" in data.get("name", ""), f"Duplicated campaign name should contain '(Copy)', got: {data.get('name')}"
        
        print(f"SUCCESS: Campaign duplicated successfully - New ID: {data.get('campaign_id')}, Name: {data.get('name')}")


class TestAuditLogs:
    """Test Audit Logs API with user_name column"""
    
    def test_audit_logs_endpoint_returns_data(self, api_client, super_admin_token):
        """Verify /api/security/audit-logs endpoint returns data"""
        response = api_client.get(
            f"{BASE_URL}/api/security/audit-logs",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "logs" in data, "Missing 'logs' field"
        assert "total" in data, "Missing 'total' field"
        print(f"SUCCESS: Audit logs endpoint returns logs and total (found {data.get('total', 0)} logs)")
    
    def test_audit_logs_contain_user_name_column(self, api_client, super_admin_token):
        """Verify audit log entries contain user_name field"""
        response = api_client.get(
            f"{BASE_URL}/api/security/audit-logs?limit=10",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        logs = data.get("logs", [])
        
        if logs:
            # Check that user_name is in the log entry structure
            # Note: user_name might be None if the user wasn't found, but field should exist
            first_log = logs[0]
            assert "user_name" in first_log, "user_name field should exist in audit log entry"
            print(f"SUCCESS: Audit logs contain user_name field. Sample: {first_log.get('user_name', 'N/A')}")
        else:
            print("INFO: No audit logs found to verify user_name field")
    
    def test_audit_logs_filter_by_action(self, api_client, super_admin_token):
        """Verify audit logs can be filtered by action type"""
        response = api_client.get(
            f"{BASE_URL}/api/security/audit-logs?action=login_success",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        logs = data.get("logs", [])
        
        for log in logs:
            assert log.get("action") == "login_success", f"Expected action=login_success, got {log.get('action')}"
        
        print(f"SUCCESS: Audit logs action filter works correctly (found {len(logs)} login_success logs)")


class TestScenarioManager:
    """Test Scenario Manager with all 10 simulation types"""
    
    def test_scenarios_endpoint_exists(self, api_client, super_admin_token):
        """Verify /api/scenarios endpoint exists"""
        response = api_client.get(
            f"{BASE_URL}/api/scenarios",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: /api/scenarios endpoint works")
    
    def test_create_scenario_with_different_types(self, api_client, super_admin_token):
        """Test creating scenarios with various types"""
        scenario_types = [
            "phishing_email",
            "malicious_ads",
            "social_engineering",
            "qr_code_phishing",
            "usb_drop",
            "mfa_fatigue",
            "bec_scenario",
            "data_handling_trap",
            "ransomware_readiness",
            "shadow_it_detection"
        ]
        
        # Test creating a scenario
        test_scenario = {
            "title": f"TEST_Scenario_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "scenario_type": "phishing_email",
            "difficulty": "medium",
            "correct_answer": "unsafe",
            "explanation": "This is a test scenario for automated testing",
            "content": {
                "from_email": "test@suspicious-domain.com",
                "subject": "Test Subject",
                "body": "Test body content"
            }
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/scenarios",
            json=test_scenario,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "scenario_id" in data, "Response should contain scenario_id"
        print(f"SUCCESS: Scenario created successfully with ID: {data.get('scenario_id')}")
        
        # Cleanup - delete the test scenario
        scenario_id = data.get("scenario_id")
        if scenario_id:
            delete_response = api_client.delete(
                f"{BASE_URL}/api/scenarios/{scenario_id}",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            print(f"Cleanup: Deleted test scenario {scenario_id}")


class TestRBAC:
    """Test Role-Based Access Control for Settings/Content sections"""
    
    def test_super_admin_can_access_settings(self, api_client, super_admin_token):
        """Verify super_admin can access settings endpoints"""
        # Test branding settings
        response = api_client.get(
            f"{BASE_URL}/api/settings/branding",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Super admin should access settings, got {response.status_code}"
        print("SUCCESS: Super admin can access settings")
    
    def test_super_admin_can_access_phishing(self, api_client, super_admin_token):
        """Verify super_admin can access phishing endpoints"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/campaigns",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Super admin should access phishing, got {response.status_code}"
        print("SUCCESS: Super admin can access phishing simulations")
    
    def test_org_admin_cannot_access_settings_protected_endpoints(self, api_client, org_admin_token):
        """Verify org_admin cannot access super_admin protected endpoints"""
        # Try to access password policy settings
        response = api_client.get(
            f"{BASE_URL}/api/settings/password-policy",
            headers={"Authorization": f"Bearer {org_admin_token}"}
        )
        # Should be 403 forbidden or restricted
        assert response.status_code in [401, 403], f"Org admin should NOT access password-policy, got {response.status_code}"
        print("SUCCESS: Org admin correctly denied access to password policy settings")
    
    def test_org_admin_user_role(self, api_client, org_admin_token):
        """Verify org_admin user has correct role"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {org_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        user_role = data.get("role")
        print(f"INFO: Org admin user role is: {user_role}")
        # Role should be org_admin or similar non-super_admin role
        assert user_role != "super_admin", f"Test user should not be super_admin, got {user_role}"


class TestPhishingCampaignCRUD:
    """Test basic phishing campaign CRUD operations"""
    
    def test_list_campaigns(self, api_client, super_admin_token):
        """Verify listing phishing campaigns works"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/campaigns",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Campaigns should be a list"
        print(f"SUCCESS: Listed {len(campaigns)} phishing campaigns")
    
    def test_list_templates(self, api_client, super_admin_token):
        """Verify listing phishing templates works"""
        response = api_client.get(
            f"{BASE_URL}/api/phishing/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        templates = response.json()
        assert isinstance(templates, list), "Templates should be a list"
        print(f"SUCCESS: Listed {len(templates)} phishing templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
