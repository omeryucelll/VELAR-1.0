#!/usr/bin/env python3

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def fix_username():
    """Fix the username from orhsanavsar to orhanavsar"""
    
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        old_username = "orhsanavsar"
        new_username = "orhanavsar"
        
        print(f"Updating username from '{old_username}' to '{new_username}'...")
        
        # Find existing user
        existing_user = await db.users.find_one({"username": old_username})
        
        if existing_user:
            # Update the username
            result = await db.users.update_one(
                {"username": old_username},
                {
                    "$set": {
                        "username": new_username
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"✓ Successfully updated username to '{new_username}'")
                
                # Verify the update
                updated_user = await db.users.find_one({"username": new_username})
                if updated_user:
                    print(f"  - New username: {updated_user['username']}")
                    print(f"  - Role: {updated_user['role']}")
                    print(f"  - ID: {updated_user['id']}")
                else:
                    print(f"  - ERROR: Could not verify update for {new_username}")
            else:
                print(f"✗ Failed to update username")
        else:
            print(f"✗ User '{old_username}' not found in database")
            
        # List all current users for verification
        print("\nCurrent users in database:")
        users = await db.users.find().to_list(100)
        for user in users:
            print(f"  - Username: {user.get('username', 'N/A')}, Role: {user.get('role', 'N/A')}")
        
    except Exception as e:
        print(f"Error updating username: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_username())