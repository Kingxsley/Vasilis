#!/usr/bin/env python3
"""
Backend test script for Blog Manager endpoints.

Tests the new/modified blog endpoints under /api/content/blog:
1. GET /api/content/blog — pagination + filtering + search
2. GET /api/content/blog/stats — auth required
3. GET /api/content/blog/id/{post_id} — auth required
4. PATCH /api/content/blog/{post_id}/status — status updates
5. POST /api/content/blog/bulk — bulk actions
6. POST /api/content/blog/{post_id}/duplicate — duplication
7. DELETE /api/content/blog/{post_id} — soft/hard delete
8. POST /api/content/blog — create with optional fields
9. Smoke test other content endpoints for user-not-defined bug fix

Expected seed state: 45 blog posts (30 published, 10 draft, 5 archived)
"""

import asyncio
import json
import sys
import time
from typing import Dict, Any, Optional, List

import httpx

# Backend URL from frontend .env
BACKEND_URL = "https://cms-enterprise.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.created_posts = []  # Track posts created during testing for cleanup
    
    def success(self, test_name: str):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def failure(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n=== TEST SUMMARY ===")
        print(f"Total: {total}, Passed: {self.passed}, Failed: {self.failed}")
        if self.errors:
            print("\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

async def login_admin() -> Optional[str]:
    """Login as super admin and return JWT token"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BACKEND_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("token")
            else:
                print(f"Admin login failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Admin login error: {e}")
            return None

async def test_blog_list_pagination_filtering(result: TestResult, admin_token: Optional[str]):
    """Test GET /api/content/blog with various parameters"""
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    
    async with httpx.AsyncClient() as client:
        # Test 1: No auth, no params - should return only published posts
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog", timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response shape
                required_fields = ["posts", "total", "skip", "limit", "page", "total_pages"]
                for field in required_fields:
                    if field not in data:
                        result.failure("Blog list (no auth, no params)", f"Missing field: {field}")
                        return
                
                # Should only show published posts (total=30)
                if data["total"] != 30:
                    result.failure("Blog list (no auth, no params)", f"Expected total=30 published posts, got {data['total']}")
                    return
                
                # Default limit should be 20
                if data["limit"] != 20:
                    result.failure("Blog list (no auth, no params)", f"Expected limit=20, got {data['limit']}")
                    return
                
                # Check posts are published
                for post in data["posts"]:
                    if not post.get("published", False):
                        result.failure("Blog list (no auth, no params)", f"Found non-published post: {post.get('title')}")
                        return
                
                result.success("Blog list (no auth, no params) → 200 with published posts only")
            else:
                result.failure("Blog list (no auth, no params)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog list (no auth, no params)", f"Request error: {e}")
        
        # Test 2: With limit=5&skip=0
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?limit=5&skip=0", timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                
                if data["limit"] != 5:
                    result.failure("Blog list (limit=5)", f"Expected limit=5, got {data['limit']}")
                    return
                
                if data["total"] != 30:
                    result.failure("Blog list (limit=5)", f"Expected total=30, got {data['total']}")
                    return
                
                if data["page"] != 1:
                    result.failure("Blog list (limit=5)", f"Expected page=1, got {data['page']}")
                    return
                
                if data["total_pages"] != 6:
                    result.failure("Blog list (limit=5)", f"Expected total_pages=6, got {data['total_pages']}")
                    return
                
                if len(data["posts"]) != 5:
                    result.failure("Blog list (limit=5)", f"Expected 5 posts, got {len(data['posts'])}")
                    return
                
                result.success("Blog list (limit=5&skip=0) → correct pagination")
            else:
                result.failure("Blog list (limit=5)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog list (limit=5)", f"Request error: {e}")
        
        # Test 3: With status=all (auth required)
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?status=all", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data["total"] != 45:
                        result.failure("Blog list (status=all, auth)", f"Expected total=45, got {data['total']}")
                        return
                    
                    result.success("Blog list (status=all, auth) → 200 with all posts")
                else:
                    result.failure("Blog list (status=all, auth)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (status=all, auth)", f"Request error: {e}")
        
        # Test 4: With status=draft (auth required)
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?status=draft", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data["total"] != 10:
                        result.failure("Blog list (status=draft, auth)", f"Expected total=10, got {data['total']}")
                        return
                    
                    # Check all posts have status "draft"
                    for post in data["posts"]:
                        if post.get("status") != "draft":
                            result.failure("Blog list (status=draft, auth)", f"Found non-draft post: {post.get('title')} with status {post.get('status')}")
                            return
                    
                    result.success("Blog list (status=draft, auth) → 200 with draft posts only")
                else:
                    result.failure("Blog list (status=draft, auth)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (status=draft, auth)", f"Request error: {e}")
        
        # Test 5: With status=archived (auth required)
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?status=archived", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data["total"] != 5:
                        result.failure("Blog list (status=archived, auth)", f"Expected total=5, got {data['total']}")
                        return
                    
                    # Check all posts have status "archived"
                    for post in data["posts"]:
                        if post.get("status") != "archived":
                            result.failure("Blog list (status=archived, auth)", f"Found non-archived post: {post.get('title')} with status {post.get('status')}")
                            return
                    
                    result.success("Blog list (status=archived, auth) → 200 with archived posts only")
                else:
                    result.failure("Blog list (status=archived, auth)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (status=archived, auth)", f"Request error: {e}")
        
        # Test 6: With status=draft (NO auth) - should return 403
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?status=draft", timeout=30.0)
            
            if response.status_code == 403:
                result.success("Blog list (status=draft, no auth) → 403 forbidden")
            else:
                result.failure("Blog list (status=draft, no auth)", f"Expected 403, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog list (status=draft, no auth)", f"Request error: {e}")
        
        # Test 7: With search=phishing (auth)
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?search=phishing", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data["total"] > 0:
                        # Check that results contain "phishing" in title/content/excerpt/tags
                        found_match = False
                        for post in data["posts"]:
                            title = post.get("title", "").lower()
                            content = post.get("content", "").lower()
                            excerpt = post.get("excerpt", "").lower()
                            tags = [tag.lower() for tag in post.get("tags", [])]
                            
                            if ("phishing" in title or "phishing" in content or 
                                "phishing" in excerpt or "phishing" in tags):
                                found_match = True
                                break
                        
                        if found_match:
                            result.success(f"Blog list (search=phishing, auth) → {data['total']} results with phishing content")
                        else:
                            result.failure("Blog list (search=phishing, auth)", "No posts contain 'phishing' in searchable fields")
                    else:
                        result.success("Blog list (search=phishing, auth) → 0 results (no phishing content)")
                else:
                    result.failure("Blog list (search=phishing, auth)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (search=phishing, auth)", f"Request error: {e}")
        
        # Test 8: With sort=title
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?sort=title&limit=5", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if len(data["posts"]) >= 2:
                        # Check if sorted A→Z by title
                        titles = [post.get("title", "") for post in data["posts"]]
                        sorted_titles = sorted(titles)
                        
                        if titles == sorted_titles:
                            result.success("Blog list (sort=title) → correctly sorted A→Z")
                        else:
                            result.failure("Blog list (sort=title)", f"Not sorted correctly: {titles}")
                    else:
                        result.success("Blog list (sort=title) → too few posts to verify sorting")
                else:
                    result.failure("Blog list (sort=title)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (sort=title)", f"Request error: {e}")
        
        # Test 9: With sort=oldest
        if admin_token:
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog?sort=oldest&limit=5", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if len(data["posts"]) >= 2:
                        # Check if sorted oldest first (by created_at)
                        dates = []
                        for post in data["posts"]:
                            created_at = post.get("created_at")
                            if created_at:
                                dates.append(created_at)
                        
                        if len(dates) >= 2:
                            # Check if dates are in ascending order (oldest first)
                            sorted_dates = sorted(dates)
                            if dates == sorted_dates:
                                result.success("Blog list (sort=oldest) → correctly sorted oldest first")
                            else:
                                result.failure("Blog list (sort=oldest)", f"Not sorted correctly: {dates}")
                        else:
                            result.success("Blog list (sort=oldest) → insufficient date data to verify")
                    else:
                        result.success("Blog list (sort=oldest) → too few posts to verify sorting")
                else:
                    result.failure("Blog list (sort=oldest)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog list (sort=oldest)", f"Request error: {e}")
        
        # Test 10: With limit=150 (should be clamped to 100)
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?limit=150", timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                
                if data["limit"] == 100:
                    result.success("Blog list (limit=150) → clamped to 100")
                else:
                    result.failure("Blog list (limit=150)", f"Expected limit=100, got {data['limit']}")
            else:
                result.failure("Blog list (limit=150)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog list (limit=150)", f"Request error: {e}")

async def test_blog_stats(result: TestResult, admin_token: Optional[str]):
    """Test GET /api/content/blog/stats"""
    async with httpx.AsyncClient() as client:
        # Test 1: With auth - should return stats
        if admin_token:
            headers = {"Authorization": f"Bearer {admin_token}"}
            try:
                response = await client.get(f"{BACKEND_URL}/content/blog/stats", headers=headers, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    expected_stats = {"total": 45, "published": 30, "draft": 10, "archived": 5}
                    for key, expected_value in expected_stats.items():
                        if data.get(key) != expected_value:
                            result.failure("Blog stats (auth)", f"Expected {key}={expected_value}, got {data.get(key)}")
                            return
                    
                    result.success("Blog stats (auth) → 200 with correct counts")
                else:
                    result.failure("Blog stats (auth)", f"Expected 200, got {response.status_code}: {response.text}")
            except Exception as e:
                result.failure("Blog stats (auth)", f"Request error: {e}")
        
        # Test 2: Without auth - should return 401
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog/stats", timeout=30.0)
            
            if response.status_code == 401:
                result.success("Blog stats (no auth) → 401 unauthorized")
            else:
                result.failure("Blog stats (no auth)", f"Expected 401, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog stats (no auth)", f"Request error: {e}")

async def test_blog_get_by_id(result: TestResult, admin_token: Optional[str]):
    """Test GET /api/content/blog/id/{post_id}"""
    if not admin_token:
        result.failure("Blog get by ID setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # First, get a draft post ID from the list
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?status=draft&limit=1", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                if data["posts"]:
                    draft_post_id = data["posts"][0]["post_id"]
                    
                    # Test 1: Get draft post by ID with auth
                    try:
                        response = await client.get(f"{BACKEND_URL}/content/blog/id/{draft_post_id}", headers=headers, timeout=30.0)
                        
                        if response.status_code == 200:
                            post_data = response.json()
                            if post_data.get("post_id") == draft_post_id:
                                result.success("Blog get by ID (draft, auth) → 200 with correct post")
                            else:
                                result.failure("Blog get by ID (draft, auth)", f"Wrong post returned: {post_data.get('post_id')}")
                        else:
                            result.failure("Blog get by ID (draft, auth)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog get by ID (draft, auth)", f"Request error: {e}")
                    
                    # Test 2: Get draft post by ID without auth - should return 401
                    try:
                        response = await client.get(f"{BACKEND_URL}/content/blog/id/{draft_post_id}", timeout=30.0)
                        
                        if response.status_code == 401:
                            result.success("Blog get by ID (draft, no auth) → 401 unauthorized")
                        else:
                            result.failure("Blog get by ID (draft, no auth)", f"Expected 401, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog get by ID (draft, no auth)", f"Request error: {e}")
                else:
                    result.failure("Blog get by ID setup", "No draft posts found")
            else:
                result.failure("Blog get by ID setup", f"Failed to get draft posts: {response.status_code}")
        except Exception as e:
            result.failure("Blog get by ID setup", f"Request error: {e}")
        
        # Test 3: Invalid ID - should return 404
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog/id/invalid-id", headers=headers, timeout=30.0)
            
            if response.status_code == 404:
                result.success("Blog get by ID (invalid ID) → 404 not found")
            else:
                result.failure("Blog get by ID (invalid ID)", f"Expected 404, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog get by ID (invalid ID)", f"Request error: {e}")

async def test_blog_status_update(result: TestResult, admin_token: Optional[str]):
    """Test PATCH /api/content/blog/{post_id}/status"""
    if not admin_token:
        result.failure("Blog status update setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # First, get a draft post to test with
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?status=draft&limit=1", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                if data["posts"]:
                    test_post_id = data["posts"][0]["post_id"]
                    
                    # Test 1: Change draft to published
                    try:
                        response = await client.patch(
                            f"{BACKEND_URL}/content/blog/{test_post_id}/status",
                            json={"status": "published"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            post_data = response.json()
                            if post_data.get("status") == "published" and post_data.get("published") == True:
                                result.success("Blog status update (draft→published) → 200 with correct status")
                            else:
                                result.failure("Blog status update (draft→published)", f"Status not updated correctly: {post_data}")
                        else:
                            result.failure("Blog status update (draft→published)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog status update (draft→published)", f"Request error: {e}")
                    
                    # Test 2: Invalid status - should return 400
                    try:
                        response = await client.patch(
                            f"{BACKEND_URL}/content/blog/{test_post_id}/status",
                            json={"status": "invalid"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 400:
                            result.success("Blog status update (invalid status) → 400 bad request")
                        else:
                            result.failure("Blog status update (invalid status)", f"Expected 400, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog status update (invalid status)", f"Request error: {e}")
                    
                    # Test 3: Change to archived
                    try:
                        response = await client.patch(
                            f"{BACKEND_URL}/content/blog/{test_post_id}/status",
                            json={"status": "archived"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            post_data = response.json()
                            if post_data.get("status") == "archived" and post_data.get("published") == False:
                                result.success("Blog status update (published→archived) → 200 with correct status")
                            else:
                                result.failure("Blog status update (published→archived)", f"Status not updated correctly: {post_data}")
                        else:
                            result.failure("Blog status update (published→archived)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog status update (published→archived)", f"Request error: {e}")
                    
                    # Restore to draft for cleanup
                    try:
                        await client.patch(
                            f"{BACKEND_URL}/content/blog/{test_post_id}/status",
                            json={"status": "draft"},
                            headers=headers,
                            timeout=30.0
                        )
                    except:
                        pass  # Cleanup attempt, ignore errors
                        
                else:
                    result.failure("Blog status update setup", "No draft posts found")
            else:
                result.failure("Blog status update setup", f"Failed to get draft posts: {response.status_code}")
        except Exception as e:
            result.failure("Blog status update setup", f"Request error: {e}")
        
        # Test 4: Invalid post ID - should return 404
        try:
            response = await client.patch(
                f"{BACKEND_URL}/content/blog/invalid-id/status",
                json={"status": "published"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 404:
                result.success("Blog status update (invalid ID) → 404 not found")
            else:
                result.failure("Blog status update (invalid ID)", f"Expected 404, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog status update (invalid ID)", f"Request error: {e}")
        
        # Test 5: Without auth - should return 401
        try:
            response = await client.patch(
                f"{BACKEND_URL}/content/blog/some-id/status",
                json={"status": "published"},
                timeout=30.0
            )
            
            if response.status_code == 401:
                result.success("Blog status update (no auth) → 401 unauthorized")
            else:
                result.failure("Blog status update (no auth)", f"Expected 401, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog status update (no auth)", f"Request error: {e}")

async def test_blog_bulk_actions(result: TestResult, admin_token: Optional[str]):
    """Test POST /api/content/blog/bulk"""
    if not admin_token:
        result.failure("Blog bulk actions setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # First, get 2 published post IDs
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?status=published&limit=2", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                if len(data["posts"]) >= 2:
                    test_post_ids = [post["post_id"] for post in data["posts"][:2]]
                    
                    # Test 1: Archive 2 published posts
                    try:
                        response = await client.post(
                            f"{BACKEND_URL}/content/blog/bulk",
                            json={"post_ids": test_post_ids, "action": "archive"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            bulk_data = response.json()
                            expected_response = {"action": "archive", "affected": 2, "post_ids": test_post_ids}
                            
                            if (bulk_data.get("action") == "archive" and 
                                bulk_data.get("affected") == 2 and 
                                set(bulk_data.get("post_ids", [])) == set(test_post_ids)):
                                result.success("Blog bulk actions (archive 2 posts) → 200 with correct response")
                                
                                # Verify stats changed
                                stats_response = await client.get(f"{BACKEND_URL}/content/blog/stats", headers=headers, timeout=30.0)
                                if stats_response.status_code == 200:
                                    stats = stats_response.json()
                                    if stats.get("archived") == 7:  # 5 + 2
                                        result.success("Blog bulk actions (archive) → stats updated correctly")
                                    else:
                                        result.failure("Blog bulk actions (archive)", f"Expected archived=7, got {stats.get('archived')}")
                                else:
                                    result.failure("Blog bulk actions (archive)", "Failed to verify stats")
                            else:
                                result.failure("Blog bulk actions (archive)", f"Wrong response: {bulk_data}")
                        else:
                            result.failure("Blog bulk actions (archive)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog bulk actions (archive)", f"Request error: {e}")
                    
                    # Test 2: Publish the same 2 posts (restore them)
                    try:
                        response = await client.post(
                            f"{BACKEND_URL}/content/blog/bulk",
                            json={"post_ids": test_post_ids, "action": "publish"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            bulk_data = response.json()
                            
                            if (bulk_data.get("action") == "publish" and 
                                bulk_data.get("affected") == 2):
                                result.success("Blog bulk actions (publish 2 posts) → 200 with correct response")
                                
                                # Verify stats back to original
                                stats_response = await client.get(f"{BACKEND_URL}/content/blog/stats", headers=headers, timeout=30.0)
                                if stats_response.status_code == 200:
                                    stats = stats_response.json()
                                    if stats.get("published") == 30 and stats.get("archived") == 5:
                                        result.success("Blog bulk actions (publish) → stats restored correctly")
                                    else:
                                        result.failure("Blog bulk actions (publish)", f"Stats not restored: {stats}")
                                else:
                                    result.failure("Blog bulk actions (publish)", "Failed to verify stats")
                            else:
                                result.failure("Blog bulk actions (publish)", f"Wrong response: {bulk_data}")
                        else:
                            result.failure("Blog bulk actions (publish)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog bulk actions (publish)", f"Request error: {e}")
                        
                else:
                    result.failure("Blog bulk actions setup", "Not enough published posts found")
            else:
                result.failure("Blog bulk actions setup", f"Failed to get published posts: {response.status_code}")
        except Exception as e:
            result.failure("Blog bulk actions setup", f"Request error: {e}")
        
        # Test 3: Get an archived post and test restore action
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?status=archived&limit=1", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                if data["posts"]:
                    archived_post_id = data["posts"][0]["post_id"]
                    
                    try:
                        response = await client.post(
                            f"{BACKEND_URL}/content/blog/bulk",
                            json={"post_ids": [archived_post_id], "action": "restore"},
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            bulk_data = response.json()
                            
                            if (bulk_data.get("action") == "restore" and 
                                bulk_data.get("affected") == 1):
                                result.success("Blog bulk actions (restore archived post) → 200 with correct response")
                                
                                # Restore it back to archived for cleanup
                                await client.post(
                                    f"{BACKEND_URL}/content/blog/bulk",
                                    json={"post_ids": [archived_post_id], "action": "archive"},
                                    headers=headers,
                                    timeout=30.0
                                )
                            else:
                                result.failure("Blog bulk actions (restore)", f"Wrong response: {bulk_data}")
                        else:
                            result.failure("Blog bulk actions (restore)", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog bulk actions (restore)", f"Request error: {e}")
                else:
                    result.failure("Blog bulk actions (restore) setup", "No archived posts found")
            else:
                result.failure("Blog bulk actions (restore) setup", f"Failed to get archived posts: {response.status_code}")
        except Exception as e:
            result.failure("Blog bulk actions (restore) setup", f"Request error: {e}")
        
        # Test 4: Empty post_ids - should return 400
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog/bulk",
                json={"post_ids": [], "action": "publish"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 400:
                result.success("Blog bulk actions (empty post_ids) → 400 bad request")
            else:
                result.failure("Blog bulk actions (empty post_ids)", f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog bulk actions (empty post_ids)", f"Request error: {e}")
        
        # Test 5: Invalid action - should return 400
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog/bulk",
                json={"post_ids": ["some-id"], "action": "invalid"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 400:
                result.success("Blog bulk actions (invalid action) → 400 bad request")
            else:
                result.failure("Blog bulk actions (invalid action)", f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog bulk actions (invalid action)", f"Request error: {e}")
        
        # Test 6: Without auth - should return 401
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog/bulk",
                json={"post_ids": ["some-id"], "action": "publish"},
                timeout=30.0
            )
            
            if response.status_code == 401:
                result.success("Blog bulk actions (no auth) → 401 unauthorized")
            else:
                result.failure("Blog bulk actions (no auth)", f"Expected 401, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog bulk actions (no auth)", f"Request error: {e}")

async def test_blog_duplicate(result: TestResult, admin_token: Optional[str]):
    """Test POST /api/content/blog/{post_id}/duplicate"""
    if not admin_token:
        result.failure("Blog duplicate setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # Get any post to duplicate
        try:
            response = await client.get(f"{BACKEND_URL}/content/blog?limit=1", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                if data["posts"]:
                    original_post = data["posts"][0]
                    original_post_id = original_post["post_id"]
                    original_title = original_post["title"]
                    original_slug = original_post["slug"]
                    
                    # Test 1: Duplicate the post
                    try:
                        response = await client.post(
                            f"{BACKEND_URL}/content/blog/{original_post_id}/duplicate",
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if response.status_code == 200:
                            duplicate_post = response.json()
                            
                            # Check requirements
                            checks = []
                            
                            # Different post_id
                            if duplicate_post.get("post_id") != original_post_id:
                                checks.append("different_id")
                            
                            # Title ending in "(Copy)"
                            if duplicate_post.get("title", "").endswith("(Copy)"):
                                checks.append("title_copy")
                            
                            # Status is "draft"
                            if duplicate_post.get("status") == "draft":
                                checks.append("status_draft")
                            
                            # Unique slug ending in "-copy" or "-copy-<hex>"
                            duplicate_slug = duplicate_post.get("slug", "")
                            if (duplicate_slug != original_slug and 
                                (duplicate_slug.endswith("-copy") or "-copy-" in duplicate_slug)):
                                checks.append("unique_slug")
                            
                            if len(checks) == 4:
                                result.success("Blog duplicate → 200 with correct duplicate post")
                                
                                # Store for cleanup
                                result.created_posts.append(duplicate_post.get("post_id"))
                            else:
                                result.failure("Blog duplicate", f"Missing requirements: {set(['different_id', 'title_copy', 'status_draft', 'unique_slug']) - set(checks)}")
                        else:
                            result.failure("Blog duplicate", f"Expected 200, got {response.status_code}: {response.text}")
                    except Exception as e:
                        result.failure("Blog duplicate", f"Request error: {e}")
                        
                else:
                    result.failure("Blog duplicate setup", "No posts found to duplicate")
            else:
                result.failure("Blog duplicate setup", f"Failed to get posts: {response.status_code}")
        except Exception as e:
            result.failure("Blog duplicate setup", f"Request error: {e}")

async def test_blog_delete(result: TestResult, admin_token: Optional[str]):
    """Test DELETE /api/content/blog/{post_id}"""
    if not admin_token:
        result.failure("Blog delete setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # Create a test post for deletion
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": "Test Post for Deletion",
                    "content": "This post will be deleted during testing",
                    "status": "draft"
                },
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                test_post = response.json()
                test_post_id = test_post.get("post_id")
                
                # Test 1: Soft delete (default permanent=false)
                try:
                    response = await client.delete(
                        f"{BACKEND_URL}/content/blog/{test_post_id}",
                        headers=headers,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        # Verify post still exists but is archived
                        get_response = await client.get(
                            f"{BACKEND_URL}/content/blog/id/{test_post_id}",
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if get_response.status_code == 200:
                            post_data = get_response.json()
                            if post_data.get("status") == "archived":
                                result.success("Blog delete (soft) → 200 and post archived")
                            else:
                                result.failure("Blog delete (soft)", f"Post not archived, status: {post_data.get('status')}")
                        else:
                            result.failure("Blog delete (soft)", f"Post not found after soft delete: {get_response.status_code}")
                    else:
                        result.failure("Blog delete (soft)", f"Expected 200, got {response.status_code}: {response.text}")
                except Exception as e:
                    result.failure("Blog delete (soft)", f"Request error: {e}")
                
                # Test 2: Hard delete (permanent=true)
                try:
                    response = await client.delete(
                        f"{BACKEND_URL}/content/blog/{test_post_id}?permanent=true",
                        headers=headers,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        # Verify post no longer exists
                        get_response = await client.get(
                            f"{BACKEND_URL}/content/blog/id/{test_post_id}",
                            headers=headers,
                            timeout=30.0
                        )
                        
                        if get_response.status_code == 404:
                            result.success("Blog delete (permanent) → 200 and post removed")
                        else:
                            result.failure("Blog delete (permanent)", f"Post still exists after permanent delete: {get_response.status_code}")
                    else:
                        result.failure("Blog delete (permanent)", f"Expected 200, got {response.status_code}: {response.text}")
                except Exception as e:
                    result.failure("Blog delete (permanent)", f"Request error: {e}")
                    
            else:
                result.failure("Blog delete setup", f"Failed to create test post: {response.status_code}")
        except Exception as e:
            result.failure("Blog delete setup", f"Request error: {e}")

async def test_blog_create(result: TestResult, admin_token: Optional[str]):
    """Test POST /api/content/blog (create)"""
    if not admin_token:
        result.failure("Blog create setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # Test 1: Create with minimal body (excerpt is optional)
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": "Test Blog Post Minimal",
                    "content": "This is a test blog post with minimal fields",
                    "status": "draft"
                },
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                post_data = response.json()
                if post_data.get("title") == "Test Blog Post Minimal":
                    result.success("Blog create (minimal fields) → 200 with correct post")
                    result.created_posts.append(post_data.get("post_id"))
                else:
                    result.failure("Blog create (minimal)", f"Wrong post data: {post_data}")
            else:
                result.failure("Blog create (minimal)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog create (minimal)", f"Request error: {e}")
        
        # Test 2: Create with published:true (no status field)
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": "Test Blog Post Published Flag",
                    "content": "This post uses published:true",
                    "published": True
                },
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                post_data = response.json()
                if post_data.get("status") == "published":
                    result.success("Blog create (published:true) → 200 with status=published")
                    result.created_posts.append(post_data.get("post_id"))
                else:
                    result.failure("Blog create (published:true)", f"Status not set correctly: {post_data.get('status')}")
            else:
                result.failure("Blog create (published:true)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog create (published:true)", f"Request error: {e}")
        
        # Test 3: Create with status:"published" (no published field)
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": "Test Blog Post Status Published",
                    "content": "This post uses status:published",
                    "status": "published"
                },
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                post_data = response.json()
                if post_data.get("published") == True:
                    result.success("Blog create (status:published) → 200 with published=true")
                    result.created_posts.append(post_data.get("post_id"))
                else:
                    result.failure("Blog create (status:published)", f"Published flag not set: {post_data.get('published')}")
            else:
                result.failure("Blog create (status:published)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Blog create (status:published)", f"Request error: {e}")
        
        # Test 4: Create two posts with same title (verify unique slugs)
        try:
            title = "Duplicate Title Test"
            
            # Create first post
            response1 = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": title,
                    "content": "First post with this title",
                    "status": "draft"
                },
                headers=headers,
                timeout=30.0
            )
            
            # Create second post with same title
            response2 = await client.post(
                f"{BACKEND_URL}/content/blog",
                json={
                    "title": title,
                    "content": "Second post with this title",
                    "status": "draft"
                },
                headers=headers,
                timeout=30.0
            )
            
            if response1.status_code == 200 and response2.status_code == 200:
                post1 = response1.json()
                post2 = response2.json()
                
                slug1 = post1.get("slug")
                slug2 = post2.get("slug")
                
                if slug1 != slug2:
                    result.success("Blog create (duplicate titles) → unique slugs generated")
                    result.created_posts.extend([post1.get("post_id"), post2.get("post_id")])
                else:
                    result.failure("Blog create (duplicate titles)", f"Slugs not unique: {slug1} == {slug2}")
            else:
                result.failure("Blog create (duplicate titles)", f"Failed to create posts: {response1.status_code}, {response2.status_code}")
        except Exception as e:
            result.failure("Blog create (duplicate titles)", f"Request error: {e}")

async def test_smoke_other_endpoints(result: TestResult, admin_token: Optional[str]):
    """Smoke test other content endpoints for user-not-defined bug fix"""
    if not admin_token:
        result.failure("Smoke test setup", "No admin token available")
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        created_items = []
        
        # Test 1: POST /api/content/news
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/news",
                json={"title": "Test News", "content": "Test content"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                result.success("Smoke test POST /api/content/news → success (no user-not-defined error)")
                news_data = response.json()
                if news_data.get("news_id"):
                    created_items.append(("news", news_data.get("news_id")))
            else:
                result.failure("Smoke test POST /api/content/news", f"Expected 200/201, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Smoke test POST /api/content/news", f"Request error: {e}")
        
        # Test 2: POST /api/content/videos
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/videos",
                json={
                    "title": "Test Video",
                    "description": "Test video description",
                    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                },
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                result.success("Smoke test POST /api/content/videos → success (no user-not-defined error)")
                video_data = response.json()
                if video_data.get("video_id"):
                    created_items.append(("videos", video_data.get("video_id")))
            else:
                result.failure("Smoke test POST /api/content/videos", f"Expected 200/201, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Smoke test POST /api/content/videos", f"Request error: {e}")
        
        # Test 3: POST /api/content/news/rss-feeds
        try:
            response = await client.post(
                f"{BACKEND_URL}/content/news/rss-feeds",
                json={"name": "Test Feed", "url": "https://example.com/feed"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                result.success("Smoke test POST /api/content/news/rss-feeds → success (no user-not-defined error)")
                feed_data = response.json()
                if feed_data.get("feed_id"):
                    created_items.append(("rss-feeds", feed_data.get("feed_id")))
            else:
                result.failure("Smoke test POST /api/content/news/rss-feeds", f"Expected 200/201, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Smoke test POST /api/content/news/rss-feeds", f"Request error: {e}")
        
        # Test 4: PATCH /api/content/about
        try:
            response = await client.patch(
                f"{BACKEND_URL}/content/about",
                json={"title": "About Us", "content": "<p>Test about content</p>"},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                result.success("Smoke test PATCH /api/content/about → success (no user-not-defined error)")
            else:
                result.failure("Smoke test PATCH /api/content/about", f"Expected 200/201, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Smoke test PATCH /api/content/about", f"Request error: {e}")
        
        # Test 5: POST /api/content/upload (with small image file)
        try:
            # Create a small test image (1x1 pixel PNG)
            import base64
            small_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
            
            files = {"file": ("test.png", small_png, "image/png")}
            
            response = await client.post(
                f"{BACKEND_URL}/content/upload",
                files=files,
                headers={"Authorization": f"Bearer {admin_token}"},  # Don't include Content-Type for multipart
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                result.success("Smoke test POST /api/content/upload → success (no user-not-defined error)")
                upload_data = response.json()
                if upload_data.get("file_id"):
                    created_items.append(("upload", upload_data.get("file_id")))
            else:
                result.failure("Smoke test POST /api/content/upload", f"Expected 200/201, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Smoke test POST /api/content/upload", f"Request error: {e}")
        
        # Cleanup created items
        for item_type, item_id in created_items:
            try:
                if item_type == "news":
                    await client.delete(f"{BACKEND_URL}/content/news/{item_id}", headers=headers, timeout=30.0)
                elif item_type == "videos":
                    await client.delete(f"{BACKEND_URL}/content/videos/{item_id}", headers=headers, timeout=30.0)
                elif item_type == "rss-feeds":
                    await client.delete(f"{BACKEND_URL}/content/news/rss-feeds/{item_id}", headers=headers, timeout=30.0)
                elif item_type == "upload":
                    await client.delete(f"{BACKEND_URL}/content/upload/{item_id}", headers=headers, timeout=30.0)
            except:
                pass  # Cleanup attempt, ignore errors

async def cleanup_created_posts(result: TestResult, admin_token: str):
    """Clean up any posts created during testing"""
    if not result.created_posts:
        return
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        for post_id in result.created_posts:
            try:
                await client.delete(
                    f"{BACKEND_URL}/content/blog/{post_id}?permanent=true",
                    headers=headers,
                    timeout=30.0
                )
            except:
                pass  # Cleanup attempt, ignore errors

async def main():
    print("=== Blog Manager Endpoints Test ===")
    print(f"Backend URL: {BACKEND_URL}")
    print("Expected seed state: 45 blog posts (30 published, 10 draft, 5 archived)")
    print()
    
    result = TestResult()
    
    # Get admin token
    admin_token = await login_admin()
    if not admin_token:
        result.failure("Admin login", "Failed to login as super admin")
        return result.summary()
    
    print("Testing blog manager endpoints...")
    
    # Run all tests
    await test_blog_list_pagination_filtering(result, admin_token)
    await test_blog_stats(result, admin_token)
    await test_blog_get_by_id(result, admin_token)
    await test_blog_status_update(result, admin_token)
    await test_blog_bulk_actions(result, admin_token)
    await test_blog_duplicate(result, admin_token)
    await test_blog_delete(result, admin_token)
    await test_blog_create(result, admin_token)
    await test_smoke_other_endpoints(result, admin_token)
    
    # Cleanup
    await cleanup_created_posts(result, admin_token)
    
    return result.summary()

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)