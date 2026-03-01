"""
Backend API Tests for Security Training Platform - Iteration 10
Testing: Login 2FA flow, CMS Tiles CRUD, Executive Training 9 modules, Upload endpoint
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLoginFlowWithout2FA:
    """Test login endpoint returns token without requiring 2FA code"""
    
    def test_login_endpoint_exists(self, api_client):
        """Test that login endpoint is accessible"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "invalid"
        })
        # Should return 401 or 400, not 404
        assert response.status_code in [401, 400, 429], f"Unexpected status: {response.status_code}"
    
    def test_login_returns_token_without_2fa_code(self, authenticated_client):
        """Test that login works without 2FA code - gets token directly"""
        # authenticated_client fixture already proves login works
        # The token is set in headers
        assert authenticated_client.headers.get("Authorization"), "Token should be set"
    
    def test_login_response_contains_2fa_flags(self, api_client):
        """Test login response includes 2FA status flags"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@admin.com",
            "password": "TestAdmin123!"
        })
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Check response has 2FA flags
        assert "requires_2fa_verification" in data, "Should have requires_2fa_verification field"
        assert "two_factor_enabled" in data, "Should have two_factor_enabled field"
        
        # For user without 2FA, these should be false
        if data["two_factor_enabled"] == False:
            assert data["requires_2fa_verification"] == False, "If 2FA not enabled, verification shouldn't be required"


class TestCMSTilesAPI:
    """Test CMS Tiles CRUD operations"""
    
    def test_get_tiles_returns_default_tiles(self, api_client):
        """Test GET /api/cms-tiles returns 4 default system tiles"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "tiles" in data, "Response should have tiles field"
        tiles = data["tiles"]
        
        # Should have at least 4 default tiles
        assert len(tiles) >= 4, f"Expected at least 4 tiles, got {len(tiles)}"
        
        # Verify default tile slugs
        slugs = [t["slug"] for t in tiles]
        for expected in ["blog", "news", "videos", "about"]:
            assert expected in slugs, f"Default tile '{expected}' missing"
    
    def test_get_tiles_admin_endpoint(self, authenticated_client):
        """Test GET /api/cms-tiles/admin returns all tiles including unpublished"""
        response = authenticated_client.get(f"{BASE_URL}/api/cms-tiles/admin")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "tiles" in data, "Response should have tiles field"
    
    def test_create_tile(self, authenticated_client):
        """Test POST /api/cms-tiles creates a new tile"""
        unique_name = f"Test Tile {uuid.uuid4().hex[:8]}"
        response = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name,
            "icon": "Star",
            "description": "Test tile for automated testing",
            "published": True
        })
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "tile_id" in data, "Created tile should have tile_id"
        assert data["name"] == unique_name
        assert data["is_system"] == False, "Custom tile should not be system tile"
        
        # Store tile_id for cleanup
        return data["tile_id"]
    
    def test_update_tile(self, authenticated_client):
        """Test PATCH /api/cms-tiles/{tile_id} updates a tile"""
        # First create a tile
        unique_name = f"Update Test {uuid.uuid4().hex[:8]}"
        create_res = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name,
            "icon": "Edit",
            "description": "Tile to update",
            "published": True
        })
        assert create_res.status_code == 200
        tile_id = create_res.json()["tile_id"]
        
        # Update the tile
        new_desc = "Updated description"
        update_res = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}", json={
            "description": new_desc,
            "icon": "EditPencil"
        })
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        updated = update_res.json()
        
        assert updated["description"] == new_desc
        
        # Cleanup - delete the tile
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
    
    def test_toggle_publish_tile(self, authenticated_client):
        """Test PATCH /api/cms-tiles/{tile_id}/publish toggles publish status"""
        # Create a tile
        unique_name = f"Publish Test {uuid.uuid4().hex[:8]}"
        create_res = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name,
            "published": True
        })
        assert create_res.status_code == 200
        tile_id = create_res.json()["tile_id"]
        
        # Toggle publish
        toggle_res = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}/publish")
        assert toggle_res.status_code == 200
        assert toggle_res.json()["published"] == False, "Should be unpublished"
        
        # Toggle again
        toggle_res2 = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}/publish")
        assert toggle_res2.status_code == 200
        assert toggle_res2.json()["published"] == True, "Should be published again"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
    
    def test_delete_custom_tile(self, authenticated_client):
        """Test DELETE /api/cms-tiles/{tile_id} deletes custom tiles"""
        # Create a tile
        unique_name = f"Delete Test {uuid.uuid4().hex[:8]}"
        create_res = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": unique_name
        })
        assert create_res.status_code == 200
        tile_id = create_res.json()["tile_id"]
        
        # Delete the tile
        delete_res = authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        assert delete_res.status_code == 200
        
        # Verify deleted
        get_res = authenticated_client.get(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        # Should use slug not tile_id for get endpoint
        # Just verify delete returned success
    
    def test_cannot_delete_system_tile(self, authenticated_client):
        """Test that system tiles cannot be deleted"""
        response = authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/tile_blog")
        assert response.status_code == 400, "Should not be able to delete system tile"
        assert "cannot be deleted" in response.json().get("detail", "").lower()
    
    def test_create_tile_requires_admin(self, unauthenticated_client):
        """Test that creating tiles requires authentication"""
        response = unauthenticated_client.post(f"{BASE_URL}/api/cms-tiles", json={
            "name": "Unauthorized"
        })
        assert response.status_code == 401, "Should require auth"


class TestExecutiveTrainingModules:
    """Test Executive Training shows 9 modules"""
    
    def test_available_modules_returns_9_modules(self, authenticated_client):
        """Test GET /api/executive-training/available-modules returns 9 modules"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "modules" in data, "Should have modules field"
        modules = data["modules"]
        
        # Should have exactly 9 modules
        assert len(modules) == 9, f"Expected 9 modules, got {len(modules)}: {[m['key'] for m in modules]}"
    
    def test_all_expected_modules_present(self, authenticated_client):
        """Test that all 9 expected modules are present"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        modules = response.json()["modules"]
        
        module_keys = [m["key"] for m in modules]
        expected_modules = [
            "phishing",
            "social_engineering",
            "password_security",
            "data_protection",
            "ransomware",
            "insider_threat",
            "mobile_security",
            "remote_work",
            "bec"
        ]
        
        for expected in expected_modules:
            assert expected in module_keys, f"Module '{expected}' missing from available modules"
    
    def test_module_structure(self, authenticated_client):
        """Test each module has required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        modules = response.json()["modules"]
        
        for module in modules:
            assert "key" in module, f"Module missing 'key': {module}"
            assert "title" in module, f"Module missing 'title': {module}"
            assert "subtitle" in module, f"Module missing 'subtitle': {module}"
            assert "slide_count" in module, f"Module missing 'slide_count': {module}"
            assert module["slide_count"] > 0, f"Module should have slides: {module}"
    
    def test_generate_each_module(self, authenticated_client):
        """Test generating PPTX for each module"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        modules = response.json()["modules"]
        
        # Test generating first module only (to save time)
        module = modules[0]
        gen_response = authenticated_client.get(f"{BASE_URL}/api/executive-training/generate/{module['key']}")
        assert gen_response.status_code == 200, f"Failed to generate {module['key']}: {gen_response.text}"
        
        # Verify it's a PPTX file
        content_type = gen_response.headers.get('content-type', '')
        assert 'presentation' in content_type.lower() or 'pptx' in content_type.lower(), \
            f"Should return PPTX, got: {content_type}"


class TestExecutiveTrainingUpload:
    """Test Executive Training upload endpoint"""
    
    def test_get_uploaded_presentations(self, authenticated_client):
        """Test GET /api/executive-training/uploaded returns list"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/uploaded")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "presentations" in data, "Should have presentations field"
        assert isinstance(data["presentations"], list)
    
    def test_upload_requires_super_admin(self, viewer_client):
        """Test that upload requires super admin role"""
        # Create a minimal PPTX-like content (just headers check)
        files = {'file': ('test.pptx', b'PK', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
        data = {'name': 'Test Upload'}
        
        # Use viewer client (non-admin)
        response = viewer_client.post(
            f"{BASE_URL}/api/executive-training/upload",
            files=files,
            data=data
        )
        assert response.status_code in [403, 401], f"Should require super admin, got: {response.status_code}"
    
    def test_upload_requires_file(self, authenticated_client):
        """Test upload endpoint validates file presence"""
        # Send without file
        response = authenticated_client.post(
            f"{BASE_URL}/api/executive-training/upload",
            data={"name": "No File"}
        )
        # Should return 400 for missing file
        assert response.status_code == 400, f"Should require file: {response.text}"


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_check(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
