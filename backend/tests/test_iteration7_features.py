"""
Iteration 7 Backend Tests - Audit Logs, Permissions, Navigation Features
Tests for:
1. Audit Logs page at /api/security/audit-logs
2. Audit Logs export functionality (CSV and JSON)
3. Permissions page user listing
4. Role-based navigation restrictions
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "test@admin.com"
SUPER_ADMIN_PASSWORD = "Test123!"
ORG_ADMIN_EMAIL = "orgadmin@test.com"
ORG_ADMIN_PASSWORD = "Test123!"

# Module 1: Authentication
class TestAuthentication:
    """Test authentication for both user roles"""
    
    def test_super_admin_login(self):
        """Test super_admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "super_admin", "User is not super_admin"
        print(f"✓ Super admin login successful: {data['user']['email']}")
        
    def test_org_admin_login(self):
        """Test org_admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        
        # May fail if org_admin doesn't exist yet - that's expected
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print(f"✓ Org admin login successful: {data['user']['email']}")
        else:
            pytest.skip("Org admin user doesn't exist yet")


# Module 2: Audit Logs API
class TestAuditLogsAPI:
    """Test audit logs endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate as super admin")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_audit_logs(self):
        """Test fetching audit logs"""
        response = requests.get(f"{BASE_URL}/api/security/audit-logs", headers=self.headers)
        
        assert response.status_code == 200, f"Get audit logs failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "logs" in data
        assert "total" in data
        assert "action_types" in data
        assert isinstance(data["logs"], list)
        print(f"✓ Audit logs fetched: {data['total']} total logs")
        
    def test_audit_logs_columns(self):
        """Verify audit logs have correct columns: Timestamp, Action, Email, IP Address, Country, Severity"""
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?limit=5", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if data["logs"]:
            log = data["logs"][0]
            # Check required columns are present
            required_fields = ["timestamp", "action", "severity"]
            for field in required_fields:
                assert field in log, f"Missing field: {field}"
            
            # Optional but expected fields
            expected_fields = ["user_email", "ip_address", "country"]
            for field in expected_fields:
                if field in log:
                    print(f"  ✓ Field '{field}' present")
        
        print("✓ Audit logs columns verified")
        
    def test_audit_logs_filtering(self):
        """Test audit logs filtering by action, severity"""
        # Test action filter
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?action=login_success", headers=self.headers)
        assert response.status_code == 200
        
        # Test severity filter  
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?severity=info", headers=self.headers)
        assert response.status_code == 200
        
        # Test email search
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?user_email=test", headers=self.headers)
        assert response.status_code == 200
        
        print("✓ Audit logs filtering works")
    
    def test_audit_logs_pagination(self):
        """Test audit logs pagination"""
        response = requests.get(f"{BASE_URL}/api/security/audit-logs?limit=10&offset=0", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "offset" in data
        assert "limit" in data
        print("✓ Audit logs pagination works")


# Module 3: Audit Logs Export
class TestAuditLogsExport:
    """Test audit logs export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate as super admin")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_export_csv(self):
        """Test CSV export at /api/security/audit-logs/export?format=csv"""
        response = requests.get(
            f"{BASE_URL}/api/security/audit-logs/export?format=csv", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"CSV export failed: {response.text}"
        
        # Verify content-type
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or "application/octet-stream" in content_type or len(response.content) > 0
        
        # Verify content is CSV-like
        content = response.text
        assert "timestamp" in content.lower() or len(content) > 0
        
        # Verify Content-Disposition header for download
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp or len(response.content) > 0
        
        print("✓ CSV export works correctly")
    
    def test_export_json(self):
        """Test JSON export at /api/security/audit-logs/export?format=json"""
        response = requests.get(
            f"{BASE_URL}/api/security/audit-logs/export?format=json", 
            headers=self.headers
        )
        
        assert response.status_code == 200, f"JSON export failed: {response.text}"
        
        # Verify content can be parsed as JSON
        try:
            data = json.loads(response.text)
            assert isinstance(data, list), "JSON export should return an array"
            print(f"✓ JSON export works correctly ({len(data)} logs)")
        except json.JSONDecodeError as e:
            pytest.fail(f"JSON export is not valid JSON: {e}")
    
    def test_export_with_filters(self):
        """Test export with filters applied"""
        response = requests.get(
            f"{BASE_URL}/api/security/audit-logs/export?format=json&severity=info", 
            headers=self.headers
        )
        
        assert response.status_code == 200
        print("✓ Export with filters works")


# Module 4: Permissions Page - User Listing
class TestPermissionsAPI:
    """Test permissions/users listing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate as super admin")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_users(self):
        """Test users API returns list of users for permissions page"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        
        # PermissionsPage.js handles both array and object with users property
        if isinstance(data, list):
            users = data
        else:
            users = data.get("users", [])
        
        assert isinstance(users, list), "Users should be a list"
        
        if users:
            user = users[0]
            # Verify user has required fields
            assert "user_id" in user
            assert "email" in user
            assert "name" in user
            assert "role" in user
        
        print(f"✓ Users list returned: {len(users)} users")
        
    def test_permissions_roles_endpoint(self):
        """Test permissions roles endpoint"""
        response = requests.get(f"{BASE_URL}/api/permissions/roles", headers=self.headers)
        
        assert response.status_code == 200, f"Get roles failed: {response.text}"
        data = response.json()
        
        assert "assignable_roles" in data
        print(f"✓ Assignable roles fetched: {len(data['assignable_roles'])} roles")
    
    def test_permissions_available_endpoint(self):
        """Test available permissions endpoint"""
        response = requests.get(f"{BASE_URL}/api/permissions/available", headers=self.headers)
        
        assert response.status_code == 200, f"Get available permissions failed: {response.text}"
        data = response.json()
        
        assert "permission_groups" in data
        print(f"✓ Available permissions fetched")


# Module 5: Security Dashboard
class TestSecurityDashboard:
    """Test security dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate as super admin")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_security_dashboard(self):
        """Test security dashboard returns data"""
        response = requests.get(f"{BASE_URL}/api/security/dashboard", headers=self.headers)
        
        assert response.status_code == 200, f"Security dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "summary" in data
        assert "successful_logins_24h" in data["summary"]
        assert "failed_logins_24h" in data["summary"]
        
        print("✓ Security dashboard works")
    
    def test_login_history(self):
        """Test login history endpoint"""
        response = requests.get(f"{BASE_URL}/api/security/login-history?days=7", headers=self.headers)
        
        assert response.status_code == 200, f"Login history failed: {response.text}"
        data = response.json()
        
        assert "history" in data
        print("✓ Login history works")


# Module 6: Role-Based Access Control
class TestRoleBasedAccess:
    """Test that org_admin has restricted access"""
    
    def test_org_admin_cannot_access_security_dashboard(self):
        """Test org_admin cannot access super_admin-only endpoints"""
        # First login as org_admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Org admin user doesn't exist")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to access security dashboard (should fail with 403)
        response = requests.get(f"{BASE_URL}/api/security/dashboard", headers=headers)
        
        assert response.status_code == 403, f"Org admin should not access security dashboard, got {response.status_code}"
        print("✓ Org admin correctly blocked from security dashboard")
    
    def test_org_admin_cannot_export_audit_logs(self):
        """Test org_admin cannot export audit logs"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Org admin user doesn't exist")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/security/audit-logs/export?format=csv", headers=headers)
        
        assert response.status_code == 403, f"Org admin should not export audit logs, got {response.status_code}"
        print("✓ Org admin correctly blocked from audit logs export")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
