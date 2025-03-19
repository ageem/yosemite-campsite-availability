import requests
import json
from datetime import datetime, timedelta

# Campground facility IDs
CAMPGROUND_NAMES = {
    "232447": "Upper Pines",
    "232450": "Lower Pines",
    "232449": "North Pines",
    "232451": "Hodgdon Meadow"
}

def check_campsite_availability(facility_id, start_date, end_date):
    """
    Check campsite availability for a specific facility and date range.
    
    Args:
        facility_id (str): The facility ID for the campground
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
        
    Returns:
        dict: Dictionary of available sites with their dates
    """
    # Create a set of months to check
    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
    
    # If dates span multiple months, we need to check each month
    months_to_check = []
    current_month = start_date_obj.replace(day=1)
    
    while current_month <= end_date_obj:
        months_to_check.append(current_month.strftime('%Y-%m-01'))
        # Move to next month
        if current_month.month == 12:
            current_month = current_month.replace(year=current_month.year + 1, month=1)
        else:
            current_month = current_month.replace(month=current_month.month + 1)
    
    # Check availability for each month
    availability = {}
    
    for month_date in months_to_check:
        try:
            # Make API request
            url = f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={month_date}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch data for facility {facility_id}: {response.status_code}")
                continue
            
            data = response.json()
            
            # Process the response data
            for site_id, details in data.get('campsites', {}).items():
                for date, status in details.get('availabilities', {}).items():
                    if date >= start_date and date <= end_date and status == "Available":
                        if site_id not in availability:
                            availability[site_id] = []
                        availability[site_id].append(date)
                        
        except Exception as e:
            print(f"Error checking availability for month {month_date}: {e}")
    
    return availability

def check_selected_campgrounds(campgrounds, start_date, end_date):
    """
    Check availability for selected campgrounds.
    
    Args:
        campgrounds (list): List of facility IDs to check
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
        
    Returns:
        tuple: (results dict, found_any boolean)
    """
    results = {}
    found_any = False
    
    for facility_id in campgrounds:
        try:
            availability = check_campsite_availability(facility_id, start_date, end_date)
            
            # Get campground name
            campground_name = CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}")
            
            results[facility_id] = {
                'name': campground_name,
                'availability': availability
            }
            
            if availability and len(availability) > 0:
                found_any = True
                
        except Exception as e:
            print(f"Error checking availability for facility {facility_id}: {e}")
            results[facility_id] = {
                'name': CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}"),
                'availability': {},
                'error': str(e)
            }
    
    return results, found_any

if __name__ == "__main__":
    # Example usage
    start_date = "2025-06-01"
    end_date = "2025-06-07"
    
    # Check all campgrounds
    campgrounds = list(CAMPGROUND_NAMES.keys())
    
    results, found_any = check_selected_campgrounds(campgrounds, start_date, end_date)
    
    if found_any:
        print("Found available campsites!")
        for facility_id, data in results.items():
            if data['availability']:
                print(f"\n{data['name']}:")
                for site_id, dates in data['availability'].items():
                    print(f"  Site {site_id}: {', '.join(dates)}")
    else:
        print("No campsites available for the selected dates.")
        print("Try different dates or check back later.")
