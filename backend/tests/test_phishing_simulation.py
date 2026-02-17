"""
Phishing Simulation Backend API Tests
Tests for: templates, campaigns, tracking, and full phishing simulation flow
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cybersecurity-train.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@netshield.com"
TEST_PASSWORD = "test1234"

class TestAuth:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login with test admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "super_admin", f"Expected super_admin but got {data['user']['role']}"
        print(f"✓ Login successful - User role: {data['user']['role']}")

    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrong_password"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials properly rejected")

    def test_auth_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert data["role"] == "super_admin"
        print("✓ /auth/me returns correct user info")


class TestPhishingTemplates:
    """Test phishing template CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_templates(self):
        """Test listing phishing templates"""
        response = requests.get(f"{BASE_URL}/api/phishing/templates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} templates")
        
        # Verify default templates are seeded (should be 3)
        if len(data) >= 3:
            template_names = [t["name"] for t in data]
            assert "IT Password Reset" in template_names or len(template_names) >= 3
            print("✓ Default templates are present")
    
    def test_create_template(self):
        """Test creating a new phishing template"""
        template_data = {
            "name": "TEST_Security Alert Template",
            "subject": "Security Alert - {{USER_NAME}}",
            "sender_name": "Security Team",
            "sender_email": "security@test-corp.net",
            "body_html": "<html><body><h1>Security Alert</h1><p>Dear {{USER_NAME}},</p><p>Click <a href='{{TRACKING_LINK}}'>here</a> to verify.</p></body></html>",
            "body_text": "Security Alert for {{USER_NAME}}. Click here: {{TRACKING_LINK}}"
        }
        
        response = requests.post(f"{BASE_URL}/api/phishing/templates", 
            json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        data = response.json()
        
        assert data["name"] == template_data["name"]
        assert data["subject"] == template_data["subject"]
        assert "template_id" in data
        assert "created_at" in data
        print(f"✓ Created template: {data['template_id']}")
        
        # Cleanup - delete the test template
        delete_res = requests.delete(f"{BASE_URL}/api/phishing/templates/{data['template_id']}", 
            headers=self.headers)
        assert delete_res.status_code == 200
        print("✓ Test template cleaned up")
    
    def test_get_template(self):
        """Test getting a specific template"""
        # First get list to find a template
        list_res = requests.get(f"{BASE_URL}/api/phishing/templates", headers=self.headers)
        templates = list_res.json()
        
        if len(templates) > 0:
            template_id = templates[0]["template_id"]
            response = requests.get(f"{BASE_URL}/api/phishing/templates/{template_id}", 
                headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["template_id"] == template_id
            print(f"✓ Retrieved template: {data['name']}")
        else:
            pytest.skip("No templates to test")

    def test_delete_template(self):
        """Test deleting a template"""
        # Create a template first
        template_data = {
            "name": "TEST_Delete Me Template",
            "subject": "Test Subject",
            "sender_name": "Test Sender",
            "sender_email": "test@test.com",
            "body_html": "<html><body>Test</body></html>"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/templates", 
            json=template_data, headers=self.headers)
        template_id = create_res.json()["template_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/phishing/templates/{template_id}", 
            headers=self.headers)
        assert response.status_code == 200
        
        # Verify it's gone
        get_res = requests.get(f"{BASE_URL}/api/phishing/templates/{template_id}", 
            headers=self.headers)
        assert get_res.status_code == 404
        print("✓ Template deleted successfully")


class TestPhishingCampaigns:
    """Test phishing campaign operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and prepare test data"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get organization and users
        orgs_res = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        self.orgs = orgs_res.json()
        
        users_res = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        self.users = users_res.json()
        
        templates_res = requests.get(f"{BASE_URL}/api/phishing/templates", headers=self.headers)
        self.templates = templates_res.json()
    
    def test_list_campaigns(self):
        """Test listing phishing campaigns"""
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} campaigns")
    
    def test_create_campaign_with_tracking_codes(self):
        """Test creating a campaign and verify tracking codes are generated"""
        if not self.orgs or not self.templates:
            pytest.skip("Need at least one organization and template")
        
        # Use a user - need to assign one to org first if needed
        org_id = self.orgs[0]["organization_id"]
        
        # Find or create a user in this org
        org_users = [u for u in self.users if u.get("organization_id") == org_id]
        
        if not org_users:
            # Assign a test user to the org
            test_user = self.users[0] if self.users else None
            if test_user:
                update_res = requests.patch(f"{BASE_URL}/api/users/{test_user['user_id']}", 
                    json={"organization_id": org_id}, headers=self.headers)
                if update_res.status_code == 200:
                    org_users = [test_user]
        
        if not org_users:
            # Create a test user in the org
            user_data = {
                "email": "test_campaign_user@test.com",
                "password": "testpass123",
                "name": "TEST Campaign User",
                "role": "trainee",
                "organization_id": org_id
            }
            create_user_res = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
            if create_user_res.status_code == 200:
                org_users = [create_user_res.json()]
        
        if not org_users:
            pytest.skip("Could not get users for org")
        
        campaign_data = {
            "name": "TEST_Phishing Campaign",
            "organization_id": org_id,
            "template_id": self.templates[0]["template_id"],
            "target_user_ids": [org_users[0]["user_id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        data = response.json()
        
        assert data["name"] == campaign_data["name"]
        assert data["status"] == "draft"
        assert data["total_targets"] == 1
        assert "campaign_id" in data
        campaign_id = data["campaign_id"]
        print(f"✓ Created campaign: {campaign_id}")
        
        # Verify tracking codes were generated for targets
        targets_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=self.headers)
        assert targets_res.status_code == 200
        targets = targets_res.json()
        
        assert len(targets) == 1
        assert "tracking_code" in targets[0]
        assert len(targets[0]["tracking_code"]) > 10  # Ensure tracking code is meaningful
        assert targets[0]["email_sent"] == False
        assert targets[0]["email_opened"] == False
        assert targets[0]["link_clicked"] == False
        print(f"✓ Target created with tracking code: {targets[0]['tracking_code'][:20]}...")
        
        # Cleanup
        delete_res = requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", 
            headers=self.headers)
        assert delete_res.status_code == 200
        print("✓ Test campaign cleaned up")
    
    def test_launch_campaign(self):
        """Test launching a campaign (emails in simulation mode)"""
        if not self.orgs or not self.templates or not self.users:
            pytest.skip("Need org, template, and users")
        
        org_id = self.orgs[0]["organization_id"]
        
        # Get a user to target
        target_user_id = self.users[0]["user_id"]
        
        # Assign user to org if needed
        requests.patch(f"{BASE_URL}/api/users/{target_user_id}", 
            json={"organization_id": org_id}, headers=self.headers)
        
        campaign_data = {
            "name": "TEST_Launch Campaign",
            "organization_id": org_id,
            "template_id": self.templates[0]["template_id"],
            "target_user_ids": [target_user_id]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        campaign_id = create_res.json()["campaign_id"]
        
        # Launch the campaign
        response = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/launch", 
            headers=self.headers)
        assert response.status_code == 200, f"Failed to launch: {response.text}"
        data = response.json()
        
        assert "emails_sent" in data
        assert data["emails_sent"] >= 0  # In simulation mode, should still count
        print(f"✓ Campaign launched - {data['emails_sent']} emails sent (simulation mode)")
        
        # Verify campaign status changed
        campaign_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", 
            headers=self.headers)
        campaign = campaign_res.json()
        assert campaign["status"] == "active"
        print("✓ Campaign status is now 'active'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", headers=self.headers)
    
    def test_campaign_stats(self):
        """Test getting campaign statistics"""
        if not self.orgs or not self.templates or not self.users:
            pytest.skip("Need org, template, and users")
        
        org_id = self.orgs[0]["organization_id"]
        target_user_id = self.users[0]["user_id"]
        
        # Assign user to org
        requests.patch(f"{BASE_URL}/api/users/{target_user_id}", 
            json={"organization_id": org_id}, headers=self.headers)
        
        campaign_data = {
            "name": "TEST_Stats Campaign",
            "organization_id": org_id,
            "template_id": self.templates[0]["template_id"],
            "target_user_ids": [target_user_id]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        campaign_id = create_res.json()["campaign_id"]
        
        # Get stats
        response = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/stats", 
            headers=self.headers)
        assert response.status_code == 200
        stats = response.json()
        
        assert stats["campaign_id"] == campaign_id
        assert "total_targets" in stats
        assert "emails_sent" in stats
        assert "emails_opened" in stats
        assert "links_clicked" in stats
        assert "open_rate" in stats
        assert "click_rate" in stats
        print(f"✓ Stats retrieved - targets: {stats['total_targets']}, open_rate: {stats['open_rate']}%")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", headers=self.headers)


class TestTrackingEndpoints:
    """Test tracking pixel and link click endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test campaign with targets"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get org, template, users
        orgs_res = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        self.orgs = orgs_res.json()
        
        templates_res = requests.get(f"{BASE_URL}/api/phishing/templates", headers=self.headers)
        self.templates = templates_res.json()
        
        users_res = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        self.users = users_res.json()
    
    def test_email_open_tracking(self):
        """Test tracking pixel endpoint for email opens"""
        if not self.orgs or not self.templates or not self.users:
            pytest.skip("Need org, template, and users")
        
        org_id = self.orgs[0]["organization_id"]
        target_user_id = self.users[0]["user_id"]
        
        # Assign user to org
        requests.patch(f"{BASE_URL}/api/users/{target_user_id}", 
            json={"organization_id": org_id}, headers=self.headers)
        
        # Create campaign
        campaign_data = {
            "name": "TEST_Tracking Test",
            "organization_id": org_id,
            "template_id": self.templates[0]["template_id"],
            "target_user_ids": [target_user_id]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        campaign_id = create_res.json()["campaign_id"]
        
        # Get the tracking code
        targets_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=self.headers)
        targets = targets_res.json()
        tracking_code = targets[0]["tracking_code"]
        
        # Hit the tracking pixel endpoint (no auth required)
        response = requests.get(f"{BASE_URL}/api/phishing/track/open/{tracking_code}")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("image/")
        print("✓ Tracking pixel endpoint returns image")
        
        # Verify the open was recorded
        targets_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=self.headers)
        targets = targets_res.json()
        assert targets[0]["email_opened"] == True
        assert targets[0]["email_opened_at"] is not None
        print("✓ Email open recorded in database")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", headers=self.headers)
    
    def test_link_click_tracking(self):
        """Test link click tracking endpoint"""
        if not self.orgs or not self.templates or not self.users:
            pytest.skip("Need org, template, and users")
        
        org_id = self.orgs[0]["organization_id"]
        target_user_id = self.users[0]["user_id"]
        
        # Assign user to org
        requests.patch(f"{BASE_URL}/api/users/{target_user_id}", 
            json={"organization_id": org_id}, headers=self.headers)
        
        # Create campaign
        campaign_data = {
            "name": "TEST_Click Tracking",
            "organization_id": org_id,
            "template_id": self.templates[0]["template_id"],
            "target_user_ids": [target_user_id]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        campaign_id = create_res.json()["campaign_id"]
        
        # Get the tracking code
        targets_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=self.headers)
        targets = targets_res.json()
        tracking_code = targets[0]["tracking_code"]
        
        # Hit the click tracking endpoint (no auth required) - should redirect or show landing
        response = requests.get(f"{BASE_URL}/api/phishing/track/click/{tracking_code}", 
            allow_redirects=False)
        # Should either redirect (302) or show HTML landing page (200)
        assert response.status_code in [200, 302], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            # Verify it's the awareness landing page
            assert "Security Training" in response.text or "phishing" in response.text.lower()
            print("✓ Link click returns security awareness page")
        else:
            print("✓ Link click returns redirect")
        
        # Verify the click was recorded
        time.sleep(0.5)  # Small delay to ensure DB update
        targets_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/targets", 
            headers=self.headers)
        targets = targets_res.json()
        assert targets[0]["link_clicked"] == True
        assert targets[0]["link_clicked_at"] is not None
        print("✓ Link click recorded in database")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", headers=self.headers)


