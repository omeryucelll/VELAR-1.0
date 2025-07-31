#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Production Tracking System
Tests all endpoints including authentication, projects, parts, QR codes, and scanning workflow
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ProductionTrackingAPITester:
    def __init__(self, base_url="https://6eb4648f-6a52-486f-a3a6-9720a334c26b.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.test_data = {}  # Store created test data
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            if not success:
                print(f"   Status: {response.status_code}, Expected: {expected_status}")
                print(f"   Response: {response_data}")

            return success, response_data

        except Exception as e:
            print(f"   Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test credentials from the request
        test_users = [
            ("operator1", "password123", "operator"),
            ("manager1", "password123", "manager"), 
            ("admin1", "password123", "admin")
        ]

        for username, password, expected_role in test_users:
            # Test login
            success, response = self.make_request(
                "POST", "auth/login", 
                {"username": username, "password": password}
            )
            
            if success and "token" in response:
                self.tokens[username] = response["token"]
                user_role = response.get("user", {}).get("role", "")
                role_match = user_role == expected_role
                self.log_test(
                    f"Login {username}", 
                    role_match,
                    f"(Role: {user_role})"
                )
            else:
                self.log_test(f"Login {username}", False, f"No token received")

        # Test invalid credentials
        success, _ = self.make_request(
            "POST", "auth/login",
            {"username": "invalid", "password": "wrong"},
            expected_status=401
        )
        self.log_test("Invalid credentials rejection", success)

    def test_projects(self):
        """Test project endpoints"""
        print("\n📋 Testing Projects...")
        
        manager_token = self.tokens.get("manager1")
        if not manager_token:
            print("❌ No manager token available for project tests")
            return

        # Test get projects (should work for all authenticated users)
        success, projects = self.make_request("GET", "projects", token=manager_token)
        self.log_test("Get projects", success, f"({len(projects) if success else 0} projects)")

        # Look for the test project mentioned in the request
        test_project = None
        if success:
            for project in projects:
                if "Metal Parts Production Line Alpha" in project.get("name", ""):
                    test_project = project
                    self.test_data["project"] = project
                    break

        if test_project:
            self.log_test("Found test project", True, f"ID: {test_project['id']}")
            
            # Test get specific project
            success, project_detail = self.make_request(
                "GET", f"projects/{test_project['id']}", 
                token=manager_token
            )
            self.log_test("Get specific project", success)
            
            if success:
                steps = project_detail.get("process_steps", [])
                expected_steps = ["Initial Quality Control", "Machining (CNC)", "Welding", "Painting", "Final Quality Control"]
                steps_match = len(steps) == 5
                self.log_test("Project has 5 process steps", steps_match, f"Steps: {steps}")
        else:
            self.log_test("Find test project", False, "Metal Parts Production Line Alpha not found")

    def test_parts(self):
        """Test parts endpoints"""
        print("\n🔧 Testing Parts...")
        
        manager_token = self.tokens.get("manager1")
        if not manager_token:
            print("❌ No manager token available for parts tests")
            return

        # Test get parts
        success, parts = self.make_request("GET", "parts", token=manager_token)
        self.log_test("Get parts", success, f"({len(parts) if success else 0} parts)")

        # Look for test parts mentioned in the request
        test_parts = ["MP-001-A", "MP-002-B", "MP-003-C"]
        found_parts = []
        
        if success:
            for part in parts:
                part_number = part.get("part_number", "")
                if part_number in test_parts:
                    found_parts.append(part)
                    if part_number == "MP-001-A":
                        self.test_data["test_part"] = part

        self.log_test("Found test parts", len(found_parts) >= 1, 
                     f"Found: {[p['part_number'] for p in found_parts]}")

        # Test part status endpoint
        if found_parts:
            test_part = found_parts[0]
            success, status_data = self.make_request(
                "GET", f"parts/{test_part['id']}/status",
                token=manager_token
            )
            self.log_test("Get part status", success)
            
            if success:
                process_instances = status_data.get("process_instances", [])
                self.log_test("Part has process instances", len(process_instances) > 0,
                             f"({len(process_instances)} instances)")

    def test_qr_codes(self):
        """Test QR code generation"""
        print("\n📱 Testing QR Code Generation...")
        
        manager_token = self.tokens.get("manager1")
        test_part = self.test_data.get("test_part")
        
        if not manager_token or not test_part:
            print("❌ Missing manager token or test part for QR code tests")
            return

        # Test QR code generation
        success, qr_codes = self.make_request(
            "GET", f"parts/{test_part['id']}/qr-codes",
            token=manager_token
        )
        self.log_test("Generate QR codes", success)
        
        if success and qr_codes:
            self.test_data["qr_codes"] = qr_codes
            
            # Verify QR code structure
            first_qr = qr_codes[0]
            has_start_qr = "start_qr" in first_qr and "code" in first_qr["start_qr"]
            has_end_qr = "end_qr" in first_qr and "code" in first_qr["end_qr"]
            
            self.log_test("QR codes have proper structure", has_start_qr and has_end_qr)
            self.log_test("QR codes for all steps", len(qr_codes) == 5, 
                         f"({len(qr_codes)} QR code sets)")

    def test_qr_scanning_workflow(self):
        """Test the core QR scanning workflow"""
        print("\n🔍 Testing QR Scanning Workflow...")
        
        qr_codes = self.test_data.get("qr_codes")
        operator_token = self.tokens.get("operator1")
        
        if not qr_codes or not operator_token:
            print("❌ No QR codes or operator token available for scanning tests")
            return

        # Test scanning with operator credentials (traditional method)
        operator_creds = {"username": "operator1", "password": "password123"}
        
        # Test 1: Start first process step with traditional auth
        first_step_qr = qr_codes[0]
        start_qr_code = first_step_qr["start_qr"]["code"]
        
        success, response = self.make_request(
            "POST", "scan/start",
            {
                "qr_code": start_qr_code,
                **operator_creds
            },
            token=operator_token
        )
        self.log_test("Start first process step (traditional auth)", success, 
                     f"Step: {first_step_qr['step_name']}")

        if success:
            # Test 2: End first process step with session-based auth
            end_qr_code = first_step_qr["end_qr"]["code"]
            success, response = self.make_request(
                "POST", "scan/end",
                {
                    "qr_code": end_qr_code,
                    "username": "operator1",
                    "password": "session_authenticated"  # Key test for new functionality
                },
                token=operator_token
            )
            self.log_test("End first process step (session auth)", success)

            if success and len(qr_codes) > 1:
                # Test 3: Start second step with session-based auth
                second_step_qr = qr_codes[1]
                second_start_qr = second_step_qr["start_qr"]["code"]
                
                success, response = self.make_request(
                    "POST", "scan/start",
                    {
                        "qr_code": second_start_qr,
                        "username": "operator1",
                        "password": "session_authenticated"
                    },
                    token=operator_token
                )
                self.log_test("Start second step (session auth)", success)

        # Test session-based auth without valid token (should fail)
        success, _ = self.make_request(
            "POST", "scan/start",
            {
                "qr_code": start_qr_code,
                "username": "operator1",
                "password": "session_authenticated"
            },
            # No token provided
            expected_status=401
        )
        self.log_test("Session auth without token rejection", success)

        # Test error cases
        # Test invalid QR code with token
        success, _ = self.make_request(
            "POST", "scan/start",
            {
                "qr_code": "invalid-qr-code",
                **operator_creds
            },
            token=operator_token,
            expected_status=404
        )
        self.log_test("Invalid QR code rejection", success)

        # Test invalid credentials for scanning with token
        success, _ = self.make_request(
            "POST", "scan/start",
            {
                "qr_code": start_qr_code,
                "username": "invalid",
                "password": "wrong"
            },
            token=operator_token,
            expected_status=401
        )
        self.log_test("Invalid scan credentials rejection", success)

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n📊 Testing Dashboard...")
        
        manager_token = self.tokens.get("manager1")
        if not manager_token:
            print("❌ No manager token available for dashboard tests")
            return

        success, dashboard_data = self.make_request(
            "GET", "dashboard/overview",
            token=manager_token
        )
        self.log_test("Get dashboard overview", success)
        
        if success:
            self.log_test("Dashboard has data", len(dashboard_data) > 0,
                         f"({len(dashboard_data)} items)")
            
            # Check dashboard data structure
            if dashboard_data:
                first_item = dashboard_data[0]
                has_part = "part" in first_item
                has_project = "project" in first_item
                has_current_step = "current_step" in first_item
                
                self.log_test("Dashboard data structure", 
                             has_part and has_project and has_current_step)

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        operator_token = self.tokens.get("operator1")
        manager_token = self.tokens.get("manager1")
        
        if not operator_token or not manager_token:
            print("❌ Missing tokens for role-based access tests")
            return

        # Test operator trying to create project (should fail)
        success, _ = self.make_request(
            "POST", "projects",
            {
                "name": "Test Project",
                "description": "Should fail",
                "process_steps": ["Step 1", "Step 2"]
            },
            token=operator_token,
            expected_status=403
        )
        self.log_test("Operator cannot create projects", success)

        # Test operator trying to create parts (should fail)
        if self.test_data.get("project"):
            success, _ = self.make_request(
                "POST", "parts",
                {
                    "part_number": "TEST-PART",
                    "project_id": self.test_data["project"]["id"]
                },
                token=operator_token,
                expected_status=403
            )
            self.log_test("Operator cannot create parts", success)

        # Test operator can access dashboard (should work)
        success, _ = self.make_request("GET", "dashboard/overview", token=operator_token)
        self.log_test("Operator can access dashboard", success)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Production Tracking System API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        try:
            self.test_authentication()
            self.test_projects()
            self.test_parts()
            self.test_qr_codes()
            self.test_qr_scanning_workflow()
            self.test_dashboard()
            self.test_role_based_access()
            
        except Exception as e:
            print(f"\n💥 Test suite crashed: {str(e)}")
            return 1

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = ProductionTrackingAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())