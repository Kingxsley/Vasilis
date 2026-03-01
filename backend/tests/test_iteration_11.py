"""
Iteration 11 Backend Tests
Testing: CMS Tiles CRUD, Contact Form API, RSS Feed Management, Form Submissions
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCMSTilesAPI:
    """Test CMS Tiles CRUD operations"""
    
    def test_get_tiles_public(self, api_client):
        """Test GET /api/cms-tiles returns published tiles"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles")
        assert response.status_code == 200
        data = response.json()
        assert "tiles" in data
        # Should have at least 4 default tiles
        assert len(data["tiles"]) >= 4
        
    def test_get_tiles_returns_default_system_tiles(self, api_client):
        """Verify default system tiles exist"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles")
        assert response.status_code == 200
        tiles = response.json()["tiles"]
        
        # Check for default system tiles
        slugs = [t["slug"] for t in tiles]
        assert "blog" in slugs
        assert "news" in slugs
        assert "videos" in slugs
        assert "about" in slugs
        
    def test_get_tiles_admin_requires_auth(self, unauthenticated_client):
        """Test admin endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/cms-tiles/admin")
        assert response.status_code in [401, 403]
        
    def test_get_tiles_admin(self, authenticated_client):
        """Test GET /api/cms-tiles/admin returns all tiles including unpublished"""
        response = authenticated_client.get(f"{BASE_URL}/api/cms-tiles/admin")
        assert response.status_code == 200
        data = response.json()
        assert "tiles" in data
        
    def test_create_tile(self, authenticated_client):
        """Test creating a new tile"""
        unique_id = uuid.uuid4().hex[:8]
        tile_data = {
            "name": f"Test Tile {unique_id}",
            "slug": f"test-tile-{unique_id}",
            "icon": "Globe",
            "description": "Automated test tile",
            "published": True,
            "route_type": "custom"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json=tile_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == tile_data["name"]
        assert data["slug"] == tile_data["slug"]
        assert data["is_system"] == False
        assert "tile_id" in data
        
        # Cleanup
        tile_id = data["tile_id"]
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        
    def test_create_tile_requires_auth(self, unauthenticated_client):
        """Test tile creation requires authentication"""
        tile_data = {"name": "Unauthorized Tile", "icon": "Globe"}
        response = unauthenticated_client.post(f"{BASE_URL}/api/cms-tiles", json=tile_data)
        assert response.status_code in [401, 403]
        
    def test_update_tile(self, authenticated_client):
        """Test updating a tile"""
        # First create a tile
        unique_id = uuid.uuid4().hex[:8]
        tile_data = {
            "name": f"Update Test {unique_id}",
            "slug": f"update-test-{unique_id}",
            "icon": "FileText",
            "description": "Original description"
        }
        create_resp = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json=tile_data)
        assert create_resp.status_code == 200
        tile_id = create_resp.json()["tile_id"]
        
        # Update the tile
        update_data = {
            "description": "Updated description",
            "icon": "Info"
        }
        update_resp = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}", json=update_data)
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["description"] == "Updated description"
        assert updated["icon"] == "Info"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        
    def test_toggle_publish_tile(self, authenticated_client):
        """Test toggling publish status of a tile"""
        # Create tile
        unique_id = uuid.uuid4().hex[:8]
        tile_data = {
            "name": f"Publish Test {unique_id}",
            "slug": f"publish-test-{unique_id}",
            "published": True
        }
        create_resp = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json=tile_data)
        assert create_resp.status_code == 200
        tile_id = create_resp.json()["tile_id"]
        
        # Toggle publish off
        toggle_resp = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}/publish")
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["published"] == False
        
        # Toggle publish on
        toggle_resp2 = authenticated_client.patch(f"{BASE_URL}/api/cms-tiles/{tile_id}/publish")
        assert toggle_resp2.status_code == 200
        assert toggle_resp2.json()["published"] == True
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        
    def test_delete_custom_tile(self, authenticated_client):
        """Test deleting a custom tile"""
        # Create tile
        unique_id = uuid.uuid4().hex[:8]
        tile_data = {
            "name": f"Delete Test {unique_id}",
            "slug": f"delete-test-{unique_id}"
        }
        create_resp = authenticated_client.post(f"{BASE_URL}/api/cms-tiles", json=tile_data)
        assert create_resp.status_code == 200
        tile_id = create_resp.json()["tile_id"]
        
        # Delete
        delete_resp = authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/{tile_id}")
        assert delete_resp.status_code == 200
        
        # Verify deleted
        get_resp = authenticated_client.get(f"{BASE_URL}/api/cms-tiles/{tile_data['slug']}")
        assert get_resp.status_code == 404
        
    def test_cannot_delete_system_tile(self, authenticated_client):
        """Test that system tiles cannot be deleted"""
        # Try to delete the blog tile (system tile)
        response = authenticated_client.delete(f"{BASE_URL}/api/cms-tiles/tile_blog")
        assert response.status_code == 400
        assert "System tiles cannot be deleted" in response.json().get("detail", "")


