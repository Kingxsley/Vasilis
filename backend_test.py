#!/usr/bin/env python3
"""
Backend API Testing for VasilisNetShield
Testing the specific endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class VasilisNetShieldTester:
    def __init__(self, base_url="https://cert-builder-21.preview.emergentagent.com"):
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

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint with and without organization_id parameter"""
        print("\n🔍 Testing Dashboard Stats...")
        if not self.token:
            self.log_test("Dashboard Stats", False, "No auth token available")
            return False
        
        # Test without organization_id
        response = self.make_request('GET', '/dashboard/stats')
        
        if response is None:
            self.log_test("Dashboard Stats (no org)", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and 'total_users' in data:
                    self.log_test("Dashboard Stats (no org)", True, f"Got stats: {data}")
                else:
                    self.log_test("Dashboard Stats (no org)", False, f"Invalid stats format: {data}")
                    return False
            except:
                self.log_test("Dashboard Stats (no org)", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Dashboard Stats (no org)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        # Test with organization_id parameter
        response = self.make_request('GET', '/dashboard/stats?organization_id=test_org')
        
        if response is None:
            self.log_test("Dashboard Stats (with org)", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict):
                    self.log_test("Dashboard Stats (with org)", True, f"Got filtered stats: {data}")
                    return True
                else:
                    self.log_test("Dashboard Stats (with org)", False, f"Invalid stats format: {data}")
                    return False
            except:
                self.log_test("Dashboard Stats (with org)", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Dashboard Stats (with org)", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_organizations(self):
        """Test fetching organizations"""
        print("\n🔍 Testing Organizations...")
        if not self.token:
            self.log_test("Organizations", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/organizations')
        
        if response is None:
            self.log_test("Organizations", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Organizations", True, f"Got {len(data)} organizations")
                    return True
                else:
                    self.log_test("Organizations", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("Organizations", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Organizations", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_cms_tiles(self):
        """Test fetching CMS tiles"""
        print("\n🔍 Testing CMS Tiles...")
        if not self.token:
            self.log_test("CMS Tiles", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/cms-tiles')
        
        if response is None:
            self.log_test("CMS Tiles", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and 'tiles' in data:
                    tiles = data['tiles']
                    self.log_test("CMS Tiles", True, f"Got {len(tiles)} CMS tiles")
                    return True
                else:
                    self.log_test("CMS Tiles", False, f"Expected dict with 'tiles' key, got: {data}")
                    return False
            except:
                self.log_test("CMS Tiles", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("CMS Tiles", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_cms_public_page(self):
        """Test public CMS page endpoint (should 404 if not found)"""
        print("\n🔍 Testing CMS Public Page...")
        
        # Test with a non-existent slug (should 404)
        response = self.make_request('GET', '/cms-tiles/public/page/test-slug')
        
        if response is None:
            self.log_test("CMS Public Page (404)", False, "Request failed")
            return False
            
        if response.status_code == 404:
            self.log_test("CMS Public Page (404)", True, "Correctly returns 404 for non-existent page")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                self.log_test("CMS Public Page (found)", True, f"Found public page: {data.get('name', 'Unknown')}")
                return True
            except:
                self.log_test("CMS Public Page (found)", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("CMS Public Page", False, f"Unexpected status code: {response.status_code}")
            return False

    def test_analytics_training(self):
        """Test analytics training endpoint"""
        print("\n🔍 Testing Analytics Training...")
        if not self.token:
            self.log_test("Analytics Training", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/analytics/training')
        
        if response is None:
            self.log_test("Analytics Training", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test("Analytics Training", True, f"Got training analytics: {type(data)}")
                return True
            except:
                self.log_test("Analytics Training", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Analytics Training", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_security_dashboard(self):
        """Test security dashboard endpoint"""
        print("\n🔍 Testing Security Dashboard...")
        if not self.token:
            self.log_test("Security Dashboard", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/security/dashboard')
        
        if response is None:
            self.log_test("Security Dashboard", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test("Security Dashboard", True, f"Got security dashboard: {type(data)}")
                return True
            except:
                self.log_test("Security Dashboard", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Security Dashboard", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_audit_logs(self):
        """Test audit logs endpoint"""
        print("\n🔍 Testing Audit Logs...")
        if not self.token:
            self.log_test("Audit Logs", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/security/audit-logs')
        
        if response is None:
            self.log_test("Audit Logs", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Audit Logs", True, f"Got {len(data)} audit logs")
                    return True
                elif isinstance(data, dict) and 'logs' in data:
                    logs = data['logs']
                    self.log_test("Audit Logs", True, f"Got {len(logs)} audit logs")
                    return True
                else:
                    self.log_test("Audit Logs", True, f"Got audit logs response: {type(data)}")
                    return True
            except:
                self.log_test("Audit Logs", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Audit Logs", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_activity_logs(self):
        """Test activity logs endpoint"""
        print("\n🔍 Testing Activity Logs...")
        if not self.token:
            self.log_test("Activity Logs", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/activity-logs')
        
        if response is None:
            self.log_test("Activity Logs", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Activity Logs", True, f"Got {len(data)} activity logs")
                    return True
                elif isinstance(data, dict) and 'logs' in data:
                    logs = data['logs']
                    self.log_test("Activity Logs", True, f"Got {len(logs)} activity logs")
                    return True
                else:
                    self.log_test("Activity Logs", True, f"Got activity logs response: {type(data)}")
                    return True
            except:
                self.log_test("Activity Logs", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Activity Logs", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_users_list(self):
        """Test users list endpoint with limit parameter"""
        print("\n🔍 Testing Users List...")
        if not self.token:
            self.log_test("Users List", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/users?limit=10')
        
        if response is None:
            self.log_test("Users List", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Users List", True, f"Got {len(data)} users")
                    return True
                else:
                    self.log_test("Users List", False, f"Expected list, got: {type(data)}")
                    return False
            except:
                self.log_test("Users List", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Users List", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def test_password_policy(self):
        """Test password policy endpoint"""
        print("\n🔍 Testing Password Policy...")
        if not self.token:
            self.log_test("Password Policy", False, "No auth token available")
            return False
        
        response = self.make_request('GET', '/settings/password-policy')
        
        if response is None:
            self.log_test("Password Policy", False, "Request failed")
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_test("Password Policy", True, f"Got password policy: {type(data)}")
                return True
            except:
                self.log_test("Password Policy", False, f"Invalid JSON response: {response.text}")
                return False
        else:
            self.log_test("Password Policy", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting VasilisNetShield Backend API Tests")
        print("Testing endpoints from review request")
        print("=" * 70)
        
        # Test 1: Login with provided credentials
        if not self.test_login():
            print("❌ Cannot continue without login")
            return False
        
        # Test 2: Dashboard stats (with and without org_id)
        self.test_dashboard_stats()
        
        # Test 3: Organizations
        self.test_organizations()
        
        # Test 4: CMS tiles
        self.test_cms_tiles()
        
        # Test 5: CMS public page (should 404 for test-slug)
        self.test_cms_public_page()
        
        # Test 6: Analytics training
        self.test_analytics_training()
        
        # Test 7: Security dashboard
        self.test_security_dashboard()
        
        # Test 8: Audit logs
        self.test_audit_logs()
        
        # Test 9: Activity logs
        self.test_activity_logs()
        
        # Test 10: Users list with limit
        self.test_users_list()
        
        # Test 11: Password policy
        self.test_password_policy()
        
        print("\n" + "=" * 70)
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