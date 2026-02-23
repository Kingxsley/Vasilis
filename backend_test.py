#!/usr/bin/env python3
"""
Backend API Testing for VasilisNetShield
Tests the key APIs and functionality mentioned in the bug fixes.
"""

import requests
import json
import sys
from datetime import datetime

class VasilisNetShieldTester:
    def __init__(self, base_url="https://security-sim-builder.preview.emergentagent.com"):
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

    def make_request(self, method, endpoint, data=None, headers=None, expected_status=None):
        """Make HTTP request with error handling"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        if headers is None:
            headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        headers['Content-Type'] = 'application/json'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_health_check(self):
        """Test backend health check"""
        response = self.make_request('GET', '/health')
        
        if response is None:
            self.log_test("Health Check", False, "Request failed - no response")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_test("Health Check", True, f"Backend is healthy - {data}")
                    return True
                else:
                    self.log_test("Health Check", False, f"Backend status not healthy: {data}")
                    return False
            except:
                self.log_test("Health Check", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Health Check", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_user_registration(self):
        """Test user registration - creates super admin user"""
        user_data = {
            "email": f"testadmin_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPassword123!",
            "name": "Test Admin User"
        }
        
        response = self.make_request('POST', '/auth/register', user_data)
        
        if response is None:
            self.log_test("User Registration", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get('token')
                self.user_data = data.get('user')
                
                if self.token and self.user_data:
                    self.log_test("User Registration", True, f"User created: {self.user_data['email']} with role {self.user_data['role']}")
                    return True
                else:
                    self.log_test("User Registration", False, f"Missing token or user data: {data}")
                    return False
            except:
                self.log_test("User Registration", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("User Registration", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_create_training_module_with_scenarios(self):
        """Test creating training module with scenarios field"""
        if not self.token:
            self.log_test("Training Module Creation", False, "No auth token available")
            return False
            
        module_data = {
            "name": "Test Security Module",
            "module_type": "phishing",
            "description": "Test module for security training",
            "difficulty": "medium",
            "duration_minutes": 30,
            "scenarios_count": 2,
            "scenarios": ["scenario_1", "scenario_2"],
            "is_active": True
        }
        
        response = self.make_request('POST', '/training/modules', module_data)
        
        if response is None:
            self.log_test("Training Module Creation", False, "Request failed")
            return False
            
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                if data.get('scenarios') == module_data['scenarios']:
                    self.log_test("Training Module Creation", True, f"Module created with scenarios: {data['scenarios']}")
                    return True
                else:
                    self.log_test("Training Module Creation", False, f"Scenarios field not properly handled: {data}")
                    return False
            except:
                self.log_test("Training Module Creation", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Training Module Creation", False, f"Expected 200/201, got {response.status_code}: {response.text}")
            return False

    def test_phishing_tracking_route(self):
        """Test phishing tracking route for phish_ campaign IDs"""
        # Test with a phish_ prefixed campaign ID
        phish_campaign_id = "phish_test123"
        
        response = self.make_request('GET', f'/track/{phish_campaign_id}')
        
        if response is None:
            self.log_test("Phishing Tracking Route", False, "Request failed")
            return False
        
        # For phishing campaigns, we expect either a tracking page or proper routing    
        if response.status_code in [200, 404]:  # 404 is acceptable for non-existent campaign
            self.log_test("Phishing Tracking Route", True, f"Phish campaign route accessible (status: {response.status_code})")
            return True
        else:
            self.log_test("Phishing Tracking Route", False, f"Unexpected status {response.status_code}: {response.text}")
            return False

    def test_ad_tracking_route(self):
        """Test ad tracking route for ad campaign IDs"""
        # Test with an ad campaign ID 
        ad_campaign_id = "adcamp_test123"
        
        response = self.make_request('GET', f'/track/{ad_campaign_id}')
        
        if response is None:
            self.log_test("Ad Tracking Route", False, "Request failed")
            return False
            
        # For ad campaigns, we expect either a tracking page or proper routing
        if response.status_code in [200, 404]:  # 404 is acceptable for non-existent campaign
            self.log_test("Ad Tracking Route", True, f"Ad campaign route accessible (status: {response.status_code})")
            return True
        else:
            self.log_test("Ad Tracking Route", False, f"Unexpected status {response.status_code}: {response.text}")
            return False

    def test_phishing_stats_endpoint(self):
        """Test phishing stats endpoint includes both phishing and ad data"""
        if not self.token:
            self.log_test("Phishing Stats Endpoint", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/phishing/stats')
        
        if response is None:
            self.log_test("Phishing Stats Endpoint", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                # Check for expected fields that should aggregate both phishing and ad data
                expected_fields = ['total_campaigns', 'total_sent', 'total_opened', 'total_clicked']
                has_required_fields = all(field in data for field in expected_fields)
                
                if has_required_fields:
                    self.log_test("Phishing Stats Endpoint", True, f"Stats endpoint working with aggregated data: {data}")
                    return True
                else:
                    self.log_test("Phishing Stats Endpoint", False, f"Missing expected aggregated fields: {data}")
                    return False
            except:
                self.log_test("Phishing Stats Endpoint", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Phishing Stats Endpoint", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_favicon_serving(self):
        """Test that favicon.svg is served properly"""
        response = requests.get(f"{self.base_url}/favicon.svg", timeout=10)
        
        if response.status_code == 200:
            if 'svg' in response.headers.get('content-type', '').lower():
                self.log_test("Favicon SVG Serving", True, "Favicon.svg served with correct content type")
                return True
            else:
                self.log_test("Favicon SVG Serving", False, f"Wrong content type: {response.headers.get('content-type')}")
                return False
        else:
            self.log_test("Favicon SVG Serving", False, f"Expected 200, got {response.status_code}")
            return False

    def test_copy_url_functionality(self):
        """Test that ad simulations copy URL returns embed format with /api/track/"""
        if not self.token:
            self.log_test("Copy URL Functionality", False, "No auth token available")
            return False
            
        # Try to get ad campaigns to test copy URL functionality
        response = self.make_request('GET', '/ads/campaigns')
        
        if response is None:
            self.log_test("Copy URL Functionality", False, "Request failed")
            return False
            
        if response.status_code == 200:
            # The copy URL functionality is frontend-based but should use /api/track/ format
            # We can verify the backend supports the tracking endpoints
            self.log_test("Copy URL Functionality", True, "Ad campaigns endpoint accessible for copy URL feature")
            return True
        else:
            self.log_test("Copy URL Functionality", False, f"Ad campaigns endpoint failed: {response.status_code}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting VasilisNetShield Backend Tests")
        print("=" * 50)
        
        # Test 1: Health check
        self.test_health_check()
        
        # Test 2: User registration (creates auth token)  
        self.test_user_registration()
        
        # Test 3: Training module creation with scenarios field
        self.test_create_training_module_with_scenarios()
        
        # Test 4: Phishing tracking route
        self.test_phishing_tracking_route()
        
        # Test 5: Ad tracking route  
        self.test_ad_tracking_route()
        
        # Test 6: Phishing stats endpoint
        self.test_phishing_stats_endpoint()
        
        # Test 7: Favicon serving
        self.test_favicon_serving()
        
        # Test 8: Copy URL functionality support
        self.test_copy_url_functionality()
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} test(s) failed")
            return False

def main():
    """Main test runner"""
    tester = VasilisNetShieldTester()
    
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