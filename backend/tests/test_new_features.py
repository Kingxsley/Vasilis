"""
Test Suite for New Features:
1. Export Reports (Excel/PDF) - /api/export/*
2. CSV User Import - /api/import/*
3. Malicious Ad Simulations - /api/ads/*
4. Training Certificates - /api/certificates/*
"""
import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://netshield-admin-hub.preview.emergentagent.com')

# Test Credentials
TEST_ADMIN_EMAIL = "testadmin@netshield.com"
TEST_ADMIN_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication token and return headers"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    token = response.json().get("token")
    user = response.json().get("user")
    return {"Authorization": f"Bearer {token}"}, user


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================== AUTHENTICATION ====================
class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        print(f"Login successful: user_id={data['user']['user_id']}, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


# ==================== AD TEMPLATES ====================
class TestAdTemplates:
    """Malicious Ad Templates CRUD tests"""
    
    def test_seed_default_templates(self, auth_headers):
        """Seed default ad templates"""
        headers, user = auth_headers
        response = requests.post(f"{BASE_URL}/api/ads/templates/seed-defaults", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Seed templates result: {data}")
    
    def test_list_templates(self, auth_headers):
        """List all ad templates"""
        headers, user = auth_headers
        response = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} ad templates")
        if data:
            template = data[0]
            assert "template_id" in template
            assert "name" in template
            assert "ad_type" in template
            assert "headline" in template
        return data
    
    def test_create_template(self, auth_headers):
        """Create a custom ad template"""
        headers, user = auth_headers
        template_data = {
            "name": "TEST_Custom Scam Ad",
            "ad_type": "banner",
            "headline": "You've Won $1 Million!",
            "description": "Click here to claim your prize immediately!",
            "call_to_action": "CLAIM NOW",
            "style_css": "background: red; color: white;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", json=template_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == template_data["name"]
        assert data["ad_type"] == template_data["ad_type"]
        assert "template_id" in data
        print(f"Created template: {data['template_id']}")
        return data["template_id"]
    
    def test_delete_template(self, auth_headers):
        """Delete a test template"""
        headers, user = auth_headers
        # First create one to delete
        template_data = {
            "name": "TEST_Template_To_Delete",
            "ad_type": "popup",
            "headline": "Delete Me",
            "description": "This will be deleted",
            "call_to_action": "DELETE"
        }
        create_resp = requests.post(f"{BASE_URL}/api/ads/templates", json=template_data, headers=headers)
        assert create_resp.status_code == 200
        template_id = create_resp.json()["template_id"]
        
        # Now delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/ads/templates/{template_id}", headers=headers)
        assert delete_resp.status_code == 200
        print(f"Deleted template: {template_id}")


# ==================== AD CAMPAIGNS ====================
class TestAdCampaigns:
    """Malicious Ad Campaigns tests"""
    
    @pytest.fixture
    def setup_campaign_data(self, auth_headers):
        """Get required data for campaign creation"""
        headers, user = auth_headers
        
        # Get organizations
        orgs_resp = requests.get(f"{BASE_URL}/api/organizations", headers=headers)
        orgs = orgs_resp.json() if orgs_resp.status_code == 200 else []
        
        # Get users
        users_resp = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_resp.json() if users_resp.status_code == 200 else []
        
        # Get templates
        templates_resp = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        templates = templates_resp.json() if templates_resp.status_code == 200 else []
        
        return {
            "organizations": orgs,
            "users": users,
            "templates": templates
        }
    
    def test_create_ad_campaign(self, auth_headers, setup_campaign_data):
        """Create a new ad campaign"""
        headers, user = auth_headers
        data = setup_campaign_data
        
        if not data["organizations"] or not data["templates"]:
            pytest.skip("No organizations or templates available")
        
        # Find users in the organization
        org = data["organizations"][0]
        org_users = [u for u in data["users"] if u.get("organization_id") == org["organization_id"]]
        
        if not org_users:
            # Use all users if none in org
            org_users = data["users"][:3]
        
        if not org_users:
            pytest.skip("No users available for campaign targets")
        
        campaign_data = {
            "name": "TEST_Ad_Campaign_Awareness",
            "organization_id": org["organization_id"],
            "template_id": data["templates"][0]["template_id"],
            "target_user_ids": [u["user_id"] for u in org_users[:3]]
        }
        
        response = requests.post(f"{BASE_URL}/api/ads/campaigns", json=campaign_data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "campaign_id" in result
        assert result["name"] == campaign_data["name"]
        assert result["total_targets"] == len(campaign_data["target_user_ids"])
        print(f"Created ad campaign: {result['campaign_id']} with {result['total_targets']} targets")
        return result["campaign_id"]
    
    def test_list_ad_campaigns(self, auth_headers):
        """List all ad campaigns"""
        headers, user = auth_headers
        response = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} ad campaigns")
        return data
    
    def test_get_campaign_stats(self, auth_headers):
        """Get stats for a campaign"""
        headers, user = auth_headers
        
        # Get campaigns first
        campaigns_resp = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        campaigns = campaigns_resp.json() if campaigns_resp.status_code == 200 else []
        
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.get(f"{BASE_URL}/api/ads/campaigns/{campaign_id}/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        assert "campaign_id" in stats
        assert "total_targets" in stats
        assert "ads_viewed" in stats
        assert "ads_clicked" in stats
        assert "view_rate" in stats
        assert "click_rate" in stats
        print(f"Campaign stats: views={stats['ads_viewed']}, clicks={stats['ads_clicked']}")
    
    def test_get_campaign_targets(self, auth_headers):
        """Get targets for a campaign"""
        headers, user = auth_headers
        
        campaigns_resp = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        campaigns = campaigns_resp.json() if campaigns_resp.status_code == 200 else []
        
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0]["campaign_id"]
        response = requests.get(f"{BASE_URL}/api/ads/campaigns/{campaign_id}/targets", headers=headers)
        assert response.status_code == 200
        targets = response.json()
        assert isinstance(targets, list)
        if targets:
            target = targets[0]
            assert "target_id" in target
            assert "tracking_code" in target
            assert "user_email" in target
        print(f"Campaign has {len(targets)} targets")


# ==================== AD TRACKING ====================
class TestAdTracking:
    """Ad tracking endpoints (public)"""
    
    def test_ad_click_tracking(self, auth_headers):
        """Test ad click tracking endpoint"""
        headers, user = auth_headers
        
        # Get a campaign with targets
        campaigns_resp = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        campaigns = campaigns_resp.json() if campaigns_resp.status_code == 200 else []
        
        if not campaigns:
            pytest.skip("No campaigns available")
        
        campaign_id = campaigns[0]["campaign_id"]
        targets_resp = requests.get(f"{BASE_URL}/api/ads/campaigns/{campaign_id}/targets", headers=headers)
        targets = targets_resp.json() if targets_resp.status_code == 200 else []
        
        if not targets:
            pytest.skip("No targets in campaign")
        
        tracking_code = targets[0]["tracking_code"]
        
        # Test click tracking (public endpoint - no auth needed)
        response = requests.get(f"{BASE_URL}/api/ads/track/click/{tracking_code}")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "Security Training" in response.text
        print(f"Click tracking works - shows awareness page")


# ==================== USER IMPORT ====================
class TestUserImport:
    """CSV User Import tests"""
    
    def test_get_import_template(self, auth_headers):
        """Download CSV import template"""
        headers, user = auth_headers
        response = requests.get(f"{BASE_URL}/api/import/users/template", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "template" in data
        assert "columns" in data
        assert "valid_roles" in data
        
        # Verify template content
        template_content = data["template"]
        assert "name,email,role,organization_name,password" in template_content
        print(f"Template columns: {[c['name'] for c in data['columns']]}")
    
    def test_preview_csv_import(self, auth_headers):
        """Preview CSV import"""
        headers, user = auth_headers
        
        # Create a test CSV content
        csv_content = "name,email,role,organization_name,password\nTest User 1,testuser1_import@test.com,trainee,Test Org,testpass123\nTest User 2,testuser2_import@test.com,trainee,Test Org,testpass456"
        
        files = {
            'file': ('test_import.csv', csv_content, 'text/csv')
        }
        
        # Remove Content-Type from headers for multipart
        auth_only_headers = {"Authorization": headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/import/users/preview", files=files, headers=auth_only_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_rows" in data
        assert "valid_rows" in data
        assert "invalid_rows" in data
        assert "preview" in data
        print(f"Preview: total={data['total_rows']}, valid={data['valid_rows']}, invalid={data['invalid_rows']}")
    
    def test_import_users_from_csv(self, auth_headers):
        """Import users from CSV"""
        headers, user = auth_headers
        
        # Create test CSV with unique emails
        import time
        timestamp = int(time.time())
        csv_content = f"name,email,role,organization_name,password\nTEST_Import User {timestamp},test_import_{timestamp}@test.com,trainee,Test Import Org,testpass123"
        
        files = {
            'file': ('test_import.csv', csv_content, 'text/csv')
        }
        
        auth_only_headers = {"Authorization": headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/import/users", files=files, headers=auth_only_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_processed" in data
        assert "successful" in data
        assert "failed" in data
        assert "created_users" in data
        print(f"Import result: processed={data['total_processed']}, successful={data['successful']}, failed={data['failed']}")


# ==================== CERTIFICATES ====================
class TestCertificates:
    """Training Certificates tests"""
    
    def test_check_certificate_eligibility(self, auth_headers):
        """Check user eligibility for certificate"""
        headers, user = auth_headers
        user_id = user["user_id"]
        
        response = requests.get(f"{BASE_URL}/api/certificates/user/{user_id}/check", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "eligible" in data
        print(f"Certificate eligibility: eligible={data['eligible']}, sessions={data.get('completed_sessions', 0)}")
        return data
    
    def test_generate_certificate_not_eligible(self, auth_headers):
        """Test certificate generation when not eligible"""
        headers, user = auth_headers
        user_id = user["user_id"]
        
        # First check eligibility
        check_resp = requests.get(f"{BASE_URL}/api/certificates/user/{user_id}/check", headers=headers)
        eligibility = check_resp.json()
        
        if eligibility.get("eligible"):
            # User is eligible, test generation
            response = requests.get(f"{BASE_URL}/api/certificates/user/{user_id}", headers=headers)
            assert response.status_code == 200
            assert "application/pdf" in response.headers.get("content-type", "")
            print(f"Certificate generated successfully (PDF size: {len(response.content)} bytes)")
        else:
            # User not eligible, should return 400
            response = requests.get(f"{BASE_URL}/api/certificates/user/{user_id}", headers=headers)
            assert response.status_code == 400
            print(f"Certificate not generated - user not eligible: {eligibility.get('reason', 'No completed training')}")
    
    def test_verify_certificate_not_found(self, auth_headers):
        """Verify non-existent certificate"""
        headers, user = auth_headers
        
        response = requests.get(f"{BASE_URL}/api/certificates/verify/FAKE-CERT-ID")
        assert response.status_code == 404


# ==================== EXPORT REPORTS ====================
class TestExportReports:
    """Export reports (Excel/PDF) tests"""
    
    @pytest.fixture
    def phishing_campaign_id(self, auth_headers):
        """Get or create a phishing campaign for testing exports"""
        headers, user = auth_headers
        
        # Get existing phishing campaigns
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            if campaigns:
                return campaigns[0]["campaign_id"]
        
        return None
    
    def test_export_phishing_excel(self, auth_headers, phishing_campaign_id):
        """Export phishing campaign to Excel"""
        headers, user = auth_headers
        
        if not phishing_campaign_id:
            pytest.skip("No phishing campaign available for export")
        
        response = requests.get(f"{BASE_URL}/api/export/phishing/{phishing_campaign_id}/excel", headers=headers)
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print(f"Excel export successful: {len(response.content)} bytes")
    
    def test_export_phishing_pdf(self, auth_headers, phishing_campaign_id):
        """Export phishing campaign to PDF"""
        headers, user = auth_headers
        
        if not phishing_campaign_id:
            pytest.skip("No phishing campaign available for export")
        
        response = requests.get(f"{BASE_URL}/api/export/phishing/{phishing_campaign_id}/pdf", headers=headers)
        assert response.status_code == 200
        assert "pdf" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print(f"PDF export successful: {len(response.content)} bytes")
    
    def test_export_training_excel(self, auth_headers):
        """Export training report to Excel"""
        headers, user = auth_headers
        
        response = requests.get(f"{BASE_URL}/api/export/training/excel", headers=headers)
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")
        print(f"Training Excel export: {len(response.content)} bytes")
    
    def test_export_nonexistent_campaign(self, auth_headers):
        """Test export for non-existent campaign"""
        headers, user = auth_headers
        
        response = requests.get(f"{BASE_URL}/api/export/phishing/fake_campaign_id/excel", headers=headers)
        assert response.status_code == 404


# ==================== CLEANUP ====================
class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_templates(self, auth_headers):
        """Delete test templates"""
        headers, user = auth_headers
        
        templates_resp = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        templates = templates_resp.json() if templates_resp.status_code == 200 else []
        
        deleted = 0
        for template in templates:
            if template["name"].startswith("TEST_"):
                delete_resp = requests.delete(f"{BASE_URL}/api/ads/templates/{template['template_id']}", headers=headers)
                if delete_resp.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test templates")
    
    def test_cleanup_test_campaigns(self, auth_headers):
        """Delete test ad campaigns"""
        headers, user = auth_headers
        
        campaigns_resp = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        campaigns = campaigns_resp.json() if campaigns_resp.status_code == 200 else []
        
        deleted = 0
        for campaign in campaigns:
            if campaign["name"].startswith("TEST_"):
                delete_resp = requests.delete(f"{BASE_URL}/api/ads/campaigns/{campaign['campaign_id']}", headers=headers)
                if delete_resp.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test ad campaigns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
