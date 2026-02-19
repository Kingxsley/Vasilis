"""
Test Iteration 14 - New Features Testing
- Advanced Analytics date range filter
- Users page bulk selection and delete with confirmation
- Activity Logs page (super admin only)
- Activity Logs date filtering and bulk delete
- Contact form email sending
- Phishing templates working
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser123@vasilisnetshield.com"
TEST_PASSWORD = "TestAdmin123!"


class TestAuth:
    """Authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns 'token' not 'access_token'
        assert "token" in data, f"No token in response: {data.keys()}"
        return data["token"]
    
    def test_login_success(self):
        """Test super admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"PASS: Super admin login successful - role: {data['user']['role']}")


class TestAdvancedAnalyticsDateRange:
    """Test Advanced Analytics date range filter functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_analytics_overview_with_days(self, auth_token):
        """Test analytics overview with days parameter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview?days=30", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Analytics overview with days=30 returned {response.status_code}")
    
    def test_analytics_overview_with_custom_date_range(self, auth_token):
        """Test analytics overview with custom date range"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Analytics overview with custom date range ({start_date} to {end_date}) returned {response.status_code}")
    
    def test_phishing_stats_with_date_range(self, auth_token):
        """Test phishing stats with custom date range"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/phishing/stats?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"PASS: Phishing stats with date range - total_campaigns: {data.get('total_campaigns', 0)}")
    
    def test_phishing_click_details_with_date_range(self, auth_token):
        """Test phishing click details with custom date range"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/phishing/click-details?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"PASS: Phishing click details - {len(data.get('click_details', []))} clicks in date range")


class TestUsersPageBulkDelete:
    """Test Users page bulk selection and delete with confirmation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_list_users(self, auth_token):
        """Test listing users for bulk operations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        users = response.json()
        assert isinstance(users, list), "Response should be a list of users"
        print(f"PASS: Listed {len(users)} users")
    
    def test_create_test_user_for_bulk_delete(self, auth_token):
        """Create a test user that can be deleted"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_user = {
            "name": "TEST_BulkDelete_User",
            "email": f"test_bulk_delete_{int(time.time())}@test.com",
            "password": "TestPassword123!",
            "role": "trainee"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=test_user, headers=headers)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert "user_id" in data, "User ID not returned"
        print(f"PASS: Created test user for bulk delete: {data['user_id']}")
        return data["user_id"]
    
    def test_delete_user(self, auth_token):
        """Test single user delete endpoint (used by bulk delete)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a user to delete
        test_user = {
            "name": "TEST_Delete_User",
            "email": f"test_delete_{int(time.time())}@test.com",
            "password": "TestPassword123!",
            "role": "trainee"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=test_user, headers=headers)
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        user_id = create_response.json()["user_id"]
        
        # Now delete the user
        delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert delete_response.status_code in [200, 204], f"Failed to delete: {delete_response.text}"
        print(f"PASS: Deleted user {user_id}")
        
        # Verify user is gone
        get_response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert get_response.status_code == 404, "User should not exist after delete"
        print(f"PASS: Verified user {user_id} no longer exists")


