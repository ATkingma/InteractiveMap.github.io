// Initialize the Arena Breakout Interactive Map
console.log('Starting Arena Breakout map initialization...');

try {
    var interactive_map = new InteractiveMap('map', {
        max_good_zoom: 6,
        max_map_zoom: 8,
        website_source: 'https://github.com/interactive-game-maps/arena-breakout',
        website_subdir: 'arena-breakout',
        attribution: `
        <li>Arena Breakout game assets used for educational purposes</li>
        <li>Interactive map template by <a href="https://github.com/interactive-game-maps">Interactive Game Maps</a></li>
        `
    });

    console.log('InteractiveMap created successfully');

    // Configure map to allow more zoom out and set background color
    const map = interactive_map.getMap();
    map.options.minZoom = -2; // Allow zooming out much more
    map.options.maxZoom = 8;
    
    // Set background color for areas outside the map
    map.getContainer().style.backgroundColor = '#ff6b35';

    // Add the main game map as an image overlay
    interactive_map.addTileLayer('Arena Breakout Map', {
        minNativeZoom: 0,
        maxNativeZoom: 4,
        attribution: 'Map from Arena Breakout'
    });

    console.log('Tile layer added');

    // Add marker layers in order (they will appear in this order in sidebar and layer control)
    console.log('Adding marker layers...');
    addArmoryLoot(interactive_map);
    addFarmLoot(interactive_map);
    addNorthridgeLoot(interactive_map);
    addTvStationLoot(interactive_map);
    addValleyLoot(interactive_map);
    addSpawnPoints(interactive_map);

    console.log('Marker layers added, finalizing map...');

    // Finalize the map after adding all layers
    interactive_map.finalize();

    // Override the default zoom to start fully zoomed out
    console.log('Setting initial zoom to fully zoomed out...');
    setTimeout(() => {
        // Set custom bounds for 4078x2158 map and start zoomed out
        const mapBounds = [
            [0, 0],
            [2158, 4078] // Using actual game coordinates
        ];
        
        // Set view to show full map with maximum zoom out
        map.fitBounds(mapBounds, {
            padding: [50, 50],
            maxZoom: -1 // Start at minimum zoom level (more zoomed out)
        });
        
        console.log('Map view set to fully zoomed out with 4078x2158 coordinate system');
    }, 500);

    // Initialize floor control and enhanced features after map is ready
    console.log('Initializing floor control and enhanced features...');
    setTimeout(() => {
        try {
            // Initialize Floor Control first
            if (window.FloorControl && map) {
                window.floorControl = new FloorControl(map);
                console.log('Floor control initialized successfully!');
            } else {
                console.warn('Floor control not available or map not ready');
            }

            // Then initialize Enhanced Features
            if (window.EnhancedMapFeatures && map && interactive_map.sidebar) {
                window.enhancedFeatures = new EnhancedMapFeatures(map, interactive_map.sidebar);
                console.log('Enhanced features initialized successfully!');
                
                // Update coordinate system reference
                if (window.floorControl) {
                    window.enhancedFeatures.mapDimensions = window.floorControl.mapDimensions;
                    window.enhancedFeatures.convertLatLngToXY = (latlng) => window.floorControl.convertLatLngToXY(latlng);
                    window.enhancedFeatures.convertXYToLatLng = (coords) => window.floorControl.convertXYToLatLng(coords);
                }
                
                // Apply initial filters to show only current floor markers
                setTimeout(() => {
                    window.enhancedFeatures.applyFilters();
                    console.log('Initial floor-based filtering applied');
                }, 500);
            } else {
                console.warn('Enhanced features not available or map not ready');
            }

        } catch (enhancedError) {
            console.error('Error initializing enhanced features:', enhancedError);
        }
    }, 1000);

    console.log('Arena Breakout map initialized successfully!');

} catch (error) {
    console.error('Error initializing Arena Breakout map:', error);
}
