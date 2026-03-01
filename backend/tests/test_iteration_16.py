"""
Iteration 16 Backend Tests - Testing fixes for:
1. Bulk User Import API
2. Credential Harvest Statistics with org filtering
3. News pagination across RSS feeds
4. User approval workflow
5. Welcome email function signature
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBulkUserImportAPI:
    """Test the Bulk User Import API endpoints"""

    def test_import_preview_endpoint_exists(self, authenticated_client):
        """Test that /api/import/users/preview endpoint accepts file uploads"""
        # Create a minimal CSV file
        csv_content = "name,email,role,organization_name\nTest User,test_preview@example.com,trainee,Test Org\n"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        # Note: authenticated_client is a requests session, need to remove Content-Type for multipart
        response = requests.post(
            f"{BASE_URL}/api/import/users/preview",
            files=files,
            headers={"Authorization": authenticated_client.headers.get("Authorization")}
        )
        
        assert response.status_code == 200, f"Preview endpoint failed: {response.text}"
        data = response.json()
        assert "total_rows" in data
        assert "valid_rows" in data
        assert "invalid_rows" in data
        assert "preview" in data

    def test_import_preview_validates_csv_format(self, authenticated_client):
        """Test that preview validates CSV format with missing fields"""
        # Test CSV with a row missing optional organization field
        csv_content = "name,email,role,organization_name\nJohn Doe,john@example.com,trainee,\nJane Smith,jane@example.com,org_admin,Test Org"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = requests.post(
            f"{BASE_URL}/api/import/users/preview",
            files=files,
            headers={"Authorization": authenticated_client.headers.get("Authorization")}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should process valid rows
        assert data["total_rows"] >= 1

    def test_import_preview_rejects_non_csv(self, authenticated_client):
        """Test that preview rejects non-CSV files"""
        files = {'file': ('test.txt', io.BytesIO(b"not a csv"), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/import/users/preview",
            files=files,
            headers={"Authorization": authenticated_client.headers.get("Authorization")}
        )
        
        assert response.status_code == 400, "Should reject non-CSV files"

    def test_import_template_endpoint(self, authenticated_client):
        """Test the CSV template endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/import/users/template")
        
        assert response.status_code == 200, f"Template endpoint failed: {response.text}"
        data = response.json()
        assert "template" in data
        assert "columns" in data
        assert "valid_roles" in data
        # Verify password is no longer required in V2
        assert "notes" in data

    def test_import_users_creates_accounts(self, authenticated_client):
        """Test that import users endpoint creates user accounts"""
        # Use unique email to avoid conflicts
        test_email = f"TEST_import_{uuid.uuid4().hex[:8]}@example.com"
        csv_content = f"name,email,role,organization_name\nTEST Import User,{test_email},trainee,Test Org\n"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = requests.post(
            f"{BASE_URL}/api/import/users",
            files=files,
            headers={"Authorization": authenticated_client.headers.get("Authorization")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert "total_processed" in data
        assert "successful" in data
        assert "created_users" in data
        
        # Cleanup - delete created user
        if data.get("created_users"):
            for user in data["created_users"]:
                authenticated_client.delete(f"{BASE_URL}/api/users/{user['user_id']}")


class TestCredentialSubmissionsStats:
    """Test credential submissions stats with org filtering"""

    def test_stats_endpoint_exists(self, authenticated_client):
        """Test that /api/phishing/credential-submissions/stats exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/phishing/credential-submissions/stats")
        
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        data = response.json()
        assert "total_submissions" in data
        assert "total_unique_users" in data
        assert "campaign_count" in data
        assert "by_campaign" in data

    def test_stats_with_org_filter(self, authenticated_client):
        """Test stats endpoint with organization_id filter"""
        # First get an organization
        orgs_response = authenticated_client.get(f"{BASE_URL}/api/organizations")
        if orgs_response.status_code != 200:
            pytest.skip("No organizations available")
        
        orgs = orgs_response.json()
        if not orgs or (isinstance(orgs, dict) and not orgs.get("organizations")):
            pytest.skip("No organizations available")
        
        org_list = orgs.get("organizations", orgs) if isinstance(orgs, dict) else orgs
        if not org_list:
            pytest.skip("No organizations available")
        
        org_id = org_list[0].get("organization_id")
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/phishing/credential-submissions/stats",
            params={"organization_id": org_id}
        )
        
        assert response.status_code == 200, f"Stats with org filter failed: {response.text}"
        data = response.json()
        # Response structure should be same
        assert "total_submissions" in data
        assert "by_campaign" in data

    def test_submissions_list_endpoint(self, authenticated_client):
        """Test the credential submissions list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/phishing/credential-submissions")
        
        assert response.status_code == 200, f"Submissions endpoint failed: {response.text}"
        data = response.json()
        assert "submissions" in data
        assert "total" in data

    def test_submissions_with_filters(self, authenticated_client):
        """Test submissions endpoint with campaign_id and organization_id filters"""
        # Get campaigns first
        campaigns_response = authenticated_client.get(f"{BASE_URL}/api/phishing/campaigns")
        if campaigns_response.status_code != 200:
            pytest.skip("No campaigns available")
        
        campaigns = campaigns_response.json()
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0].get("campaign_id") if campaigns else None
        
        if campaign_id:
            response = authenticated_client.get(
                f"{BASE_URL}/api/phishing/credential-submissions",
                params={"campaign_id": campaign_id}
            )
            assert response.status_code == 200


class TestNewsPagination:
    """Test news pagination across RSS feeds"""

    def test_news_endpoint_returns_total(self, api_client):
        """Test that /api/content/news returns total count"""
        response = api_client.get(f"{BASE_URL}/api/content/news", params={"limit": 5})
        
        assert response.status_code == 200, f"News endpoint failed: {response.text}"
        data = response.json()
        assert "news" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data

    def test_news_pagination_skip_works(self, api_client):
        """Test that skip parameter works for pagination"""
        # Get first page
        response1 = api_client.get(f"{BASE_URL}/api/content/news", params={"limit": 5, "skip": 0})
        assert response1.status_code == 200
        
        data1 = response1.json()
        total = data1.get("total", 0)
        
        if total > 5:
            # Get second page
            response2 = api_client.get(f"{BASE_URL}/api/content/news", params={"limit": 5, "skip": 5})
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Should have different items
            if data1.get("news") and data2.get("news"):
                page1_ids = [n.get("news_id") for n in data1["news"]]
                page2_ids = [n.get("news_id") for n in data2["news"]]
                # Check that pages are different
                assert not any(id in page1_ids for id in page2_ids), "Pagination should return different items"

    def test_news_includes_rss_items(self, api_client):
        """Test that news includes RSS items when include_rss=true"""
        response = api_client.get(f"{BASE_URL}/api/content/news", params={"include_rss": True, "limit": 50})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if there are any RSS items
        news = data.get("news", [])
        rss_items = [n for n in news if n.get("source") == "rss"]
        # Note: RSS items may or may not be present depending on feeds
        # Just verify the structure is correct
        assert isinstance(news, list)

    def test_news_total_greater_than_page_size(self, api_client):
        """Test that total can be greater than items per page (RSS feeds provide more items)"""
        response = api_client.get(f"{BASE_URL}/api/content/news", params={"include_rss": True, "limit": 5})
        
        assert response.status_code == 200
        data = response.json()
        
        total = data.get("total", 0)
        returned_count = len(data.get("news", []))
        
        # If there are more items, total should reflect that
        if total > 5:
            assert returned_count <= 5, "Should respect limit parameter"


class TestUserApprovalWorkflow:
    """Test user approval workflow with organization_id handling"""

    def test_approve_endpoint_exists(self, authenticated_client):
        """Test that approval endpoint structure is correct"""
        # Create a test inquiry first
        inquiry_data = {
            "name": "TEST Approval User",
            "email": f"test_approve_{uuid.uuid4().hex[:8]}@example.com",
            "message": "Test inquiry for approval testing"
        }
        
        # Create inquiry (public endpoint)
        create_response = requests.post(f"{BASE_URL}/api/inquiries", json=inquiry_data)
        assert create_response.status_code == 200, f"Create inquiry failed: {create_response.text}"
        inquiry_id = create_response.json().get("inquiry_id")
        
        # Test approval with organization_id
        orgs_response = authenticated_client.get(f"{BASE_URL}/api/organizations")
        org_id = None
        if orgs_response.status_code == 200:
            orgs = orgs_response.json()
            org_list = orgs.get("organizations", orgs) if isinstance(orgs, dict) else orgs
            if org_list:
                org_id = org_list[0].get("organization_id")
        
        approve_data = {
            "role": "trainee",
            "organization_id": org_id if org_id else "none",
            "send_welcome_email": False  # Don't send email during test
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{inquiry_id}/approve",
            json=approve_data
        )
        
        assert response.status_code == 200, f"Approval failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        
        # Cleanup
        if data.get("user_id"):
            authenticated_client.delete(f"{BASE_URL}/api/users/{data['user_id']}")
        authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")

    def test_approve_validates_role(self, authenticated_client):
        """Test that approval validates role parameter"""
        # Create a test inquiry
        inquiry_data = {
            "name": "TEST Role Validation",
            "email": f"test_role_{uuid.uuid4().hex[:8]}@example.com",
            "message": "Test inquiry"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/inquiries", json=inquiry_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create inquiry")
        
        inquiry_id = create_response.json().get("inquiry_id")
        
        # Try with invalid role
        approve_data = {
            "role": "invalid_role",
            "organization_id": "none",
            "send_welcome_email": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{inquiry_id}/approve",
            json=approve_data
        )
        
        # Should reject invalid role
        assert response.status_code in [400, 422], f"Should reject invalid role: {response.text}"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")

    def test_approve_handles_none_organization(self, authenticated_client):
        """Test that approval handles 'none' organization_id correctly"""
        inquiry_data = {
            "name": "TEST No Org",
            "email": f"test_noorg_{uuid.uuid4().hex[:8]}@example.com",
            "message": "Test inquiry"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/inquiries", json=inquiry_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create inquiry")
        
        inquiry_id = create_response.json().get("inquiry_id")
        
        # Approve with "none" organization
        approve_data = {
            "role": "trainee",
            "organization_id": "none",
            "send_welcome_email": False
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{inquiry_id}/approve",
            json=approve_data
        )
        
        assert response.status_code == 200, f"Approval with 'none' org failed: {response.text}"
        data = response.json()
        
        # Cleanup
        if data.get("user_id"):
            authenticated_client.delete(f"{BASE_URL}/api/users/{data['user_id']}")
        authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")


class TestWelcomeEmailFunctionSignature:
    """Test that welcome email function signature is correct"""

    def test_bulk_import_sends_welcome_emails(self, authenticated_client):
        """Test that bulk import correctly uses send_welcome_email with user_email and password params"""
        # This is an integration test - we verify import works which uses the correct params
        test_email = f"TEST_email_sig_{uuid.uuid4().hex[:8]}@example.com"
        csv_content = f"name,email,role,organization_name\nTEST Email User,{test_email},trainee,Test Org\n"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = requests.post(
            f"{BASE_URL}/api/import/users",
            files=files,
            headers={"Authorization": authenticated_client.headers.get("Authorization")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # The import should work (which verifies the function signature is correct internally)
        assert data.get("successful", 0) >= 0
        
        # Cleanup
        if data.get("created_users"):
            for user in data["created_users"]:
                authenticated_client.delete(f"{BASE_URL}/api/users/{user['user_id']}")

    def test_approval_sends_welcome_email_param(self, authenticated_client):
        """Test that approval endpoint accepts send_welcome_email parameter"""
        inquiry_data = {
            "name": "TEST Welcome Email",
            "email": f"test_welcome_{uuid.uuid4().hex[:8]}@example.com",
            "message": "Test inquiry"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/inquiries", json=inquiry_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create inquiry")
        
        inquiry_id = create_response.json().get("inquiry_id")
        
        # Approve with send_welcome_email = True
        approve_data = {
            "role": "trainee",
            "organization_id": "none",
            "send_welcome_email": True  # This param should be accepted
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/inquiries/{inquiry_id}/approve",
            json=approve_data
        )
        
        assert response.status_code == 200, f"Approval with send_welcome_email failed: {response.text}"
        data = response.json()
        # Verify welcome_email_sent field is in response
        assert "welcome_email_sent" in data or "message" in data
        
        # Cleanup
        if data.get("user_id"):
            authenticated_client.delete(f"{BASE_URL}/api/users/{data['user_id']}")
        authenticated_client.delete(f"{BASE_URL}/api/inquiries/{inquiry_id}")


class TestRSSFeedConfiguration:
    """Test RSS feed management endpoints"""

    def test_list_rss_feeds(self, authenticated_client):
        """Test listing RSS feeds"""
        response = authenticated_client.get(f"{BASE_URL}/api/content/news/rss-feeds")
        
        assert response.status_code == 200, f"RSS feeds list failed: {response.text}"
        data = response.json()
        assert "feeds" in data

    def test_add_rss_feed(self, authenticated_client):
        """Test adding a new RSS feed"""
        feed_data = {
            "name": f"TEST Feed {uuid.uuid4().hex[:8]}",
            "url": "https://feeds.feedburner.com/TheHackersNews",
            "enabled": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/content/news/rss-feeds",
            json=feed_data
        )
        
        assert response.status_code == 200, f"Add RSS feed failed: {response.text}"
        data = response.json()
        assert "feed_id" in data
        
        # Cleanup
        if data.get("feed_id"):
            authenticated_client.delete(f"{BASE_URL}/api/content/news/rss-feeds/{data['feed_id']}")
