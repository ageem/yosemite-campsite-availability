from http.server import BaseHTTPRequestHandler
import json
import requests
from datetime import datetime, timedelta

# Campground facility IDs and names
CAMPGROUND_NAMES = {
    "232447": "Upper Pines",
    "232450": "Lower Pines",
    "232449": "North Pines",
    "232451": "Hodgdon Meadow",
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
    Check campsite availability for a given facility ID and date range.
    
    Args:
        facility_id (str): Recreation.gov facility ID
        start_date (str): Start date in YYYY-MM-DD format
        end_date (str): End date in YYYY-MM-DD format
        
    Returns:
        dict: Dictionary containing availability info and reservation type
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
    reservation_types = {}
    is_first_come_first_served = False
    
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
                # Check if the site is first-come, first-served
                if 'reservationService' in details and details['reservationService'] == 'fcfs':
                    is_first_come_first_served = True
                    if site_id not in reservation_types:
                        reservation_types[site_id] = 'fcfs'
                else:
                    if site_id not in reservation_types:
                        reservation_types[site_id] = 'online'
                
                for date_str, status in details.get('availabilities', {}).items():
                    # Extract just the date part (YYYY-MM-DD) for comparison
                    date_part = date_str.split('T')[0] if 'T' in date_str else date_str
                    
                    # Compare dates as strings (YYYY-MM-DD format ensures correct comparison)
                    if date_part >= start_date and date_part <= end_date:
                        if status == 'Available':
                            if date_part not in availability:
                                availability[date_part] = []
                            availability[date_part].append(site_id)
        except Exception as e:
            print(f"Error checking availability for month {month_date}: {e}")
            # Continue to next month
            continue
    
    # Return the results
    return {
        'availability': availability,
        'reservation_types': reservation_types,
        'is_first_come_first_served': is_first_come_first_served
    }

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        if not data or 'startDate' not in data or 'endDate' not in data or 'campgrounds' not in data:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False, 
                'error': 'Missing required parameters'
            }).encode())
            return
        
        start_date = data['startDate']
        end_date = data['endDate']
        campgrounds = data['campgrounds']
        
        # Validate date format
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False, 
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }).encode())
            return
        
        # Check availability for each campground
        results = {}
        found_any = False
        
        for facility_id in campgrounds:
            try:
                availability_data = check_campsite_availability(facility_id, start_date, end_date)
                
                # Get campground name
                campground_name = CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}")
                
                # Ensure we have all the expected keys in the response
                if not isinstance(availability_data, dict):
                    availability_data = {'availability': {}, 'reservation_types': {}, 'is_first_come_first_served': False}
                
                if 'availability' not in availability_data:
                    availability_data['availability'] = {}
                if 'reservation_types' not in availability_data:
                    availability_data['reservation_types'] = {}
                if 'is_first_come_first_served' not in availability_data:
                    availability_data['is_first_come_first_served'] = False
                
                results[facility_id] = {
                    'name': campground_name,
                    'availability': availability_data['availability'],
                    'reservation_types': availability_data['reservation_types'],
                    'is_first_come_first_served': availability_data['is_first_come_first_served']
                }
                
                if availability_data['availability'] and len(availability_data['availability']) > 0:
                    found_any = True
            except Exception as e:
                print(f"Error checking availability for facility {facility_id}: {e}")
                results[facility_id] = {
                    'name': CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}"),
                    'availability': {},
                    'error': str(e)
                }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        self.wfile.write(json.dumps({
            'success': True,
            'results': results,
            'foundAny': found_any
        }).encode())
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours
        self.end_headers()
