// Initialize the interactive map application
console.log('Interactive Map - Initialization Script Loaded');

// Note: Removed custom element check as we're now using simple div elements for markers

// Log when the main map class is available
if (window.interactiveMap) {
    console.log('Interactive Map instance available:', window.interactiveMap);
} else {
    console.log('Waiting for Interactive Map to initialize...');
}

// Additional initialization can be added here
