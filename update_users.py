#!/usr/bin/env python3

import asyncio
import os
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def update_user_accounts():
    """Update the specified user accounts"""
    
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # User updates to perform
        user_updates = [
            {
                "old_username": "manager1",
                "new_username": "tunaerdiguven", 
                "new_password": "tuna123"
            },
            {
                "old_username": "operator1",
                "new_username": "orhsanavsar",
                "new_password": "orhan123"
            }
        ]
        
        print("Updating user accounts...")
        
        for update in user_updates:
            old_username = update["old_username"]
            new_username = update["new_username"]
            new_password = update["new_password"]
            
            # Find existing user
            existing_user = await db.users.find_one({"username": old_username})
            
            if existing_user:
                # Hash the new password
                new_password_hash = hash_password(new_password)
                
                # Update the user
                result = await db.users.update_one(
                    {"username": old_username},
                    {
                        "$set": {
                            "username": new_username,
                            "password_hash": new_password_hash
                        }
                    }
                )
                
                if result.modified_count > 0:
                    print(f"✓ Successfully updated user '{old_username}' to '{new_username}'")
                    
                    # Verify the update
                    updated_user = await db.users.find_one({"username": new_username})
                    if updated_user:
                        print(f"  - New username: {updated_user['username']}")
                        print(f"  - Role: {updated_user['role']}")
                        print(f"  - Password updated: ✓")
                    else:
                        print(f"  - ERROR: Could not verify update for {new_username}")
                else:
                    print(f"✗ Failed to update user '{old_username}'")
            else:
                print(f"✗ User '{old_username}' not found in database")
        
        print("\n" + "="*50)
        print("USER UPDATE COMPLETE!")
        print("="*50)
        print("\nUpdated Credentials:")
        print("- Manager: tunaerdiguven / tuna123")
        print("- Operator: orhsanavsar / orhan123")
        print("\nYou can now login with the new credentials!")
        
    except Exception as e:
        print(f"Error updating users: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(update_user_accounts())