from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import sys
import json
import importlib.util
import requests
from datetime import datetime, timedelta

app = Flask(__name__)

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

# Update dates in the Python script
@app.route('/update_dates', methods=['POST'])
def update_dates():
    try:
        data = request.json
        
        if not data or 'startDate' not in data or 'endDate' not in data:
            return jsonify({'success': False, 'error': 'Missing date parameters'}), 400
        
        start_date = data['startDate']
        end_date = data['endDate']
        
        # Validate date format
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Return success
        return jsonify({'success': True, 'message': 'Dates updated successfully'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Check availability using the Python script
@app.route('/check_availability', methods=['POST'])
def check_availability():
    try:
        data = request.json
        
        if not data or 'startDate' not in data or 'endDate' not in data or 'campgrounds' not in data:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        start_date = data['startDate']
        end_date = data['endDate']
        campgrounds = data['campgrounds']
        
        # Validate date format
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Dynamically import the check_yosemite module
        try:
            spec = importlib.util.spec_from_file_location("check_yosemite", "./check_yosemite.py")
            check_yosemite = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(check_yosemite)
        except Exception as e:
            print(f"Error importing check_yosemite: {e}")
            # If we can't import, use our own implementation
            return check_availability_api(start_date, end_date, campgrounds)
        
        # Check availability for each campground
        results = {}
        found_any = False
        
        for facility_id in campgrounds:
            try:
                availability = check_yosemite.check_campsite_availability(facility_id, start_date, end_date)
                
                # Get campground name
                campground_name = check_yosemite.CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}")
                
                results[facility_id] = {
                    'name': campground_name,
                    'availability': availability
                }
                
                if availability and len(availability) > 0:
                    found_any = True
            except Exception as e:
                print(f"Error checking availability for facility {facility_id}: {e}")
                results[facility_id] = {
                    'name': check_yosemite.CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}"),
                    'availability': {},
                    'error': str(e)
                }
        
        return jsonify({
            'success': True,
            'results': results,
            'foundAny': found_any
        })
    
    except Exception as e:
        print(f"Error in check_availability: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def check_availability_api(start_date, end_date, campgrounds):
    """Fallback function to check availability directly using the Recreation.gov API"""
    results = {}
    found_any = False
    
    # Campground names mapping
    CAMPGROUND_NAMES = {
        "232447": "Upper Pines",
        "232450": "Lower Pines",
        "232449": "North Pines",
        "232451": "Hodgdon Meadow",
        "233503": "Grant River",
        "255119": "Fowlers Campground"
    }
    
    for facility_id in campgrounds:
        try:
            # Format dates for API request
            start_month = start_date[:7] + "-01"  # YYYY-MM-01
            
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
            
            # Add results for this campground
            results[facility_id] = {
                'name': CAMPGROUND_NAMES.get(facility_id, f"Campground {facility_id}"),
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
    
    return jsonify({
        'success': True,
        'results': results,
        'foundAny': found_any
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)