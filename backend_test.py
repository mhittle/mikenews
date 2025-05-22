import requests
import unittest
import sys
import json
from datetime import datetime

class NewsAggregatorAPITester:
    def __init__(self, base_url="http://localhost:8001/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_feed_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
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
            
            result = {
                "name": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response"] = response.json()
                except:
                    result["response"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    result["error"] = response.json()
                except:
                    result["error"] = response.text
            
            self.test_results.append(result)
            return success, response
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })
            return False, None

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_login(self, username, password):
        """Test login and get token"""
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'username': username,
            'password': password
        }
        
        success, response = self.run_test(
            "Login",
            "POST",
            "token",
            200,
            data=None,
            headers=headers
        )
        
        # For login, we need to use form data instead of JSON
        if not success:
            url = f"{self.base_url}/token"
            try:
                response = requests.post(
                    url, 
                    data=data,
                    headers=headers
                )
                success = response.status_code == 200
                if success:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: {response.status_code}")
                    self.test_results[-1]["success"] = True
                    self.test_results[-1]["status_code"] = response.status_code
                    self.test_results[-1]["response"] = response.json()
            except Exception as e:
                print(f"❌ Failed - Error: {str(e)}")
                return False
        
        if success and response and hasattr(response, 'json'):
            response_data = response.json()
            if 'access_token' in response_data:
                self.token = response_data['access_token']
                return True
        
        return False

    def test_get_current_user(self):
        """Test getting the current user profile"""
        return self.run_test(
            "Get Current User",
            "GET",
            "users/me",
            200
        )

    def test_update_preferences(self, preferences):
        """Test updating user preferences"""
        return self.run_test(
            "Update Preferences",
            "PUT",
            "users/me/preferences",
            200,
            data=preferences
        )
        
    def test_update_preferences_with_topics_filter_type(self, filter_type):
        """Test updating user preferences with topics filter type"""
        preferences = {
            "reading_level": 7,
            "information_density": 8,
            "bias_threshold": 6,
            "propaganda_threshold": 7,
            "max_length": 3000,
            "min_length": 100,
            "topics": ["technology", "science", "health"],
            "regions": ["north_america", "europe"],
            "show_paywalled": False,
            "topics_filter_type": filter_type
        }
        
        success, response = self.run_test(
            f"Update Preferences with Topics Filter Type: {filter_type}",
            "PUT",
            "users/me/preferences",
            200,
            data=preferences
        )
        
        if success and response and hasattr(response, 'json'):
            response_data = response.json()
            if response_data.get("topics_filter_type") == filter_type:
                print(f"✅ Topics filter type correctly set to: {filter_type}")
                return True
            else:
                print(f"❌ Topics filter type not correctly set. Expected: {filter_type}, Got: {response_data.get('topics_filter_type')}")
                return False
        
        return False

    def test_get_articles(self):
        """Test getting articles"""
        return self.run_test(
            "Get Articles",
            "GET",
            "articles",
            200
        )

    def test_get_articles_with_auth(self):
        """Test getting articles with authentication"""
        return self.run_test(
            "Get Articles with Auth",
            "GET",
            "articles",
            200
        )
        
    def test_get_feeds(self):
        """Test getting RSS feeds"""
        return self.run_test(
            "Get RSS Feeds",
            "GET",
            "feeds",
            200
        )
        
    def test_add_rss_feed(self, feed_data):
        """Test adding a new RSS feed"""
        success, response = self.run_test(
            "Add RSS Feed",
            "POST",
            "feeds",
            200,  # Should be 201 but checking for 200 to be safe
            data=feed_data
        )
        
        if success and response and hasattr(response, 'json'):
            response_data = response.json()
            if 'id' in response_data:
                self.test_feed_id = response_data['id']
                print(f"✅ Feed added with ID: {self.test_feed_id}")
                return True
        
        return False
        
    def test_process_feed(self, feed_id=None):
        """Test processing a specific RSS feed"""
        if feed_id is None and self.test_feed_id is None:
            print("❌ No feed ID available for processing")
            return False
            
        feed_id = feed_id or self.test_feed_id
        
        return self.run_test(
            f"Process Feed (ID: {feed_id})",
            "POST",
            f"feeds/{feed_id}/process",
            200,
            data={}
        )
        
    def test_process_all_feeds(self):
        """Test processing all RSS feeds"""
        return self.run_test(
            "Process All Feeds",
            "POST",
            "process-all-feeds",
            200,
            data={}
        )
        
    def test_delete_feed(self, feed_id=None):
        """Test deleting an RSS feed"""
        if feed_id is None and self.test_feed_id is None:
            print("❌ No feed ID available for deletion")
            return False
            
        feed_id = feed_id or self.test_feed_id
        
        return self.run_test(
            f"Delete Feed (ID: {feed_id})",
            "DELETE",
            f"feeds/{feed_id}",
            200
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print("="*50)
        
        if self.tests_passed < self.tests_run:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result.get("success"):
                    print(f"- {result['name']}")
                    if "error" in result:
                        print(f"  Error: {result['error']}")
                    if "status_code" in result:
                        print(f"  Status: {result['status_code']} (Expected: {result['expected_status']})")
        
        return self.tests_passed == self.tests_run

def main():
    # Setup
    tester = NewsAggregatorAPITester()
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test login with admin credentials
    if not tester.test_login("admin", "admin123"):
        print("❌ Login failed, some tests may not work correctly")
    else:
        print("✅ Admin login successful")
    
    # Test getting current user
    tester.test_get_current_user()
    
    # Test the topics filter type option in preferences
    print("\n🔍 Testing topics filter type in preferences...")
    tester.test_update_preferences_with_topics_filter_type("OR")
    tester.test_update_preferences_with_topics_filter_type("AND")
    
    # Test getting RSS feeds
    success, response = tester.test_get_feeds()
    feeds = []
    if success and response and hasattr(response, 'json'):
        feeds = response.json()
        print(f"✅ Found {len(feeds)} RSS feeds")
    
    # Test adding a new RSS feed
    print("\n🔍 Testing adding a new RSS feed...")
    new_feed = {
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "name": "BBC World News",
        "category": "world",
        "region": "europe"
    }
    tester.test_add_rss_feed(new_feed)
    
    # Test processing a specific feed
    if tester.test_feed_id:
        print("\n🔍 Testing processing a specific feed...")
        tester.test_process_feed()
    elif feeds:
        # If we couldn't add a new feed but there are existing feeds, test with the first one
        print("\n🔍 Testing processing an existing feed...")
        tester.test_process_feed(feeds[0]['id'])
    
    # Test processing all feeds
    print("\n🔍 Testing processing all feeds...")
    tester.test_process_all_feeds()
    
    # Test getting articles with auth (should apply preferences)
    tester.test_get_articles_with_auth()
    
    # Clean up by deleting the test feed
    if tester.test_feed_id:
        print("\n🔍 Cleaning up test feed...")
        tester.test_delete_feed()
    
    # Print summary
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
