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
    "233503": "Grant River",
    "255119": "Fowlers Campground"
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
                for date, status in details.get('availabilities', {}).items():
                    if date >= start_date and date <= end_date and status == "Available":
                        if site_id not in availability:
                            availability[site_id] = []
                        availability[site_id].append(date)
                        
        except Exception as e:
            print(f"Error checking availability for month {month_date}: {e}")
    
    return availability

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
