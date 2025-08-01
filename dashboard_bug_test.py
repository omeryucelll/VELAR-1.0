#!/usr/bin/env python3
"""
Focused test for Dashboard Current Step Display Bug Fix
Tests the critical bug where dashboard was showing project defaults instead of actual custom steps
"""

import requests
import sys
import json
from datetime import datetime

class DashboardBugTester:
    def __init__(self, base_url="https://f174794d-2bf1-4ce3-907a-0cbbafcd8596.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
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

    def make_request(self, method: str, endpoint: str, data=None, expected_status: int = 200):
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

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

    def authenticate(self):
        """Authenticate as manager"""
        print("🔐 Authenticating...")
        success, response = self.make_request(
            "POST", "auth/login", 
            {"username": "tunaerdiguven", "password": "tuna123"}
        )
        
        if success and "token" in response:
            self.token = response["token"]
            self.log_test("Manager authentication", True)
            return True
        else:
            self.log_test("Manager authentication", False)
            return False

    def test_dashboard_current_step_bug_fix(self):
        """Test the critical dashboard current step display bug fix"""
        print("\n🚨 TESTING DASHBOARD CURRENT STEP DISPLAY BUG FIX")
        print("=" * 60)
        
        # Get existing project
        success, projects = self.make_request("GET", "projects")
        if not success or not projects:
            self.log_test("Get existing projects", False, "No projects found")
            return
            
        project = projects[0]  # Use the existing ROKETSAN-0001 project
        project_id = project["id"]
        project_name = project["name"]
        project_default_steps = project.get("process_steps", [])
        
        print(f"📋 Using project: {project_name}")
        print(f"📋 Project default steps: {project_default_steps}")
        
        # Test Scenario 1: Create work order with custom steps different from project defaults
        print("\n🔧 Test Scenario 1: Custom Steps vs Project Defaults")
        custom_steps = ["Hazırlık", "İşleme"]  # Turkish custom steps
        
        success, response = self.make_request(
            "POST", "parts",
            {
                "part_number": "DASHBOARD-BUG-TEST-001",
                "project_id": project_id,
                "process_steps": custom_steps
            }
        )
        
        if not success:
            self.log_test("Create work order with custom steps", False)
            return
            
        created_part = response
        part_id = created_part["id"]
        
        self.log_test("Create work order with custom steps", True, 
                     f"Part: {created_part['part_number']}")
        
        # Verify process instances were created with custom steps
        success, status_data = self.make_request("GET", f"parts/{part_id}/status")
        if success:
            process_instances = status_data.get("process_instances", [])
            actual_step_names = [pi["step_name"] for pi in process_instances]
            
            # Check that process instances use ONLY custom steps, not project defaults
            uses_custom_steps = set(actual_step_names) == set(custom_steps)
            self.log_test("Process instances use custom steps", uses_custom_steps,
                         f"Expected: {custom_steps}, Got: {actual_step_names}")
            
            uses_project_defaults = any(step in project_default_steps for step in actual_step_names)
            self.log_test("Process instances do NOT use project defaults", not uses_project_defaults,
                         f"Custom steps: {actual_step_names}, Project defaults: {project_default_steps}")
        
        # CRITICAL TEST: Get dashboard and verify current step shows custom step name
        print("\n📊 CRITICAL TEST: Dashboard Current Step Display")
        success, dashboard_data = self.make_request("GET", "dashboard/overview")
        
        if not success:
            self.log_test("Get dashboard overview", False)
            return
            
        # Find our test part in dashboard data
        test_part_dashboard = None
        for item in dashboard_data:
            if item.get("part", {}).get("id") == part_id:
                test_part_dashboard = item
                break
        
        if not test_part_dashboard:
            self.log_test("Find test part in dashboard", False, "Part not found in dashboard")
            return
            
        current_step_in_dashboard = test_part_dashboard.get("current_step", "")
        expected_first_step = custom_steps[0]  # "Hazırlık"
        
        # TEST 1: Dashboard shows actual custom step name (not project default)
        shows_custom_step = current_step_in_dashboard == expected_first_step
        self.log_test("🎯 Dashboard shows CUSTOM step name", shows_custom_step,
                     f"Expected: '{expected_first_step}', Got: '{current_step_in_dashboard}'")
        
        # TEST 2: Dashboard does NOT show project default step names
        shows_project_default = current_step_in_dashboard in project_default_steps
        self.log_test("🎯 Dashboard does NOT show project defaults", not shows_project_default,
                     f"Current step '{current_step_in_dashboard}' should not be in project defaults {project_default_steps}")
        
        # TEST 3: No old default labels like "initial quality control"
        old_default_labels = ["initial quality control", "Initial Quality Control", "quality control", "machining", "welding", "painting"]
        shows_old_defaults = any(label.lower() in current_step_in_dashboard.lower() for label in old_default_labels)
        self.log_test("🎯 No old default labels in dashboard", not shows_old_defaults,
                     f"Current step '{current_step_in_dashboard}' should not contain old default labels")
        
        # Test Scenario 2: Create another work order with different custom steps
        print("\n🔧 Test Scenario 2: Different Custom Steps")
        unique_steps = ["Başlangıç", "Orta Aşama", "Bitiş"]
        
        success, response2 = self.make_request(
            "POST", "parts",
            {
                "part_number": "DASHBOARD-BUG-TEST-002",
                "project_id": project_id,
                "process_steps": unique_steps
            }
        )
        
        if success:
            part2_id = response2["id"]
            
            # Get updated dashboard
            success, dashboard_data = self.make_request("GET", "dashboard/overview")
            
            if success:
                # Find the new part
                for item in dashboard_data:
                    if item.get("part", {}).get("id") == part2_id:
                        current_step = item.get("current_step", "")
                        expected_step = unique_steps[0]  # "Başlangıç"
                        
                        step_accuracy = current_step == expected_step
                        self.log_test("🎯 Different custom steps displayed correctly", step_accuracy,
                                     f"Expected: '{expected_step}', Got: '{current_step}'")
                        break
        
        # Test Scenario 3: Verify existing parts still work correctly
        print("\n🔧 Test Scenario 3: Existing Parts Verification")
        
        # Check all dashboard items to ensure no regression
        all_items_valid = True
        invalid_items = []
        
        for item in dashboard_data:
            part = item.get("part", {})
            current_step = item.get("current_step", "")
            part_number = part.get("part_number", "")
            
            # Check if current step is empty or contains obvious default placeholders
            if not current_step or current_step.strip() == "":
                all_items_valid = False
                invalid_items.append(f"{part_number}: empty current_step")
            elif "placeholder" in current_step.lower() or "default" in current_step.lower():
                all_items_valid = False
                invalid_items.append(f"{part_number}: contains placeholder/default")
        
        self.log_test("🎯 All dashboard items have valid current_step", all_items_valid,
                     f"Invalid items: {invalid_items}" if invalid_items else "All items valid")
        
        # Test Scenario 4: Verify dashboard structure
        print("\n🔧 Test Scenario 4: Dashboard Structure Verification")
        
        if dashboard_data:
            first_item = dashboard_data[0]
            
            # Check required fields
            has_part = "part" in first_item
            has_project = "project" in first_item  
            has_current_step = "current_step" in first_item
            
            self.log_test("Dashboard has required fields", has_part and has_project and has_current_step,
                         f"part: {has_part}, project: {has_project}, current_step: {has_current_step}")
            
            # Check current_step is not empty
            current_step_not_empty = first_item.get("current_step", "") != ""
            self.log_test("Current step field is not empty", current_step_not_empty,
                         f"Current step: '{first_item.get('current_step', '')}'")

    def run_test(self):
        """Run the dashboard bug fix test"""
        print("🚀 DASHBOARD CURRENT STEP DISPLAY BUG FIX TEST")
        print("🎯 CRITICAL: Testing that dashboard shows actual custom steps, not project defaults")
        print("=" * 80)

        if not self.authenticate():
            return 1

        try:
            self.test_dashboard_current_step_bug_fix()
            
        except Exception as e:
            print(f"\n💥 Test crashed: {str(e)}")
            return 1

        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 DASHBOARD BUG FIX TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 DASHBOARD BUG FIX VERIFIED - All tests passed!")
            print("✅ Dashboard correctly shows custom step names from process instances")
            print("✅ Dashboard does NOT show project default steps")
            print("✅ No old default labels appearing in dashboard")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  DASHBOARD BUG FIX FAILED - {failed} tests failed")
            print("❌ Dashboard may still be showing incorrect step information")
            return 1

def main():
    """Main test runner"""
    tester = DashboardBugTester()
    return tester.run_test()

if __name__ == "__main__":
    sys.exit(main())