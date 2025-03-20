import requests
import json
from datetime import datetime

def test_campground_api(facility_id, start_date):
    """
    Test the Recreation.gov API for a specific campground
    
    Args:
        facility_id (str): The facility ID for the campground
        start_date (str): Start date in YYYY-MM-DD format (should be first of month)
    """
    # Try different date formats
    date_formats = [
        start_date,  # Original format YYYY-MM-DD
        start_date.replace("-", ""),  # YYYYMMDD
        datetime.strptime(start_date, '%Y-%m-%d').strftime('%m/%d/%Y'),  # MM/DD/YYYY
        datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y/%m/%d')   # YYYY/MM/DD
    ]
    
    print(f"\nTesting API for facility ID: {facility_id}")
    
    for date_format in date_formats:
        url = f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={date_format}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"\nTrying date format: {date_format}")
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
                        print(f"Unique statuses: {unique_statuses}")
                        
                        # Check what "Available" looks like in the data
                        print("\nChecking for 'Available' status format:")
                        for date, status in list(sample_site.get('availabilities', {}).items())[:10]:
                            print(f"{date}: {status}")
                else:
                    print("No 'campsites' data found in the response")
                    print("Response data keys:", data.keys())
                    print("Response preview:", json.dumps(data, indent=2)[:500] + "...")
                
                # If we got a successful response, break out of the loop
                break
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
