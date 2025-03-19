# Yosemite Campsite Availability Checker

A web application that checks for campsite availability in Yosemite National Park using the Recreation.gov API.

## Features

- Check availability for multiple campgrounds: Upper Pines, Lower Pines, North Pines, and Hodgdon Meadow
- Simple date selection with separate start and end date inputs
- Direct links to campground reservation pages on Recreation.gov
- Visual indicators for available and unavailable campsites
- Responsive design that works on both desktop and mobile devices

## How to Use

1. Select a start date and end date for your camping trip
2. Choose which campgrounds you want to check (all are selected by default)
3. Click "Check Availability" to search for available campsites
4. View the results, which will show available sites by campground
5. Click "View Campground" to go directly to the Recreation.gov reservation page

## Technical Details

- Frontend: HTML, CSS (Tailwind CSS), JavaScript
- Backend: Python with Flask
- API: Recreation.gov API for campsite availability data

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/ageem/yosemite-campsite-availability.git
   ```

2. Install the required dependencies:
   ```
   pip install flask requests
   ```

3. Run the server:
   ```
   python server.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## License

MIT License