class TestActivityLogs:
    """Test Activity Logs page - super admin only"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_activity_logs_list(self, auth_token):
        """Test activity logs list endpoint - super admin only"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "logs" in data, "Response should have 'logs' key"
        assert "total" in data, "Response should have 'total' key"
        assert "pages" in data, "Response should have 'pages' key"
        print(f"PASS: Activity logs list - {data['total']} total logs, {data['pages']} pages")
    
    def test_activity_logs_with_date_filter(self, auth_token):
        """Test activity logs with date filtering"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/activity-logs?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"PASS: Activity logs date filter - {data['total']} logs in date range")
    
    def test_activity_logs_with_action_filter(self, auth_token):
        """Test activity logs with action filtering"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs?action=login", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"PASS: Activity logs action filter - {data['total']} login-related logs")
    
    def test_activity_logs_with_resource_filter(self, auth_token):
        """Test activity logs with resource type filtering"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs?resource_type=user", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"PASS: Activity logs resource filter - {data['total']} user-related logs")
    
    def test_activity_logs_stats(self, auth_token):
        """Test activity logs statistics endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs/stats?days=30", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_activities" in data, "Response should have 'total_activities'"
        assert "top_actions" in data, "Response should have 'top_actions'"
        assert "most_active_users" in data, "Response should have 'most_active_users'"
        print(f"PASS: Activity logs stats - {data['total_activities']} total activities in last 30 days")
    
    def test_activity_logs_pagination(self, auth_token):
        """Test activity logs pagination"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs?page=1&limit=10", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert len(data.get("logs", [])) <= 10, "Should return at most 10 logs"
        print(f"PASS: Activity logs pagination - page 1 with limit 10")


class TestActivityLogsBulkDelete:
    """Test Activity Logs bulk delete functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_bulk_delete_activity_logs(self, auth_token):
        """Test bulk delete of activity logs"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get some activity log IDs
        list_response = requests.get(f"{BASE_URL}/api/activity-logs?limit=5", headers=headers)
        assert list_response.status_code == 200, f"Failed to list: {list_response.text}"
        data = list_response.json()
        
        if data["total"] == 0:
            pytest.skip("No activity logs to delete")
        
        # Get activity IDs from first 2 logs (if available)
        logs = data.get("logs", [])[:2]
        if len(logs) == 0:
            pytest.skip("No activity logs available")
        
        activity_ids = [log["activity_id"] for log in logs]
        
        # Test bulk delete endpoint
        delete_response = requests.delete(
            f"{BASE_URL}/api/activity-logs",
            headers=headers,
            json={"activity_ids": activity_ids}
        )
        assert delete_response.status_code == 200, f"Failed to bulk delete: {delete_response.text}"
        result = delete_response.json()
        assert "Deleted" in result.get("message", ""), "Should confirm deletion"
        print(f"PASS: Bulk deleted activity logs - {result.get('message')}")


class TestContactFormEmail:
    """Test Contact form email sending to info@vasilisnetshield.com"""
    
    def test_contact_form_inquiry_submission(self):
        """Test contact form submission via inquiry endpoint"""
        # Contact form submissions go through POST /api/inquiries
        response = requests.post(f"{BASE_URL}/api/inquiries", json={
            "name": "Test Contact User",
            "email": "testcontact@example.com",
            "phone": "+1234567890",
            "organization": "Test Organization",
            "message": "This is a test contact form submission for iteration 14 testing."
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have success message"
        assert "inquiry_id" in data, "Response should have inquiry_id"
        print(f"PASS: Contact form submission successful - inquiry_id: {data['inquiry_id']}")
        print(f"NOTE: Email should be sent to info@vasilisnetshield.com (verify in SendGrid logs)")


class TestPhishingTemplates:
    """Test phishing templates are working"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_list_phishing_templates(self, auth_token):
        """Test listing phishing templates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/phishing/templates", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        templates = response.json()
        assert isinstance(templates, list), "Response should be a list"
        print(f"PASS: Listed {len(templates)} phishing templates")
        
        if len(templates) > 0:
            template = templates[0]
            print(f"  Sample template: {template.get('name', 'N/A')} - category: {template.get('category', 'N/A')}")
    
    def test_list_campaigns_with_templates(self, auth_token):
        """Test listing campaigns to verify templates are being used"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        campaigns = response.json()
        print(f"PASS: Listed {len(campaigns)} phishing campaigns")
        
        for campaign in campaigns[:3]:  # Check first 3
            print(f"  Campaign: {campaign.get('name', 'N/A')} - status: {campaign.get('status', 'N/A')}, targets: {campaign.get('total_targets', 0)}")
    
    def test_campaign_stats(self, auth_token):
        """Test campaign statistics including email sending"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/phishing/stats", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        stats = response.json()
        print(f"PASS: Phishing stats - total_campaigns: {stats.get('total_campaigns', 0)}, total_sent: {stats.get('total_sent', 0)}")


class TestActivityLogsAccessControl:
    """Test that Activity Logs is super admin only"""
    
    def test_activity_logs_requires_super_admin(self):
        """Test that non-super-admin cannot access activity logs"""
        # First, create a trainee user
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create trainee user
        trainee_email = f"test_trainee_{int(time.time())}@test.com"
        trainee_password = "TestTrainee123!"
        
        create_response = requests.post(f"{BASE_URL}/api/users", json={
            "name": "Test Trainee",
            "email": trainee_email,
            "password": trainee_password,
            "role": "trainee"
        }, headers=admin_headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create trainee user for access control test")
        
        trainee_user_id = create_response.json()["user_id"]
        
        try:
            # Login as trainee
            trainee_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": trainee_email,
                "password": trainee_password
            })
            
            if trainee_login.status_code == 200:
                trainee_token = trainee_login.json()["token"]
                trainee_headers = {"Authorization": f"Bearer {trainee_token}"}
                
                # Try to access activity logs
                logs_response = requests.get(f"{BASE_URL}/api/activity-logs", headers=trainee_headers)
                assert logs_response.status_code == 403, f"Trainee should not access activity logs, got {logs_response.status_code}"
                print(f"PASS: Activity logs correctly restricted - trainee got 403 Forbidden")
            else:
                print(f"NOTE: Could not verify trainee access - login failed")
        finally:
            # Clean up - delete trainee user
            requests.delete(f"{BASE_URL}/api/users/{trainee_user_id}", headers=admin_headers)
            print(f"CLEANUP: Deleted test trainee user")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
