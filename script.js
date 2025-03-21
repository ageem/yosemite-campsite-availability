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
    };
    
    // Campground links mapping
    const CAMPGROUND_LINKS = {
        "232447": "https://www.recreation.gov/camping/campgrounds/232447",
        "232450": "https://www.recreation.gov/camping/campgrounds/232450",
        "232449": "https://www.recreation.gov/camping/campgrounds/232449",
        "232451": "https://www.recreation.gov/camping/campgrounds/232451",
        "232452": "https://www.recreation.gov/camping/campgrounds/232452",
        "232446": "https://www.recreation.gov/camping/campgrounds/232446",
        "232448": "https://www.recreation.gov/camping/campgrounds/232448",
        "10083567": "https://www.recreation.gov/camping/campgrounds/10083567",
        "232453": "https://www.recreation.gov/camping/campgrounds/232453",
        "10083840": "https://www.recreation.gov/camping/campgrounds/10083840",
        "10083831": "https://www.recreation.gov/camping/campgrounds/10083831",
        "10083845": "https://www.recreation.gov/camping/campgrounds/10083845",
        "232445": "https://www.recreation.gov/camping/campgrounds/232445",
        "232458": "https://www.recreation.gov/camping/campgrounds/232458"
    };
    
    // Force some campgrounds to be first-come, first-served for testing
    const FORCE_FCFS = ["232458"]; // Platte River is first-come, first-served
    
    // Force some campgrounds to be closed (not just reserved)
    const FORCE_CLOSED = ["232453"]; // Bridalveil Creek is closed
    
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
    
    // Set up Select All and Clear All buttons
    const selectAllBtn = document.getElementById('select-all-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const campgroundCheckboxes = document.querySelectorAll('.campground-checkbox');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            campgroundCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            campgroundCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
    
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
            // Determine the API URL based on the environment
            // If we're on localhost, use /check_availability, otherwise use /api/check_availability
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = isLocalhost ? '/check_availability' : '/api/check_availability';
            
            console.log(`Using API endpoint: ${apiUrl} (isLocalhost: ${isLocalhost})`);
                
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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse JSON response:", responseText);
                throw new Error("Invalid response from server");
            }
            
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
    
    // Function to display results
    function displayResults(results, foundAny) {
        const resultsDiv = document.getElementById("results");
        const resultsContent = document.getElementById("results-content");
        resultsContent.innerHTML = "";
        
        if (!foundAny) {
            resultsContent.innerHTML = `
                <div class="bg-red-50 p-4 rounded-md fade-in-up">
                    <p class="text-red-600 font-medium">No availability found for the selected date range and campgrounds.</p>
                </div>
            `;
            resultsDiv.classList.remove("hidden");
            return;
        }
        
        // Add legend for color coding
        const legendDiv = document.createElement("div");
        legendDiv.className = "mb-4 p-4 rounded-md fade-in-up";
        legendDiv.innerHTML = `
            <div class="flex flex-col gap-2 md:flex-row md:gap-4 md:justify-between">
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                    <span class="text-sm">Available for online reservation</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    <span class="text-sm">First-come, first-served only</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
                    <span class="text-sm">Mixed availability</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                    <span class="text-sm">Reserved</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
                    <span class="text-sm">Closed</span>
                </div>
            </div>
        `;
        resultsContent.appendChild(legendDiv);
        
        // First show campgrounds with availability
        for (const [facilityId, campgroundData] of Object.entries(results)) {
            const campgroundName = campgroundData.name || CAMPGROUND_NAMES[facilityId];
            const availability = campgroundData.availability || {};
            const isFirstComeFirstServed = FORCE_FCFS.includes(facilityId) || campgroundData.is_first_come_first_served || false;
            const campgroundLink = CAMPGROUND_LINKS[facilityId];
            
            if (Object.keys(availability).length > 0) {
                const campgroundDiv = document.createElement("div");
                campgroundDiv.className = "mb-4 border border-gray-200 rounded-md overflow-hidden fade-in-up";
                
                // Create unique ID for this accordion
                const accordionId = `accordion-${facilityId}`;
                
                // Determine color based on reservation type
                let bgColor, textColor, iconColor, iconName;
                
                if (isFirstComeFirstServed) {
                    bgColor = "bg-blue-100";
                    textColor = "text-blue-800";
                    iconColor = "text-blue-600";
                    iconName = "forest"; 
                    statusBadge = '';
                } else {
                    bgColor = "bg-green-100";
                    textColor = "text-green-800";
                    iconColor = "text-green-600";
                    iconName = "forest";
                    statusBadge = '';
                }
                
                // Create accordion header with availability status
                const headerDiv = document.createElement("div");
                headerDiv.className = `accordion-header flex justify-between items-center p-4 border-b`;
                
                // Create header content with appropriate message
                let headerMessage;
                
                if (isFirstComeFirstServed) {
                    headerMessage = `${campgroundName}`;
                } else {
                    headerMessage = `${campgroundName}`;
                }
                
                headerDiv.innerHTML = `
                    <div class="flex items-center flex-wrap">
                        <span class="material-icons ${iconColor} mr-2">${iconName}</span>
                        <h3 class="text-lg md:text-xl font-medium ${textColor}">${headerMessage}</h3>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center">
                        <span class="material-icons accordion-icon ${iconColor}">expand_more</span>
                    </div>
                `;
                
                // Create accordion content
                const contentDiv = document.createElement("div");
                contentDiv.id = accordionId;
                contentDiv.className = "p-6"; 
                contentDiv.style.maxHeight = "0";
                contentDiv.style.overflow = "hidden";
                contentDiv.style.transition = "max-height 0.5s ease-out"; 
                contentDiv.style.display = "none"; 
                
                // Add the "Available Sites:" text and View Campground link at the top of content
                const contentHeaderDiv = document.createElement("div");
                contentHeaderDiv.className = "flex justify-between items-center mb-4";
                
                // Adjust header text based on reservation type
                let headerText;
                if (isFirstComeFirstServed) {
                    headerText = "First-come, first-served only";
                } else {
                    headerText = "Available for online reservation";
                }
                
                contentHeaderDiv.innerHTML = `
                    <h4 class="text-lg font-medium text-gray-700">${headerText}</h4>
                    <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm md:text-base flex items-center">
                        View Campground
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                `;
                contentDiv.appendChild(contentHeaderDiv);
                
                // Format dates to be more readable
                function formatDate(dateStr) {
                    // Handle the API's date format which includes T00:00:00Z
                    const dateOnly = dateStr.split('T')[0];
                    const date = new Date(dateOnly);
                    // Format as "Day, Month Day" (e.g., "Mon, Apr 14")
                    return date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                };
                
                // Group dates by month and year
                const groupedDates = {};
                
                // Handle the new data structure where availability is keyed by date, not site ID
                if (availability) {
                    Object.keys(availability).forEach(dateStr => {
                        const siteIds = availability[dateStr];
                        if (Array.isArray(siteIds) && siteIds.length > 0) {
                            const dateObj = new Date(dateStr);
                            const monthYear = `${dateObj.toLocaleString('default', { month: 'long' })} ${dateObj.getFullYear()}`;
                            
                            if (!groupedDates[monthYear]) {
                                groupedDates[monthYear] = {};
                            }
                            
                            // Use the date string as key to avoid duplicates
                            if (!groupedDates[monthYear][dateStr]) {
                                groupedDates[monthYear][dateStr] = dateObj;
                            }
                        }
                    });
                }
                
                // Create HTML for grouped dates
                let datesHtml = '';
                
                Object.entries(groupedDates).forEach(([monthYear, datesMap]) => {
                    datesHtml += `<h4 class="font-semibold mt-4 mb-2 text-gray-700">${monthYear}</h4>`;
                    datesHtml += '<div class="flex flex-wrap">';
                    
                    // Convert the map to an array and sort by date
                    const sortedDates = Object.values(datesMap).sort((a, b) => a - b);
                    
                    // Group dates in chunks of 3 for better display
                    sortedDates.forEach(date => {
                        const formattedDate = formatDate(date.toISOString());
                        // Use the appropriate color based on reservation type
                        const badgeClass = isFirstComeFirstServed 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-green-100 text-green-800";
                        datesHtml += `<span class="${badgeClass} text-xs md:text-sm px-2 py-1 rounded mr-2 mb-2">${formattedDate}</span>`;
                    });
                    
                    datesHtml += '</div>';
                });
                
                contentDiv.innerHTML += `
                    <ul class="pl-6 list-disc space-y-6">
                        ${Object.entries(availability).map(([dateStr, siteIds]) => {
                            if (!Array.isArray(siteIds)) {
                                return `<li>${dateStr}: ${siteIds}</li>`;
                            }
                            
                            return `<li>
                                <div class="font-medium">${formatDate(dateStr)}:</div>
                                <div class="ml-4 mt-1">
                                    ${siteIds.join(', ')}
                                </div>
                            </li>`;
                        }).join('')}
                    </ul>
                `;
                
                // Add event listener to toggle accordion
                headerDiv.addEventListener("click", function() {
                    const arrow = headerDiv.querySelector('.accordion-icon');
                    if (contentDiv.style.maxHeight === "0px" || !contentDiv.style.maxHeight) {
                        contentDiv.style.maxHeight = "2000px"; // Set a large value to ensure all content is visible
                        arrow.textContent = 'expand_less';
                        contentDiv.style.display = "block"; // Show content
                    } else {
                        contentDiv.style.maxHeight = "0px";
                        arrow.textContent = 'expand_more';
                        contentDiv.style.display = "none"; // Hide content
                    }
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
                campgroundDiv.className = "mb-4 border border-gray-200 rounded-md overflow-hidden fade-in-up";
                
                // Create accordion header with no availability status
                const headerDiv = document.createElement("div");
                headerDiv.className = "accordion-header flex justify-between items-center p-4 border-b";
                
                // Check if campground is closed or just reserved
                const isClosed = FORCE_CLOSED.includes(facilityId);
                const iconColor = isClosed ? "text-gray-600" : "text-red-600";
                
                headerDiv.innerHTML = `
                    <div class="flex items-center flex-wrap">
                        <span class="material-icons ${iconColor} mr-2">close</span>
                        <h3 class="text-lg font-medium ${iconColor}">${campgroundName}</h3>
                    </div>
                    <div class="flex items-center">
                        <span class="material-icons accordion-icon ${iconColor}">expand_more</span>
                    </div>
                `;

                // Create accordion content
                const contentDiv = document.createElement("div");
                contentDiv.className = "p-6";
                contentDiv.style.maxHeight = "0";
                contentDiv.style.overflow = "hidden";
                contentDiv.style.transition = "max-height 0.5s ease-out";
                contentDiv.style.display = "none";

                // Add appropriate message based on status
                const statusMessage = isClosed ? "Closed" : "Reserved";
                
                // Add View Campground link in the content
                contentDiv.innerHTML = `
                    <div class="mb-4">
                        <h4 class="text-lg font-medium text-gray-700">${statusMessage}</h4>
                    </div>
                    <div class="flex justify-end">
                        <a href="${campgroundLink}" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center">
                            View Campground
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                `;
                
                // Add event listener to toggle accordion
                headerDiv.addEventListener("click", function() {
                    const arrow = headerDiv.querySelector('.accordion-icon');
                    if (contentDiv.style.maxHeight === "0px" || !contentDiv.style.maxHeight) {
                        contentDiv.style.maxHeight = "2000px";
                        arrow.textContent = 'expand_less';
                        contentDiv.style.display = "block"; // Show content
                    } else {
                        contentDiv.style.maxHeight = "0px";
                        arrow.textContent = 'expand_more';
                        setTimeout(() => {
                            contentDiv.style.display = "none"; // Hide content
                        }, 500);
                    }
                });
                
                campgroundDiv.appendChild(headerDiv);
                campgroundDiv.appendChild(contentDiv);
                resultsContent.appendChild(campgroundDiv);
            }
        }
        
        resultsDiv.classList.remove("hidden");
    }
});
