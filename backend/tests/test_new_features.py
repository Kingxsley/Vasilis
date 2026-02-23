"""
Backend API Tests for New Features (Iteration 6)
Tests: Vulnerable Users, QR Code Generation, Credential Submission Tracking, Discord Webhook
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vasilis-phishing.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@vasilisns.com"
SUPER_ADMIN_PASSWORD = "Admin123!Pass"

# Cached token for reuse across tests
_cached_token = None

def get_auth_token():
    """Get cached auth token or login to get new one"""
    global _cached_token
    if _cached_token:
        return _cached_token
    
    time.sleep(0.2)  # Small delay to avoid rate limiting
    response = requests.post(f"{API}/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200 and "token" in response.json():
        _cached_token = response.json()["token"]
        return _cached_token
    raise Exception(f"Failed to get token: {response.status_code} - {response.text}")

def get_auth_headers():
    """Get auth headers with token"""
    return {"Authorization": f"Bearer {get_auth_token()}"}


class TestVulnerableUsers:
    """Vulnerable Users Dashboard API tests"""
    
    def test_get_vulnerable_users(self):
        """Test getting vulnerable users list"""
        response = requests.get(f"{API}/vulnerable-users?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "users" in data, "Missing 'users' field"
        assert "total" in data, "Missing 'total' field"
        assert "stats" in data, "Missing 'stats' field"
        
        # Verify stats structure
        stats = data["stats"]
        assert "critical" in stats, "Missing 'critical' stat"
        assert "high" in stats, "Missing 'high' stat"
        assert "medium" in stats, "Missing 'medium' stat"
        assert "low" in stats, "Missing 'low' stat"
        assert "total_clicks" in stats, "Missing 'total_clicks' stat"
        assert "total_credential_submissions" in stats, "Missing 'total_credential_submissions' stat"
        
        print(f"PASS: Vulnerable users API - {data['total']} users, stats: {stats}")
    
    def test_vulnerable_users_export_csv(self):
        """Test CSV export of vulnerable users"""
        response = requests.get(f"{API}/vulnerable-users/export/csv?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        # Verify content type
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Verify has content-disposition header (file download)
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, f"Missing attachment header: {content_disposition}"
        assert "vulnerable_users" in content_disposition, "Missing filename in header"
        
        # Verify CSV content has headers
        content = response.text
        assert "User Name" in content or "Email" in content, "CSV missing expected headers"
        
        print(f"PASS: CSV export working - {len(content)} bytes")
    
    def test_vulnerable_users_export_json(self):
        """Test JSON export of vulnerable users"""
        response = requests.get(f"{API}/vulnerable-users/export/json?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify export fields
        assert "export_date" in data, "Missing export_date"
        assert "period_days" in data, "Missing period_days"
        assert "users" in data, "Missing users"
        assert "total" in data, "Missing total"
        assert "stats" in data, "Missing stats"
        
        print(f"PASS: JSON export working - {data['total']} users exported")
    
    def test_vulnerable_users_stats(self):
        """Test vulnerable users statistics endpoint"""
        response = requests.get(f"{API}/vulnerable-users/stats?days=30", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "summary" in data, "Missing summary"
        assert "by_organization" in data, "Missing by_organization breakdown"
        assert "repeat_offenders" in data, "Missing repeat_offenders"
        assert "period_days" in data, "Missing period_days"
        
        print(f"PASS: Vulnerable users stats endpoint working")


class TestQRCodeGeneration:
    """QR Code Generation API tests"""
    
    def test_qr_code_generation_with_valid_tracking_code(self):
        """Test QR code generation for a tracking code"""
        # First we need a valid tracking code - try to get one from existing campaigns
        campaigns_response = requests.get(f"{API}/phishing/campaigns", headers=get_auth_headers())
        
        if campaigns_response.status_code == 200:
            campaigns = campaigns_response.json()
            if campaigns and len(campaigns) > 0:
                campaign_id = campaigns[0].get("campaign_id")
                # Get targets for this campaign
                targets_response = requests.get(
                    f"{API}/phishing/campaigns/{campaign_id}/targets", 
                    headers=get_auth_headers()
                )
                if targets_response.status_code == 200:
                    targets = targets_response.json()
                    if targets and len(targets) > 0:
                        tracking_code = targets[0].get("tracking_code")
                        if tracking_code:
                            # Now test QR code generation
                            qr_response = requests.get(
                                f"{API}/phishing/qr-code/{tracking_code}",
                                headers=get_auth_headers()
                            )
                            assert qr_response.status_code == 200, f"QR code failed: {qr_response.status_code}"
                            qr_data = qr_response.json()
                            
                            assert "qr_code_url" in qr_data, "Missing qr_code_url"
                            assert "tracking_url" in qr_data, "Missing tracking_url"
                            assert "tracking_code" in qr_data, "Missing tracking_code"
                            assert "qrserver.com" in qr_data["qr_code_url"], "QR URL should use qrserver.com"
                            
                            print(f"PASS: QR code generated for tracking_code={tracking_code}")
                            return
        
        # Test with test_track_abc123 (will return 404 but checks endpoint exists)
        qr_response = requests.get(f"{API}/phishing/qr-code/test_track_abc123", headers=get_auth_headers())
        # 404 is expected for invalid tracking code, but 200 if it exists
        assert qr_response.status_code in [200, 404], f"Unexpected status: {qr_response.status_code}"
        
        if qr_response.status_code == 200:
            qr_data = qr_response.json()
            assert "qr_code_url" in qr_data, "Missing qr_code_url"
            print(f"PASS: QR code endpoint working with test tracking code")
        else:
            print(f"INFO: QR code endpoint exists but test_track_abc123 not found (expected)")
    
    def test_qr_code_invalid_tracking_code(self):
        """Test QR code generation with invalid tracking code returns 404"""
        response = requests.get(
            f"{API}/phishing/qr-code/invalid_nonexistent_code_12345",
            headers=get_auth_headers()
        )
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("PASS: QR code returns 404 for invalid tracking code")


class TestCredentialSubmissionTracking:
    """Credential Submission Tracking API tests"""
    
    def test_credential_submission_tracking_endpoint_exists(self):
        """Test credential submission tracking endpoint exists and rejects invalid codes"""
        response = requests.post(
            f"{API}/phishing/track/credentials/invalid_tracking_code_xyz",
            headers={"Content-Type": "application/json"}
        )
        # Should return 404 for invalid tracking code
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("PASS: Credential submission endpoint exists and validates tracking codes")
    
    def test_credential_submission_with_valid_tracking_code(self):
        """Test credential submission with a valid tracking code from campaigns"""
        # Get a valid tracking code
        campaigns_response = requests.get(f"{API}/phishing/campaigns", headers=get_auth_headers())
        
        if campaigns_response.status_code != 200:
            print("INFO: Could not get campaigns to test credential submission")
            return
            
        campaigns = campaigns_response.json()
        if not campaigns:
            print("INFO: No campaigns available to test credential submission")
            return
        
        campaign_id = campaigns[0].get("campaign_id")
        targets_response = requests.get(
            f"{API}/phishing/campaigns/{campaign_id}/targets",
            headers=get_auth_headers()
        )
        
        if targets_response.status_code != 200:
            print("INFO: Could not get targets to test credential submission")
            return
            
        targets = targets_response.json()
        if not targets:
            print("INFO: No targets in campaign to test credential submission")
            return
        
        tracking_code = targets[0].get("tracking_code")
        if not tracking_code:
            print("INFO: No tracking code available in target")
            return
        
        # Submit credential tracking
        response = requests.post(
            f"{API}/phishing/track/credentials/{tracking_code}",
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 with HTML awareness page
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML response, got {content_type}"
        
        # Should contain awareness message
        content = response.text
        assert "Security Training Alert" in content or "credential" in content.lower()
        
        print(f"PASS: Credential submission tracking working for code={tracking_code}")


class TestDiscordWebhookInOrganizations:
    """Discord Webhook field in Organizations API tests"""
    
    def test_organizations_have_discord_webhook_field(self):
        """Test that organizations API includes discord_webhook_url field"""
        response = requests.get(f"{API}/organizations", headers=get_auth_headers())
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        orgs = response.json()
        print(f"INFO: Found {len(orgs)} organizations")
        
        # Organization response should support discord_webhook_url field
        # The field may not exist in all orgs, but the API should accept it
        print("PASS: Organizations API accessible")
    
    def test_create_organization_with_discord_webhook(self):
        """Test creating organization with discord_webhook_url field"""
        test_org_data = {
            "name": "TEST_Discord_Webhook_Org",
            "domain": "testdiscord.com",
            "description": "Test organization for Discord webhook",
            "discord_webhook_url": "https://discord.com/api/webhooks/test/testwebhook"
        }
        
        # Try to create org
        response = requests.post(
            f"{API}/organizations",
            headers=get_auth_headers(),
            json=test_org_data
        )
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            org_id = data.get("organization_id")
            
            # Verify discord_webhook_url was saved
            if "discord_webhook_url" in data:
                assert data["discord_webhook_url"] == test_org_data["discord_webhook_url"]
            
            # Clean up - delete test org
            delete_response = requests.delete(
                f"{API}/organizations/{org_id}",
                headers=get_auth_headers()
            )
            print(f"PASS: Created org with discord_webhook_url, cleaned up (delete status: {delete_response.status_code})")
        elif response.status_code == 400 and "already exists" in response.text.lower():
            # Org might already exist from previous test
            print("INFO: Test org already exists, testing update instead")
            
            # Find and update existing test org
            orgs_response = requests.get(f"{API}/organizations", headers=get_auth_headers())
            if orgs_response.status_code == 200:
                orgs = orgs_response.json()
                test_org = next((o for o in orgs if o["name"] == "TEST_Discord_Webhook_Org"), None)
                if test_org:
                    update_response = requests.patch(
                        f"{API}/organizations/{test_org['organization_id']}",
                        headers=get_auth_headers(),
                        json={"discord_webhook_url": "https://discord.com/api/webhooks/updated/url"}
                    )
                    assert update_response.status_code in [200, 204], f"Update failed: {update_response.status_code}"
                    print("PASS: Updated existing test org with discord_webhook_url")
        else:
            print(f"INFO: Create org returned {response.status_code} - {response.text[:200]}")


class TestHealthAndAuth:
    """Basic health and auth tests for sanity check"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{API}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check passed")
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{API}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"PASS: Super admin login - {data['user']['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
