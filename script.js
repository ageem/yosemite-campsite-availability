// Initialize date pickers and other functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize flatpickr for start date
    const startDatePicker = flatpickr("#start-date", {
        dateFormat: "Y-m-d", // YYYY-MM-DD format to match Python script
        minDate: "today",
        defaultDate: new Date()
    });
    
    // Initialize flatpickr for end date
    const endDatePicker = flatpickr("#end-date", {
        dateFormat: "Y-m-d", // YYYY-MM-DD format to match Python script
        minDate: "today",
        defaultDate: new Date(new Date().setDate(new Date().getDate() + 7)) // Default to 7 days from today
    });
    
    // Campground names mapping
    const CAMPGROUND_NAMES = {
        "232447": "Upper Pines",
        "232450": "Lower Pines",
        "232449": "North Pines",
        "232451": "Hodgdon Meadow"
    };
    
    // Campground links mapping
    const CAMPGROUND_LINKS = {
        "232447": "https://www.recreation.gov/camping/campgrounds/232447",
        "232450": "https://www.recreation.gov/camping/campgrounds/232450",
        "232449": "https://www.recreation.gov/camping/campgrounds/232449",
        "232451": "https://www.recreation.gov/camping/campgrounds/232451"
    };
    
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
        
        // Use the server-side API endpoint to check availability
        try {
            const response = await fetch('/check_availability', {
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
                    campgroundDiv.className = "mb-6 pb-4 border-b border-gray-200";
                    
                    campgroundDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-lg font-medium text-green-700">🎉 ${campgroundName} has availability!</h3>
                            <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center">
                                View Campground
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                        <div class="bg-green-50 p-3 rounded-md">
                            <h4 class="font-medium mb-2">Available Sites:</h4>
                            <ul class="pl-6 list-disc space-y-1">
                                ${Object.entries(availability).map(([siteId, dates]) => {
                                    return `<li>Site ${siteId}: ${Array.isArray(dates) ? dates.join(", ") : dates}</li>`;
                                }).join('')}
                            </ul>
                        </div>
                    `;
                    
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
                    campgroundDiv.className = "mb-6 pb-4 border-b border-gray-200";
                    
                    campgroundDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-lg font-medium text-red-600">❌ No availability in ${campgroundName}</h3>
                            <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center">
                                View Campground
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    `;
                    
                    resultsContent.appendChild(campgroundDiv);
                }
            }
        }
        
        document.getElementById("results").classList.remove("hidden");
    }
});
