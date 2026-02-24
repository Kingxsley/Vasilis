"""
Custom Email Templates API Tests
Tests: CRUD operations and integration with Phishing Campaigns
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://security-modules-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "Admin123!"

# Cached token for reuse across tests
_cached_token = None


def get_auth_token():
    """Get cached auth token or login to get new one"""
    global _cached_token
    if _cached_token:
        return _cached_token
    
    time.sleep(0.2)
    response = requests.post(f"{API}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200 and "token" in response.json():
        _cached_token = response.json()["token"]
        return _cached_token
    raise Exception(f"Failed to get token: {response.status_code} - {response.text}")


def get_auth_headers():
    """Get auth headers with token"""
    return {"Authorization": f"Bearer {get_auth_token()}"}


class TestCustomEmailTemplatesCRUD:
    """Custom Email Templates CRUD operation tests"""
    
    def test_list_custom_email_templates(self):
        """Test listing all custom email templates"""
        response = requests.get(f"{API}/custom-email-templates", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "templates" in data, "Response should have 'templates' key"
        assert isinstance(data["templates"], list), "templates should be a list"
        print(f"PASS: Listed {len(data['templates'])} custom email templates")
    
    def test_get_specific_custom_email_template(self):
        """Test getting a specific custom email template by ID"""
        # First list templates to get an ID
        list_response = requests.get(f"{API}/custom-email-templates", headers=get_auth_headers())
        templates = list_response.json().get("templates", [])
        
        if len(templates) > 0:
            template_id = templates[0]["id"]
            response = requests.get(f"{API}/custom-email-templates/{template_id}", headers=get_auth_headers())
            assert response.status_code == 200, f"Failed to get template: {response.text}"
            
            template = response.json()
            assert "id" in template
            assert "name" in template
            assert "subject" in template
            assert "html" in template
            print(f"PASS: Retrieved template '{template['name']}' with id {template['id']}")
        else:
            pytest.skip("No templates available to test GET by ID")
    
    def test_create_custom_email_template(self):
        """Test creating a new custom email template"""
        test_template = {
            "name": "TEST_Pytest Template",
            "description": "Created by pytest",
            "subject": "Test Subject Line",
            "type": "phishing",
            "html": "<html><body><h1>Test Email</h1><p>Hello {{USER_NAME}}</p><a href='{{TRACKING_LINK}}'>Click Here</a></body></html>",
            "config": {"logoIcon": "🧪", "testMode": True}
        }
        
        response = requests.post(f"{API}/custom-email-templates", json=test_template, headers=get_auth_headers())
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        
        created = response.json()
        assert "id" in created, "Created template should have an id"
        assert created["name"] == test_template["name"]
        assert created["subject"] == test_template["subject"]
        print(f"PASS: Created custom email template with id: {created['id']}")
        
        # Store for cleanup
        return created["id"]
    
    def test_update_custom_email_template(self):
        """Test updating a custom email template"""
        # First create a template to update
        create_data = {
            "name": "TEST_Update Template",
            "subject": "Original Subject",
            "html": "<p>Original content</p>",
            "type": "custom"
        }
        create_response = requests.post(f"{API}/custom-email-templates", json=create_data, headers=get_auth_headers())
        template_id = create_response.json().get("id")
        
        if template_id:
            # Update the template
            update_data = {
                "name": "TEST_Updated Template Name",
                "subject": "Updated Subject Line",
                "html": "<p>Updated content</p>",
                "type": "custom"
            }
            update_response = requests.put(f"{API}/custom-email-templates/{template_id}", json=update_data, headers=get_auth_headers())
            assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
            
            # Verify update
            get_response = requests.get(f"{API}/custom-email-templates/{template_id}", headers=get_auth_headers())
            updated = get_response.json()
            assert updated["name"] == "TEST_Updated Template Name"
            assert updated["subject"] == "Updated Subject Line"
            print(f"PASS: Updated template {template_id}")
            
            # Cleanup
            requests.delete(f"{API}/custom-email-templates/{template_id}", headers=get_auth_headers())
        else:
            pytest.skip("Failed to create template for update test")
    
    def test_delete_custom_email_template(self):
        """Test deleting a custom email template"""
        # Create a template to delete
        create_data = {
            "name": "TEST_Delete Me Template",
            "subject": "Will be deleted",
            "html": "<p>Delete me</p>",
            "type": "custom"
        }
        create_response = requests.post(f"{API}/custom-email-templates", json=create_data, headers=get_auth_headers())
        template_id = create_response.json().get("id")
        
        if template_id:
            # Delete the template
            delete_response = requests.delete(f"{API}/custom-email-templates/{template_id}", headers=get_auth_headers())
            assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
            
            # Verify deletion - should return 404
            get_response = requests.get(f"{API}/custom-email-templates/{template_id}", headers=get_auth_headers())
            assert get_response.status_code == 404, "Deleted template should return 404"
            print(f"PASS: Deleted template {template_id}")
        else:
            pytest.skip("Failed to create template for delete test")


class TestCustomEmailTemplateIntegration:
    """Tests for custom email template integration with phishing campaigns"""
    
    def test_campaign_accepts_custom_email_template_id(self):
        """Test that phishing campaign creation accepts custom_email_template_id parameter"""
        # Get required data
        templates_response = requests.get(f"{API}/custom-email-templates", headers=get_auth_headers())
        custom_templates = templates_response.json().get("templates", [])
        
        if len(custom_templates) == 0:
            pytest.skip("No custom email templates available for integration test")
        
        custom_template_id = custom_templates[0]["id"]
        
        # Get phishing templates
        phishing_templates = requests.get(f"{API}/phishing/templates", headers=get_auth_headers()).json()
        if len(phishing_templates) == 0:
            pytest.skip("No phishing templates available")
        template_id = phishing_templates[0]["template_id"]
        
        # Get users in org
        users = requests.get(f"{API}/users", headers=get_auth_headers()).json()
        org_user = next((u for u in users if u.get("organization_id")), None)
        if not org_user:
            pytest.skip("No users in an organization available")
        
        # Create campaign with custom_email_template_id
        campaign_data = {
            "name": "TEST_Custom Email Integration Test",
            "organization_id": org_user["organization_id"],
            "template_id": template_id,
            "target_user_ids": [org_user["user_id"]],
            "risk_level": "low",
            "custom_email_template_id": custom_template_id
        }
        
        response = requests.post(f"{API}/phishing/campaigns", json=campaign_data, headers=get_auth_headers())
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        
        created_campaign = response.json()
        assert "campaign_id" in created_campaign
        print(f"PASS: Created campaign '{created_campaign['name']}' with custom_email_template_id")
        
        # Cleanup - delete the test campaign
        requests.delete(f"{API}/phishing/campaigns/{created_campaign['campaign_id']}", headers=get_auth_headers())
    
    def test_campaign_without_custom_email_template(self):
        """Test that phishing campaign can be created without custom_email_template_id (optional field)"""
        # Get phishing templates
        phishing_templates = requests.get(f"{API}/phishing/templates", headers=get_auth_headers()).json()
        if len(phishing_templates) == 0:
            pytest.skip("No phishing templates available")
        template_id = phishing_templates[0]["template_id"]
        
        # Get users in org
        users = requests.get(f"{API}/users", headers=get_auth_headers()).json()
        org_user = next((u for u in users if u.get("organization_id")), None)
        if not org_user:
            pytest.skip("No users in an organization available")
        
        # Create campaign WITHOUT custom_email_template_id
        campaign_data = {
            "name": "TEST_No Custom Email Campaign",
            "organization_id": org_user["organization_id"],
            "template_id": template_id,
            "target_user_ids": [org_user["user_id"]],
            "risk_level": "low"
            # Note: no custom_email_template_id
        }
        
        response = requests.post(f"{API}/phishing/campaigns", json=campaign_data, headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        
        created_campaign = response.json()
        print(f"PASS: Created campaign without custom_email_template_id")
        
        # Cleanup
        requests.delete(f"{API}/phishing/campaigns/{created_campaign['campaign_id']}", headers=get_auth_headers())


class TestCleanup:
    """Cleanup test data created during tests"""
    
    def test_cleanup_test_templates(self):
        """Clean up any TEST_ prefixed templates"""
        response = requests.get(f"{API}/custom-email-templates", headers=get_auth_headers())
        templates = response.json().get("templates", [])
        
        deleted_count = 0
        for template in templates:
            if template.get("name", "").startswith("TEST_"):
                del_response = requests.delete(f"{API}/custom-email-templates/{template['id']}", headers=get_auth_headers())
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"PASS: Cleaned up {deleted_count} test templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
