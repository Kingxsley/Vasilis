#!/usr/bin/env python3
"""
Additional edge case tests for CMS Admin endpoints
"""

import asyncio
import httpx

BACKEND_URL = "https://cms-enterprise.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@vasilisnetshield.com"
ADMIN_PASSWORD = "Admin123!"

async def test_edge_cases():
    print("=== Additional Edge Case Tests ===")
    
    # Login as admin
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30.0
        )
        if response.status_code != 200:
            print("❌ Failed to login as admin")
            return
        
        admin_token = response.json().get("token")
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test 1: Status endpoint response structure
        print("\n1. Testing status endpoint response structure...")
        response = await client.get(f"{BACKEND_URL}/admin/cms/status", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status response: {data}")
            
            # Verify all 9 collections are present with non-negative counts
            expected_collections = [
                "pages", "cms_tiles", "news", "events", "blog_posts", 
                "contact_submissions", "sidebar_configs", "navigation_items", "landing_layouts"
            ]
            before_counts = data.get("before_counts", {})
            for collection in expected_collections:
                count = before_counts.get(collection, -1)
                print(f"  {collection}: {count}")
                if count < 0:
                    print(f"❌ Invalid count for {collection}")
        
        # Test 2: Reset endpoint with different body combinations
        print("\n2. Testing reset endpoint with different body combinations...")
        
        test_bodies = [
            {"confirm": False, "i_understand_data_loss": False},
            {"confirm": True, "i_understand_data_loss": False},
            {"confirm": False, "i_understand_data_loss": True},
            # Note: NOT testing {"confirm": True, "i_understand_data_loss": True} as that would wipe data
        ]
        
        for body in test_bodies:
            response = await client.post(
                f"{BACKEND_URL}/admin/cms/reset",
                json=body,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                dry_run = data.get("dry_run")
                print(f"✅ Reset {body} → dry_run={dry_run}")
                if not dry_run:
                    print("❌ Expected dry_run=true for safety")
            else:
                print(f"❌ Reset {body} → {response.status_code}")
        
        # Test 3: Restore endpoint with different backup stamps
        print("\n3. Testing restore endpoint with different backup stamps...")
        
        test_stamps = ["nonexistent", "invalid_format", "20260101T000000Z"]
        for stamp in test_stamps:
            response = await client.post(
                f"{BACKEND_URL}/admin/cms/restore?backup_stamp={stamp}&confirm=false",
                headers=headers
            )
            if response.status_code == 404:
                data = response.json()
                print(f"✅ Restore {stamp} → 404: {data.get('detail')}")
            else:
                print(f"❌ Restore {stamp} → {response.status_code} (expected 404)")
        
        print("\n=== Edge Case Tests Complete ===")

if __name__ == "__main__":
    asyncio.run(test_edge_cases())