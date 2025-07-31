#!/usr/bin/env python3

import asyncio
import requests
import json
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "frontend"
load_dotenv(ROOT_DIR / '.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_URL = f"{BACKEND_URL}/api"

async def setup_updated_users():
    """Setup users with the requested credentials"""
    
    print("Setting up users with updated credentials for Production Tracking System...")
    
    # Create users with the requested credentials
    users = [
        {"username": "orhsanavsar", "password": "orhan123", "role": "operator"},  # Updated operator
        {"username": "tunaerdiguven", "password": "tuna123", "role": "manager"},  # Updated manager
        {"username": "admin1", "password": "password123", "role": "admin"}  # Keep admin as is
    ]
    
    tokens = {}
    
    # Register users
    for user in users:
        try:
            response = requests.post(f"{API_URL}/auth/register", json=user)
            if response.status_code == 200:
                result = response.json()
                tokens[user["username"]] = result["token"]
                print(f"✓ Created user: {user['username']} ({user['role']})")
            else:
                print(f"✗ Failed to create user {user['username']}: {response.text}")
        except Exception as e:
            print(f"✗ Error creating user {user['username']}: {e}")
    
    # Create a test project with the new manager
    if "tunaerdiguven" in tokens:
        headers = {"Authorization": f"Bearer {tokens['tunaerdiguven']}"}
        
        project_data = {
            "name": "Metal Parts Production Line Alpha",
            "description": "Standard production line for metal parts with 5 sequential steps",
            "process_steps": [
                "Initial Quality Control",
                "Machining (CNC)",
                "Welding",
                "Painting",
                "Final Quality Control"
            ]
        }
        
        try:
            response = requests.post(f"{API_URL}/projects", json=project_data, headers=headers)
            if response.status_code == 200:
                project = response.json()
                project_id = project["id"]
                print(f"✓ Created project: {project['name']}")
                
                # Create test parts
                parts = [
                    {"part_number": "MP-001-A", "project_id": project_id},
                    {"part_number": "MP-002-B", "project_id": project_id},
                    {"part_number": "MP-003-C", "project_id": project_id}
                ]
                
                for part_data in parts:
                    try:
                        response = requests.post(f"{API_URL}/parts", json=part_data, headers=headers)
                        if response.status_code == 200:
                            part = response.json()
                            print(f"✓ Created part: {part['part_number']}")
                        else:
                            print(f"✗ Failed to create part {part_data['part_number']}: {response.text}")
                    except Exception as e:
                        print(f"✗ Error creating part {part_data['part_number']}: {e}")
                        
            else:
                print(f"✗ Failed to create project: {response.text}")
        except Exception as e:
            print(f"✗ Error creating project: {e}")
    
    print("\n" + "="*50)
    print("SETUP COMPLETE WITH UPDATED CREDENTIALS!")
    print("="*50)
    print("\nUpdated Test Credentials:")
    print("- Operator: orhsanavsar / orhan123")
    print("- Manager:  tunaerdiguven / tuna123") 
    print("- Admin:    admin1 / password123")
    print("\nYou can now:")
    print("1. Login with any of the above credentials")
    print("2. View the dashboard to see parts in production")
    print("3. Generate QR codes for the test parts")
    print("4. Test the scanning workflow")
    print("\nThe system includes a 5-step process:")
    print("1. Initial Quality Control")
    print("2. Machining (CNC)")
    print("3. Welding")
    print("4. Painting")
    print("5. Final Quality Control")

if __name__ == "__main__":
    asyncio.run(setup_updated_users())