import requests
import json
from datetime import datetime
import urllib.parse

def test_api_endpoint():
    """
    Test different API endpoints based on the Recreation.gov website
    """
    # Test facility details endpoint
    facility_ids = ["233503", "255119", "232447"]  # Grant River, Fowlers, Upper Pines
    
    for facility_id in facility_ids:
        print(f"\n\nTesting facility ID: {facility_id}")
        
        # Try the facility details endpoint
        facility_url = f"https://www.recreation.gov/api/camps/campgrounds/{facility_id}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"\nFacility Details URL: {facility_url}")
        
        try:
            response = requests.get(facility_url, headers=headers)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("Facility data keys:", list(data.keys()))
                
                if 'campground' in data:
                    campground = data['campground']
                    print(f"Facility Name: {campground.get('facility_name', 'Unknown')}")
                    print(f"Facility Type: {campground.get('facility_type', 'Unknown')}")
                    print(f"Is Reservable: {campground.get('reservable', 'Unknown')}")
                else:
                    print("No 'campground' data found")
            else:
                print(f"Error response: {response.text[:200]}")
        except Exception as e:
            print(f"Error testing facility API: {e}")
        
        # Try the availability endpoint with current date
        current_year = datetime.now().year
        next_month = datetime.now().month + 1
        if next_month > 12:
            next_month = 1
            current_year += 1
        
        month_start = f"{current_year}-{next_month:02d}-01"  # First day of next month
        
        # Try multiple availability endpoints with proper URL encoding
        availability_urls = [
            f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={urllib.parse.quote(month_start + 'T00:00:00.000Z')}",
            f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={month_start}",
            f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?month={month_start[:7]}"
        ]
        
        for url in availability_urls:
            print(f"\nAvailability URL: {url}")
            
            try:
                response = requests.get(url, headers=headers)
                print(f"Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print("Response keys:", list(data.keys()))
                    
                    if 'campsites' in data:
                        print(f"Number of campsites: {len(data['campsites'])}")
                        
                        # Check for any available sites
                        available_count = 0
                        for site_id, details in data['campsites'].items():
                            for date, status in details.get('availabilities', {}).items():
                                if status == "Available":
                                    available_count += 1
                        
                        print(f"Number of available slots: {available_count}")
                        
                        # Print sample data
                        if data['campsites']:
                            sample_site_id = list(data['campsites'].keys())[0]
                            print(f"Sample site ID: {sample_site_id}")
                            availabilities = data['campsites'][sample_site_id].get('availabilities', {})
                            print(f"Sample availabilities (first 5): {list(availabilities.items())[:5]}")
                    else:
                        print("No 'campsites' data found")
                        print("Response preview:", json.dumps(data, indent=2)[:300] + "...")
                else:
                    print(f"Error response: {response.text[:200]}")
            except Exception as e:
                print(f"Error testing availability API: {e}")

if __name__ == "__main__":
    test_api_endpoint()
