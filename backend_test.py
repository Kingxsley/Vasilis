#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class VasilisNetShieldAPITester:
    def __init__(self, base_url="https://cyber-sim-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            'organizations': [],
            'users': [],
            'campaigns': [],
            'sessions': []
        }
        
        # Set up session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'VasilisNetShield-Test-Suite/1.0'
        })

    def log_test(self, name: str, success: bool, details: str = "", expected: Any = None, actual: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            if expected is not None and actual is not None:
                print(f"   Expected: {expected}")
                print(f"   Actual: {actual}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details,
            'expected': expected,
            'actual': actual,
            'timestamp': datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root endpoint
        response = self.make_request('GET', '', auth_required=False)
        if response and response.status_code == 200:
            self.log_test("Root API endpoint", True)
        else:
            self.log_test("Root API endpoint", False, f"Status: {response.status_code if response else 'No response'}")

    def test_registration_flow(self):
        """Test user registration - first user becomes super_admin"""
        print("\n🔍 Testing Registration Flow...")
        
        # Generate unique test data
        timestamp = int(time.time())
        test_email = f"admin.test.{timestamp}@vasilisnetshield.com"
        test_password = "SecurePassword123!"
        test_name = f"Admin Test {timestamp}"
        
        # Test registration
        registration_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = self.make_request('POST', 'auth/register', registration_data, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.token = data['token']
                self.user_id = data['user']['user_id']
                user_role = data['user']['role']
                
                # Check if first user is super_admin
                if user_role == 'super_admin':
                    self.log_test("User registration (first user = super_admin)", True)
                else:
                    self.log_test("User registration", True, f"Role: {user_role} (may not be first user)")
                    
                self.log_test("JWT token generation", True)
            else:
                self.log_test("Registration response format", False, "Missing token or user data")
        else:
            self.log_test("User registration", False, 
                        f"Status: {response.status_code if response else 'No response'}")

    def test_login_flow(self):
        """Test user login"""
        print("\n🔍 Testing Login Flow...")
        
        if not self.token:
            print("⚠️  Skipping login test - no registered user available")
            return
            
        # We'll test with a second user login after creating one
        timestamp = int(time.time())
        test_email = f"user.test.{timestamp}@vasilisnetshield.com"
        test_password = "UserPassword123!"
        
        # First create a user via admin endpoint
        user_data = {
            "email": test_email,
            "password": test_password,
            "name": f"Regular User {timestamp}",
            "role": "trainee"
        }
        
        create_response = self.make_request('POST', 'users', user_data)
        if create_response and create_response.status_code == 200:
            # Now try to login with this user
            login_data = {
                "email": test_email,
                "password": test_password
            }
            
            response = self.make_request('POST', 'auth/login', login_data, auth_required=False)
            if response and response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.log_test("User login", True)
                else:
                    self.log_test("Login response format", False, "Missing token or user data")
            else:
                self.log_test("User login", False, 
                            f"Status: {response.status_code if response else 'No response'}")
        else:
            print("⚠️  Skipping login test - could not create test user")

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        if not self.token:
            self.log_test("Auth me endpoint", False, "No token available")
            return
            
        response = self.make_request('GET', 'auth/me')
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['user_id', 'email', 'name', 'role']
            
            if all(field in data for field in required_fields):
                self.log_test("Auth me endpoint", True)
            else:
                missing_fields = [f for f in required_fields if f not in data]
                self.log_test("Auth me response format", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Auth me endpoint", False, 
                        f"Status: {response.status_code if response else 'No response'}")

    def test_organizations_crud(self):
        """Test Organizations CRUD operations"""
        print("\n🔍 Testing Organizations CRUD...")
        
        if not self.token:
            print("⚠️  Skipping organizations test - no auth token")
            return
            
        # CREATE
        org_data = {
            "name": f"Test Organization {int(time.time())}",
            "domain": "testorg.com",
            "description": "Test organization for API testing"
        }
        
        response = self.make_request('POST', 'organizations', org_data)
        if response and response.status_code == 200:
            org = response.json()
            org_id = org.get('organization_id')
            if org_id:
                self.created_resources['organizations'].append(org_id)
                self.log_test("Create organization", True)
                
                # READ (single)
                get_response = self.make_request('GET', f'organizations/{org_id}')
                if get_response and get_response.status_code == 200:
                    self.log_test("Get single organization", True)
                else:
                    self.log_test("Get single organization", False)
                
                # UPDATE
                update_data = {"description": "Updated test organization"}
                patch_response = self.make_request('PATCH', f'organizations/{org_id}', update_data)
                if patch_response and patch_response.status_code == 200:
                    self.log_test("Update organization", True)
                else:
                    self.log_test("Update organization", False)
                    
            else:
                self.log_test("Create organization", False, "No organization_id returned")
        else:
            self.log_test("Create organization", False, 
                        f"Status: {response.status_code if response else 'No response'}")
        
        # LIST
        list_response = self.make_request('GET', 'organizations')
        if list_response and list_response.status_code == 200:
            orgs = list_response.json()
            if isinstance(orgs, list):
                self.log_test("List organizations", True, f"Found {len(orgs)} organizations")
            else:
                self.log_test("List organizations", False, "Response is not a list")
        else:
            self.log_test("List organizations", False)

    def test_users_crud(self):
        """Test Users CRUD operations"""
        print("\n🔍 Testing Users CRUD...")
        
        if not self.token:
            print("⚠️  Skipping users test - no auth token")
            return
            
        # CREATE
        timestamp = int(time.time())
        user_data = {
            "email": f"testuser.{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": f"Test User {timestamp}",
            "role": "trainee"
        }
        
        response = self.make_request('POST', 'users', user_data)
        if response and response.status_code == 200:
            user = response.json()
            user_id = user.get('user_id')
            if user_id:
                self.created_resources['users'].append(user_id)
                self.log_test("Create user", True)
                
                # READ (single)
                get_response = self.make_request('GET', f'users/{user_id}')
                if get_response and get_response.status_code == 200:
                    self.log_test("Get single user", True)
                else:
                    self.log_test("Get single user", False)
                
                # UPDATE
                update_data = {"name": f"Updated User {timestamp}"}
                patch_response = self.make_request('PATCH', f'users/{user_id}', update_data)
                if patch_response and patch_response.status_code == 200:
                    self.log_test("Update user", True)
                else:
                    self.log_test("Update user", False)
                    
            else:
                self.log_test("Create user", False, "No user_id returned")
        else:
            self.log_test("Create user", False, 
                        f"Status: {response.status_code if response else 'No response'}")
        
        # LIST
        list_response = self.make_request('GET', 'users')
        if list_response and list_response.status_code == 200:
            users = list_response.json()
            if isinstance(users, list):
                self.log_test("List users", True, f"Found {len(users)} users")
            else:
                self.log_test("List users", False, "Response is not a list")
        else:
            self.log_test("List users", False)

    def test_campaigns_crud(self):
        """Test Campaigns CRUD operations"""
        print("\n🔍 Testing Campaigns CRUD...")
        
        if not self.token:
            print("⚠️  Skipping campaigns test - no auth token")
            return
        
        # Need an organization for campaign
        if not self.created_resources['organizations']:
            print("⚠️  Skipping campaigns test - no organization available")
            return
            
        org_id = self.created_resources['organizations'][0]
        
        # CREATE
        timestamp = int(time.time())
        campaign_data = {
            "name": f"Test Campaign {timestamp}",
            "organization_id": org_id,
            "campaign_type": "phishing",
            "description": "Test phishing campaign",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-12-31T23:59:59Z"
        }
        
        response = self.make_request('POST', 'campaigns', campaign_data)
        if response and response.status_code == 200:
            campaign = response.json()
            campaign_id = campaign.get('campaign_id')
            if campaign_id:
                self.created_resources['campaigns'].append(campaign_id)
                self.log_test("Create campaign", True)
                
                # READ (single)
                get_response = self.make_request('GET', f'campaigns/{campaign_id}')
                if get_response and get_response.status_code == 200:
                    self.log_test("Get single campaign", True)
                else:
                    self.log_test("Get single campaign", False)
                
                # UPDATE
                update_data = {"status": "active"}
                patch_response = self.make_request('PATCH', f'campaigns/{campaign_id}', update_data)
                if patch_response and patch_response.status_code == 200:
                    self.log_test("Update campaign", True)
                else:
                    self.log_test("Update campaign", False)
                    
            else:
                self.log_test("Create campaign", False, "No campaign_id returned")
        else:
            self.log_test("Create campaign", False, 
                        f"Status: {response.status_code if response else 'No response'}")
        
        # LIST
        list_response = self.make_request('GET', 'campaigns')
        if list_response and list_response.status_code == 200:
            campaigns = list_response.json()
            if isinstance(campaigns, list):
                self.log_test("List campaigns", True, f"Found {len(campaigns)} campaigns")
            else:
                self.log_test("List campaigns", False, "Response is not a list")
        else:
            self.log_test("List campaigns", False)

    def test_training_modules(self):
        """Test Training Modules endpoints"""
        print("\n🔍 Testing Training Modules...")
        
        if not self.token:
            print("⚠️  Skipping training modules test - no auth token")
            return
            
        # LIST modules
        response = self.make_request('GET', 'training/modules')
        if response and response.status_code == 200:
            modules = response.json()
            if isinstance(modules, list) and len(modules) == 3:
                self.log_test("List training modules", True, f"Found {len(modules)} modules")
                
                # Check module structure and types
                expected_types = ['phishing', 'ads', 'social_engineering']
                found_types = [m.get('module_type') for m in modules]
                
                if all(t in found_types for t in expected_types):
                    self.log_test("Training modules content", True, "All 3 module types present")
                else:
                    self.log_test("Training modules content", False, 
                                f"Expected {expected_types}, found {found_types}")
                
                # Test getting single module
                if modules:
                    module_id = modules[0].get('module_id')
                    if module_id:
                        get_response = self.make_request('GET', f'training/modules/{module_id}')
                        if get_response and get_response.status_code == 200:
                            self.log_test("Get single training module", True)
                        else:
                            self.log_test("Get single training module", False)
            else:
                self.log_test("List training modules", False, 
                            f"Expected 3 modules, got {len(modules) if modules else 0}")
        else:
            self.log_test("List training modules", False)

    def test_training_sessions(self):
        """Test Training Sessions"""
        print("\n🔍 Testing Training Sessions...")
        
        if not self.token:
            print("⚠️  Skipping training sessions test - no auth token")
            return
            
        # Start a training session
        session_data = {
            "module_id": "mod_phishing_email"
        }
        
        response = self.make_request('POST', 'training/sessions', session_data)
        if response and response.status_code == 200:
            session = response.json()
            session_id = session.get('session_id')
            if session_id:
                self.created_resources['sessions'].append(session_id)
                self.log_test("Start training session", True)
                
                # Get current scenario
                scenario_response = self.make_request('GET', f'training/sessions/{session_id}/scenario')
                if scenario_response and scenario_response.status_code == 200:
                    scenario = scenario_response.json()
                    scenario_id = scenario.get('scenario_id')
                    self.log_test("Get training scenario", True)
                    
                    # Submit an answer
                    if scenario_id:
                        answer_data = {
                            "scenario_id": scenario_id,
                            "answer": "unsafe"
                        }
                        answer_response = self.make_request('POST', f'training/sessions/{session_id}/answer', answer_data)
                        if answer_response and answer_response.status_code == 200:
                            self.log_test("Submit training answer", True)
                        else:
                            self.log_test("Submit training answer", False)
                else:
                    self.log_test("Get training scenario", False)
                    
                # Get session info
                session_info_response = self.make_request('GET', f'training/sessions/{session_id}')
                if session_info_response and session_info_response.status_code == 200:
                    self.log_test("Get training session info", True)
                else:
                    self.log_test("Get training session info", False)
                    
            else:
                self.log_test("Start training session", False, "No session_id returned")
        else:
            self.log_test("Start training session", False, 
                        f"Status: {response.status_code if response else 'No response'}")
        
        # List sessions
        list_response = self.make_request('GET', 'training/sessions')
        if list_response and list_response.status_code == 200:
            sessions = list_response.json()
            if isinstance(sessions, list):
                self.log_test("List training sessions", True, f"Found {len(sessions)} sessions")
            else:
                self.log_test("List training sessions", False, "Response is not a list")
        else:
            self.log_test("List training sessions", False)

    def test_analytics_endpoints(self):
        """Test Analytics endpoints"""
        print("\n🔍 Testing Analytics...")
        
        if not self.token:
            print("⚠️  Skipping analytics test - no auth token")
            return
            
        # Dashboard stats
        response = self.make_request('GET', 'dashboard/stats')
        if response and response.status_code == 200:
            stats = response.json()
            expected_fields = ['total_organizations', 'total_users', 'total_campaigns', 
                             'active_campaigns', 'total_training_sessions', 'average_score']
            
            if all(field in stats for field in expected_fields):
                self.log_test("Dashboard stats", True)
            else:
                missing = [f for f in expected_fields if f not in stats]
                self.log_test("Dashboard stats", False, f"Missing fields: {missing}")
        else:
            self.log_test("Dashboard stats", False, 
                        f"Status: {response.status_code if response else 'No response'}")
        
        # Training analytics
        analytics_response = self.make_request('GET', 'analytics/training')
        if analytics_response and analytics_response.status_code == 200:
            analytics = analytics_response.json()
            if 'by_module' in analytics and 'recent_sessions' in analytics:
                self.log_test("Training analytics", True)
            else:
                self.log_test("Training analytics", False, "Missing expected fields")
        else:
            self.log_test("Training analytics", False)

    def test_ai_generation(self):
        """Test AI content generation"""
        print("\n🔍 Testing AI Content Generation...")
        
        if not self.token:
            print("⚠️  Skipping AI test - no auth token")
            return
            
        # Test AI generation
        ai_data = {
            "scenario_type": "phishing_email",
            "difficulty": "medium",
            "context": "Corporate environment test"
        }
        
        response = self.make_request('POST', 'ai/generate', ai_data)
        if response and response.status_code == 200:
            ai_result = response.json()
            if 'content' in ai_result and 'correct_answer' in ai_result and 'explanation' in ai_result:
                self.log_test("AI content generation", True)
            else:
                self.log_test("AI content generation", False, "Missing expected fields in response")
        else:
            self.log_test("AI content generation", False, 
                        f"Status: {response.status_code if response else 'No response'}")

    def cleanup_resources(self):
        """Clean up test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Note: We're not deleting resources in this test to avoid breaking the system
        # In a real test environment, you'd want to clean up
        pass

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting VasilisNetShield API Test Suite")
        print(f"Testing against: {self.base_url}")
        print(f"Started at: {datetime.now().isoformat()}")
        
        try:
            self.test_basic_endpoints()
            self.test_registration_flow()
            self.test_login_flow()
            self.test_auth_me()
            self.test_organizations_crud()
            self.test_users_crud()
            self.test_campaigns_crud()
            self.test_training_modules()
            self.test_training_sessions()
            self.test_analytics_endpoints()
            self.test_ai_generation()
            
        finally:
            self.cleanup_resources()
            
        # Print summary
        print(f"\n📊 Test Summary")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0%")
        
        return self.tests_passed == self.tests_run


def main():
    tester = VasilisNetShieldAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())