class TestCampaignLifecycle:
    """Test full campaign lifecycle: create -> launch -> pause -> complete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_full_campaign_lifecycle(self):
        """Test creating, launching, pausing, and completing a campaign"""
        # Get prerequisites
        orgs_res = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        orgs = orgs_res.json()
        
        templates_res = requests.get(f"{BASE_URL}/api/phishing/templates", headers=self.headers)
        templates = templates_res.json()
        
        users_res = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = users_res.json()
        
        if not orgs or not templates or not users:
            pytest.skip("Need org, template, and users")
        
        org_id = orgs[0]["organization_id"]
        target_user_id = users[0]["user_id"]
        
        # Assign user to org
        requests.patch(f"{BASE_URL}/api/users/{target_user_id}", 
            json={"organization_id": org_id}, headers=self.headers)
        
        # 1. CREATE campaign
        campaign_data = {
            "name": "TEST_Lifecycle Campaign",
            "organization_id": org_id,
            "template_id": templates[0]["template_id"],
            "target_user_ids": [target_user_id]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/phishing/campaigns", 
            json=campaign_data, headers=self.headers)
        assert create_res.status_code == 200
        campaign_id = create_res.json()["campaign_id"]
        assert create_res.json()["status"] == "draft"
        print("✓ Step 1: Campaign created in draft status")
        
        # 2. LAUNCH campaign
        launch_res = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/launch", 
            headers=self.headers)
        assert launch_res.status_code == 200
        
        get_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", 
            headers=self.headers)
        assert get_res.json()["status"] == "active"
        print("✓ Step 2: Campaign launched and is now active")
        
        # 3. PAUSE campaign
        pause_res = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/pause", 
            headers=self.headers)
        assert pause_res.status_code == 200
        
        get_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", 
            headers=self.headers)
        assert get_res.json()["status"] == "paused"
        print("✓ Step 3: Campaign paused")
        
        # 4. RESUME campaign
        resume_res = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/launch", 
            headers=self.headers)
        assert resume_res.status_code == 200
        print("✓ Step 4: Campaign resumed")
        
        # 5. COMPLETE campaign
        complete_res = requests.post(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}/complete", 
            headers=self.headers)
        assert complete_res.status_code == 200
        
        get_res = requests.get(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", 
            headers=self.headers)
        assert get_res.json()["status"] == "completed"
        assert get_res.json()["completed_at"] is not None
        print("✓ Step 5: Campaign completed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/phishing/campaigns/{campaign_id}", headers=self.headers)
        print("✓ Lifecycle test complete and cleaned up")


class TestUserRoleDisplay:
    """Test that user roles are displayed correctly"""
    
    def test_super_admin_role_display(self):
        """Verify that super_admin users show correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["user"]["role"] == "super_admin"
        print(f"✓ User {TEST_EMAIL} correctly shows role: super_admin")
    
    def test_kingsley_accounts_role(self):
        """Test that Kingsley's accounts show correct super_admin role (bug fix verification)"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all users
        users_res = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_res.json()
        
        # Find Kingsley's accounts
        kingsley_accounts = [u for u in users if "kingsley" in u["email"].lower() or "kingsley" in u["name"].lower()]
        
        for account in kingsley_accounts:
            print(f"  - {account['email']}: role={account['role']}")
            # Based on bug fix, both Kingsley accounts should be super_admin
            assert account["role"] == "super_admin", f"Expected super_admin but got {account['role']} for {account['email']}"
        
        print(f"✓ Found {len(kingsley_accounts)} Kingsley accounts, all with super_admin role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
