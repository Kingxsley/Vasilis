"""
Iteration 5 Feature Tests - Certificate Templates, Landing Page Editor, Ad Simulations Copy URL
Tests the new features implemented in iteration 5 of the cybersecurity training application.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://netshield-preview.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"


class TestSetup:
    """Shared test setup and fixtures"""
    
    @staticmethod
    def get_auth_token():
        """Get authentication token for API calls"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None


# ============== LANDING LAYOUTS API TESTS ==============

class TestLandingLayouts:
    """Test /api/landing-layouts endpoints"""
    
    def test_get_landing_layout_public(self):
        """GET /api/landing-layouts - Should return layout data (public endpoint)"""
        response = requests.get(f"{API_URL}/landing-layouts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify structure
        assert "layout_id" in data, "Response should have layout_id"
        assert "sections" in data, "Response should have sections"
        assert isinstance(data["sections"], list), "Sections should be a list"
        
        # Verify sections have required fields
        if len(data["sections"]) > 0:
            section = data["sections"][0]
            assert "section_id" in section, "Section should have section_id"
            assert "type" in section, "Section should have type"
            assert "order" in section, "Section should have order"
            assert "visible" in section, "Section should have visible field"
            assert "content" in section, "Section should have content"
        
        print(f"✓ Landing layout returned with {len(data['sections'])} sections")
    
    def test_get_section_types(self):
        """GET /api/landing-layouts/section-types - Should return available section types"""
        response = requests.get(f"{API_URL}/landing-layouts/section-types")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one section type"
        
        # Check expected section types exist
        types = [item["type"] for item in data]
        expected_types = ["hero", "features", "cta", "testimonials", "faq"]
        for expected in expected_types:
            assert expected in types, f"Section type '{expected}' should exist"
        
        # Verify section type structure
        section_type = data[0]
        assert "type" in section_type, "Section type should have 'type'"
        assert "name" in section_type, "Section type should have 'name'"
        assert "description" in section_type, "Section type should have 'description'"
        assert "icon" in section_type, "Section type should have 'icon'"
        
        print(f"✓ Section types returned: {len(data)} types ({', '.join(types[:5])}...)")
    
    def test_update_landing_layout_requires_auth(self):
        """PUT /api/landing-layouts - Should require authentication"""
        response = requests.put(f"{API_URL}/landing-layouts", json={"sections": []})
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Landing layout update correctly requires authentication")


# ============== CERTIFICATE TEMPLATES API TESTS ==============

class TestCertificateTemplates:
    """Test /api/certificate-templates endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token before each test"""
        self.token = TestSetup.get_auth_token()
        if not self.token:
            pytest.skip("Could not obtain auth token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_certificate_templates(self):
        """GET /api/certificate-templates - Should list all templates"""
        response = requests.get(f"{API_URL}/certificate-templates", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Certificate templates returned: {len(data)} templates")
    
    def test_certificate_templates_requires_auth(self):
        """GET /api/certificate-templates - Should require authentication"""
        response = requests.get(f"{API_URL}/certificate-templates")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Certificate templates correctly requires authentication")
    
    def test_get_default_template(self):
        """GET /api/certificate-templates/default - Should return default template"""
        response = requests.get(f"{API_URL}/certificate-templates/default", headers=self.headers)
        
        # May return 200 with default structure or existing default
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "template_id" in data, "Should have template_id"
        assert "elements" in data, "Should have elements"
        print(f"✓ Default template returned: {data.get('name', 'Default Certificate')}")
    
    def test_list_signatures(self):
        """GET /api/certificate-templates/assets/signatures - Should list signatures"""
        response = requests.get(f"{API_URL}/certificate-templates/assets/signatures", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Signatures returned: {len(data)} signatures")
    
    def test_list_certifying_bodies(self):
        """GET /api/certificate-templates/assets/certifying-bodies - Should list certifying bodies"""
        response = requests.get(f"{API_URL}/certificate-templates/assets/certifying-bodies", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Certifying bodies returned: {len(data)} bodies")
    
    def test_seed_presets(self):
        """POST /api/certificate-templates/seed-presets - Should create preset templates"""
        response = requests.post(f"{API_URL}/certificate-templates/seed-presets", headers=self.headers, json={})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        print(f"✓ Seed presets: {data.get('message')}")
    
    def test_create_template(self):
        """POST /api/certificate-templates - Should create a new template"""
        template_data = {
            "name": f"TEST_Template_{os.urandom(4).hex()}",
            "description": "Test template for automated testing",
            "background_color": "#ffffff",
            "border_style": "modern",
            "orientation": "landscape",
            "elements": []
        }
        
        response = requests.post(f"{API_URL}/certificate-templates", headers=self.headers, json=template_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "template_id" in data, "Response should have template_id"
        assert data.get("name") == template_data["name"], "Name should match"
        
        # Cleanup - delete the test template
        template_id = data["template_id"]
        delete_response = requests.delete(f"{API_URL}/certificate-templates/{template_id}", headers=self.headers)
        assert delete_response.status_code == 200, "Should be able to delete test template"
        
        print(f"✓ Created and deleted test template: {template_id}")


# ============== AD SIMULATIONS API TESTS ==============

class TestAdSimulations:
    """Test /api/ads endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token before each test"""
        self.token = TestSetup.get_auth_token()
        if not self.token:
            pytest.skip("Could not obtain auth token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_campaigns(self):
        """GET /api/ads/campaigns - Should list all campaigns"""
        response = requests.get(f"{API_URL}/ads/campaigns", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Ad campaigns returned: {len(data)} campaigns")
    
    def test_list_templates(self):
        """GET /api/ads/templates - Should list all ad templates"""
        response = requests.get(f"{API_URL}/ads/templates", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Ad templates returned: {len(data)} templates")
    
    def test_seed_default_templates(self):
        """POST /api/ads/templates/seed-defaults - Should seed default templates"""
        response = requests.post(f"{API_URL}/ads/templates/seed-defaults", headers=self.headers, json={})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        print(f"✓ Seed ad templates: {data.get('message')}")


# ============== HEALTH CHECK ==============

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """GET /api/health - Should return healthy status"""
        response = requests.get(f"{API_URL}/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("status") == "healthy", "Status should be healthy"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
