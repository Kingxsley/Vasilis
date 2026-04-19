#!/usr/bin/env python3
"""
Backend test script for Phase 1 CMS Admin endpoints.

Tests the 3 new CMS admin endpoints:
1. GET /api/admin/cms/status
2. POST /api/admin/cms/reset  
3. POST /api/admin/cms/restore

Test matrix:
- Authentication enforcement (401, 403, 200)
- Happy-path behavior as super_admin
- Safety checks (dry-run behavior)
"""

import asyncio
import json
import sys
from typing import Dict, Any, Optional

import httpx

# Backend URL from frontend .env
BACKEND_URL = "https://security-hardening-28.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"

# Expected CMS collections
EXPECTED_CMS_COLLECTIONS = [
    "pages", "cms_tiles", "news", "events", "blog_posts", 
    "contact_submissions", "sidebar_configs", "navigation_items", "landing_layouts"
]

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
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

async def register_trainee() -> Optional[str]:
    """Register a trainee user and return JWT token"""
    import time
    unique_email = f"testtrainee{int(time.time())}@example.com"
    
    async with httpx.AsyncClient() as client:
        try:
            # Register trainee
            response = await client.post(
                f"{BACKEND_URL}/auth/register",
                json={
                    "email": unique_email,
                    "password": "Test123!",
                    "name": "Test Trainee"
                },
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("token")
            else:
                print(f"Trainee registration failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Trainee registration error: {e}")
            return None

async def test_unauthenticated_requests(result: TestResult):
    """Test that unauthenticated requests return 401"""
    async with httpx.AsyncClient() as client:
        endpoints = [
            ("GET", "/admin/cms/status"),
            ("POST", "/admin/cms/reset"),
            ("POST", "/admin/cms/restore?backup_stamp=test&confirm=false")
        ]
        
        for method, endpoint in endpoints:
            try:
                if method == "GET":
                    response = await client.get(f"{BACKEND_URL}{endpoint}", timeout=30.0)
                else:
                    response = await client.post(
                        f"{BACKEND_URL}{endpoint}",
                        json={"confirm": False, "i_understand_data_loss": False} if "reset" in endpoint else {},
                        timeout=30.0
                    )
                
                if response.status_code == 401:
                    data = response.json()
                    if data.get("detail") == "Unauthorized":
                        result.success(f"Unauthenticated {method} {endpoint} → 401")
                    else:
                        result.failure(f"Unauthenticated {method} {endpoint}", f"Wrong error message: {data}")
                else:
                    result.failure(f"Unauthenticated {method} {endpoint}", f"Expected 401, got {response.status_code}")
            except Exception as e:
                result.failure(f"Unauthenticated {method} {endpoint}", f"Request error: {e}")

async def test_non_super_admin_requests(result: TestResult):
    """Test that non-super-admin requests return 403"""
    trainee_token = await register_trainee()
    if not trainee_token:
        result.failure("Non-super-admin auth setup", "Failed to register trainee user")
        return
    
    headers = {"Authorization": f"Bearer {trainee_token}"}
    
    async with httpx.AsyncClient() as client:
        endpoints = [
            ("GET", "/admin/cms/status"),
            ("POST", "/admin/cms/reset"),
            ("POST", "/admin/cms/restore?backup_stamp=test&confirm=false")
        ]
        
        for method, endpoint in endpoints:
            try:
                if method == "GET":
                    response = await client.get(f"{BACKEND_URL}{endpoint}", headers=headers, timeout=30.0)
                else:
                    response = await client.post(
                        f"{BACKEND_URL}{endpoint}",
                        json={"confirm": False, "i_understand_data_loss": False} if "reset" in endpoint else {},
                        headers=headers,
                        timeout=30.0
                    )
                
                if response.status_code == 403:
                    data = response.json()
                    if "Access denied. Required level: super_admin" in data.get("detail", ""):
                        result.success(f"Non-super-admin {method} {endpoint} → 403")
                    else:
                        result.failure(f"Non-super-admin {method} {endpoint}", f"Wrong error message: {data}")
                else:
                    result.failure(f"Non-super-admin {method} {endpoint}", f"Expected 403, got {response.status_code}")
            except Exception as e:
                result.failure(f"Non-super-admin {method} {endpoint}", f"Request error: {e}")

async def test_super_admin_status(result: TestResult, admin_token: str):
    """Test GET /api/admin/cms/status as super_admin"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BACKEND_URL}/admin/cms/status", headers=headers, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                if not data.get("dry_run"):
                    result.failure("Super-admin status", "Missing or false dry_run field")
                    return
                
                before_counts = data.get("before_counts", {})
                if not isinstance(before_counts, dict):
                    result.failure("Super-admin status", "before_counts is not a dict")
                    return
                
                # Check all 9 expected collections are present
                missing_collections = []
                for collection in EXPECTED_CMS_COLLECTIONS:
                    if collection not in before_counts:
                        missing_collections.append(collection)
                    elif not isinstance(before_counts[collection], int) or before_counts[collection] < 0:
                        result.failure("Super-admin status", f"Invalid count for {collection}: {before_counts[collection]}")
                        return
                
                if missing_collections:
                    result.failure("Super-admin status", f"Missing collections: {missing_collections}")
                    return
                
                # Check no extra collections
                extra_collections = set(before_counts.keys()) - set(EXPECTED_CMS_COLLECTIONS)
                if extra_collections:
                    result.failure("Super-admin status", f"Unexpected collections: {extra_collections}")
                    return
                
                result.success("Super-admin GET /admin/cms/status → 200 with correct structure")
            else:
                result.failure("Super-admin status", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Super-admin status", f"Request error: {e}")

async def test_super_admin_reset_dry_run(result: TestResult, admin_token: str):
    """Test POST /api/admin/cms/reset with dry-run scenarios"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        # Test 1: confirm=false, i_understand_data_loss=false (dry-run)
        try:
            response = await client.post(
                f"{BACKEND_URL}/admin/cms/reset",
                json={"confirm": False, "i_understand_data_loss": False},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get("dry_run"):
                    result.failure("Reset dry-run (false,false)", "Expected dry_run=true")
                    return
                
                if data.get("backup_stamp") is not None:
                    result.failure("Reset dry-run (false,false)", f"Expected backup_stamp=null, got {data.get('backup_stamp')}")
                    return
                
                before_counts = data.get("before_counts", {})
                if not isinstance(before_counts, dict) or len(before_counts) != 9:
                    result.failure("Reset dry-run (false,false)", f"Invalid before_counts: {before_counts}")
                    return
                
                backed_up = data.get("backed_up", {})
                deleted = data.get("deleted", {})
                if backed_up != {} or deleted != {}:
                    result.failure("Reset dry-run (false,false)", f"Expected empty backed_up/deleted, got {backed_up}/{deleted}")
                    return
                
                result.success("Reset dry-run (confirm=false, i_understand_data_loss=false) → 200 dry-run")
            else:
                result.failure("Reset dry-run (false,false)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Reset dry-run (false,false)", f"Request error: {e}")
        
        # Test 2: confirm=true, i_understand_data_loss=false (still dry-run)
        try:
            response = await client.post(
                f"{BACKEND_URL}/admin/cms/reset",
                json={"confirm": True, "i_understand_data_loss": False},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get("dry_run"):
                    result.failure("Reset dry-run (true,false)", "Expected dry_run=true (BOTH flags required)")
                    return
                
                result.success("Reset dry-run (confirm=true, i_understand_data_loss=false) → 200 dry-run")
            else:
                result.failure("Reset dry-run (true,false)", f"Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Reset dry-run (true,false)", f"Request error: {e}")

async def test_super_admin_restore_404(result: TestResult, admin_token: str):
    """Test POST /api/admin/cms/restore with non-existent backup"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BACKEND_URL}/admin/cms/restore?backup_stamp=nonexistent&confirm=false",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 404:
                data = response.json()
                expected_detail = "No backup found with stamp 'nonexistent'"
                if data.get("detail") == expected_detail:
                    result.success("Restore non-existent backup → 404")
                else:
                    result.failure("Restore non-existent backup", f"Wrong error message: {data.get('detail')}")
            else:
                result.failure("Restore non-existent backup", f"Expected 404, got {response.status_code}: {response.text}")
        except Exception as e:
            result.failure("Restore non-existent backup", f"Request error: {e}")

async def main():
    print("=== CMS Admin Endpoints Test ===")
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    result = TestResult()
    
    # Test authentication enforcement
    print("Testing authentication enforcement...")
    await test_unauthenticated_requests(result)
    await test_non_super_admin_requests(result)
    
    # Get admin token for super_admin tests
    admin_token = await login_admin()
    if not admin_token:
        result.failure("Admin login", "Failed to login as super admin")
        return result.summary()
    
    print("\nTesting super_admin happy-path behavior...")
    await test_super_admin_status(result, admin_token)
    await test_super_admin_reset_dry_run(result, admin_token)
    await test_super_admin_restore_404(result, admin_token)
    
    return result.summary()

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)