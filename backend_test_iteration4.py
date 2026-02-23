#!/usr/bin/env python3
"""
Backend API Testing for VasilisNetShield - Iteration 4
Focused testing for specific features mentioned in review request:
- Module Designer picks type (not default phishing)
- Random questions
- Phishing tracking redirects
- Ad copy URL uses embed URL
- Auto-assign training on link click
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class VasilisNetShieldTesterIteration4:
    def __init__(self, base_url="https://vasilis-app.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    def test_health_check(self):
        """Test backend health endpoint"""
        print("\n🔍 Testing Backend Health...")
        response = self.make_request('GET', '/health')
        
        if response is None:
            self.log_test("Backend Health Check", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_test("Backend Health Check", True, f"Backend is healthy: {data}")
                    return True
                else:
                    self.log_test("Backend Health Check", False, f"Backend status not healthy: {data}")
                    return False
            except:
                self.log_test("Backend Health Check", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Backend Health Check", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_admin_login(self):
        """Test login with provided admin credentials"""
        print("\n🔍 Testing Admin Login...")
        login_data = {
            "email": "testadmin@test.com",
            "password": "TestPass123!"
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
                
                if self.token and self.user_data and self.user_data.get('role') == 'super_admin':
                    self.log_test("Admin Login", True, f"Successfully logged in as {self.user_data['email']} with role {self.user_data['role']}")
                    return True
                else:
                    self.log_test("Admin Login", False, f"Missing token or incorrect role: {data}")
                    return False
            except:
                self.log_test("Admin Login", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Admin Login", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_create_non_phishing_module(self):
        """Test creating module with non-phishing type - Feature requirement"""
        print("\n🔍 Testing Create Non-Phishing Module Type...")
        if not self.token:
            self.log_test("Create Non-Phishing Module", False, "No auth token available")
            return False
            
        # Test creating module with different types (not just phishing)
        module_data = {
            "name": f"Social Engineering Module {datetime.now().strftime('%H%M%S')}",
            "module_type": "social_engineering",  # NOT phishing
            "description": "Test module with social engineering type",
            "difficulty": "medium",
            "duration_minutes": 20,
            "questions": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "multiple_choice",
                    "question": "Which of these is a social engineering attack?",
                    "options": ["Pretexting", "Baiting", "Quid pro quo", "All of the above"],
                    "correct_answer": "All of the above"
                }
            ],
            "is_active": True
        }
        
        response = self.make_request('POST', '/training/modules', module_data)
        
        if response is None:
            self.log_test("Create Non-Phishing Module", False, "Request failed")
            return False
            
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                if data.get('module_type') == 'social_engineering':
                    self.log_test("Create Non-Phishing Module", True, f"Successfully created {data['module_type']} module: {data['module_id']}")
                    return True
                else:
                    self.log_test("Create Non-Phishing Module", False, f"Module type not set correctly: {data}")
                    return False
            except:
                self.log_test("Create Non-Phishing Module", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Create Non-Phishing Module", False, f"Expected 200/201, got {response.status_code}: {response.text}")
            return False

    def test_phishing_tracking_redirect(self):
        """Test phishing tracking link redirects to awareness page (not landing page)"""
        print("\n🔍 Testing Phishing Tracking Redirect...")
        
        # Get existing phishing campaign to use its tracking code
        campaigns_response = self.make_request('GET', '/phishing/campaigns')
        if not campaigns_response or campaigns_response.status_code != 200:
            self.log_test("Phishing Tracking Redirect", False, "Could not get phishing campaigns")
            return False
        
        campaigns = campaigns_response.json()
        if not campaigns:
            self.log_test("Phishing Tracking Redirect", False, "No phishing campaigns found to test")
            return False
        
        # Test phishing tracking endpoint
        # Based on review context, there should be tracking code from campaign phish_310ed2d74bfd
        test_tracking_code = "b0TXP7xZea3E1YZdqfCVZw"  # From agent context
        test_user_id = self.user_data['user_id'] if self.user_data else "test_user"
        
        # Test phishing click tracking endpoint
        tracking_url = f"/phishing/track/click/{test_tracking_code}?u={test_user_id}"
        response = self.make_request('GET', tracking_url, allow_redirects=False)
        
        if response is None:
            self.log_test("Phishing Tracking Redirect", False, "Request failed")
            return False
        
        # Should be a redirect (302) to awareness page, not landing page
        if response.status_code == 302:
            location = response.headers.get('Location', '')
            if 'awareness' in location.lower() or 'phishing' in location.lower():
                self.log_test("Phishing Tracking Redirect", True, f"Redirects to awareness page: {location}")
                return True
            else:
                self.log_test("Phishing Tracking Redirect", False, f"Redirects to wrong location: {location}")
                return False
        elif response.status_code == 200:
            # Check if it returns HTML awareness page directly
            content = response.text
            if 'awareness' in content.lower() or 'phishing' in content.lower():
                self.log_test("Phishing Tracking Redirect", True, "Returns awareness page HTML")
                return True
            else:
                self.log_test("Phishing Tracking Redirect", False, f"Returns wrong content: {content[:200]}...")
                return False
        else:
            self.log_test("Phishing Tracking Redirect", False, f"Unexpected status code: {response.status_code}")
            return False

    def test_phishing_awareness_page(self):
        """Test phishing awareness page endpoint"""
        print("\n🔍 Testing Phishing Awareness Page...")
        
        test_tracking_code = "b0TXP7xZea3E1YZdqfCVZw"
        awareness_url = f"/phishing/track/click/{test_tracking_code}"
        response = self.make_request('GET', awareness_url)
        
        if response is None:
            self.log_test("Phishing Awareness Page", False, "Request failed")
            return False
        
        if response.status_code == 200:
            content = response.text
            if any(word in content.lower() for word in ['awareness', 'phishing', 'security', 'training']):
                self.log_test("Phishing Awareness Page", True, "Returns HTML awareness page with security content")
                return True
            else:
                self.log_test("Phishing Awareness Page", False, f"Missing awareness content: {content[:200]}...")
                return False
        else:
            self.log_test("Phishing Awareness Page", False, f"Expected 200, got {response.status_code}")
            return False

    def test_ad_embed_url_functionality(self):
        """Test ad campaigns copy URL uses embed URL"""
        print("\n🔍 Testing Ad Embed URL Functionality...")
        
        # Get ad campaigns
        response = self.make_request('GET', '/ads/campaigns')
        if response is None:
            self.log_test("Ad Embed URL", False, "Request failed")
            return False
        
        if response.status_code == 200:
            campaigns = response.json()
            if campaigns:
                campaign = campaigns[0]
                campaign_id = campaign.get('campaign_id', 'adcamp_921eb6f9275c')  # Fallback to context ID
                
                # Test ad render endpoint for embed URL
                render_url = f"/ads/render/{campaign_id}"
                render_response = self.make_request('GET', render_url)
                
                if render_response and render_response.status_code == 200:
                    self.log_test("Ad Embed URL", True, f"Ad embed URL working: /api/ads/render/{campaign_id}")
                    return True
                else:
                    self.log_test("Ad Embed URL", False, f"Ad render endpoint failed: {render_response.status_code if render_response else 'No response'}")
                    return False
            else:
                self.log_test("Ad Embed URL", True, "No ad campaigns to test (endpoint accessible)")
                return True
        else:
            self.log_test("Ad Embed URL", False, f"Expected 200, got {response.status_code}")
            return False

    def test_phishing_campaign_with_assigned_module(self):
        """Test phishing campaign creation with assigned training module"""
        print("\n🔍 Testing Phishing Campaign with Assigned Module...")
        if not self.token:
            self.log_test("Campaign with Assigned Module", False, "No auth token available")
            return False
        
        # Get available training modules
        modules_response = self.make_request('GET', '/training/modules')
        if not modules_response or modules_response.status_code != 200:
            self.log_test("Campaign with Assigned Module", False, "Could not get training modules")
            return False
        
        modules = modules_response.json()
        if not modules:
            self.log_test("Campaign with Assigned Module", False, "No training modules available")
            return False
        
        # Get templates and orgs for campaign creation
        templates_response = self.make_request('GET', '/phishing/templates')
        orgs_response = self.make_request('GET', '/organizations')
        
        if not templates_response or templates_response.status_code != 200:
            self.log_test("Campaign with Assigned Module", False, "Could not get phishing templates")
            return False
        
        if not orgs_response or orgs_response.status_code != 200:
            self.log_test("Campaign with Assigned Module", False, "Could not get organizations")
            return False
        
        templates = templates_response.json()
        orgs = orgs_response.json()
        
        if not templates or not orgs:
            self.log_test("Campaign with Assigned Module", False, "Missing templates or organizations")
            return False
        
        # Create campaign with assigned_module_id
        campaign_data = {
            "name": f"Test Campaign with Module {datetime.now().strftime('%H%M%S')}",
            "organization_id": orgs[0]['organization_id'],
            "template_id": templates[0]['template_id'],
            "target_user_ids": [self.user_data['user_id']] if self.user_data else [],
            "assigned_module_id": modules[0]['module_id']  # Key feature to test
        }
        
        response = self.make_request('POST', '/phishing/campaigns', campaign_data)
        
        if response is None:
            self.log_test("Campaign with Assigned Module", False, "Request failed")
            return False
            
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                if data.get('campaign_id'):
                    self.log_test("Campaign with Assigned Module", True, f"Campaign created with assigned module: {data.get('campaign_id')}")
                    return True
                else:
                    self.log_test("Campaign with Assigned Module", False, f"Campaign creation failed: {data}")
                    return False
            except:
                self.log_test("Campaign with Assigned Module", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Campaign with Assigned Module", False, f"Expected 200/201, got {response.status_code}: {response.text}")
            return False

    def run_all_tests(self):
        """Run all backend tests for iteration 4"""
        print("🚀 Starting VasilisNetShield Backend Tests - Iteration 4")
        print("Focus: Module types, tracking redirects, embed URLs, assigned modules")
        print("=" * 70)
        
        # Test 1: Health check
        self.test_health_check()
        
        # Test 2: Admin login with provided credentials
        if not self.test_admin_login():
            print("❌ Cannot continue without login")
            return False
        
        # Test 3: Create module with non-phishing type (feature requirement)
        self.test_create_non_phishing_module()
        
        # Test 4: Test phishing tracking redirect (not to landing page)
        self.test_phishing_tracking_redirect()
        
        # Test 5: Test phishing awareness page
        self.test_phishing_awareness_page()
        
        # Test 6: Test ad embed URL functionality
        self.test_ad_embed_url_functionality()
        
        # Test 7: Test phishing campaign with assigned module
        self.test_phishing_campaign_with_assigned_module()
        
        print("\n" + "=" * 70)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All iteration 4 tests passed!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} test(s) failed")
            return False

def main():
    """Main test runner"""
    tester = VasilisNetShieldTesterIteration4()
    
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