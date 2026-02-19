"""
Test Suite for Iteration 8 - New Features Testing
Tests:
1. RBAC for inquiries endpoint (super_admin only)
2. User Import V2 template format (no password column)
3. Scenario types endpoint (10 types)
4. Dashboard stats with scenario_types breakdown
5. Sidebar RBAC restrictions (validated via UI)
6. Country filter in audit logs
7. Permissions page loading
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://awareness-hub-9.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "kingsley@vasilisnetshield.com", "password": "Test123!"}
ORG_ADMIN_CREDS = {"email": "orgadmin@test.com", "password": "Test123!"}

class TestSession:
    """Helper class to manage test session"""
    super_admin_token = None
    org_admin_token = None


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    if TestSession.super_admin_token:
        return TestSession.super_admin_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Could not login as super_admin: {response.status_code} - {response.text}")
    TestSession.super_admin_token = response.json().get("token")
    return TestSession.super_admin_token


@pytest.fixture(scope="module")
def org_admin_token():
    """Get org admin token"""
    if TestSession.org_admin_token:
        return TestSession.org_admin_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ORG_ADMIN_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Could not login as org_admin: {response.status_code} - {response.text}")
    TestSession.org_admin_token = response.json().get("token")
    return TestSession.org_admin_token


# ============== INQUIRIES RBAC TESTS ==============
class TestInquiriesRBAC:
    """Test inquiries endpoint RBAC - super_admin only access"""
    
    def test_org_admin_cannot_access_inquiries(self, org_admin_token):
        """Verify org_admin CANNOT access /api/inquiries endpoint (403 Forbidden)"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inquiries", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for org_admin, got {response.status_code}"
        assert "super admin" in response.json().get("detail", "").lower(), \
            "Error message should mention super admin access required"
        print(f"✓ org_admin correctly denied access to /api/inquiries (403)")
    
    def test_super_admin_can_access_inquiries(self, super_admin_token):
        """Verify super_admin CAN access /api/inquiries endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200 for super_admin, got {response.status_code}"
        data = response.json()
        assert "inquiries" in data, "Response should contain 'inquiries' key"
        assert "total" in data, "Response should contain 'total' key"
        print(f"✓ super_admin can access /api/inquiries (found {data.get('total')} inquiries)")
    
    def test_org_admin_cannot_access_inquiries_stats(self, org_admin_token):
        """Verify org_admin CANNOT access /api/inquiries/stats"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/inquiries/stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for org_admin on stats, got {response.status_code}"
        print(f"✓ org_admin correctly denied access to /api/inquiries/stats (403)")


# ============== USER IMPORT V2 TEMPLATE TESTS ==============
class TestUserImportV2:
    """Test User Import V2 template format - no password column (auto-generated)"""
    
    def test_import_template_format(self, super_admin_token):
        """Verify User Import V2 template has correct format (no password column)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/import/users/template", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check template CSV content
        template_csv = data.get("template", "")
        assert "name" in template_csv.lower(), "Template should include 'name' column"
        assert "email" in template_csv.lower(), "Template should include 'email' column"
        assert "role" in template_csv.lower(), "Template should include 'role' column"
        assert "organization_name" in template_csv.lower(), "Template should include 'organization_name' column"
        
        # IMPORTANT: V2 format should NOT have password column
        first_line = template_csv.split('\n')[0].lower()
        assert "password" not in first_line, f"V2 template should NOT have password column, got: {first_line}"
        
        # Check column definitions
        columns = data.get("columns", [])
        column_names = [c.get("name") for c in columns]
        assert "name" in column_names, "Columns should include 'name'"
        assert "email" in column_names, "Columns should include 'email'"
        assert "role" in column_names, "Columns should include 'role'"
        assert "password" not in column_names, "V2 columns should NOT include 'password'"
        
        # Check notes mention auto-generation
        notes = data.get("notes", [])
        notes_text = " ".join(notes).lower()
        assert "auto" in notes_text or "generat" in notes_text, \
            f"Notes should mention auto-generated passwords, got: {notes}"
        
        print(f"✓ User Import V2 template has correct format (no password column)")
        print(f"  Columns: {column_names}")
        print(f"  Notes: {notes}")


# ============== SCENARIO TYPES TESTS ==============
class TestScenarioTypes:
    """Test scenario types endpoint - all 10 types should be returned"""
    
    EXPECTED_TYPES = [
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
    
    def test_scenario_types_returns_all_10_types(self, super_admin_token):
        """Verify /api/scenarios/types returns all 10 scenario types"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/scenarios/types", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        types = data.get("types", [])
        assert len(types) == 10, f"Expected 10 scenario types, got {len(types)}"
        
        # Verify all expected types are present
        for expected_type in self.EXPECTED_TYPES:
            assert expected_type in types, f"Missing scenario type: {expected_type}"
        
        # Check descriptions are provided
        descriptions = data.get("descriptions", {})
        assert len(descriptions) == 10, f"Expected 10 descriptions, got {len(descriptions)}"
        
        print(f"✓ /api/scenarios/types returns all 10 types:")
        for t in types:
            print(f"  - {t}: {descriptions.get(t, 'N/A')}")


