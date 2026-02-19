"""
Backend API Tests for Content Management System
Tests blog CRUD, news CRUD, videos CRUD, about page, and role-based access control
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://auth-fix-test-1.preview.emergentagent.com').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "testadmin@netshield.com", "password": "AdminTest123!"}
MEDIA_MANAGER_CREDS = {"email": "media@netshield.com", "password": "MediaManager123!"}


class TestHealthAndAuth:
    """Test health and authentication endpoints"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"Health check passed: {data}")
    
    def test_super_admin_login(self):
        """Test super_admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"Super admin login successful: {data['user']['email']}")
    
    def test_media_manager_login(self):
        """Test media_manager login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEDIA_MANAGER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "media_manager"
        print(f"Media manager login successful: {data['user']['email']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com", 
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid login correctly rejected")


class TestBlogCRUD:
    """Test Blog Post CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def media_manager_token(self):
        """Get media_manager auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEDIA_MANAGER_CREDS)
        return response.json()["token"]
    
    def test_create_blog_post_as_admin(self, admin_token):
        """Test creating a blog post as super_admin"""
        unique_title = f"TEST_Blog Post {uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "excerpt": "This is a test blog post excerpt",
            "content": "<p>This is the <strong>test</strong> blog post content with <em>rich text</em>.</p>",
            "tags": ["test", "automation"],
            "published": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/blog",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == unique_title
        assert "post_id" in data
        assert "slug" in data
        assert data["published"] == True
        print(f"Blog post created: {data['post_id']}")
        return data["post_id"]
    
    def test_create_blog_post_as_media_manager(self, media_manager_token):
        """Test creating a blog post as media_manager"""
        unique_title = f"TEST_Media Manager Post {uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "excerpt": "Post created by media manager",
            "content": "<h1>Heading</h1><p>Content here</p><ul><li>List item</li></ul>",
            "tags": ["media", "test"],
            "published": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/blog",
            json=payload,
            headers={"Authorization": f"Bearer {media_manager_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == unique_title
        assert data["published"] == False
        print(f"Media manager created blog post: {data['post_id']}")
    
    def test_list_blog_posts(self):
        """Test listing blog posts (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/content/blog")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"Blog posts listed: {len(data['posts'])} posts, total: {data['total']}")
    
    def test_list_all_blog_posts_admin(self, admin_token):
        """Test listing all blog posts including unpublished (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/content/blog?published_only=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        print(f"All blog posts (including drafts): {len(data['posts'])}")
    
    def test_update_blog_post(self, admin_token):
        """Test updating a blog post"""
        # First create a post
        payload = {
            "title": f"TEST_Update Test {uuid.uuid4().hex[:8]}",
            "excerpt": "Original excerpt",
            "content": "<p>Original content</p>",
            "tags": [],
            "published": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/content/blog",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        post_id = create_response.json()["post_id"]
        
        # Update the post
        update_payload = {
            "title": f"TEST_Updated Title {uuid.uuid4().hex[:8]}",
            "content": "<p>Updated content with <strong>bold</strong></p>",
            "published": True
        }
        
        update_response = requests.patch(
            f"{BASE_URL}/api/content/blog/{post_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["published"] == True
        print(f"Blog post updated: {post_id}")
    
    def test_delete_blog_post(self, admin_token):
        """Test deleting a blog post"""
        # First create a post
        payload = {
            "title": f"TEST_Delete Test {uuid.uuid4().hex[:8]}",
            "excerpt": "To be deleted",
            "content": "<p>Delete me</p>",
            "tags": [],
            "published": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/content/blog",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        post_id = create_response.json()["post_id"]
        
        # Delete the post
        delete_response = requests.delete(
            f"{BASE_URL}/api/content/blog/{post_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200
        print(f"Blog post deleted: {post_id}")
    
    def test_unauthorized_blog_access(self):
        """Test that unauthenticated users cannot create posts"""
        payload = {
            "title": "Unauthorized Post",
            "excerpt": "Should fail",
            "content": "<p>Content</p>",
            "tags": [],
            "published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/content/blog", json=payload)
        assert response.status_code in [401, 403]
        print("Unauthorized blog creation correctly rejected")


class TestVideoCRUD:
    """Test Video CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        return response.json()["token"]
    
    def test_create_video(self, admin_token):
        """Test creating a video"""
        payload = {
            "title": f"TEST_Video {uuid.uuid4().hex[:8]}",
            "description": "Test video description",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "training",
            "published": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/videos",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "video_id" in data
        assert data["youtube_id"] == "dQw4w9WgXcQ"
        print(f"Video created: {data['video_id']}")
    
    def test_list_videos(self):
        """Test listing videos (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/content/videos")
        assert response.status_code == 200
        data = response.json()
        assert "videos" in data
        print(f"Videos listed: {len(data['videos'])}")
    
    def test_update_video_published_status(self, admin_token):
        """Test toggling video published status"""
        # First create a video
        payload = {
            "title": f"TEST_Toggle Video {uuid.uuid4().hex[:8]}",
            "description": "Toggle test",
            "youtube_url": "https://youtu.be/test123",
            "category": "awareness",
            "published": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/content/videos",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        video_id = create_response.json()["video_id"]
        
        # Update published status
        update_response = requests.patch(
            f"{BASE_URL}/api/content/videos/{video_id}",
            json={"published": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["published"] == True
        print(f"Video published status updated: {video_id}")
    
    def test_delete_video(self, admin_token):
        """Test deleting a video"""
        # First create a video
        payload = {
            "title": f"TEST_Delete Video {uuid.uuid4().hex[:8]}",
            "description": "To be deleted",
            "youtube_url": "https://youtube.com/watch?v=delete123",
            "category": "training",
            "published": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/content/videos",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        video_id = create_response.json()["video_id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/content/videos/{video_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200
        print(f"Video deleted: {video_id}")


class TestNewsCRUD:
    """Test News CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        return response.json()["token"]
    
    def test_create_news(self, admin_token):
        """Test creating news"""
        payload = {
            "title": f"TEST_News Item {uuid.uuid4().hex[:8]}",
            "content": "This is a test news item",
            "link": "https://example.com/news",
            "published": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/news",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "news_id" in data
        print(f"News created: {data['news_id']}")
    
    def test_list_news(self):
        """Test listing news (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/content/news")
        assert response.status_code == 200
        data = response.json()
        assert "news" in data
        print(f"News listed: {len(data['news'])}")
    
    def test_delete_news(self, admin_token):
        """Test deleting news"""
        # Create first
        payload = {
            "title": f"TEST_Delete News {uuid.uuid4().hex[:8]}",
            "content": "To be deleted",
            "published": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/content/news",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        news_id = create_response.json()["news_id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/content/news/{news_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200
        print(f"News deleted: {news_id}")


class TestAboutPage:
    """Test About Page operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        return response.json()["token"]
    
    def test_get_about(self):
        """Test getting about page content (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/content/about")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data or "content" in data
        print(f"About page retrieved: {data.get('title', 'No title')}")
    
    def test_update_about(self, admin_token):
        """Test updating about page"""
        payload = {
            "title": "About VasilisNetShield",
            "content": "<p>Test about content</p>",
            "mission": "To empower organizations with cybersecurity knowledge",
            "vision": "A cyber-secure world"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/content/about",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("mission") == payload["mission"]
        print("About page updated successfully")


class TestRoleBasedAccess:
    """Test role-based access control for content management"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def media_manager_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEDIA_MANAGER_CREDS)
        return response.json()["token"]
    
    def test_media_manager_can_create_content(self, media_manager_token):
        """Test media_manager can create blog posts"""
        payload = {
            "title": f"TEST_RBAC Blog {uuid.uuid4().hex[:8]}",
            "excerpt": "RBAC test",
            "content": "<p>Content from media manager</p>",
            "tags": ["rbac"],
            "published": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/blog",
            json=payload,
            headers={"Authorization": f"Bearer {media_manager_token}"}
        )
        
        assert response.status_code == 200
        print("media_manager CAN create blog posts")
    
    def test_media_manager_can_create_videos(self, media_manager_token):
        """Test media_manager can add videos"""
        payload = {
            "title": f"TEST_RBAC Video {uuid.uuid4().hex[:8]}",
            "description": "RBAC test video",
            "youtube_url": "https://youtube.com/watch?v=rbactest",
            "category": "training",
            "published": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/content/videos",
            json=payload,
            headers={"Authorization": f"Bearer {media_manager_token}"}
        )
        
        assert response.status_code == 200
        print("media_manager CAN create videos")
    
    def test_media_manager_cannot_access_admin_endpoints(self, media_manager_token):
        """Test media_manager CANNOT access admin-only endpoints like users/orgs"""
        # Try to access users list (admin only)
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {media_manager_token}"}
        )
        assert response.status_code == 403
        print("media_manager correctly BLOCKED from admin endpoints")
    
    def test_admin_can_access_all_content_endpoints(self, admin_token):
        """Test super_admin can access all content endpoints"""
        endpoints = [
            f"{BASE_URL}/api/content/blog?published_only=false",
            f"{BASE_URL}/api/content/videos?published_only=false",
            f"{BASE_URL}/api/content/news",
            f"{BASE_URL}/api/content/about"
        ]
        
        for endpoint in endpoints:
            response = requests.get(endpoint, headers={"Authorization": f"Bearer {admin_token}"})
            assert response.status_code == 200
            print(f"Admin can access: {endpoint}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
