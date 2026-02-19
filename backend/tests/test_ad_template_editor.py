"""
Test Ad Template Editor Features - Iteration 15
Tests the No-Code Ad Simulation Editor functionality:
- Ad template CRUD operations
- Visual editor data persistence
- Color/style configurations
- Ad type selection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdTemplateEditorAPIs:
    """Test Ad Template Editor backend APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_super@test.com",
            "password": "Test123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate - skipping tests")
        return login_response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_list_ad_templates(self, headers):
        """Test listing ad templates"""
        response = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Templates should be a list"
        print(f"✓ Listed {len(data)} ad templates")
    
    def test_create_ad_template_banner(self, headers):
        """Test creating a banner ad template"""
        template_data = {
            "name": "TEST_Banner_Visual_Editor",
            "ad_type": "banner",
            "headline": "Test Headline for Banner",
            "description": "Test description for banner ad template",
            "call_to_action": "Click Here",
            "style_css": "background: #1a1a2e; color: #ffffff; border-radius: 8px;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == template_data["name"]
        assert data["ad_type"] == "banner"
        assert data["headline"] == template_data["headline"]
        assert data["call_to_action"] == template_data["call_to_action"]
        assert "template_id" in data
        print(f"✓ Created banner template: {data['template_id']}")
        return data["template_id"]
    
    def test_create_ad_template_popup(self, headers):
        """Test creating a popup ad template with colors"""
        template_data = {
            "name": "TEST_Popup_Scam_Alert",
            "ad_type": "popup",
            "headline": "WARNING: Virus Detected!",
            "description": "Your computer is infected with 23 dangerous viruses!",
            "call_to_action": "Scan Now",
            "style_css": "background: #dc2626; color: #ffffff; border-radius: 12px;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["ad_type"] == "popup"
        assert "#dc2626" in data.get("style_css", "")
        print(f"✓ Created popup template with custom colors")
        return data["template_id"]
    
    def test_create_ad_template_sidebar(self, headers):
        """Test creating a sidebar ad template"""
        template_data = {
            "name": "TEST_Sidebar_Money_Scam",
            "ad_type": "sidebar",
            "headline": "Make $5,000/Week!",
            "description": "Local mom discovers this ONE WEIRD TRICK",
            "call_to_action": "Learn Secret",
            "style_css": "background: #15803d; color: #ffffff;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ad_type"] == "sidebar"
        print(f"✓ Created sidebar template")
        return data["template_id"]
    
    def test_create_ad_template_native(self, headers):
        """Test creating a native ad template"""
        template_data = {
            "name": "TEST_Native_Article",
            "ad_type": "native",
            "headline": "Sponsored: Secret Investment",
            "description": "This article reveals the secrets banks don't want you to know",
            "call_to_action": "Read More",
            "style_css": "background: #0D1117; color: #ffffff; border-radius: 4px;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["ad_type"] == "native"
        print(f"✓ Created native template")
        return data["template_id"]
    
    def test_create_ad_template_with_image_url(self, headers):
        """Test creating ad template with optional image URL"""
        template_data = {
            "name": "TEST_Template_With_Image",
            "ad_type": "popup",
            "headline": "Prize Giveaway!",
            "description": "You've won a free iPhone!",
            "call_to_action": "Claim Now",
            "image_url": "https://example.com/fake-prize.png",
            "style_css": "background: #ff6b35; color: #ffffff;"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["image_url"] == template_data["image_url"]
        print(f"✓ Created template with image URL")
    
    def test_template_validation_missing_name(self, headers):
        """Test that template creation requires name"""
        template_data = {
            "ad_type": "popup",
            "headline": "Test",
            "description": "Test",
            "call_to_action": "Click"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        # Pydantic validation should fail
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}"
        print(f"✓ Validation correctly rejected template without name")
    
    def test_template_validation_missing_headline(self, headers):
        """Test that template creation requires headline"""
        template_data = {
            "name": "TEST_Missing_Headline",
            "ad_type": "popup",
            "description": "Test",
            "call_to_action": "Click"
        }
        response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert response.status_code == 422, f"Expected 422 for missing headline, got {response.status_code}"
        print(f"✓ Validation correctly rejected template without headline")
    
    def test_seed_default_templates(self, headers):
        """Test seeding default malicious ad templates"""
        response = requests.post(f"{BASE_URL}/api/ads/templates/seed-defaults", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Seed defaults: {data['message']}")
    
    def test_delete_ad_template(self, headers):
        """Test deleting an ad template"""
        # First create a template to delete
        template_data = {
            "name": "TEST_To_Be_Deleted",
            "ad_type": "banner",
            "headline": "Delete Me",
            "description": "This template will be deleted",
            "call_to_action": "Delete"
        }
        create_response = requests.post(f"{BASE_URL}/api/ads/templates", headers=headers, json=template_data)
        assert create_response.status_code == 200
        template_id = create_response.json()["template_id"]
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/ads/templates/{template_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted template: {template_id}")
        
        # Verify it's gone from list
        list_response = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        templates = list_response.json()
        template_ids = [t["template_id"] for t in templates]
        assert template_id not in template_ids, "Deleted template should not be in list"
        print(f"✓ Verified template no longer in list")
    
    def test_delete_nonexistent_template(self, headers):
        """Test deleting a non-existent template returns 404"""
        response = requests.delete(f"{BASE_URL}/api/ads/templates/nonexistent_id", headers=headers)
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for non-existent template")


class TestAdCampaignWithTemplates:
    """Test creating ad campaigns with visual editor templates"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_super@test.com",
            "password": "Test123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        return login_response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_list_ad_campaigns(self, headers):
        """Test listing ad campaigns"""
        response = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} ad campaigns")
    
    def test_get_campaign_stats(self, headers):
        """Test getting campaign stats if campaigns exist"""
        # First get list of campaigns
        list_response = requests.get(f"{BASE_URL}/api/ads/campaigns", headers=headers)
        campaigns = list_response.json()
        
        if not campaigns:
            pytest.skip("No campaigns to test stats")
        
        campaign_id = campaigns[0]["campaign_id"]
        stats_response = requests.get(f"{BASE_URL}/api/ads/campaigns/{campaign_id}/stats", headers=headers)
        assert stats_response.status_code == 200
        data = stats_response.json()
        assert "total_targets" in data
        assert "view_rate" in data
        assert "click_rate" in data
        print(f"✓ Got stats for campaign: {data['campaign_name']}")


class TestCleanup:
    """Cleanup test templates"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_super@test.com",
            "password": "Test123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        return login_response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_templates(self, headers):
        """Delete all TEST_ prefixed templates"""
        list_response = requests.get(f"{BASE_URL}/api/ads/templates", headers=headers)
        templates = list_response.json()
        
        deleted = 0
        for template in templates:
            if template["name"].startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/ads/templates/{template['template_id']}", 
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
