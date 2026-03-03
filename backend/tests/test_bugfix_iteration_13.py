"""
Test Bug Fixes - Iteration 13
Tests for:
1. RSS feeds show correct status (enabled/disabled) 
2. Content Manager shows Blog, News, Videos, About tabs + CMS custom tiles + RSS Feeds tab
3. Sidebar simplified - CMS tiles excluded from navigation (they appear in Content Manager)
4. Executive Training bulk delete presentations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-unify-1.preview.emergentagent.com')
API = f"{BASE_URL}/api"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{API}/auth/login", json={
        "email": "test@admin.com",
        "password": "TestAdmin123!"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def headers(auth_token):
    """Authenticated headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestRSSFeedsStatusFix:
    """Test RSS feeds status field is 'enabled' (not 'is_active')"""
    
    def test_rss_feeds_endpoint_exists(self, headers):
        """RSS feeds endpoint should be accessible"""
        response = requests.get(f"{API}/content/news/rss-feeds", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "feeds" in data
    
    def test_rss_feeds_have_enabled_field(self, headers):
        """RSS feeds should have 'enabled' field (not 'is_active')"""
        response = requests.get(f"{API}/content/news/rss-feeds", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        feeds = data.get("feeds", [])
        if len(feeds) > 0:
            # Check that feeds have 'enabled' field
            for feed in feeds:
                assert "enabled" in feed, f"Feed {feed.get('name')} missing 'enabled' field"
                assert isinstance(feed["enabled"], bool), f"'enabled' should be boolean"
                # Should NOT have 'is_active' field (old name)
                assert "is_active" not in feed, f"Feed {feed.get('name')} should not have 'is_active' field"
    
    def test_create_rss_feed_with_enabled_field(self, headers):
        """Creating RSS feed should use 'enabled' field"""
        import uuid
        test_feed = {
            "name": f"Test Feed {uuid.uuid4().hex[:8]}",
            "url": "https://test-feed-url.com/rss",
            "enabled": True
        }
        
        response = requests.post(f"{API}/content/news/rss-feeds", json=test_feed, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "enabled" in data
        assert data["enabled"] == True
        
        # Cleanup
        feed_id = data.get("feed_id")
        if feed_id:
            requests.delete(f"{API}/content/news/rss-feeds/{feed_id}", headers=headers)
    
    def test_toggle_rss_feed_enabled_status(self, headers):
        """Should be able to toggle 'enabled' status"""
        import uuid
        test_feed = {
            "name": f"Toggle Test Feed {uuid.uuid4().hex[:8]}",
            "url": "https://toggle-test.com/rss",
            "enabled": True
        }
        
        # Create feed
        response = requests.post(f"{API}/content/news/rss-feeds", json=test_feed, headers=headers)
        assert response.status_code == 200
        feed_id = response.json().get("feed_id")
        
        # Toggle enabled to False
        response = requests.patch(f"{API}/content/news/rss-feeds/{feed_id}", 
                                 json={"enabled": False}, headers=headers)
        assert response.status_code == 200
        assert response.json()["enabled"] == False
        
        # Toggle back to True
        response = requests.patch(f"{API}/content/news/rss-feeds/{feed_id}", 
                                 json={"enabled": True}, headers=headers)
        assert response.status_code == 200
        assert response.json()["enabled"] == True
        
        # Cleanup
        requests.delete(f"{API}/content/news/rss-feeds/{feed_id}", headers=headers)


class TestCMSTilesInContentManager:
    """Test CMS tiles are available and properly structured"""
    
    def test_cms_tiles_endpoint_returns_tiles(self, headers):
        """CMS tiles endpoint should return system and custom tiles"""
        response = requests.get(f"{API}/cms-tiles", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "tiles" in data
        tiles = data["tiles"]
        
        # Should have at least the 4 system tiles
        tile_names = [t.get("name") for t in tiles]
        assert "Blog" in tile_names
        assert "News" in tile_names
        assert "Videos" in tile_names
        assert "About" in tile_names
    
    def test_cms_tiles_have_correct_structure(self, headers):
        """CMS tiles should have required fields"""
        response = requests.get(f"{API}/cms-tiles", headers=headers)
        assert response.status_code == 200
        tiles = response.json().get("tiles", [])
        
        required_fields = ["tile_id", "name", "slug", "icon", "published", "is_system"]
        for tile in tiles:
            for field in required_fields:
                assert field in tile, f"Tile {tile.get('name')} missing '{field}' field"
    
    def test_system_tiles_are_marked_correctly(self, headers):
        """System tiles should have is_system=True"""
        response = requests.get(f"{API}/cms-tiles", headers=headers)
        assert response.status_code == 200
        tiles = response.json().get("tiles", [])
        
        system_tile_names = ["Blog", "News", "Videos", "About"]
        for tile in tiles:
            if tile.get("name") in system_tile_names:
                assert tile.get("is_system") == True, f"{tile.get('name')} should be a system tile"


class TestSidebarSimplified:
    """Test that CMS tiles are excluded from navigation items in sidebar"""
    
    def test_navigation_public_endpoint(self, headers):
        """Navigation public endpoint should work"""
        response = requests.get(f"{API}/navigation/public", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
    
    def test_navigation_cms_tiles_marked_correctly(self, headers):
        """CMS tiles in navigation should have is_cms_tile flag"""
        response = requests.get(f"{API}/navigation/public", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        # All CMS tiles should have is_cms_tile=True
        cms_labels = ["Blog", "News", "Videos", "About"]
        for item in items:
            if item.get("label") in cms_labels:
                assert item.get("is_cms_tile") == True, f"{item.get('label')} should have is_cms_tile=True"
    
    def test_cms_tiles_have_content_section(self, headers):
        """CMS tiles should be assigned to 'content' section"""
        response = requests.get(f"{API}/navigation/public", headers=headers)
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        for item in items:
            if item.get("is_cms_tile"):
                assert item.get("section_id") == "content", f"CMS tile {item.get('label')} should be in content section"


class TestExecutiveTrainingBulkDelete:
    """Test Executive Training bulk delete presentations"""
    
    def test_uploaded_presentations_endpoint(self, headers):
        """Uploaded presentations endpoint should work"""
        response = requests.get(f"{API}/executive-training/uploaded", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "presentations" in data
    
    def test_bulk_delete_requires_presentation_ids(self, headers):
        """Bulk delete should require presentation IDs"""
        response = requests.delete(
            f"{API}/executive-training/uploaded/bulk",
            json={"presentation_ids": []},
            headers=headers
        )
        assert response.status_code == 400
        assert "No presentation IDs provided" in response.json().get("detail", "")
    
    def test_bulk_delete_endpoint_exists(self, headers):
        """Bulk delete endpoint should be accessible"""
        # Test with non-existent IDs - should return success with 0 deleted
        response = requests.delete(
            f"{API}/executive-training/uploaded/bulk",
            json={"presentation_ids": ["non_existent_id_1", "non_existent_id_2"]},
            headers=headers
        )
        # Should return 200 with deleted_count=0
        assert response.status_code == 200
        data = response.json()
        assert "deleted_count" in data
        assert data["deleted_count"] == 0


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Health endpoint should work"""
        response = requests.get(f"{API}/health")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
