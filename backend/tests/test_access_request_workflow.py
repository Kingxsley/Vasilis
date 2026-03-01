"""
Test Access Request Workflow - Iteration 15
Tests for the new access request workflow features:
- POST /api/inquiries/{id}/approve - Create user from access request
- POST /api/inquiries/{id}/assign - Assign to admin
- POST /api/inquiries/{id}/resolve - Mark as resolved
- PATCH /api/inquiries/{id} with status=rejected - Reject request
- GET /api/inquiries/admins/list - Get list of admins
- DELETE /api/inquiries/{id} - Delete request
"""

import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@admin.com"
ADMIN_PASSWORD = "TestAdmin123!"


@pytest.fixture
def authenticated_client():
    """Get authenticated session with admin credentials"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="function")
def test_inquiry(authenticated_client):
    """Create a test inquiry for testing workflows - fresh for each test"""
    unique_id = uuid.uuid4().hex[:8]
    
    # Create inquiry via public endpoint
    response = requests.post(f"{BASE_URL}/api/inquiries", json={
        "name": f"TEST_User_{unique_id}",
        "email": f"test_{unique_id}@example.com",
        "phone": "1234567890",
        "organization": f"TEST_Org_{unique_id}",
        "message": "This is a test inquiry for workflow testing"
    })
    
    if response.status_code == 200:
        inquiry_id = response.json().get("inquiry_id")
        yield inquiry_id
        
        # Cleanup - delete inquiry after test
        try:
            authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")
        except:
            pass
    else:
        pytest.skip("Failed to create test inquiry")


class TestInquiriesEndpointsExist:
    """Test that all required endpoints exist and respond correctly"""
    
    def test_list_inquiries_endpoint_exists(self, authenticated_client):
        """Test GET /api/inquiries returns list of inquiries"""
        response = authenticated_client.get(f"{BASE_URL}/api/inquiries")
        assert response.status_code == 200
        data = response.json()
        assert "inquiries" in data
        assert isinstance(data["inquiries"], list)
        assert "total" in data
    
    def test_admins_list_endpoint_exists(self, authenticated_client):
        """Test GET /api/inquiries/admins/list returns list of admins"""
        response = authenticated_client.get(f"{BASE_URL}/api/inquiries/admins/list")
        assert response.status_code == 200
        data = response.json()
        assert "admins" in data
        assert isinstance(data["admins"], list)
        # Should have at least the test admin
        if len(data["admins"]) > 0:
            admin = data["admins"][0]
            assert "user_id" in admin
            assert "email" in admin
            assert "role" in admin
    
    def test_inquiry_stats_endpoint_exists(self, authenticated_client):
        """Test GET /api/inquiries/stats returns statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/inquiries/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data


class TestApproveWorkflow:
    """Test Approve & Create User workflow"""
    
    def test_approve_creates_user_account(self, authenticated_client, test_inquiry):
        """Test POST /api/inquiries/{id}/approve creates user account"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/approve",
            json={
                "role": "trainee",
                "organization_id": "",
                "send_welcome_email": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "temp_password" in data or data.get("welcome_email_sent") == True
        
        # Cleanup - delete created user
        user_id = data.get("user_id")
        if user_id:
            try:
                authenticated_client.delete(f"{BASE_URL}/api/users/{user_id}")
            except:
                pass
    
    def test_approve_rejects_already_approved(self, authenticated_client, test_inquiry):
        """Test cannot approve already approved request"""
        # First approval
        response1 = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/approve",
            json={
                "role": "trainee",
                "send_welcome_email": False
            }
        )
        assert response1.status_code == 200
        user_id = response1.json().get("user_id")
        
        # Second approval should fail
        response2 = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/approve",
            json={
                "role": "trainee",
                "send_welcome_email": False
            }
        )
        assert response2.status_code == 400
        assert "already" in response2.json().get("detail", "").lower()
        
        # Cleanup
        if user_id:
            try:
                authenticated_client.delete(f"{BASE_URL}/api/users/{user_id}")
            except:
                pass
    
    def test_approve_validates_role(self, authenticated_client, test_inquiry):
        """Test approve endpoint validates role parameter"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/approve",
            json={
                "role": "invalid_role",
                "send_welcome_email": False
            }
        )
        assert response.status_code == 400
        assert "role" in response.json().get("detail", "").lower() or "invalid" in response.json().get("detail", "").lower()