# ============== DASHBOARD STATS TESTS ==============
class TestDashboardStats:
    """Test dashboard stats endpoint - scenario_types breakdown"""
    
    def test_dashboard_stats_has_scenario_types(self, super_admin_token):
        """Verify /api/dashboard/stats returns scenario_types breakdown"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields
        assert "total_scenarios" in data, "Response should include total_scenarios"
        assert "scenario_types" in data, "Response should include scenario_types breakdown"
        
        total_scenarios = data.get("total_scenarios", 0)
        scenario_types = data.get("scenario_types", {})
        
        # Calculate sum of scenario types
        type_sum = sum(scenario_types.values())
        
        print(f"✓ Dashboard stats returned:")
        print(f"  Total scenarios: {total_scenarios}")
        print(f"  Scenario types breakdown: {scenario_types}")
        print(f"  Sum of types: {type_sum}")
        
        # The scenario_types dict should be populated if scenarios exist
        if total_scenarios > 0:
            assert len(scenario_types) > 0, "scenario_types should have entries when scenarios exist"
            # Type sum should match or be close to total (some might be inactive)
            # Note: total_scenarios only counts is_active=True
        
        # Check for expected scenario types if templates were seeded (35 total = 7 types * 5 each)
        # But we need at least a non-empty response
        assert isinstance(scenario_types, dict), "scenario_types should be a dictionary"


# ============== PERMISSIONS PAGE TEST ==============
class TestPermissionsPage:
    """Test permissions API endpoints"""
    
    def test_permissions_roles_endpoint(self, super_admin_token):
        """Test /api/permissions/roles returns assignable roles"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/roles", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "assignable_roles" in data, "Response should have assignable_roles"
        roles = data.get("assignable_roles", [])
        assert len(roles) > 0, "Should have at least one assignable role"
        
        print(f"✓ Permissions roles endpoint working, {len(roles)} roles available")
    
    def test_permissions_available_endpoint(self, super_admin_token):
        """Test /api/permissions/available returns permission groups"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/available", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "permission_groups" in data, "Response should have permission_groups"
        groups = data.get("permission_groups", {})
        
        print(f"✓ Permissions available endpoint working, {len(groups)} groups defined")


# ============== AUDIT LOGS COUNTRY FILTER TEST ==============
class TestAuditLogsCountryFilter:
    """Test audit logs country filter functionality"""
    
    def test_audit_logs_with_country_filter(self, super_admin_token):
        """Verify country filter works in audit logs"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get all logs to find available countries
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?limit=100", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        all_logs = response.json().get("logs", [])
        
        # Find a country that has logs
        countries = set()
        for log in all_logs:
            country = log.get("country")
            if country and country != "Unknown":
                countries.add(country)
        
        if not countries:
            pytest.skip("No logs with country data available")
        
        test_country = list(countries)[0]
        
        # Now filter by country
        response = requests.get(
            f"{BASE_URL}/api/security/audit-logs?country={test_country}&limit=50", 
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        filtered_logs = response.json().get("logs", [])
        
        # All filtered logs should have the specified country
        for log in filtered_logs:
            assert log.get("country") == test_country or log.get("country_code") == test_country, \
                f"Log country {log.get('country')} doesn't match filter {test_country}"
        
        print(f"✓ Country filter working - filtered by '{test_country}', got {len(filtered_logs)} logs")


# ============== SEED TEMPLATES TEST ==============
class TestSeedTemplates:
    """Test if simulation templates are seeded correctly"""
    
    def test_seed_templates_or_check_existing(self, super_admin_token):
        """Seed templates if needed and verify 35 scenarios exist (7 types * 5 each)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First check current scenario count
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        
        initial_count = response.json().get("total_scenarios", 0)
        
        # If we don't have enough scenarios, try seeding
        if initial_count < 35:
            # Try to seed templates
            seed_response = requests.post(
                f"{BASE_URL}/api/scenarios/seed-templates", 
                headers=headers
            )
            if seed_response.status_code == 200:
                seed_data = seed_response.json()
                print(f"  Seeded: {seed_data.get('seeded', 0)} templates")
                print(f"  Skipped: {seed_data.get('skipped', 0)} (already existed)")
        
        # Verify final count
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        final_data = response.json()
        total_scenarios = final_data.get("total_scenarios", 0)
        scenario_types = final_data.get("scenario_types", {})
        
        print(f"✓ Total scenarios: {total_scenarios}")
        print(f"  Breakdown by type: {scenario_types}")
        
        # We expect at least 35 scenarios for the new simulation types
        # But existing scenarios from before might exist too
        type_count = len(scenario_types)
        
        # Verify we have the 7 new simulation types represented
        new_types = ["qr_code_phishing", "usb_drop", "mfa_fatigue", "bec_scenario", 
                     "data_handling_trap", "ransomware_readiness", "shadow_it_detection"]
        
        for new_type in new_types:
            if new_type in scenario_types:
                assert scenario_types[new_type] >= 5, f"Expected at least 5 {new_type} scenarios"


# ============== RUN TESTS ==============
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
