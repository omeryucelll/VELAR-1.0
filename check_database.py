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

async def check_database():
    """Check what's in the database"""
    
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Check collections
        collections = await db.list_collection_names()
        print(f"Collections in database '{db_name}': {collections}")
        
        # Check users collection
        if "users" in collections:
            users = await db.users.find().to_list(100)
            print(f"\nUsers in database ({len(users)} total):")
            for user in users:
                print(f"  - Username: {user.get('username', 'N/A')}, Role: {user.get('role', 'N/A')}, ID: {user.get('id', 'N/A')}")
        else:
            print("\nNo 'users' collection found in database")
            
        # Check other collections too
        for collection_name in collections:
            if collection_name != "users":
                count = await db[collection_name].count_documents({})
                print(f"\n{collection_name} collection: {count} documents")
                
    except Exception as e:
        print(f"Error checking database: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_database())