class TestAssignWorkflow:
    """Test Assign to Admin workflow"""
    
    def test_assign_to_admin(self, authenticated_client, test_inquiry):
        """Test POST /api/inquiries/{id}/assign assigns request to admin"""
        # Get list of admins first
        admins_response = authenticated_client.get(f"{BASE_URL}/api/inquiries/admins/list")
        assert admins_response.status_code == 200
        admins = admins_response.json().get("admins", [])
        
        if len(admins) == 0:
            pytest.skip("No admins available for assignment test")
        
        admin_id = admins[0]["user_id"]
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/assign",
            json={"admin_id": admin_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "assigned_to" in data
        assert data["assigned_to"]["user_id"] == admin_id
    
    def test_assign_validates_admin_id(self, authenticated_client, test_inquiry):
        """Test assign endpoint rejects invalid admin_id"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{test_inquiry}/assign",
            json={"admin_id": "invalid_admin_123"}
        )
        assert response.status_code == 400
        assert "admin" in response.json().get("detail", "").lower() or "not found" in response.json().get("detail", "").lower()


class TestResolveWorkflow:
    """Test Resolve request workflow"""
    
    def test_resolve_marks_as_resolved(self, authenticated_client, test_inquiry):
        """Test POST /api/inquiries/{id}/resolve marks request as resolved"""
        response = authenticated_client.post(f"{BASE_URL}/api/inquiries/{test_inquiry}/resolve")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "resolved" in data["message"].lower()
        
        # Verify status is now resolved
        get_response = authenticated_client.get(f"{BASE_URL}/api/inquiries/{test_inquiry}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "resolved"
    
    def test_resolve_nonexistent_inquiry(self, authenticated_client):
        """Test resolve returns 404 for nonexistent inquiry"""
        response = authenticated_client.post(f"{BASE_URL}/api/inquiries/nonexistent_123/resolve")
        assert response.status_code == 404


class TestRejectWorkflow:
    """Test Reject request workflow"""
    
    def test_reject_updates_status(self, authenticated_client, test_inquiry):
        """Test PATCH /api/inquiries/{id} with status=rejected"""
        response = authenticated_client.patch(
            f"{BASE_URL}/api/inquiries/{test_inquiry}",
            json={"status": "rejected"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"
        
        # Verify status is now rejected
        get_response = authenticated_client.get(f"{BASE_URL}/api/inquiries/{test_inquiry}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "rejected"
    
    def test_update_validates_status(self, authenticated_client, test_inquiry):
        """Test update endpoint validates status parameter"""
        response = authenticated_client.patch(
            f"{BASE_URL}/api/inquiries/{test_inquiry}",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400
        assert "status" in response.json().get("detail", "").lower() or "invalid" in response.json().get("detail", "").lower()


class TestDeleteWorkflow:
    """Test Delete request workflow"""
    
    def test_delete_inquiry(self, authenticated_client):
        """Test DELETE /api/inquiries/{id} deletes inquiry"""
        # Create a new inquiry to delete
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/api/inquiries", json={
            "name": f"TEST_Delete_{unique_id}",
            "email": f"test_delete_{unique_id}@example.com",
            "message": "Test inquiry to be deleted"
        })
        assert create_response.status_code == 200
        inquiry_id = create_response.json()["inquiry_id"]
        
        # Delete the inquiry
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = authenticated_client.get(f"{BASE_URL}/api/inquiries/{inquiry_id}")
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_returns_404(self, authenticated_client):
        """Test delete returns 404 for nonexistent inquiry"""
        response = authenticated_client.delete(f"{BASE_URL}/api/inquiries/nonexistent_999")
        assert response.status_code == 404


class TestCreateInquiry:
    """Test public inquiry creation"""
    
    def test_create_inquiry_public_endpoint(self):
        """Test POST /api/inquiries creates inquiry without auth"""
        unique_id = uuid.uuid4().hex[:8]
        response = requests.post(f"{BASE_URL}/api/inquiries", json={
            "name": f"TEST_Public_{unique_id}",
            "email": f"test_public_{unique_id}@example.com",
            "phone": "1234567890",
            "organization": "Test Org",
            "message": "Test message for public inquiry creation"
        })
        assert response.status_code == 200
        data = response.json()
        assert "inquiry_id" in data
        assert "message" in data
    
    def test_create_inquiry_validates_email(self):
        """Test inquiry creation validates email format"""
        response = requests.post(f"{BASE_URL}/api/inquiries", json={
            "name": "Test User",
            "email": "invalid-email",
            "message": "Test message"
        })
        assert response.status_code == 422  # Pydantic validation error
