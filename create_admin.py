#!/usr/bin/env python3
"""
Check and create admin user if needed
"""
import asyncio
import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def main():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if admin user exists
    admin_email = "admin@vasilisnetshield.com"
    admin_user = await db.users.find_one({"email": admin_email})
    
    if admin_user:
        print(f"Admin user {admin_email} already exists")
        print(f"Role: {admin_user.get('role')}")
        return
    
    # Create admin user
    password = "Admin123!"
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    user_doc = {
        "user_id": "user_admin_001",
        "email": admin_email,
        "name": "Admin User",
        "password_hash": password_hash,
        "role": "super_admin",
        "organization_id": None,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    print(f"Created admin user: {admin_email} with password: {password}")

if __name__ == "__main__":
    asyncio.run(main())