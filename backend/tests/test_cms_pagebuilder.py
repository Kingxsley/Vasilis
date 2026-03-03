"""
Test CMS Tiles and Page Builder - Iteration 17
Tests for CMS pages served from root URLs, events block rendering, and contact form
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCMSTilesAPI:
    """Test CMS Tiles public and admin endpoints"""
    
    def test_get_nav_tiles_returns_custom_pages(self, api_client):
        """Test /api/cms-tiles/nav returns published custom tiles"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/nav")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiles" in data
        
        # Should have at least Contact us and Events tiles
        tile_names = [t["name"] for t in data["tiles"]]
        assert "Contact us" in tile_names or "Events" in tile_names
        
        # Each tile should have required fields
        for tile in data["tiles"]:
            assert "name" in tile
            assert "slug" in tile
            assert "published" in tile
            assert tile["published"] is True
    
    def test_get_tile_by_slug_contact_us(self, api_client):
        """Test /api/cms-tiles/Contact-us returns correct tile"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/Contact-us")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Contact us"
        assert data["slug"] == "Contact-us"
        assert data["published"] is True
        
        # Should have blocks with contact_form
        assert "blocks" in data
        assert len(data["blocks"]) > 0
        
        # Check contact_form block exists
        block_types = [b["type"] for b in data["blocks"]]
        assert "contact_form" in block_types
    
    def test_get_tile_by_slug_events_page(self, api_client):
        """Test /api/cms-tiles/events-page returns correct tile"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/events-page")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Events"
        assert data["slug"] == "events-page"
        assert data["published"] is True
        
        # Should have blocks with events
        assert "blocks" in data
        assert len(data["blocks"]) > 0
        
        # Check events block exists
        block_types = [b["type"] for b in data["blocks"]]
        assert "events" in block_types
    
    def test_get_public_tiles(self, api_client):
        """Test /api/cms-tiles/public returns published tiles"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/public")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiles" in data
        
        # All returned tiles should be published
        for tile in data["tiles"]:
            assert tile.get("published", False) is True
    
    def test_nonexistent_tile_returns_404(self, api_client):
        """Test /api/cms-tiles/{slug} returns 404 for non-existent tile"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/nonexistent-page-xyz")
        assert response.status_code == 404


class TestEventsAPI:
    """Test Events API endpoints"""
    
    def test_list_events(self, api_client):
        """Test /api/events returns events list"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        assert "total" in data
    
    def test_get_upcoming_events(self, api_client):
        """Test /api/events/upcoming returns upcoming events"""
        response = api_client.get(f"{BASE_URL}/api/events/upcoming")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        
        # Check events have correct date field (start_date not start_time)
        for event in data["events"]:
            assert "start_date" in event, "Event should have start_date field"
            assert "start_time" not in event or event.get("start_time") is None, "Event should not use start_time"
            assert "title" in event
            assert "event_id" in event
    
    def test_event_date_format(self, api_client):
        """Test events use start_date field with correct ISO format"""
        response = api_client.get(f"{BASE_URL}/api/events/upcoming")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["events"]) > 0:
            event = data["events"][0]
            # Verify start_date is ISO format
            assert "start_date" in event
            start_date = event["start_date"]
            # Should be ISO format like "2026-03-15T14:00:00Z"
            assert "T" in start_date, f"start_date should be ISO format, got: {start_date}"
            assert start_date.endswith("Z") or "+" in start_date or "-" in start_date[-6:], \
                f"start_date should have timezone, got: {start_date}"


class TestContactFormAPI:
    """Test Contact form submission API"""
    
    def test_contact_form_submission(self, api_client):
        """Test /api/contact accepts form submissions"""
        test_data = {
            "name": "TEST_User",
            "email": "test@example.com",
            "phone": "+1234567890",
            "organization": "TEST_Org",
            "subject": "Test Subject",
            "message": "This is a test message from automated testing."
        }
        
        response = api_client.post(f"{BASE_URL}/api/contact", json=test_data)
        # Should return 200 or 201 for successful submission
        assert response.status_code in [200, 201], f"Contact form submission failed: {response.text}"
    
    def test_contact_form_validation(self, api_client):
        """Test /api/contact validates required fields"""
        # Missing required fields
        test_data = {
            "name": "",
            "email": "",
            "message": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/contact", json=test_data)
        # Should return 422 or 400 for validation error
        assert response.status_code in [400, 422]


class TestBlockTypes:
    """Test that block type configurations are valid"""
    
    def test_contact_form_block_structure(self, api_client):
        """Test contact_form block has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/Contact-us")
        assert response.status_code == 200
        
        data = response.json()
        contact_blocks = [b for b in data.get("blocks", []) if b["type"] == "contact_form"]
        
        assert len(contact_blocks) > 0, "Contact page should have contact_form block"
        
        block = contact_blocks[0]
        content = block.get("content", {})
        # Verify contact form has expected content fields
        assert "title" in content or "buttonText" in content, \
            "contact_form block should have title or buttonText"
    
    def test_events_block_structure(self, api_client):
        """Test events block has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/cms-tiles/events-page")
        assert response.status_code == 200
        
        data = response.json()
        events_blocks = [b for b in data.get("blocks", []) if b["type"] == "events"]
        
        assert len(events_blocks) > 0, "Events page should have events block"
        
        block = events_blocks[0]
        content = block.get("content", {})
        # Verify events block has expected content fields
        assert "limit" in content, "events block should have limit"
        assert "layout" in content, "events block should have layout"
