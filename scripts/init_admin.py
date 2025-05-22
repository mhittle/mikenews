import asyncio
import os
import sys
from pathlib import Path
import uuid

# Add parent directory to path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent))

from backend.server import db, get_password_hash, User, UserPreferences

async def create_admin_user():
    """Create an admin user if one doesn't exist"""
    # Check if admin already exists
    admin = await db.users.find_one({"username": "admin"})
    if admin:
        print("Admin user already exists")
        return
    
    # Create admin user
    password_hash = get_password_hash("admin123")
    
    # Create with default preferences
    preferences = UserPreferences(
        reading_level=5,
        information_density=5,
        bias_threshold=5,
        propaganda_threshold=5,
        max_length=5000,
        min_length=0,
        topics=[],
        regions=[],
        show_paywalled=True
    )
    
    user = User(
        id=str(uuid.uuid4()),
        username="admin",
        email="admin@example.com",
        preferences=preferences
    )
    
    user_dict = user.dict()
    user_dict["password"] = password_hash
    
    await db.users.insert_one(user_dict)
    print("Admin user created successfully")
    print("Username: admin")
    print("Password: admin123")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
