import requests
import json
from datetime import datetime, timedelta

# Campground facility IDs
CAMPGROUND_NAMES = {
    "232447": "Upper Pines",
    "232450": "Lower Pines",
    "232449": "North Pines",
    "232451": "Hodgdon Meadow",
    "233503": "Grant River",
    "255119": "Fowlers Campground",
    "232452": "Crane Flat",
    "232446": "Wawona",
    "232448": "Tuolumne Meadows",
    "10083567": "White Wolf",
    "232453": "Bridalveil Creek",
    "10083840": "Yosemite Creek",
    "10083831": "Porcupine Flat",
    "10083845": "Tamarack Flat",
    "232445": "Watchman",
    "232458": "Platte River"
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
            # Make API request with URL-encoded date format
            formatted_date = f"{month_date}T00%3A00%3A00.000Z"
            url = f"https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month?start_date={formatted_date}"
            
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
                for date_str, status in details.get('availabilities', {}).items():
                    # Extract just the date part (YYYY-MM-DD) for comparison
                    date_part = date_str.split('T')[0] if 'T' in date_str else date_str
                    
                    # Compare dates as strings (YYYY-MM-DD format ensures correct comparison)
                    if date_part >= start_date and date_part <= end_date and status == "Available":
                        if site_id not in availability:
                            availability[site_id] = []
                        availability[site_id].append(date_part)
                        
        except Exception as e:
            print(f"Error checking availability for month {month_date}: {e}")
    
    return availability
