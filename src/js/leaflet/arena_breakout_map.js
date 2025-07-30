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
    map.options.minZoom = -4; // Allow zooming out much more
    map.options.maxZoom = 8;
    
    // Set background color for areas outside the map
    map.getContainer().style.backgroundColor = '#ff6b35';

    // Add the main game map as an image overlay
    interactive_map.addTileLayer('Arena Breakout Map', {
        minNativeZoom: -4,
        maxNativeZoom: 4,
        attribution: 'Map from Arena Breakout'
    });

    console.log('Tile layer added');

    console.log('Map setup complete, no marker layers...');

    // Finalize the map after adding all layers
    interactive_map.finalize();

    // Override the default zoom to start fully zoomed out
    console.log('Setting initial zoom to fully zoomed out...');
    setTimeout(() => {
        // Set custom bounds for 4078x2158 map and start zoomed out
        const mapBounds = [
            [0, 240],
            [2158, 4078] // Using actual game coordinates with offset start
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
                window.floorControl = new FloorControl(map, window.mapDataManager);
                console.log('Floor control initialized successfully!');
            } else {
                console.warn('Floor control not available or map not ready');
            }

            // Initialize Map Data Manager and Marker System
            if (window.MapDataManager && window.EnhancedMarkerSystem) {
                window.mapDataManager = new MapDataManager();
                window.markerSystem = new EnhancedMarkerSystem(map, window.mapDataManager);
                
                // Get selected map from sessionStorage or default to arena-breakout
                const selectedMap = sessionStorage.getItem('selectedMap') || 'arena-breakout';
                console.log(`Loading map data for: ${selectedMap}`);
                
                // Load selected map data
                window.markerSystem.loadMapData(selectedMap).then(() => {
                    console.log(`${selectedMap} marker data loaded successfully!`);
                    
                    // Check for saved difficulty and apply it
                    const savedDifficulty = sessionStorage.getItem('selectedDifficulty');
                    if (savedDifficulty && window.mapDataManager.mapData) {
                        console.log('Applying saved difficulty:', savedDifficulty);
                        window.mapDataManager.currentDifficulty = savedDifficulty;
                        
                        // Update enabled types for the saved difficulty
                        if (typeof window.mapDataManager.mapData.getAllTypes === 'function') {
                            window.mapDataManager.enabledTypes = new Set(window.mapDataManager.mapData.getAllTypes(savedDifficulty));
                        }
                    }
                    
                    // Update navigation bar with loaded map name
                    if (window.mapDataManager && window.mapDataManager.mapData) {
                        const mapNameElement = document.getElementById('current-map-name');
                        if (mapNameElement) {
                            const displayName = window.mapDataManager.mapData.mapName
                                .split('-')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                            mapNameElement.textContent = displayName;
                            
                            // Also update page title
                            document.title = `${displayName} - Arena Breakout Interactive Map`;
                        }
                        
                        // Call updateMapName if available
                        if (typeof window.updateMapName === 'function') {
                            window.updateMapName();
                        }
                    }
                    
                    // Update floor control with map data
                    if (window.floorControl) {
                        window.floorControl.mapDataManager = window.mapDataManager;
                        window.floorControl.updateFloorsFromMapData();
                    }
                }).catch(error => {
                    console.error('Error loading marker data:', error);
                    // Fallback to arena-breakout if selected map fails
                    if (selectedMap !== 'arena-breakout') {
                        console.log('Falling back to arena-breakout map...');
                        window.markerSystem.loadMapData('arena-breakout');
                    }
                });
                
                // Make marker system globally accessible for UI callbacks
                window.markerSystem = window.markerSystem;
                console.log('Marker system initialized successfully!');
            } else {
                console.warn('Marker system not available');
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
                
                // Connect floor changes to marker system
                if (window.floorControl && window.markerSystem) {
                    const originalSetFloor = window.floorControl.setFloor;
                    window.floorControl.setFloor = function(floorNumber) {
                        originalSetFloor.call(this, floorNumber);
                        window.markerSystem.setFloor(floorNumber);
                    };
                }
                
                // Apply initial filters to show markers
                setTimeout(() => {
                    if (window.markerSystem) {
                        window.markerSystem.updateMarkers();
                    }
                    console.log('Initial marker display applied');
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
