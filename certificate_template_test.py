#!/usr/bin/env python3
"""
Certificate Template Backend API Testing for VasilisNetShield
Testing the specific certificate template endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class CertificateTemplateTester:
    def __init__(self, base_url="https://security-hardening-28.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_template_id = None
        self.created_org_id = None

    def log_test(self, name, success, message="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "PASS"
            print(f"✅ {name}: {message}")
        else:
            status = "FAIL"
            print(f"❌ {name}: {message}")
        
        self.test_results.append({
            "test": name,
            "status": status,
            "message": message,
            "response_data": response_data
        })

    def make_request(self, method, endpoint, data=None, headers=None, allow_redirects=True):
        """Make HTTP request with error handling"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        if headers is None:
            headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        headers['Content-Type'] = 'application/json'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=15, allow_redirects=allow_redirects)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15, allow_redirects=allow_redirects)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=15, allow_redirects=allow_redirects)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15, allow_redirects=allow_redirects)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_login(self):
        """Test login with provided admin credentials"""
        print("\n🔍 Testing Admin Login...")
        login_data = {
            "email": "admin@vasilisnetshield.com",
            "password": "Admin123!"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response is None:
            self.log_test("Admin Login", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get('token')
                self.user_data = data.get('user')
                
                if self.token and self.user_data:
                    self.log_test("Admin Login", True, f"Successfully logged in as {self.user_data['email']} with role {self.user_data.get('role', 'unknown')}")
                    return True
                else:
                    self.log_test("Admin Login", False, f"Missing token or user data: {data}")
                    return False
            except:
                self.log_test("Admin Login", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Admin Login", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_seed_presets(self):
        """Test seeding preset certificate templates"""
        print("\n🔍 Testing Certificate Template Preset Seeding...")
        if not self.token:
            self.log_test("Seed Presets", False, "No auth token available")
            return False
        
        response = self.make_request('POST', '/certificate-templates/seed-presets')
        
        if response is None:
            self.log_test("Seed Presets", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data and 'templates' in data:
                    self.log_test("Seed Presets", True, f"Seeded templates: {data['message']}, Templates: {data['templates']}")
                    return True
                else:
                    self.log_test("Seed Presets", False, f"Unexpected response format: {data}")
                    return False
            except:
                self.log_test("Seed Presets", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Seed Presets", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_list_templates(self):
        """Test listing all certificate templates"""
        print("\n🔍 Testing Certificate Template List...")
        if not self.token:
            self.log_test("List Templates", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/certificate-templates')
        
        if response is None:
            self.log_test("List Templates", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    # Check if templates have required fields
                    if len(data) > 0:
                        template = data[0]
                        required_fields = ['template_id', 'name', 'elements']
                        missing_fields = [field for field in required_fields if field not in template]
                        if missing_fields:
                            self.log_test("List Templates", False, f"Templates missing required fields: {missing_fields}")
                            return False
                    
                    self.log_test("List Templates", True, f"Got {len(data)} templates with proper structure")
                    return True
                else:
                    self.log_test("List Templates", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("List Templates", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("List Templates", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_create_template(self):
        """Test creating a new certificate template"""
        print("\n🔍 Testing Certificate Template Creation...")
        if not self.token:
            self.log_test("Create Template", False, "No auth token available")
            return False
        
        template_data = {
            "name": "Test Template",
            "orientation": "landscape",
            "border_style": "classic",
            "elements": []
        }
        
        response = self.make_request('POST', '/certificate-templates', template_data)
        
        if response is None:
            self.log_test("Create Template", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'template_id' in data and 'message' in data:
                    self.created_template_id = data['template_id']
                    self.log_test("Create Template", True, f"Created template with ID: {self.created_template_id}")
                    return True
                else:
                    self.log_test("Create Template", False, f"Missing template_id or message in response: {data}")
                    return False
            except:
                self.log_test("Create Template", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Create Template", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_update_template(self):
        """Test updating a certificate template with elements"""
        print("\n🔍 Testing Certificate Template Update...")
        if not self.token:
            self.log_test("Update Template", False, "No auth token available")
            return False
        
        if not self.created_template_id:
            self.log_test("Update Template", False, "No template ID available for update")
            return False
        
        # Sample elements array for testing
        elements = [
            {
                "id": "title",
                "type": "text",
                "x": 10,
                "y": 20,
                "width": 80,
                "height": 10,
                "content": "CERTIFICATE OF COMPLETION",
                "style": {
                    "fontSize": "32px",
                    "fontWeight": "bold",
                    "textAlign": "center",
                    "color": "#1F4E79"
                }
            },
            {
                "id": "user_name",
                "type": "text",
                "x": 10,
                "y": 40,
                "width": 80,
                "height": 8,
                "placeholder": "{user_name}",
                "style": {
                    "fontSize": "28px",
                    "fontWeight": "bold",
                    "textAlign": "center",
                    "color": "#1F4E79"
                }
            }
        ]
        
        update_data = {
            "elements": elements
        }
        
        response = self.make_request('PATCH', f'/certificate-templates/{self.created_template_id}', update_data)
        
        if response is None:
            self.log_test("Update Template", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data and 'template_id' in data:
                    self.log_test("Update Template", True, f"Updated template: {data['message']}")
                    return True
                else:
                    self.log_test("Update Template", False, f"Unexpected response format: {data}")
                    return False
            except:
                self.log_test("Update Template", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Update Template", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_preview_template(self):
        """Test generating PDF preview of a certificate template"""
        print("\n🔍 Testing Certificate Template Preview...")
        if not self.token:
            self.log_test("Template Preview", False, "No auth token available")
            return False
        
        if not self.created_template_id:
            self.log_test("Template Preview", False, "No template ID available for preview")
            return False
        
        response = self.make_request('GET', f'/certificate-templates/{self.created_template_id}/preview')
        
        if response is None:
            self.log_test("Template Preview", False, "Request failed")
            return False
            
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'application/pdf' in content_type:
                pdf_size = len(response.content)
                self.log_test("Template Preview", True, f"Generated PDF preview ({pdf_size} bytes)")
                return True
            else:
                self.log_test("Template Preview", False, f"Expected PDF, got content-type: {content_type}")
                return False
        else:
            self.log_test("Template Preview", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_list_signatures(self):
        """Test listing certificate signatures"""
        print("\n🔍 Testing Certificate Signatures List...")
        if not self.token:
            self.log_test("List Signatures", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/certificate-templates/assets/signatures')
        
        if response is None:
            self.log_test("List Signatures", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("List Signatures", True, f"Got {len(data)} signatures")
                    return True
                else:
                    self.log_test("List Signatures", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("List Signatures", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("List Signatures", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_list_certifying_bodies(self):
        """Test listing certifying bodies"""
        print("\n🔍 Testing Certifying Bodies List...")
        if not self.token:
            self.log_test("List Certifying Bodies", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/certificate-templates/assets/certifying-bodies')
        
        if response is None:
            self.log_test("List Certifying Bodies", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("List Certifying Bodies", True, f"Got {len(data)} certifying bodies")
                    return True
                else:
                    self.log_test("List Certifying Bodies", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("List Certifying Bodies", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("List Certifying Bodies", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_create_organization(self):
        """Test creating an organization with certificate template assignment"""
        print("\n🔍 Testing Organization Creation with Certificate Template...")
        if not self.token:
            self.log_test("Create Organization", False, "No auth token available")
            return False
        
        if not self.created_template_id:
            self.log_test("Create Organization", False, "No template ID available for assignment")
            return False
        
        org_data = {
            "name": "Test Organization",
            "domain": "test.example.com",
            "description": "Test organization for certificate template testing",
            "certificate_template_id": self.created_template_id
        }
        
        response = self.make_request('POST', '/organizations', org_data)
        
        if response is None:
            self.log_test("Create Organization", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'organization_id' in data and 'certificate_template_id' in data:
                    self.created_org_id = data['organization_id']
                    assigned_template = data['certificate_template_id']
                    if assigned_template == self.created_template_id:
                        self.log_test("Create Organization", True, f"Created org {self.created_org_id} with template {assigned_template}")
                        return True
                    else:
                        self.log_test("Create Organization", False, f"Template assignment mismatch: expected {self.created_template_id}, got {assigned_template}")
                        return False
                else:
                    self.log_test("Create Organization", False, f"Missing organization_id or certificate_template_id in response: {data}")
                    return False
            except:
                self.log_test("Create Organization", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Create Organization", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_list_organizations(self):
        """Test listing organizations and verify certificate template assignment"""
        print("\n🔍 Testing Organizations List with Certificate Template...")
        if not self.token:
            self.log_test("List Organizations", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/organizations')
        
        if response is None:
            self.log_test("List Organizations", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    # Check if our created org is in the list with correct template assignment
                    if self.created_org_id:
                        found_org = None
                        for org in data:
                            if org.get('organization_id') == self.created_org_id:
                                found_org = org
                                break
                        
                        if found_org:
                            template_id = found_org.get('certificate_template_id')
                            if template_id == self.created_template_id:
                                self.log_test("List Organizations", True, f"Found org {self.created_org_id} with correct template {template_id}")
                                return True
                            else:
                                self.log_test("List Organizations", False, f"Org template mismatch: expected {self.created_template_id}, got {template_id}")
                                return False
                        else:
                            self.log_test("List Organizations", False, f"Created org {self.created_org_id} not found in list")
                            return False
                    else:
                        self.log_test("List Organizations", True, f"Got {len(data)} organizations")
                        return True
                else:
                    self.log_test("List Organizations", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("List Organizations", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("List Organizations", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_update_organization_template(self):
        """Test updating organization to change certificate template assignment"""
        print("\n🔍 Testing Organization Certificate Template Update...")
        if not self.token:
            self.log_test("Update Organization Template", False, "No auth token available")
            return False
        
        if not self.created_org_id:
            self.log_test("Update Organization Template", False, "No organization ID available for update")
            return False
        
        # Update to remove template assignment (set to empty string, which backend converts to None)
        update_data = {
            "certificate_template_id": ""
        }
        
        response = self.make_request('PATCH', f'/organizations/{self.created_org_id}', update_data)
        
        if response is None:
            self.log_test("Update Organization Template", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'organization_id' in data:
                    template_id = data.get('certificate_template_id')
                    if template_id is None:
                        self.log_test("Update Organization Template", True, f"Successfully cleared template assignment for org {self.created_org_id}")
                        return True
                    else:
                        self.log_test("Update Organization Template", False, f"Template not cleared: still has {template_id}")
                        return False
                else:
                    self.log_test("Update Organization Template", False, f"Missing organization_id in response: {data}")
                    return False
            except:
                self.log_test("Update Organization Template", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Update Organization Template", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_delete_template(self):
        """Test deleting a certificate template"""
        print("\n🔍 Testing Certificate Template Deletion...")
        if not self.token:
            self.log_test("Delete Template", False, "No auth token available")
            return False
        
        if not self.created_template_id:
            self.log_test("Delete Template", False, "No template ID available for deletion")
            return False
        
        response = self.make_request('DELETE', f'/certificate-templates/{self.created_template_id}')
        
        if response is None:
            self.log_test("Delete Template", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_test("Delete Template", True, f"Deleted template: {data['message']}")
                    return True
                else:
                    self.log_test("Delete Template", False, f"Unexpected response format: {data}")
                    return False
            except:
                self.log_test("Delete Template", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Delete Template", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def run_all_tests(self):
        """Run all certificate template tests"""
        print("🚀 Starting Certificate Template Backend API Tests")
        print("Testing endpoints from review request")
        print("=" * 70)
        
        # Test 1: Login with provided credentials
        if not self.test_login():
            print("❌ Cannot continue without login")
            return False
        
        # Test 2: Seed preset templates (should create 8 templates)
        self.test_seed_presets()
        
        # Test 3: List all templates
        self.test_list_templates()
        
        # Test 4: Create new template
        self.test_create_template()
        
        # Test 5: Update template with elements array
        self.test_update_template()
        
        # Test 6: Generate PDF preview
        self.test_preview_template()
        
        # Test 7: List signatures
        self.test_list_signatures()
        
        # Test 8: List certifying bodies
        self.test_list_certifying_bodies()
        
        # Test 9: Create organization with certificate template assignment
        self.test_create_organization()
        
        # Test 10: List organizations and verify template assignment
        self.test_list_organizations()
        
        # Test 11: Update organization certificate template assignment
        self.test_update_organization_template()
        
        # Test 12: Delete template
        self.test_delete_template()
        
        print("\n" + "=" * 70)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All certificate template tests passed!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} test(s) failed")
            return False

def main():
    """Main test runner"""
    tester = CertificateTemplateTester()
    
    try:
        success = tester.run_all_tests()
        
        # Print detailed results for debugging
        print("\n📋 Detailed Test Results:")
        for result in tester.test_results:
            status_symbol = "✅" if result["status"] == "PASS" else "❌"
            print(f"{status_symbol} {result['test']}: {result['message']}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test runner failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())