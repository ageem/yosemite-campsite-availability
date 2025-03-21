// Initialize date pickers and other functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Cookie functions
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    // Get today's date
    const today = new Date();
    
    // Initialize flatpickr for start date
    const startDatePicker = flatpickr("#start-date", {
        dateFormat: "Y-m-d", // YYYY-MM-DD format to match Python script
        minDate: "today",
        defaultDate: today,
        onChange: function(selectedDates, dateStr) {
            // Save to cookie
            setCookie("yosemite_start_date", dateStr, 30);
            
            // Update end date min date to be after start date
            if (selectedDates[0]) {
                endDatePicker.set("minDate", selectedDates[0]);
            }
        }
    });
    
    // Get saved dates from cookies
    const savedStartDate = getCookie("yosemite_start_date");
    const savedEndDate = getCookie("yosemite_end_date");
    
    // Set start date from cookie if available
    if (savedStartDate) {
        startDatePicker.setDate(savedStartDate);
    }
    
    // Initialize flatpickr for end date
    const endDatePicker = flatpickr("#end-date", {
        dateFormat: "Y-m-d", // YYYY-MM-DD format to match Python script
        minDate: savedStartDate || "today",
        defaultDate: savedEndDate || null, // Only use saved date if available
        onChange: function(selectedDates, dateStr) {
            // Save to cookie
            setCookie("yosemite_end_date", dateStr, 30);
        }
    });
    
    // Set end date from cookie if available
    if (savedEndDate) {
        endDatePicker.setDate(savedEndDate);
    }
    
    // Campground names mapping
    const CAMPGROUND_NAMES = {
        "232447": "Upper Pines",
        "232450": "Lower Pines",
        "232449": "North Pines",
        "232451": "Hodgdon Meadow",
        "233503": "Grant River",
        "255119": "Fowlers Campground"
    };
    
    // Campground links mapping
    const CAMPGROUND_LINKS = {
        "232447": "https://www.recreation.gov/camping/campgrounds/232447",
        "232450": "https://www.recreation.gov/camping/campgrounds/232450",
        "232449": "https://www.recreation.gov/camping/campgrounds/232449",
        "232451": "https://www.recreation.gov/camping/campgrounds/232451",
        "233503": "https://www.recreation.gov/camping/campgrounds/233503",
        "255119": "https://www.recreation.gov/camping/campgrounds/255119"
    };
    
    // Save campground selections to cookies
    function saveCampgroundSelections() {
        const selectedCampgrounds = [];
        document.querySelectorAll(".campground-checkbox:checked").forEach(checkbox => {
            selectedCampgrounds.push(checkbox.value);
        });
        setCookie("yosemite_campgrounds", JSON.stringify(selectedCampgrounds), 30);
    }
    
    // Load campground selections from cookies
    function loadCampgroundSelections() {
        const savedCampgrounds = getCookie("yosemite_campgrounds");
        if (savedCampgrounds) {
            try {
                const campgrounds = JSON.parse(savedCampgrounds);
                
                // First uncheck all
                document.querySelectorAll(".campground-checkbox").forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // Then check only the saved ones
                campgrounds.forEach(id => {
                    const checkbox = document.querySelector(`.campground-checkbox[value="${id}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            } catch (e) {
                console.error("Error loading saved campgrounds:", e);
            }
        }
    }
    
    // Add event listeners to save campground selections
    document.querySelectorAll(".campground-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", saveCampgroundSelections);
    });
    
    // Load saved campground selections
    loadCampgroundSelections();
    
    document.getElementById("search-btn").addEventListener("click", async function() {
        // Get selected dates
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;
        
        if (!startDate) {
            alert("Please select a start date");
            return;
        }
        
        if (!endDate) {
            alert("Please select an end date");
            return;
        }
        
        // Validate dates
        if (new Date(startDate) > new Date(endDate)) {
            alert("End date must be after start date");
            return;
        }
        
        // Get selected campgrounds
        const selectedCampgrounds = [];
        document.querySelectorAll(".campground-checkbox:checked").forEach(checkbox => {
            selectedCampgrounds.push(checkbox.value);
        });
        
        if (selectedCampgrounds.length === 0) {
            alert("Please select at least one campground");
            return;
        }
        
        // Show loading indicator
        document.getElementById("loading").classList.remove("hidden");
        document.getElementById("results").classList.add("hidden");
        
        // Use the serverless API endpoint to check availability
        try {
            // Determine the API URL based on whether we're in development or production
            const apiUrl = window.location.hostname === 'localhost' 
                ? '/check_availability' 
                : '/api/check_availability';
                
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate: startDate,
                    endDate: endDate,
                    campgrounds: selectedCampgrounds
                })
            });
            
            const result = await response.json();
            
            // Hide loading indicator
            document.getElementById("loading").classList.add("hidden");
            
            if (result.success) {
                // Display results
                displayResults(result.results, result.foundAny);
            } else {
                throw new Error(result.error || "Failed to check availability");
            }
        } catch (error) {
            console.error("Error checking availability:", error);
            
            // Hide loading indicator
            document.getElementById("loading").classList.add("hidden");
            
            // Alert the user
            alert("There was an error checking availability. Please try again later.");
        }
    });
    
    function displayResults(results, foundAny) {
        const resultsContent = document.getElementById("results-content");
        resultsContent.innerHTML = "";
        
        if (!foundAny) {
            resultsContent.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-red-600 font-medium">❌ No campsites available for the selected dates.</p>
                    <p class="text-gray-600 mt-2">Try different dates or check back later.</p>
                </div>
            `;
        } else {
            // First show campgrounds with availability
            for (const [facilityId, campgroundData] of Object.entries(results)) {
                const campgroundName = campgroundData.name || CAMPGROUND_NAMES[facilityId];
                const availability = campgroundData.availability || {};
                const campgroundLink = CAMPGROUND_LINKS[facilityId];
                
                if (Object.keys(availability).length > 0) {
                    const campgroundDiv = document.createElement("div");
                    campgroundDiv.className = "mb-4 border border-gray-200 rounded-md overflow-hidden";
                    
                    // Create accordion header with availability status
                    const headerDiv = document.createElement("div");
                    headerDiv.className = "accordion-header flex justify-between items-center p-3 bg-green-50";
                    headerDiv.innerHTML = `
                        <h3 class="text-lg font-medium text-green-700">🎉 ${campgroundName} has availability!</h3>
                        <div class="flex items-center">
                            <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center mr-3" onclick="event.stopPropagation()">
                                View Campground
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 accordion-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    `;
                    
                    // Create accordion content
                    const contentDiv = document.createElement("div");
                    contentDiv.className = "accordion-content bg-white p-6"; // Increased padding
                    
                    // Ensure the accordion is closed by default by removing any 'open' class
                    contentDiv.classList.remove("open");
                    
                    contentDiv.innerHTML = `
                        <h4 class="font-medium mb-3">Available Sites:</h4>
                        <ul class="pl-6 list-disc space-y-2">
                            ${Object.entries(availability).map(([siteId, dates]) => {
                                return `<li>Site ${siteId}: ${Array.isArray(dates) ? dates.join(", ") : dates}</li>`;
                            }).join('')}
                        </ul>
                    `;
                    
                    // Add event listener to toggle accordion
                    headerDiv.addEventListener("click", function(event) {
                        // Prevent default behavior
                        event.preventDefault();
                        
                        // Toggle the open class
                        contentDiv.classList.toggle("open");
                        headerDiv.querySelector(".accordion-icon").classList.toggle("open");
                    });
                    
                    // Append header and content to the campground div
                    campgroundDiv.appendChild(headerDiv);
                    campgroundDiv.appendChild(contentDiv);
                    
                    resultsContent.appendChild(campgroundDiv);
                }
            }
            
            // Then show campgrounds without availability
            for (const [facilityId, campgroundData] of Object.entries(results)) {
                const campgroundName = campgroundData.name || CAMPGROUND_NAMES[facilityId];
                const availability = campgroundData.availability || {};
                const campgroundLink = CAMPGROUND_LINKS[facilityId];
                
                if (Object.keys(availability).length === 0) {
                    const campgroundDiv = document.createElement("div");
                    campgroundDiv.className = "mb-4 border border-gray-200 rounded-md overflow-hidden";
                    
                    // Create accordion header with no availability status
                    const headerDiv = document.createElement("div");
                    headerDiv.className = "accordion-header flex justify-between items-center p-3 bg-red-50";
                    headerDiv.innerHTML = `
                        <h3 class="text-lg font-medium text-red-600">❌ No availability in ${campgroundName}</h3>
                        <div class="flex items-center">
                            <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center" onclick="event.stopPropagation()">
                                View Campground
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    `;
                    
                    campgroundDiv.appendChild(headerDiv);
                    resultsContent.appendChild(campgroundDiv);
                }
            }
        }
        
        document.getElementById("results").classList.remove("hidden");
    }
});
