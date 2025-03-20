import requests
import json
from datetime import datetime

def test_campground_api(facility_id, start_date):
    """
    Test the Recreation.gov API for a specific campground with proper URL encoding
    
    Args:
        facility_id (str): The facility ID for the campground
        start_date (str): Start date in YYYY-MM-DD format (should be first of month)
    """
    print(f"\nTesting API for facility ID: {facility_id}")
    
    # Format the date with URL encoding
    formatted_date = f"{start_date}T00%3A00%3A00.000Z"
    url = f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={formatted_date}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if we have campsites data
            if 'campsites' in data:
                campsite_count = len(data['campsites'])
                print(f"Number of campsites: {campsite_count}")
                
                # Check for any available sites
                available_count = 0
                available_dates = []
                
                for site_id, details in data['campsites'].items():
                    for date, status in details.get('availabilities', {}).items():
                        if status == "Available":
                            available_count += 1
                            available_dates.append(date)
                
                print(f"Number of available slots: {available_count}")
                if available_count > 0:
                    print(f"Sample available dates: {available_dates[:5]}")
                    
                # Print a sample campsite data
                if campsite_count > 0:
                    sample_site_id = list(data['campsites'].keys())[0]
                    print(f"\nSample campsite data for site {sample_site_id}:")
                    sample_site = data['campsites'][sample_site_id]
                    
                    # Print availability statuses
                    print("Availability statuses:")
                    statuses = list(sample_site.get('availabilities', {}).values())
                    unique_statuses = set(statuses)
                    print(f"All status types in data: {unique_statuses}")
            else:
                print("No 'campsites' data found in the response")
                print("Response data keys:", data.keys())
                
                # Check for facility data
                if 'facility' in data:
                    facility_data = data['facility']
                    print(f"Facility Details URL: https://www.recreation.gov/api/camps/campgrounds/{facility_id}")
                    print(f"Facility data keys: {list(facility_data.keys())}")
                    
                    if 'facility_name' in facility_data:
                        print(f"Facility Name: {facility_data['facility_name']}")
                    
                    if 'facility_type' in facility_data:
                        print(f"Facility Type: {facility_data['facility_type']}")
                    
                    if 'reservable' in facility_data:
                        print(f"Is Reservable: {facility_data['reservable']}")
                    else:
                        print("Is Reservable: Unknown")
                
                print("Response preview:", json.dumps(data, indent=2)[:500] + "...")
        else:
            print(f"Error response: {response.text}")
    
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    # Test Grant River
    test_campground_api("233503", "2025-03-01")
    
    # Test Fowlers Campground
    test_campground_api("255119", "2025-03-01")
    
    # Test a Yosemite campground for comparison
    test_campground_api("232447", "2025-03-01")  # Upper Pines