class TestContactFormAPI:
    """Test Contact Form submission and retrieval"""
    
    def test_submit_contact_form(self, api_client):
        """Test submitting a contact form (public endpoint)"""
        unique_id = uuid.uuid4().hex[:8]
        form_data = {
            "name": f"Test User {unique_id}",
            "email": f"test{unique_id}@example.com",
            "phone": "+1234567890",
            "organization": "Test Org",
            "subject": "Test Inquiry",
            "message": "This is an automated test submission"
        }
        
        response = api_client.post(f"{BASE_URL}/api/contact", json=form_data)
        assert response.status_code == 200
        data = response.json()
        assert "submission_id" in data
        assert "message" in data
        
    def test_get_submissions_requires_auth(self, unauthenticated_client):
        """Test submissions retrieval requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/contact/submissions")
        assert response.status_code in [401, 403]
        
    def test_get_contact_submissions(self, authenticated_client):
        """Test retrieving contact submissions as admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/contact/submissions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_update_submission_status(self, authenticated_client, api_client):
        """Test updating submission status"""
        # First submit a contact form
        unique_id = uuid.uuid4().hex[:8]
        form_data = {
            "name": f"Status Test {unique_id}",
            "email": f"status{unique_id}@example.com",
            "message": "Testing status update"
        }
        submit_resp = api_client.post(f"{BASE_URL}/api/contact", json=form_data)
        assert submit_resp.status_code == 200
        submission_id = submit_resp.json()["submission_id"]
        
        # Update status
        status_resp = authenticated_client.patch(
            f"{BASE_URL}/api/contact/submissions/{submission_id}/status",
            json={"status": "in_progress"}
        )
        assert status_resp.status_code == 200
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/contact/submissions/{submission_id}")
        
    def test_delete_submission(self, authenticated_client, api_client):
        """Test deleting a contact submission"""
        # Submit a form
        unique_id = uuid.uuid4().hex[:8]
        form_data = {
            "name": f"Delete Test {unique_id}",
            "email": f"delete{unique_id}@example.com",
            "message": "Testing delete"
        }
        submit_resp = api_client.post(f"{BASE_URL}/api/contact", json=form_data)
        assert submit_resp.status_code == 200
        submission_id = submit_resp.json()["submission_id"]
        
        # Delete
        delete_resp = authenticated_client.delete(f"{BASE_URL}/api/contact/submissions/{submission_id}")
        assert delete_resp.status_code == 200


class TestRSSFeedAPI:
    """Test RSS Feed management"""
    
    def test_get_rss_feeds_requires_auth(self, unauthenticated_client):
        """Test RSS feeds endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/content/news/rss-feeds")
        assert response.status_code in [401, 403]
        
    def test_get_rss_feeds(self, authenticated_client):
        """Test retrieving RSS feeds as admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/content/news/rss-feeds")
        assert response.status_code == 200
        data = response.json()
        assert "feeds" in data
        assert isinstance(data["feeds"], list)
        
    def test_create_rss_feed(self, authenticated_client):
        """Test creating a new RSS feed"""
        unique_id = uuid.uuid4().hex[:8]
        feed_data = {
            "name": f"Test Feed {unique_id}",
            "url": f"https://example.com/feed-{unique_id}.xml",
            "enabled": True
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/content/news/rss-feeds", json=feed_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == feed_data["name"]
        assert data["url"] == feed_data["url"]
        assert "feed_id" in data
        
        # Cleanup
        feed_id = data["feed_id"]
        authenticated_client.delete(f"{BASE_URL}/api/content/news/rss-feeds/{feed_id}")
        
    def test_update_rss_feed(self, authenticated_client):
        """Test updating an RSS feed"""
        # Create feed
        unique_id = uuid.uuid4().hex[:8]
        feed_data = {
            "name": f"Update Feed {unique_id}",
            "url": f"https://example.com/update-{unique_id}.xml"
        }
        create_resp = authenticated_client.post(f"{BASE_URL}/api/content/news/rss-feeds", json=feed_data)
        assert create_resp.status_code == 200
        feed_id = create_resp.json()["feed_id"]
        
        # Update
        update_resp = authenticated_client.patch(
            f"{BASE_URL}/api/content/news/rss-feeds/{feed_id}",
            json={"name": f"Updated Feed {unique_id}", "enabled": False}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == f"Updated Feed {unique_id}"
        assert update_resp.json()["enabled"] == False
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/content/news/rss-feeds/{feed_id}")
        
    def test_delete_rss_feed(self, authenticated_client):
        """Test deleting an RSS feed"""
        # Create feed
        unique_id = uuid.uuid4().hex[:8]
        feed_data = {
            "name": f"Delete Feed {unique_id}",
            "url": f"https://example.com/delete-{unique_id}.xml"
        }
        create_resp = authenticated_client.post(f"{BASE_URL}/api/content/news/rss-feeds", json=feed_data)
        assert create_resp.status_code == 200
        feed_id = create_resp.json()["feed_id"]
        
        # Delete
        delete_resp = authenticated_client.delete(f"{BASE_URL}/api/content/news/rss-feeds/{feed_id}")
        assert delete_resp.status_code == 200


class TestExecutiveTrainingExpanded:
    """Test Executive Training with expanded 30+ slides"""
    
    def test_available_modules_count(self, authenticated_client):
        """Test that available modules endpoint returns modules"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        data = response.json()
        assert "modules" in data
        # Should have at least the 4 base modules
        assert len(data["modules"]) >= 4
        
    def test_phishing_module_has_30plus_slides(self, authenticated_client):
        """Test that phishing module has 30+ slides"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/available-modules")
        assert response.status_code == 200
        modules = response.json()["modules"]
        
        # Find phishing module
        phishing_module = None
        for module in modules:
            if "phishing" in module.get("key", "").lower() or "phishing" in module.get("title", "").lower():
                phishing_module = module
                break
        
        assert phishing_module is not None, "Phishing module not found"
        # Verify slide count is 30+
        slide_count = phishing_module.get("slide_count", 0)
        assert slide_count >= 30, f"Expected 30+ slides, got {slide_count}"
        
    def test_generate_phishing_pptx(self, authenticated_client):
        """Test generating phishing PPTX presentation"""
        response = authenticated_client.get(f"{BASE_URL}/api/executive-training/generate/phishing")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        # Verify file is not empty
        assert len(response.content) > 10000  # PPTX should be substantial


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        """Test health check endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
