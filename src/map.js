class ProfessionalInteractiveMap {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('mapOverlay');
        this.wrapper = document.getElementById('mapWrapper');
        
        // Map state
        this.mapImage = new Image();
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.currentMap = 'armory';
        this.currentFloor = 'ground'; // Default floor
        this.currentMode = 'normal'; // Default mode
        
        // Floor z-index mapping for marker layering (dynamic)
        this.baseFloorZIndex = 100;
        this.floorZIndexIncrement = 10;
        
        // Floor level mapping (default fallback)
        this.floorLevels = {
            'basement': -1,
            'ground': 0,
            'upper': 1,
            'elevated': 1,
            'rooftop': 2,
            'helipad': 2
        };
        
        // Available floor levels for each map
        this.availableFloorLevels = new Map();
        
        // Floor data
        this.floorData = new Map();
        this.availableFloors = new Map();
        
        // Initialize new marker system
        this.markerSystem = null;
        
        // Legacy marker state for compatibility
        this.markers = new Map();
        this.filteredMarkers = new Set();
        this.isAddingMarker = false;
        this.pendingMarker = null;
        
        // Performance optimization
        this.animationFrameId = null;
        this.lastRenderTime = 0;
        this.renderThrottle = 16; // ~60fps
        this.markerUpdateTimeout = null;
        
        // Initialize
        this.init();
    }

    async discoverAvailableMaps() {
        // List of potential maps to check for
        const potentialMaps = ['armory', 'valley', 'farm', 'northridge', 'tvstation'];
        this.mapConfigs = {};
        
        for (const mapName of potentialMaps) {
            try {
                const response = await fetch(`../maps/${mapName}-loot.json`);
                if (response.ok) {
                    const mapData = await response.json();
                    
                    // Create config from the JSON structure
                    this.mapConfigs[mapName] = {
                        name: this.formatMapName(mapName),
                        image: 'map.png', // Default image
                        baseFloor: 0,
                        floors: {}
                    };
                    
                    // Extract floors from the map data
                    if (mapData.floors && typeof mapData.floors === 'object') {
                        Object.keys(mapData.floors).forEach(floorKey => {
                            const floorData = mapData.floors[floorKey];
                            this.mapConfigs[mapName].floors[floorKey] = {
                                name: floorData.name || this.formatFloorName(floorKey),
                                image: floorData.image || 'map.png'
                            };
                        });
                    } else {
                        // Single floor map fallback
                        this.mapConfigs[mapName].floors['0'] = {
                            name: 'Ground Floor',
                            image: 'map.png'
                        };
                    }
                }
            } catch (error) {
                console.warn(`Could not load map: ${mapName}`, error);
            }
        }
        
        console.log('Discovered maps:', Object.keys(this.mapConfigs));
        return this.mapConfigs;
    }
    
    formatMapName(mapName) {
        return mapName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    formatFloorName(floorKey) {
        const floorNum = parseInt(floorKey);
        if (floorNum < 0) {
            return `Basement Level ${Math.abs(floorNum)}`;
        } else if (floorNum === 0) {
            return 'Ground Floor';
        } else {
            return `Floor ${floorNum}`;
        }
    }

    async init() {
        this.showLoading(true);
        
        try {
            // First discover available maps
            await this.discoverAvailableMaps();
            
            // Initialize the new marker system
            this.markerSystem = new MarkerSystem(this);
            await this.markerSystem.init();
            
            await this.setupCanvas();
            await this.loadMapData();
            this.setupEventListeners();
            
            // Load player data
            const playerData = this.loadPlayerData();
            
            this.updateUI();
            
            // Load selected map from URL, player data, or first available map
            const urlParams = new URLSearchParams(window.location.search);
            const availableMaps = Object.keys(this.mapConfigs);
            const mapName = urlParams.get('map') || 
                           (playerData?.currentMap) || 
                           localStorage.getItem('selectedMap') || 
                           (availableMaps.length > 0 ? availableMaps[0] : 'armory');
            
            await this.switchMap(mapName);
            
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.showNotification('Failed to load map', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async setupCanvas() {
        const container = this.wrapper;
        const rect = container.getBoundingClientRect();
        
        // Set exact map dimensions
        const MAP_WIDTH = 4078;
        const MAP_HEIGHT = 2158;
        const aspectRatio = MAP_WIDTH / MAP_HEIGHT;
        
        // Calculate canvas size maintaining exact aspect ratio
        let canvasWidth = rect.width;
        let canvasHeight = rect.width / aspectRatio;
        
        // If height is too tall, scale by height instead
        if (canvasHeight > rect.height) {
            canvasHeight = rect.height;
            canvasWidth = rect.height * aspectRatio;
        }
        
        // Set canvas size
        this.canvas.width = canvasWidth * window.devicePixelRatio;
        this.canvas.height = canvasHeight * window.devicePixelRatio;
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        // Store map dimensions for coordinate calculations
        this.mapDimensions = {
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            aspectRatio: aspectRatio
        };
        
        // Set overlay size to match canvas
        this.overlay.style.width = canvasWidth + 'px';
        this.overlay.style.height = canvasHeight + 'px';
        
        // Scale context for high DPI
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Set initial zoom level data attribute
        this.wrapper.setAttribute('data-zoom', '1');
        
        // Resize handler
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = this.wrapper;
        const rect = container.getBoundingClientRect();
        
        // Use exact map dimensions
        const aspectRatio = this.mapDimensions ? this.mapDimensions.aspectRatio : (4078 / 2158);
        
        // Calculate canvas size maintaining exact aspect ratio
        let canvasWidth = rect.width;
        let canvasHeight = rect.width / aspectRatio;
        
        // If height is too tall, scale by height instead
        if (canvasHeight > rect.height) {
            canvasHeight = rect.height;
            canvasWidth = rect.height * aspectRatio;
        }
        
        this.canvas.width = canvasWidth * window.devicePixelRatio;
        this.canvas.height = canvasHeight * window.devicePixelRatio;
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        // Set overlay size to match canvas
        this.overlay.style.width = canvasWidth + 'px';
        this.overlay.style.height = canvasHeight + 'px';
        
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Update marker positions
        this.updateAllMarkerPositions();
        
        this.requestRender();
    }

    async loadMapData() {
        // Map configurations are now loaded dynamically in discoverAvailableMaps()
        // This function is kept for compatibility but the real work is done in discoverAvailableMaps()
        console.log('Map data loading completed - using dynamic discovery');
    }

    async switchMap(mapName) {
        if (!this.mapConfigs[mapName]) return;
        
        this.showLoading(true);
        
        // Save time spent on current map
        if (this.currentMap) {
            this.saveMapTimeSpent(this.currentMap);
        }
        
        this.currentMap = mapName;
        
        try {
            // Load map image
            await this.loadMapImage(this.mapConfigs[mapName].image);
            
            // Update UI
            document.getElementById('mapTitle').textContent = `${this.mapConfigs[mapName].name} - Interactive Map`;
            document.getElementById('mapSelector').value = mapName;
            
            // Load markers for this map
            await this.loadMarkersForMap(mapName);
            
            // Reset view
            this.resetView();
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('map', mapName);
            window.history.replaceState({}, '', url);
            
            // Update map stats
            this.updateMapStats(mapName);
            
            // Load saved floor for this map or default to first available floor
            const availableFloors = this.availableFloors.get(mapName) || ['ground'];
            const savedFloor = localStorage.getItem(`current_floor_${mapName}`);
            this.currentFloor = (savedFloor && availableFloors.includes(savedFloor)) 
                ? savedFloor 
                : availableFloors[0];
            
            // Load loot for the current floor
            await this.loadFloorLoot(mapName, this.currentFloor);
            
            // Load user markers for the current floor
            await this.loadUserMarkersForFloor(mapName, this.currentFloor);
            
            // Update UI
            this.updateFilterCounts();
            this.initializeFilters();
            this.applyFilters();
            
            // Update floor selector
            const floorSelector = document.getElementById('floorSelector');
            if (floorSelector) {
                floorSelector.value = this.currentFloor;
            }
            
            // Save player data
            this.savePlayerData();
            
        } catch (error) {
            console.error('Failed to switch map:', error);
            this.showNotification('Failed to load map', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async switchMode(mode) {
        console.log(`Switching to mode: ${mode}`);
        this.currentMode = mode;
        
        // Clear existing markers
        if (this.markerSystem) {
            this.markerSystem.clearAll();
        }
        
        // Reload markers for current map with new mode
        await this.loadMapSpecificLoot(this.currentMap);
        
        // Update UI title to show current mode
        const mapTitle = document.getElementById('mapTitle');
        const baseName = this.mapConfigs[this.currentMap]?.name || this.currentMap;
        mapTitle.textContent = `${baseName} - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`;
        
        // Apply filters to show appropriate markers
        if (this.markerSystem) {
            this.markerSystem.applyFilters();
        }
        
        console.log(`Mode switched to: ${mode}`);
    }

    loadMapImage(imagePath) {
        return new Promise((resolve, reject) => {
            this.mapImage.onload = () => {
                // Update map dimensions based on actual image if needed
                console.log('Map image loaded:', {
                    naturalWidth: this.mapImage.naturalWidth,
                    naturalHeight: this.mapImage.naturalHeight,
                    currentDimensions: this.mapDimensions
                });
                
                this.requestRender();
                resolve();
            };
            this.mapImage.onerror = reject;
            
            // Add images/maps/ prefix if not already present
            const fullPath = imagePath.startsWith('images/maps/') ? 
                imagePath : 
                `images/maps/${imagePath}`;
            
            this.mapImage.src = fullPath;
        });
    }

    async loadMarkersForMap(mapName) {
        // Clear existing markers using new system
        if (this.markerSystem) {
            this.markerSystem.clearAll();
        } else {
            // Fallback for old system
            this.markers.clear();
            this.overlay.innerHTML = '';
        }
        
        // Load map-specific loot data (containers)
        await this.loadMapSpecificLoot(mapName);
        
        // Load default markers (categories) using new system
        this.loadDefaultMarkersForMap(mapName);
        
        // Load user markers from localStorage
        await this.loadUserMarkers(mapName);
        
        // Apply filters using new system
        if (this.markerSystem) {
            this.markerSystem.syncFloorFilter(); // Sync floor filter first
            this.markerSystem.updateFilterCounts();
            this.markerSystem.applyFilters();
        } else {
            // Fallback
            this.updateFilterCounts();
            this.initializeFilters();
            this.applyFilters();
        }
    }

    async loadMapSpecificLoot(mapName) {
        try {
            const response = await fetch(`../maps/${mapName}-loot.json`);
            console.log(`Fetching loot data for ${mapName}:`, response.status, response.ok);
            
            if (response.ok) {
                const lootData = await response.json();
                console.log('Loot data loaded:', lootData);
                
                // Load category markers based on current mode
                let markersToLoad = [];
                
                // Check if the data has modes structure
                if (lootData.modes && lootData.modes[this.currentMode]) {
                    console.log(`Loading markers for mode: ${this.currentMode}`);
                    markersToLoad = lootData.modes[this.currentMode].categoryMarkers || [];
                } else if (lootData.categoryMarkers) {
                    // Fallback to legacy structure
                    console.log('Loading markers from legacy structure');
                    markersToLoad = lootData.categoryMarkers;
                } else {
                    console.log('No markers found for current mode or legacy structure');
                }
                
                // Load the markers if they exist and marker system is initialized
                if (markersToLoad.length > 0 && this.markerSystem) {
                    console.log(`Loading ${markersToLoad.length} category markers for ${mapName} in ${this.currentMode} mode`);
                    markersToLoad.forEach(markerData => {
                        console.log('Processing marker data:', markerData);
                        this.markerSystem.createCategoryMarker(markerData);
                    });
                } else {
                    console.log('No category markers found or marker system not initialized');
                }
                
                // Check if the data has floors structure
                if (lootData.floors) {
                    const floors = Object.keys(lootData.floors);
                    this.availableFloors.set(mapName, floors);
                    this.floorData.set(mapName, lootData.floors);
                    
                    // Build floor level mapping from JSON data
                    const mapFloorLevels = {};
                    floors.forEach(floor => {
                        const floorData = lootData.floors[floor];
                        mapFloorLevels[floor] = floorData.level !== undefined ? floorData.level : this.floorLevels[floor] || 0;
                    });
                    
                    // Update floor levels for this map
                    Object.assign(this.floorLevels, mapFloorLevels);
                    
                    // Build available floor levels (unlimited support)
                    const floorLevels = floors.map(floor => mapFloorLevels[floor])
                                            .filter((level, index, arr) => arr.indexOf(level) === index)
                                            .sort((a, b) => b - a); // Sort descending (highest to lowest)
                    this.availableFloorLevels.set(mapName, floorLevels);
                    
                    // Load loot containers for current floor
                    await this.loadFloorLoot(mapName, this.currentFloor);
                    
                    // Load floor-specific map image if available
                    await this.loadFloorMapImage(mapName, this.currentFloor);
                } else {
                    // Legacy format - treat as ground floor
                    this.availableFloors.set(mapName, ['ground']);
                    this.availableFloorLevels.set(mapName, [0]);
                    this.floorData.set(mapName, {
                        ground: {
                            name: 'Ground Floor',
                            level: 0,
                            image: lootData.image || 'map.png',
                            lootContainers: lootData.lootContainers || []
                        }
                    });
                    
                    await this.loadFloorLoot(mapName, 'ground');
                }
                
                // Update floor selector UI
                this.updateFloorSelector(mapName);
                this.updateFloorControls();
                this.generateLevelButtons(mapName);
            }
        } catch (error) {
            console.error(`Failed to load loot data for ${mapName}:`, error);
        }
    }

    async loadFloorMapImage(mapName, floorName) {
        const floorData = this.floorData.get(mapName);
        if (!floorData || !floorData[floorName]) return;
        
        const floor = floorData[floorName];
        const imageUrl = floor.image || 'map.png';
        
        // Load the floor-specific image
        try {
            await this.loadMapImage(imageUrl);
            this.requestRender();
        } catch (error) {
            console.warn(`Failed to load floor image ${imageUrl}, using default`);
            // Fallback to default map image
            await this.loadMapImage('map.png');
        }
    }

    // Loot containers are now loaded from map-data.json in loadMapDataFromJson()

    addLootContainer(container) {
        const marker = {
            id: container.id,
            type: 'loot-container',
            subType: container.type,
            title: container.name,
            description: `Contents: ${container.contents.join(', ')}`,
            x: container.x,
            y: container.y,
            rarity: container.rarity,
            respawnTime: container.respawnTime,
            floor: container.floor || this.currentFloor
        };
        
        this.markers.set(marker.id, marker);
        this.createMarkerElement(marker);
    }

    createMarkerElement(marker) {
        // Create the web component
        const markerElement = document.createElement('map-marker');
        
        // Validate that mapDimensions exists
        if (!this.mapDimensions) {
            console.error('mapDimensions not available for marker positioning');
            return;
        }
        
        // Set basic positioning
        const xPercent = (marker.x / this.mapDimensions.width) * 100;
        const yPercent = (marker.y / this.mapDimensions.height) * 100;
        
        console.log('Creating marker:', {
            id: marker.id,
            title: marker.title,
            type: marker.type,
            subType: marker.subType,
            pixelCoords: { x: marker.x, y: marker.y },
            mapDimensions: this.mapDimensions,
            percentCoords: { x: xPercent, y: yPercent }
        });
        
        markerElement.style.left = `${xPercent}%`;
        markerElement.style.top = `${yPercent}%`;
        
        // Add CSS classes for compatibility
        markerElement.className = `map-marker ${marker.type} ${marker.subType || ''} ${marker.rarity || ''}`.trim();
        
        // Configure the marker using the custom icon system
        this.configureMarkerComponent(markerElement, marker);
        
        // Set marker data (store original pixel coordinates)
        markerElement.dataset.markerId = marker.id;
        markerElement.dataset.type = marker.type;
        markerElement.dataset.subType = marker.subType || '';
        markerElement.dataset.rarity = marker.rarity || '';
        markerElement.dataset.floor = marker.floor || 'ground';
        markerElement.dataset.x = marker.x; // Store as pixels
        markerElement.dataset.y = marker.y; // Store as pixels
        
        // Ensure marker is visible by default
        markerElement.style.display = 'block';
        markerElement.style.position = 'absolute';
        markerElement.style.pointerEvents = 'auto';
        
        // Add click handler
        markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (marker.type === 'loot-container') {
                this.showLootContainerDetails(marker);
            } else {
                this.showMarkerDetails(marker);
            }
        });
        
        console.log('Adding marker to overlay. Current overlay children:', this.overlay.children.length);
        this.overlay.appendChild(markerElement);
        this.updateMarkerPosition(markerElement);
        console.log('Marker added. New overlay children count:', this.overlay.children.length);
    }

    configureMarkerComponent(markerElement, marker) {
        const icons = this.markerIcons?.markerIcons;
        let iconConfig = null;
        
        // Get icon configuration
        if (icons) {
            if (marker.type === 'loot-container' && marker.subType) {
                iconConfig = icons['loot-container']?.[marker.subType];
            } else if (marker.type && icons[marker.type]) {
                iconConfig = icons[marker.type];
            }
        }
        
        console.log('Configuring marker:', {
            type: marker.type,
            subType: marker.subType,
            rarity: marker.rarity,
            iconConfig: iconConfig,
            markerIcons: this.markerIcons
        });
        
        // Set title
        markerElement.title = marker.title || '';
        
        if (iconConfig) {
            // Set size
            markerElement.size = iconConfig.size || 20;
            
            // Get color for rarity or default
            const color = marker.rarity ? 
                this.markerIcons.rarityColors[marker.rarity] : 
                iconConfig.color;
            
            console.log('Setting color:', color, 'for marker:', marker.title);
            markerElement.color = color || '#666666';
            
            // Set icon if available
            if (iconConfig.icon) {
                const iconPath = `images/icons/${iconConfig.icon}`;
                console.log('Setting icon path:', iconPath);
                markerElement.icon = iconPath;
            }
        } else {
            // Default configuration - different for different marker types
            console.log('No icon config found for:', marker.type, marker.subType);
            markerElement.size = 20;
            
            // Use appropriate default colors for different marker types
            switch (marker.type) {
                case 'spawn':
                    markerElement.color = '#00ff00'; // Green for spawns
                    break;
                case 'extraction':
                    markerElement.color = '#ff6600'; // Orange for extractions
                    break;
                case 'loot-container':
                    markerElement.color = '#ffff00'; // Yellow for loot containers
                    break;
                default:
                    markerElement.color = '#666666'; // Gray default
            }
        }
    }

    // Legacy method - now handled by web component
    applyCustomIcon(markerElement, marker) {
        // This method is deprecated - markers now use web components
        console.warn('applyCustomIcon is deprecated - use configureMarkerComponent instead');
    }

    // Legacy method - now handled by web component
    createColoredCircleMarker(markerElement, color) {
        // This method is deprecated - markers now use web components
        console.warn('createColoredCircleMarker is deprecated - use web component instead');
    }

    createLootContainerElement(marker) {
        const markerElement = document.createElement('div');
        markerElement.className = `map-marker loot-container ${marker.subType} ${marker.rarity}`;
        markerElement.style.left = `${marker.x}%`;
        markerElement.style.top = `${marker.y}%`;
        markerElement.style.transform = 'translate(-50%, -50%)'; // Center the marker on coordinates
        
        // Set z-index based on floor level (dynamic)
        const floorLevel = this.getMarkerFloorLevel(marker.floor);
        const floorZIndex = this.getFloorZIndex(floorLevel);
        markerElement.style.zIndex = floorZIndex;
        
        markerElement.dataset.markerId = marker.id;
        markerElement.dataset.type = marker.type;
        markerElement.dataset.subType = marker.subType;
        markerElement.dataset.rarity = marker.rarity;
        markerElement.dataset.floor = marker.floor || 'ground';
        markerElement.dataset.x = marker.x;
        markerElement.dataset.y = marker.y;
        
        console.log(`Creating marker element:`, {
            id: marker.id,
            className: markerElement.className,
            floor: marker.floor,
            floorLevel,
            position: `${marker.x}%, ${marker.y}%`,
            zIndex: floorZIndex
        });
        
        // Add instant tooltip instead of title attribute
        this.addInstantTooltip(markerElement, marker.title);
        
        markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showLootContainerDetails(marker);
        });
        
        this.overlay.appendChild(markerElement);
        this.updateMarkerPosition(markerElement);
        
        console.log(`Marker element appended to overlay. Total overlay children: ${this.overlay.children.length}`);
    }

    showLootContainerDetails(marker) {
        const modal = document.getElementById('markerModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = marker.title;
        modalBody.innerHTML = `
            <div class="loot-container-details">
                <div class="detail-row">
                    <span class="label">Type:</span>
                    <span class="value">${marker.subType.replace('-', ' ').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Rarity:</span>
                    <span class="value rarity-${marker.rarity}">${marker.rarity.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Respawn Time:</span>
                    <span class="value">${Math.floor(marker.respawnTime / 60)} minutes</span>
                </div>
                <div class="detail-row">
                    <span class="label">Contents:</span>
                    <span class="value">${marker.description.replace('Contents: ', '')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Coordinates:</span>
                    <span class="value">${marker.x}%, ${marker.y}%</span>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    async loadUserMarkers(mapName) {
        await this.loadUserMarkersForFloor(mapName, this.currentFloor);
    }

    async loadUserMarkersForFloor(mapName, floorName) {
        const savedMarkers = localStorage.getItem(`user_markers_${mapName}_${floorName}`);
        if (savedMarkers) {
            try {
                const markersData = JSON.parse(savedMarkers);
                
                // Clear existing user markers
                this.markers.forEach((marker, id) => {
                    if (marker.isUserMarker) {
                        this.markers.delete(id);
                        const element = document.querySelector(`[data-marker-id="${id}"]`);
                        if (element) element.remove();
                    }
                });
                
                // Add user markers for this floor
                markersData.forEach(marker => {
                    marker.isUserMarker = true;
                    marker.floor = floorName;
                    this.addMarker(marker);
                });
            } catch (error) {
                console.error('Failed to load user markers:', error);
            }
        }
    }

    saveUserMarkers(mapName) {
        const userMarkers = Array.from(this.markers.values()).filter(marker => marker.isUserMarker);
        localStorage.setItem(`user_markers_${mapName}_${this.currentFloor}`, JSON.stringify(userMarkers));
    }

    getUserMarkerCount() {
        return Array.from(this.markers.values()).filter(marker => marker.isUserMarker).length;
    }

    async loadDefaultMarkersForMap(mapName) {
        try {
            console.log(`Loading default markers for map: ${mapName}, mode: ${this.currentMode}`);
            
            // Load the JSON file for the map
            const response = await fetch(`../maps/${mapName}-loot.json`);
            if (!response.ok) {
                console.warn(`Could not load markers for ${mapName}: ${response.status}`);
                return;
            }
            
            const mapData = await response.json();
            console.log('Loaded map data:', mapData);
            
            // Get markers for the current mode, fallback to legacy categoryMarkers
            let markers = [];
            
            if (mapData.modes && mapData.modes[this.currentMode] && mapData.modes[this.currentMode].categoryMarkers) {
                markers = mapData.modes[this.currentMode].categoryMarkers;
                console.log(`Loading ${markers.length} markers for mode: ${this.currentMode}`);
            } else if (mapData.categoryMarkers) {
                markers = mapData.categoryMarkers;
                console.log(`Loading ${markers.length} legacy category markers`);
            }
            
            // Process each marker
            markers.forEach(marker => {
                // Ensure required properties
                const processedMarker = {
                    ...marker,
                    title: marker.title || marker.name || 'Marker',
                    category: marker.type || marker.category || 'unknown',
                    floor: marker.floor || 'ground',
                    isUserMarker: false
                };
                
                console.log('Processing marker:', processedMarker);
                
                if (this.markerSystem) {
                    this.markerSystem.addMarker(processedMarker);
                } else {
                    // Fallback for old system
                    this.markers.set(marker.id, processedMarker);
                    this.createMarkerElement(processedMarker);
                }
            });
            
        } catch (error) {
            console.error('Error loading default markers:', error);
        }
    }

    setupEventListeners() {
        // Map controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetView());
        document.getElementById('resetViewBtn').addEventListener('click', () => this.resetView());
        
        // Fullscreen
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // Map selector
        document.getElementById('mapSelector').addEventListener('change', (e) => {
            this.switchMap(e.target.value);
        });
        
        // Mode selector
        document.getElementById('modeSelector').addEventListener('change', (e) => {
            this.switchMode(e.target.value);
        });
        
        // Floor selector
        document.getElementById('floorSelector').addEventListener('change', (e) => {
            this.switchFloor(e.target.value);
        });
        
        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Form handling
        document.getElementById('addMarkerForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('markerType').addEventListener('change', (e) => this.handleMarkerTypeChange(e));
        document.getElementById('cancelAddBtn').addEventListener('click', () => this.cancelAddMarker());
        
        // Filters
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAllFilters());
        
        // Container type filter buttons
        const selectAllContainers = document.getElementById('selectAllContainers');
        const clearAllContainers = document.getElementById('clearAllContainers');
        
        if (selectAllContainers) {
            selectAllContainers.addEventListener('click', () => this.selectAllContainerFilters());
        }
        
        if (clearAllContainers) {
            clearAllContainers.addEventListener('click', () => this.clearAllContainerFilters());
        }
        
        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('markerModal').addEventListener('click', (e) => {
            if (e.target.id === 'markerModal') this.closeModal();
        });
        
        // Mobile navigation
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleMobileNav(btn));
        });
        
        // Panel toggles
        document.getElementById('mobileToggle').addEventListener('click', () => this.toggleMobileMenu());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Mouse position tracking
        this.canvas.addEventListener('mousemove', (e) => this.updateCoordinates(e));
        
        // Save data when leaving page
        window.addEventListener('beforeunload', () => {
            this.saveMapTimeSpent(this.currentMap);
            this.savePlayerData();
        });
        
        // Save data periodically
        setInterval(() => {
            this.savePlayerData();
        }, 30000); // Save every 30 seconds
    }

    handleMouseDown(e) {
        if (this.isAddingMarker) return;
        
        this.isDragging = true;
        this.lastMousePos = this.getMousePos(e);
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.isAddingMarker) return;
        
        const currentPos = this.getMousePos(e);
        const deltaX = currentPos.x - this.lastMousePos.x;
        const deltaY = currentPos.y - this.lastMousePos.y;
        
        this.translateX += deltaX;
        this.translateY += deltaY;
        
        // Clamp translation to prevent going too far off-screen
        this.clampTranslation();
        
        this.lastMousePos = currentPos;
        this.requestRender();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = this.isAddingMarker ? 'crosshair' : 'grab';
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomAt(mouseX + rect.left, mouseY + rect.top, zoomFactor);
    }

    handleClick(e) {
        if (!this.isAddingMarker || !this.pendingMarker) return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert screen coordinates to map coordinates
        const mapX = (mouseX - this.translateX) / this.scale;
        const mapY = (mouseY - this.translateY) / this.scale;
        
        // Convert to pixel coordinates (0,0 to 4078,2158)
        const pixelX = (mapX / rect.width) * this.mapDimensions.width;
        const pixelY = (mapY / rect.height) * this.mapDimensions.height;
        
        // Clamp to valid range
        this.pendingMarker.x = Math.max(0, Math.min(this.mapDimensions.width, pixelX));
        this.pendingMarker.y = Math.max(0, Math.min(this.mapDimensions.height, pixelY));
        this.pendingMarker.id = Date.now();
        this.pendingMarker.isUserMarker = true;
        
        this.addMarker(this.pendingMarker);
        this.updateFilterCounts();
        this.applyFilters();
        
        this.isAddingMarker = false;
        this.pendingMarker = null;
        this.canvas.style.cursor = 'grab';
        
        // Reset form
        document.getElementById('addMarkerForm').reset();
        // Elements made visible - removed display: none
        // document.getElementById('lootQualityGroup').style.display = 'none';
        // document.getElementById('cancelAddBtn').style.display = 'none';
        
        const roundedX = Math.round(this.pendingMarker.x);
        const roundedY = Math.round(this.pendingMarker.y);
        this.showNotification(`Marker added at (${roundedX}, ${roundedY})!`, 'success');
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMousePos = this.getTouchPos(e.touches[0]);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDragging) {
            const currentPos = this.getTouchPos(e.touches[0]);
            const deltaX = currentPos.x - this.lastMousePos.x;
            const deltaY = currentPos.y - this.lastMousePos.y;
            
            this.translateX += deltaX;
            this.translateY += deltaY;
            
            // Clamp translation to prevent going too far off-screen
            this.clampTranslation();
            
            this.lastMousePos = currentPos;
            this.requestRender();
        }
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const selectedFloor = document.getElementById('markerFloor').value;
        const markerData = {
            type: document.getElementById('markerType').value,
            title: document.getElementById('markerTitle').value,
            description: document.getElementById('markerDescription').value,
            lootQuality: document.getElementById('lootQuality').value || null,
            floor: selectedFloor === 'current' ? this.currentFloor : selectedFloor
        };
        
        if (!markerData.type || !markerData.title) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        this.pendingMarker = markerData;
        this.isAddingMarker = true;
        this.canvas.style.cursor = 'crosshair';
        
        document.getElementById('cancelAddBtn').style.display = 'inline-flex';
        this.showNotification('Click on the map to place the marker', 'info');
    }

    handleMarkerTypeChange(e) {
        const lootQualityGroup = document.getElementById('lootQualityGroup');
        if (e.target.value === 'loot-areas') {
            lootQualityGroup.style.display = 'block';
        } else {
            // Element made visible - removed display: none
            // lootQualityGroup.style.display = 'none';
        }
    }

    handleMobileNav(btn) {
        const panel = btn.dataset.panel;
        
        // Remove active class from all buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Hide all panels
        document.getElementById('leftPanel').classList.remove('active');
        document.getElementById('rightPanel').classList.remove('active');
        
        // Show selected panel
        if (panel === 'filters') {
            document.getElementById('leftPanel').classList.add('active');
        } else if (panel === 'add') {
            document.getElementById('rightPanel').classList.add('active');
        }
    }

    handleKeyboard(e) {
        if (e.key === 'Escape') {
            if (this.isAddingMarker) {
                this.cancelAddMarker();
            } else {
                this.closeModal();
            }
        } else if (e.key === 'f' && e.ctrlKey) {
            e.preventDefault();
            this.toggleFullscreen();
        } else if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            this.resetView();
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getTouchPos(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    zoom(factor) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomAt(centerX + rect.left, centerY + rect.top, factor);
    }

    zoomAt(x, y, factor) {
        const newScale = Math.max(0.5, Math.min(3, this.scale * factor));
        
        if (newScale === this.scale) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = x - rect.left;
        const mouseY = y - rect.top;
        
        // Calculate world coordinates of the mouse position
        const worldX = (mouseX - this.translateX) / this.scale;
        const worldY = (mouseY - this.translateY) / this.scale;
        
        // Update scale
        this.scale = newScale;
        
        // Calculate new translation to keep the world point under the mouse
        this.translateX = mouseX - worldX * this.scale;
        this.translateY = mouseY - worldY * this.scale;
        
        // Clamp translation to prevent going too far off-screen
        this.clampTranslation();
        
        this.requestRender();
        this.updateZoomLevel();
        this.updateAllMarkerPositions(); // Update marker scaling for new zoom level
    }

    resetView() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.requestRender();
        this.updateZoomLevel();
        this.updateAllMarkerPositions(); // Update marker scaling for reset
    }

    updateZoomLevel() {
        const zoomPercent = Math.round(this.scale * 100);
        document.getElementById('zoomLevel').textContent = `${zoomPercent}%`;
        
        // Calculate progressive marker scaling based on zoom level
        // Formula: Scale decreases as zoom increases
        // At zoom 0.5: marker scale = 1.6 (larger when zoomed out)
        // At zoom 1.0: marker scale = 1.0 (normal size)
        // At zoom 2.0: marker scale = 0.5 (smaller when zoomed in)
        // At zoom 3.0: marker scale = 0.33 (much smaller at max zoom)
        const markerScale = Math.max(0.25, Math.min(2.0, 1 / this.scale));
        
        // Apply dynamic scaling to all markers using CSS custom property
        this.wrapper.style.setProperty('--marker-scale', markerScale.toString());
        
        // Also set zoom level as data attribute for compatibility
        const zoomLevel = Math.round(this.scale * 100) / 100;
        this.wrapper.setAttribute('data-zoom', zoomLevel.toString());
    }

    updateCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert screen coordinates to map coordinates
        const mapX = (mouseX - this.translateX) / this.scale;
        const mapY = (mouseY - this.translateY) / this.scale;
        
        // Convert to pixel coordinates (0,0 to 4078,2158)
        const pixelX = Math.round((mapX / rect.width) * this.mapDimensions.width);
        const pixelY = Math.round((mapY / rect.height) * this.mapDimensions.height);
        
        document.getElementById('coordinates').textContent = `${pixelX}, ${pixelY}`;
    }

    addMarker(markerData) {
        const marker = {
            ...markerData,
            id: markerData.id || Date.now(),
            isUserMarker: markerData.isUserMarker || false,
            floor: markerData.floor || this.currentFloor
        };
        
        this.markers.set(marker.id, marker);
        
        // Use the web component createMarkerElement (the one that handles pixel coordinates)
        this.createMarkerElement(marker);
        
        this.updateRecentMarkers();
        
        // Save user markers to localStorage per map and floor
        if (marker.isUserMarker) {
            this.saveUserMarkers(this.currentMap);
        }
    }

    createMarkerElement(marker) {
        const markerElement = document.createElement('div');
        markerElement.className = `map-marker ${marker.type}`;
        markerElement.style.left = `${marker.x}%`;
        markerElement.style.top = `${marker.y}%`;
        markerElement.style.transform = 'translate(-50%, -50%)'; // Center the marker on coordinates
        
        // Set z-index based on floor level (dynamic)
        const floorLevel = this.getMarkerFloorLevel(marker.floor);
        const floorZIndex = this.getFloorZIndex(floorLevel);
        markerElement.style.zIndex = floorZIndex;
        
        markerElement.dataset.markerId = marker.id;
        markerElement.dataset.type = marker.type;
        markerElement.dataset.lootQuality = marker.lootQuality || '';
        markerElement.dataset.floor = marker.floor || 'ground';
        markerElement.dataset.x = marker.x;
        markerElement.dataset.y = marker.y;
        
        // Remove default title attribute to avoid delay
        // markerElement.title = marker.title;
        
        // Add instant tooltip on hover
        this.addInstantTooltip(markerElement, marker.title);
        
        markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMarkerDetails(marker);
        });
        
        this.overlay.appendChild(markerElement);
        this.updateMarkerPosition(markerElement);
    }

    addInstantTooltip(element, tooltipText) {
        let tooltip = null;
        
        element.addEventListener('mouseenter', (e) => {
            // Create tooltip
            tooltip = document.createElement('div');
            tooltip.className = 'instant-tooltip';
            tooltip.textContent = tooltipText;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
            
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            let top = rect.top - tooltipRect.height - 8;
            
            // Adjust if tooltip goes off screen
            if (left < 8) left = 8;
            if (left + tooltipRect.width > window.innerWidth - 8) {
                left = window.innerWidth - tooltipRect.width - 8;
            }
            if (top < 8) {
                top = rect.bottom + 8;
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });
        
        element.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
    }

    showMarkerDetails(marker) {
        console.log('Showing marker details for:', marker);
        const modal = document.getElementById('markerModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalTitle || !modalBody) {
            console.error('Modal elements not found:', { modal, modalTitle, modalBody });
            return;
        }
        
        modalTitle.textContent = marker.title;
        modalBody.innerHTML = `
            <div class="marker-details">
                <div class="detail-row">
                    <strong>Type:</strong> ${marker.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                ${marker.floor ? `
                    <div class="detail-row">
                        <strong>Floor:</strong> ${this.getFloorDisplayName(marker.floor)}
                    </div>
                ` : ''}
                ${marker.lootQuality ? `
                    <div class="detail-row">
                        <strong>Loot Quality:</strong> ${marker.lootQuality.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                ` : ''}
                <div class="detail-row">
                    <strong>Description:</strong> ${marker.description || 'No description provided'}
                </div>
                <div class="detail-row">
                    <strong>Coordinates:</strong> ${Math.round(marker.x)}, ${Math.round(marker.y)}
                </div>
                <div class="detail-row">
                    <strong>Source:</strong> ${marker.isUserMarker ? 'User Created' : marker.isLootContainer ? 'Loot Container' : 'Default'}
                </div>
                ${marker.isUserMarker ? `
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="interactiveMap.editMarker(${marker.id})">Edit</button>
                        <button class="btn-secondary" onclick="interactiveMap.deleteMarker(${marker.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        console.log('Adding show class to modal');
        modal.classList.add('show');
        console.log('Modal classes after adding show:', modal.className);
    }

    deleteMarker(markerId) {
        const marker = this.markers.get(markerId);
        if (!marker) return;
        
        this.markers.delete(markerId);
        const markerElement = document.querySelector(`[data-marker-id="${markerId}"]`);
        if (markerElement) {
            markerElement.remove();
        }
        
        // Save user markers if this was a user marker
        if (marker.isUserMarker) {
            this.saveUserMarkers(this.currentMap);
        }
        
        this.updateFilterCounts();
        this.updateRecentMarkers();
        this.closeModal();
        this.showNotification('Marker deleted successfully!', 'success');
    }

    editMarker(markerId) {
        const marker = this.markers.get(markerId);
        if (!marker || !marker.isUserMarker) return;
        
        // Populate form with marker data
        document.getElementById('markerType').value = marker.type;
        document.getElementById('markerTitle').value = marker.title;
        document.getElementById('markerDescription').value = marker.description || '';
        
        if (marker.lootQuality) {
            document.getElementById('lootQuality').value = marker.lootQuality;
            document.getElementById('lootQualityGroup').style.display = 'block';
        } else {
            // Element made visible - removed display: none
            // document.getElementById('lootQualityGroup').style.display = 'none';
        }
        
        // Remove the existing marker
        this.deleteMarker(markerId);
        
        // Set up for editing
        this.isAddingMarker = true;
        this.canvas.style.cursor = 'crosshair';
        document.getElementById('cancelAddBtn').style.display = 'inline-flex';
        
        this.closeModal();
        this.showNotification('Click on the map to place the updated marker', 'info');
    }

    closeModal() {
        console.log('Closing modal');
        const modal = document.getElementById('markerModal');
        if (modal) {
            modal.classList.remove('show');
            console.log('Modal classes after removing show:', modal.className);
        }
    }

    initializeFilters() {
        // Check only the main category filters by default, not loot quality filters
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            // Only check main category filters, not tier/quality filters
            if (!checkbox.id.includes('tier')) {
                checkbox.checked = true;
            }
        });
    }

    updateFilterCounts() {
        const counts = {};
        
        this.markers.forEach(marker => {
            // Count main types
            counts[marker.type] = (counts[marker.type] || 0) + 1;
            
            // Count container subtypes for loot-container markers
            if (marker.type === 'loot-container' && marker.subType) {
                counts[marker.subType] = (counts[marker.subType] || 0) + 1;
            }
            
            // Count loot quality
            if (marker.lootQuality) {
                counts[marker.lootQuality] = (counts[marker.lootQuality] || 0) + 1;
            }
        });
        
        // Update count displays
        Object.keys(counts).forEach(type => {
            const countElement = document.getElementById(`${type}-count`);
            if (countElement) {
                countElement.textContent = counts[type] || 0;
            }
        });
    }

    updateRecentMarkers() {
        const recentList = document.getElementById('recentMarkersList');
        recentList.innerHTML = '';
        
        const recentMarkers = Array.from(this.markers.values())
            .sort((a, b) => b.id - a.id)
            .slice(0, 5);
        
        if (recentMarkers.length === 0) {
            recentList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No markers added yet</p>';
            return;
        }
        
        recentMarkers.forEach(marker => {
            const markerItem = document.createElement('div');
            markerItem.className = 'marker-item';
            markerItem.innerHTML = `
                <div class="marker-item-title">${marker.title}</div>
                <div class="marker-item-type">${marker.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
            `;
            
            markerItem.addEventListener('click', () => {
                this.showMarkerDetails(marker);
            });
            
            recentList.appendChild(markerItem);
        });
    }

    cancelAddMarker() {
        this.isAddingMarker = false;
        this.pendingMarker = null;
        this.canvas.style.cursor = 'grab';
        
        document.getElementById('addMarkerForm').reset();
        // Elements made visible - removed display: none
        // document.getElementById('lootQualityGroup').style.display = 'none';
        // document.getElementById('cancelAddBtn').style.display = 'none';
        
        this.showNotification('Marker placement cancelled', 'info');
    }

    // Removed saveMarkers method - now using saveUserMarkers per map

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    toggleMobileMenu() {
        const leftPanel = document.getElementById('leftPanel');
        leftPanel.classList.toggle('active');
    }

    requestRender() {
        if (this.animationFrameId) return;
        
        this.animationFrameId = requestAnimationFrame(() => {
            this.render();
            this.animationFrameId = null;
        });
    }

    render() {
        const now = performance.now();
        if (now - this.lastRenderTime < this.renderThrottle) return;
        
        this.lastRenderTime = now;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
        
        // Save context
        this.ctx.save();
        
        // Apply transformations
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.scale, this.scale);
        
        // Draw map image
        if (this.mapImage.complete) {
            const canvasWidth = this.canvas.width / window.devicePixelRatio;
            const canvasHeight = this.canvas.height / window.devicePixelRatio;
            this.ctx.drawImage(this.mapImage, 0, 0, canvasWidth, canvasHeight);
        }
        
        // Restore context
        this.ctx.restore();
        
        // Apply the same transformations to the overlay so markers stay in place
        if (this.overlay) {
            this.overlay.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
            this.overlay.style.transformOrigin = '0 0';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    updateUI() {
        this.populateMapSelector();
        this.updateZoomLevel();
        this.updateFilterCounts();
        this.updateRecentMarkers();
    }

    populateMapSelector() {
        const mapSelector = document.getElementById('mapSelector');
        if (!mapSelector) return;
        
        // Clear existing options
        mapSelector.innerHTML = '';
        
        // Add options for each discovered map
        Object.entries(this.mapConfigs).forEach(([mapKey, mapConfig]) => {
            const option = document.createElement('option');
            option.value = mapKey;
            option.textContent = mapConfig.name;
            mapSelector.appendChild(option);
        });
        
        // Set current map as selected
        if (this.currentMap && this.mapConfigs[this.currentMap]) {
            mapSelector.value = this.currentMap;
        }
    }

    updateMarkerPosition(markerElement) {
        const pixelX = parseFloat(markerElement.dataset.x);
        const pixelY = parseFloat(markerElement.dataset.y);
        
        if (isNaN(pixelX) || isNaN(pixelY)) return;
        
        // Convert pixel coordinates to percentage for CSS positioning
        const xPercent = (pixelX / this.mapDimensions.width) * 100;
        const yPercent = (pixelY / this.mapDimensions.height) * 100;
        
        markerElement.style.left = `${xPercent}%`;
        markerElement.style.top = `${yPercent}%`;
        
        // Scale markers inversely to zoom level
        const markerScale = Math.max(0.5, Math.min(2.0, 1 / this.scale));
        markerElement.style.transform = `translate(-50%, -50%) scale(${markerScale})`;
    }

    updateAllMarkerPositions() {
        // Use new marker system if available
        if (this.markerSystem) {
            this.markerSystem.updateAllPositions();
            return;
        }
        
        // Fallback to old system
        // Only update marker scaling based on zoom level
        // Position is handled by overlay transform
        if (!this.overlay || !this.canvas) return;
        
        const markers = this.overlay.querySelectorAll('.map-marker, map-marker');
        if (markers.length === 0) return;
        
        // Scale markers inversely to zoom - smaller when zoomed in, larger when zoomed out
        const markerScale = Math.max(0.5, Math.min(2.0, 1 / this.scale));
        
        markers.forEach(markerElement => {
            const pixelX = parseFloat(markerElement.dataset.x);
            const pixelY = parseFloat(markerElement.dataset.y);
            
            if (!isNaN(pixelX) && !isNaN(pixelY)) {
                // Convert pixels to percentages for positioning
                const xPercent = (pixelX / this.mapDimensions.width) * 100;
                const yPercent = (pixelY / this.mapDimensions.height) * 100;
                
                markerElement.style.left = `${xPercent}%`;
                markerElement.style.top = `${yPercent}%`;
                // Update scale inversely to zoom level
                markerElement.style.transform = `translate(-50%, -50%) scale(${markerScale})`;
            }
        });
    }

    // Performance-optimized marker update with throttling
    throttledUpdateMarkers() {
        if (this.markerUpdateTimeout) {
            clearTimeout(this.markerUpdateTimeout);
        }
        
        this.markerUpdateTimeout = setTimeout(() => {
            this.updateAllMarkerPositions();
            this.markerUpdateTimeout = null;
        }, 16); // ~60fps
    }

    // Player Save System
    savePlayerData() {
        const playerData = {
            currentMap: this.currentMap,
            lastPlayed: new Date().toISOString(),
            preferences: {
                lastZoomLevel: this.scale,
                lastPosition: {
                    x: this.translateX,
                    y: this.translateY
                }
            },
            mapData: {}
        };

        // Save data for each map
        Object.keys(this.mapConfigs).forEach(mapName => {
            const mapUserMarkers = this.loadUserMarkersFromStorage(mapName);
            const mapSettings = this.loadMapSettings(mapName);
            
            playerData.mapData[mapName] = {
                userMarkers: mapUserMarkers,
                settings: mapSettings,
                lastVisited: localStorage.getItem(`last_visited_${mapName}`) || null,
                stats: this.getMapStats(mapName)
            };
        });

        localStorage.setItem('player_data', JSON.stringify(playerData));
    }

    loadPlayerData() {
        const savedData = localStorage.getItem('player_data');
        if (savedData) {
            try {
                const playerData = JSON.parse(savedData);
                
                // Restore last position and zoom for current map
                if (playerData.preferences) {
                    this.scale = playerData.preferences.lastZoomLevel || 1;
                    this.translateX = playerData.preferences.lastPosition?.x || 0;
                    this.translateY = playerData.preferences.lastPosition?.y || 0;
                }
                
                return playerData;
            } catch (error) {
                console.error('Failed to load player data:', error);
            }
        }
        return null;
    }

    loadUserMarkersFromStorage(mapName) {
        const savedMarkers = localStorage.getItem(`user_markers_${mapName}`);
        if (savedMarkers) {
            try {
                return JSON.parse(savedMarkers);
            } catch (error) {
                console.error(`Failed to load user markers for ${mapName}:`, error);
            }
        }
        return [];
    }

    loadMapSettings(mapName) {
        const savedSettings = localStorage.getItem(`map_settings_${mapName}`);
        if (savedSettings) {
            try {
                return JSON.parse(savedSettings);
            } catch (error) {
                console.error(`Failed to load map settings for ${mapName}:`, error);
            }
        }
        return {
            filterStates: {},
            searchHistory: [],
            customNotes: []
        };
    }

    saveMapSettings(mapName, settings) {
        localStorage.setItem(`map_settings_${mapName}`, JSON.stringify(settings));
    }

    getMapStats(mapName) {
        const userMarkers = this.loadUserMarkersFromStorage(mapName);
        const visitCount = parseInt(localStorage.getItem(`visit_count_${mapName}`)) || 0;
        const timeSpent = parseInt(localStorage.getItem(`time_spent_${mapName}`)) || 0;
        
        return {
            userMarkerCount: userMarkers.length,
            visitCount: visitCount,
            timeSpent: timeSpent,
            lastVisited: localStorage.getItem(`last_visited_${mapName}`) || null
        };
    }

    updateMapStats(mapName) {
        // Update visit count
        const visitCount = parseInt(localStorage.getItem(`visit_count_${mapName}`)) || 0;
        localStorage.setItem(`visit_count_${mapName}`, (visitCount + 1).toString());
        
        // Update last visited
        localStorage.setItem(`last_visited_${mapName}`, new Date().toISOString());
        
        // Start time tracking
        this.mapStartTime = Date.now();
    }

    saveMapTimeSpent(mapName) {
        if (this.mapStartTime) {
            const timeSpent = parseInt(localStorage.getItem(`time_spent_${mapName}`)) || 0;
            const sessionTime = Date.now() - this.mapStartTime;
            localStorage.setItem(`time_spent_${mapName}`, (timeSpent + sessionTime).toString());
        }
    }

    clampTranslation() {
        const rect = this.canvas.getBoundingClientRect();
        const maxTranslateX = rect.width * 0.5;
        const maxTranslateY = rect.height * 0.5;
        const minTranslateX = -rect.width * this.scale + rect.width * 0.5;
        const minTranslateY = -rect.height * this.scale + rect.height * 0.5;
        
        this.translateX = Math.max(minTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(minTranslateY, Math.min(maxTranslateY, this.translateY));
    }

    async loadFloorLoot(mapName, floorName) {
        const floors = this.floorData.get(mapName);
        if (!floors || !floors[floorName]) return;
        
        const floorData = floors[floorName];
        
        // Clear existing loot containers using new system
        if (this.markerSystem) {
            // Clear only containers, not category markers
            this.markerSystem.containers.clear();
            const containerElements = this.overlay.querySelectorAll('.container-marker');
            containerElements.forEach(element => element.remove());
        } else {
            // Fallback - clear old loot containers
            this.clearLootContainers();
        }
        
        // Load loot containers for this floor using new system
        if (floorData.lootContainers && this.markerSystem) {
            console.log(`Loading ${floorData.lootContainers.length} containers for floor ${floorName}`);
            floorData.lootContainers.forEach(containerData => {
                containerData.floor = floorName;
                console.log('Adding container with new system:', containerData);
                this.markerSystem.createContainerMarker(containerData);
            });
        } else if (floorData.lootContainers) {
            // Fallback to old system
            console.log(`Loading ${floorData.lootContainers.length} loot containers for floor ${floorName} (old system)`);
            floorData.lootContainers.forEach(container => {
                container.floor = floorName;
                console.log('Adding loot container:', container);
                this.addLootContainer(container);
            });
        } else {
            console.log(`No loot containers found for floor ${floorName}`);
        }
    }

    clearLootContainers() {
        // Remove loot container elements from DOM
        const existingContainers = this.overlay.querySelectorAll('.loot-container');
        existingContainers.forEach(container => container.remove());
        
        // Remove loot containers from markers map
        this.markers.forEach((marker, id) => {
            if (marker.type === 'loot-container') {
                this.markers.delete(id);
            }
        });
    }

    updateFloorSelector(mapName) {
        const floorSelector = document.getElementById('floorSelector');
        if (!floorSelector) return;
        
        const floors = this.availableFloors.get(mapName) || ['ground'];
        const floorData = this.floorData.get(mapName) || {};
        
        // Clear existing options
        floorSelector.innerHTML = '';
        
        // Add floor options
        floors.forEach(floorKey => {
            const option = document.createElement('option');
            option.value = floorKey;
            option.textContent = floorData[floorKey]?.name || floorKey.charAt(0).toUpperCase() + floorKey.slice(1);
            if (floorKey === this.currentFloor) {
                option.selected = true;
            }
            floorSelector.appendChild(option);
        });
        
        // Show/hide floor selector based on available floors
        const floorSelectorContainer = document.querySelector('.floor-selector-bottom');
        if (floorSelectorContainer) {
            floorSelectorContainer.style.display = floors.length > 1 ? 'block' : 'none';
        }
        
        // Update marker form floor selector
        this.updateMarkerFormFloorSelector(mapName);
    }

    updateMarkerFormFloorSelector(mapName) {
        const markerFloorSelector = document.getElementById('markerFloor');
        if (!markerFloorSelector) return;
        
        const floors = this.availableFloors.get(mapName) || ['ground'];
        const floorData = this.floorData.get(mapName) || {};
        
        
        // Clear existing options except "Current Floor"
        markerFloorSelector.innerHTML = '<option value="current">Current Floor</option>';
        
        // Add options for each floor
        floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor;
            option.textContent = floorData[floor]?.name || floor.charAt(0).toUpperCase() + floor.slice(1);
            markerFloorSelector.appendChild(option);
        });
        
        // Set to current floor by default
        markerFloorSelector.value = 'current';
    }

    async switchFloor(floorName) {
        if (this.currentFloor === floorName) return;
        
        this.currentFloor = floorName;
        
        // Save current floor to localStorage
        localStorage.setItem(`current_floor_${this.currentMap}`, floorName);
        
        // Load loot for new floor
        await this.loadFloorLoot(this.currentMap, floorName);
        
        // Load floor-specific map image
        await this.loadFloorMapImage(this.currentMap, floorName);
        
        // Load user markers for this floor
        await this.loadUserMarkersForFloor(this.currentMap, floorName);
        
        // Update marker system floor filter and apply filters
        if (this.markerSystem) {
            this.markerSystem.switchFloor(floorName);
        } else {
            // Fallback to old system
            this.updateFilterCounts();
            this.applyFilters();
        }
        
        // Update floor selector
        const floorSelector = document.getElementById('floorSelector');
        if (floorSelector) {
            floorSelector.value = floorName;
        }
        
        this.updateFloorControls();
        this.updateLevelButtons();
        
        const floorDisplayName = this.getFloorDisplayName(floorName);
        this.showNotification(`Switched to ${floorDisplayName}`, 'info');
    }

    getFloorDisplayName(floorKey) {
        const floors = this.floorData.get(this.currentMap) || {};
        return floors[floorKey]?.name || floorKey.charAt(0).toUpperCase() + floorKey.slice(1);
    }
    
    changeFloorLevel(direction) {
        const currentLevel = this.getCurrentFloorLevel();
        const availableLevels = this.availableFloorLevels.get(this.currentMap) || [0];
        const currentIndex = availableLevels.indexOf(currentLevel);
        
        let newIndex = currentIndex + direction;
        
        // Clamp to available levels
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= availableLevels.length) newIndex = availableLevels.length - 1;
        
        const newLevel = availableLevels[newIndex];
        const newFloor = this.getFloorKeyFromLevel(newLevel);
        
        if (newFloor && newFloor !== this.currentFloor) {
            this.switchFloor(newFloor);
        }
        
        this.updateFloorControls();
    }
    
    getCurrentFloorLevel() {
        const floorData = this.floorData.get(this.currentMap) || {};
        const currentFloorData = floorData[this.currentFloor];
        
        if (currentFloorData && currentFloorData.level !== undefined) {
            return currentFloorData.level;
        }
        
        return this.floorLevels[this.currentFloor] || 0;
    }
    
    getFloorKeyFromLevel(level) {
        const floors = this.availableFloors.get(this.currentMap) || [];
        const floorData = this.floorData.get(this.currentMap) || {};
        
        return floors.find(floor => {
            const floorLevelData = floorData[floor];
            return floorLevelData && floorLevelData.level !== undefined 
                ? floorLevelData.level === level
                : this.floorLevels[floor] === level;
        }) || 'ground';
    }
    
    getMarkerFloorLevel(markerFloor) {
        const floorData = this.floorData.get(this.currentMap) || {};
        const floorLevelData = floorData[markerFloor];
        return (floorLevelData && floorLevelData.level !== undefined) 
            ? floorLevelData.level 
            : this.floorLevels[markerFloor] || 0;
    }
    
    updateFloorControls() {
        const currentLevel = this.getCurrentFloorLevel();
        const availableLevels = this.availableFloorLevels.get(this.currentMap) || [0];
        
        // Update level buttons active state
        this.updateLevelButtons();
        
        // Show/hide floor controls based on available levels
        const floorControls = document.querySelector('.floor-controls');
        if (floorControls) {
            floorControls.style.display = availableLevels.length > 1 ? 'block' : 'none';
        }
    }

    generateLevelButtons(mapName) {
        const container = document.getElementById('floorLevels');
        if (!container) return;
        
        // Clear existing buttons
        container.innerHTML = '';
        
        const availableLevels = this.availableFloorLevels.get(mapName) || [0];
        const floors = this.availableFloors.get(mapName) || ['ground'];
        const floorData = this.floorData.get(mapName) || {};
        
        // Create a button for each level (sorted from highest to lowest)
        availableLevels.forEach(level => {
            const button = document.createElement('button');
            button.className = 'level-btn';
            button.textContent = level;
            button.dataset.level = level;
            button.title = `Level ${level}`;
            
            // Find the floor key for this level
            const floorKey = floors.find(floor => {
                const floorLevelData = floorData[floor];
                return floorLevelData && floorLevelData.level !== undefined 
                    ? floorLevelData.level === level
                    : this.floorLevels[floor] === level;
            });
            
            if (floorKey) {
                button.dataset.floor = floorKey;
                
                // Add tooltip with floor name
                const floorName = floorData[floorKey]?.name || floorKey;
                button.title = `${floorName} (Level ${level})`;
                
                // Set active state
                if (floorKey === this.currentFloor) {
                    button.classList.add('active');
                }
                
                // Add click handler
                button.addEventListener('click', () => {
                    this.switchFloor(floorKey);
                });
                
                container.appendChild(button);
            }
        });
        
        // Show/hide floor controls
        const floorControls = document.querySelector('.floor-controls');
        if (floorControls) {
            floorControls.style.display = availableLevels.length > 1 ? 'block' : 'none';
        }
    }
    
    updateLevelButtons() {
        const buttons = document.querySelectorAll('.level-btn');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.floor === this.currentFloor);
        });
    }

    getFloorZIndex(level) {
        // Calculate z-index based on floor level
        // Higher floors get higher z-index values
        return this.baseFloorZIndex + (level * this.floorZIndexIncrement);
    }

    applyFilters() {
        const activeFilters = new Set();
        
        // Get active filters
        document.querySelectorAll('.filter-item input[type="checkbox"]:checked').forEach(checkbox => {
            activeFilters.add(checkbox.id);
        });
        
        // Get current floor level
        const currentFloorLevel = this.getCurrentFloorLevel();
        
        // Filter all markers
        document.querySelectorAll('.map-marker, map-marker').forEach(marker => {
            const type = marker.dataset?.type || marker.getAttribute('data-type');
            const subType = marker.dataset?.subType || marker.getAttribute('data-sub-type');
            const markerFloor = marker.dataset?.floor || marker.getAttribute('data-floor') || 'ground';
            const markerFloorLevel = this.getMarkerFloorLevel(markerFloor);
            
            // Check if marker matches any filter
            let shouldShowByType = false;
            
            // Check main category filters (spawn-points, loot-areas, etc.)
            if (activeFilters.has(type)) {
                shouldShowByType = true;
            }
            
            // Check container type filters for loot-container markers
            if (type === 'loot-container' && subType) {
                if (activeFilters.has(subType)) {
                    shouldShowByType = true;
                }
            }
            
            // If no filters are active, show all
            if (activeFilters.size === 0) {
                shouldShowByType = true;
            }
            
            // Floor filter: only show markers for current floor
            const shouldShowByFloor = markerFloorLevel === currentFloorLevel;
            
            // Show marker if both conditions are met
            const shouldShow = shouldShowByType && shouldShowByFloor;
            
            if (marker.style) {
                marker.style.display = shouldShow ? 'block' : 'none';
            } else if (marker.setAttribute) {
                // For web components
                marker.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    clearFilters() {
        // Uncheck all filter checkboxes
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Show all markers by default
        document.querySelectorAll('.map-marker').forEach(marker => {
            marker.style.display = 'block';
        });
        
        this.updateFilterCounts();
    }

    selectAllFilters() {
        // Check all filter checkboxes
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.applyFilters();
    }

    selectAllContainerFilters() {
        // Check all container type filter checkboxes
        document.querySelectorAll('.container-types input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.applyFilters();
    }

    clearAllContainerFilters() {
        // Uncheck all container type filter checkboxes
        document.querySelectorAll('.container-types input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.applyFilters();
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            // Show all markers if search is empty
            this.applyFilters();
            return;
        }
        
        // Hide all markers first
        document.querySelectorAll('.map-marker').forEach(marker => {
            // Markers made visible - removed display: none
            // marker.style.display = 'none';
        });
        
        // Show markers that match the search term
        this.markers.forEach((marker, id) => {
            const matchesSearch = 
                marker.title.toLowerCase().includes(searchTerm) ||
                marker.description.toLowerCase().includes(searchTerm) ||
                marker.type.toLowerCase().includes(searchTerm);
                
            if (matchesSearch) {
                const markerElement = document.querySelector(`[data-marker-id="${id}"]`);
                if (markerElement) {
                    markerElement.style.display = 'block';
                }
            }
        });
    }

    // Panel toggle functions
    togglePanel(side) {
        const panel = document.getElementById(side === 'left' ? 'leftPanel' : 'rightPanel');
        panel.classList.toggle('active');
    }

    async loadMarkerIcons() {
        try {
            const response = await fetch('../maps/marker-icons.json');
            if (response.ok) {
                this.markerIcons = await response.json();
                console.log('Marker icons loaded successfully');
            }
        } catch (error) {
            console.warn('Could not load marker icons:', error);
            this.markerIcons = null;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.interactiveMap = new ProfessionalInteractiveMap();
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause animations when page is hidden
            if (window.interactiveMap) {
                window.interactiveMap.lastRenderTime = 0;
            }
        }
    });

    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        });
    }
