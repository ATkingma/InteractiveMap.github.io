/**
 * Floor Control for Arena Breakout Interactive Map
 * Displays floor switching buttons and current grid position in bottom left
 */

class FloorControl {
    constructor(map, mapDataManager = null) {
        this.map = map;
        this.mapDataManager = mapDataManager;
        this.currentFloor = 0; // Use numeric floor values
        this.currentDifficulty = 'normal';
        this.mapDimensions = { width: 4078, height: 2158 };
        this.gridSize = 100; // Grid cell size in pixels
        this.gridOverlay = null;
        this.showGrid = false;
        this.gridLabels = [];
        this.availableFloors = []; // Will be populated from JSON data
        this.floorData = {}; // Will be populated from JSON data
        
        this.currentPosition = { x: 0, y: 0 };
        this.currentImageOverlay = null;
        
        this.init();
    }

    init() {
        this.setDefaultFloors(); // Initialize with default floors
        this.createFloorControlInstance();
        this.createGridDisplay();
        this.createGridOverlay();
        this.setupMouseTracking();
        this.setInitialView();
    }

    /**
     * Update floors based on map data
     */
    updateFloorsFromMapData() {
        if (!this.mapDataManager || !this.mapDataManager.mapData) {
            this.setDefaultFloors();
            return;
        }

        const difficulty = this.mapDataManager.mapData.getDifficulty(this.currentDifficulty);
        if (!difficulty) {
            this.setDefaultFloors();
            return;
        }

        // Extract floor data from JSON
        this.availableFloors = [];
        this.floorData = {};

        difficulty.levels.forEach(level => {
            this.availableFloors.push(level.floor);
            this.floorData[level.floor] = {
                name: level.name,
                mapImage: `../public/images/maps/${level.mapImage}`,
                description: `Floor ${level.floor}: ${level.name}`,
                floor: level.floor
            };
        });

        // Sort floors numerically
        this.availableFloors.sort((a, b) => b - a); // Descending order (highest floors first)

        this.updateFloorControlButtons();
    }

    /**
     * Set default floors when no map data is available
     */
    setDefaultFloors() {
        this.availableFloors = [0, -1, -2];
        this.floorData = {
            0: {
                name: 'Ground Floor',
                mapImage: '../public/images/maps/map.png',
                description: 'Main level with primary locations',
                floor: 0
            },
            '-1': {
                name: 'Basement 1',
                mapImage: '../public/images/maps/armory-ground.png',
                description: 'Underground storage areas',
                floor: -1
            },
            '-2': {
                name: 'Basement 2', 
                mapImage: '../public/images/maps/armory-basement2.png',
                description: 'Deep underground facilities',
                floor: -2
            }
        };
        this.updateFloorControlButtons();
    }

    /**
     * Set current difficulty and update floors
     */
    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.updateFloorsFromMapData();
    }

    createFloorControl() {
        // Create floor control container
        const floorControl = L.control({ position: 'bottomleft' });
        
        floorControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'floor-control-container');
            this.floorControlDiv = div; // Store reference for updates
            
            this.updateFloorControlContent(div);

            // Prevent map interaction when clicking on control
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };

        floorControl.addTo(this.map);
        this.floorControlInstance = floorControl;
    }

    /**
     * Update floor control buttons based on current data
     */
    updateFloorControlButtons() {
        if (this.floorControlDiv) {
            this.updateFloorControlContent(this.floorControlDiv);
        }
    }

    /**
     * Update the content of the floor control div
     */
    updateFloorControlContent(div) {
        const floorButtons = this.availableFloors.map(floor => {
            const floorData = this.floorData[floor];
            if (!floorData) return '';
            
            return `
                <button class="floor-btn ${floor === this.currentFloor ? 'active' : ''}" 
                        data-floor="${floor}" 
                        title="${floorData.description}">
                    <i class="fas fa-layer-group"></i>
                    ${floorData.name}
                </button>
            `;
        }).join('');

        div.innerHTML = `
            <div class="floor-control">
                <div class="floor-title">
                    <i class="fas fa-building"></i>
                    <span>Floor Selection</span>
                </div>
                <div class="floor-buttons">
                    ${floorButtons}
                </div>
                <div class="grid-controls">
                    <div class="grid-title">
                        <i class="fas fa-th"></i>
                        <span>Grid System</span>
                    </div>
                    <div class="grid-options">
                        <button class="grid-toggle-btn" title="Toggle grid overlay">
                            <i class="fas fa-th"></i> ${this.showGrid ? 'Hide Grid' : 'Show Grid'}
                        </button>
                        <select class="grid-size-select" title="Grid size">
                            <option value="50" ${this.gridSize === 50 ? 'selected' : ''}>50px Grid</option>
                            <option value="100" ${this.gridSize === 100 ? 'selected' : ''}>100px Grid</option>
                            <option value="200" ${this.gridSize === 200 ? 'selected' : ''}>200px Grid</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        // Add click events to floor buttons
        div.querySelectorAll('.floor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const floorId = parseInt(e.currentTarget.getAttribute('data-floor'));
                this.switchFloor(floorId);
            });
        });

        // Add grid control events
        const gridToggleBtn = div.querySelector('.grid-toggle-btn');
        const gridSizeSelect = div.querySelector('.grid-size-select');

        if (gridToggleBtn) {
            gridToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleGrid();
            });
        }

        if (gridSizeSelect) {
            gridSizeSelect.addEventListener('change', (e) => {
                const newSize = parseInt(e.target.value);
                this.setGridSize(newSize);
            });
        }
    }

    createFloorControlInstance() {
        // Create floor control container
        const floorControl = L.control({ position: 'bottomleft' });
        
        floorControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'floor-control-container');
            this.floorControlDiv = div; // Store reference for updates
            
            this.updateFloorControlContent(div);

            // Prevent map interaction when clicking on control
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };

        floorControl.addTo(this.map);
        this.floorControlInstance = floorControl;
    }

    createGridDisplay() {
        // Create grid position display
        const gridControl = L.control({ position: 'bottomleft' });
        
        gridControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'grid-display-container');
            div.innerHTML = `
                <div class="grid-display">
                    <div class="grid-title">
                        <i class="fas fa-crosshairs"></i>
                        <span>Position</span>
                    </div>
                    <div class="grid-coordinates">
                        <div class="coord-display">
                            <span class="coord-label">X:</span>
                            <span class="coord-value" id="grid-x">0</span>
                        </div>
                        <div class="coord-display">
                            <span class="coord-label">Y:</span>
                            <span class="coord-value" id="grid-y">0</span>
                        </div>
                        <div class="coord-display">
                            <span class="coord-label">Grid:</span>
                            <span class="coord-value" id="grid-cell">A1</span>
                        </div>
                    </div>
                    <div class="grid-info">
                        <small>${this.mapDimensions.width}x${this.mapDimensions.height} • ${this.gridSize}px grid</small>
                    </div>
                </div>
            `;

            // Prevent map interaction when clicking on control
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };

        gridControl.addTo(this.map);
    }

    setupMouseTracking() {
        this.map.on('mousemove', (e) => {
            const coords = this.convertLatLngToXY(e.latlng);
            this.updateGridDisplay(coords.x, coords.y);
        });
    }

    convertLatLngToXY(latlng) {
        // Convert Leaflet LatLng to game coordinates based on 4078x2158 map
        // The image bounds should be exactly [0,240] to [2158,4078] (height,width) with 240 offset
        const bounds = [[0, 240], [2158, 4078]];
        
        // Map bounds are in Leaflet coordinate system: [south,west] to [north,east]
        // For our coordinate system: [0,240] to [2158,4078]
        const south = bounds[0][0];    // 0
        const west = bounds[0][1];     // 240  
        const north = bounds[1][0];    // 2158
        const east = bounds[1][1];     // 4078
        
        // Calculate relative position within bounds (0-1)
        const relX = (latlng.lng - west) / (east - west);
        const relY = (north - latlng.lat) / (north - south);
        
        // Convert to actual pixel coordinates (accounting for 240 offset)
        const x = Math.round(Math.max(240, Math.min(this.mapDimensions.width, 240 + relX * (this.mapDimensions.width - 240))));
        const y = Math.round(Math.max(0, Math.min(this.mapDimensions.height, relY * this.mapDimensions.height)));
        
        return { x, y };
    }

    convertXYToLatLng(coords) {
        // Convert game coordinates to Leaflet LatLng based on 4078x2158 map
        // The image bounds should be exactly [0,240] to [2158,4078] (height,width) with 240 offset
        const bounds = [[0, 240], [2158, 4078]];
        
        const south = bounds[0][0];    // 0
        const west = bounds[0][1];     // 240  
        const north = bounds[1][0];    // 2158
        const east = bounds[1][1];     // 4078
        
        // Calculate relative position (0-1) accounting for 240 offset
        const relX = (coords.x - 240) / (this.mapDimensions.width - 240);
        const relY = coords.y / this.mapDimensions.height;
        
        // Convert to LatLng coordinates
        const lng = west + relX * (east - west);
        const lat = north - relY * (north - south);
        
        return L.latLng(lat, lng);
    }

    updateGridDisplay(x, y) {
        this.currentPosition = { x, y };
        
        const xElement = document.getElementById('grid-x');
        const yElement = document.getElementById('grid-y');
        const gridElement = document.getElementById('grid-cell');
        
        if (xElement) xElement.textContent = x;
        if (yElement) yElement.textContent = y;
        
        // Update grid cell display
        if (gridElement) {
            const gridCell = this.convertXYToGrid({ x, y });
            gridElement.textContent = gridCell;
        }
    }

    switchFloor(floorId) {
        // Ensure floorId is a number
        floorId = typeof floorId === 'string' ? parseInt(floorId) : floorId;
        
        if (floorId === this.currentFloor) return;
        
        const floorData = this.floorData[floorId];
        if (!floorData) {
            console.warn(`Floor data not found for floor: ${floorId}`);
            return;
        }

        console.log(`Switching to floor: ${floorId} (${floorData.name})`);
        
        // Update current floor
        this.currentFloor = floorId;
        
        // Update active button
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.getAttribute('data-floor')) === floorId) {
                btn.classList.add('active');
            }
        });

        // Switch map image overlay
        this.updateMapImage(floorData.mapImage);
        
        // Trigger floor change event for other systems
        this.map.fire('floorchange', { 
            floor: floorId, 
            floorData: floorData 
        });
        
        // Update marker system if available
        if (window.markerSystem) {
            window.markerSystem.setFloor(floorId);
        }
        
        // Update enhanced features if available
        if (window.enhancedFeatures) {
            window.enhancedFeatures.switchFloor(floorId);
        }
    }

    /**
     * Set current floor (external API)
     */
    setFloor(floorId) {
        this.switchFloor(floorId);
    }

    updateMapImage(imagePath) {
        // Remove existing overlay if any
        if (this.currentImageOverlay) {
            this.map.removeLayer(this.currentImageOverlay);
        }

        // Calculate bounds for the map based on 4078x2158 dimensions with 240 offset
        const bounds = [
            [0, 240],
            [this.mapDimensions.height, this.mapDimensions.width] // Use actual coordinates with offset
        ];

        // Add new image overlay
        this.currentImageOverlay = L.imageOverlay(imagePath, bounds, {
            attribution: 'Arena Breakout Map',
            opacity: 1.0
        }).addTo(this.map);

        console.log(`Map image updated to: ${imagePath} with bounds:`, bounds);
    }

    setInitialView() {
        // Set initial view to show full map (zoomed out) based on 4078x2158 with 240 offset
        const bounds = [
            [0, 240],
            [this.mapDimensions.height, this.mapDimensions.width] // 2158x4078 with offset
        ];
        
        // Fit to bounds with padding and allow more zoom out
        this.map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: -1 // Allow starting more zoomed out
        });
        
        // Load initial floor
        this.updateMapImage(this.floorData[this.currentFloor].mapImage);
        
        console.log('Map initialized with full zoom out view using 4078x2158 coordinate system');
    }

    getCurrentFloor() {
        return this.currentFloor;
    }

    getCurrentPosition() {
        return this.currentPosition;
    }

    getFloorData(floorId) {
        return this.floorData[floorId] || this.floorData[this.currentFloor];
    }

    // Grid System Methods
    createGridOverlay() {
        // Create grid overlay group
        this.gridOverlay = L.layerGroup();
        this.createGridLines();
        this.createGridLabels();
    }

    createGridLines() {
        if (!this.gridOverlay) return;

        // Clear existing grid lines
        this.gridOverlay.clearLayers();

        const cols = Math.ceil(this.mapDimensions.width / this.gridSize);
        const rows = Math.ceil(this.mapDimensions.height / this.gridSize);

        // Create vertical lines
        for (let i = 0; i <= cols; i++) {
            const x = i * this.gridSize;
            const line = L.polyline([
                [0, x],
                [this.mapDimensions.height, x]
            ], {
                color: '#ff8c00',
                weight: 1,
                opacity: 0.3,
                className: 'grid-line'
            });
            this.gridOverlay.addLayer(line);
        }

        // Create horizontal lines
        for (let i = 0; i <= rows; i++) {
            const y = i * this.gridSize;
            const line = L.polyline([
                [y, 0],
                [y, this.mapDimensions.width]
            ], {
                color: '#ff8c00',
                weight: 1,
                opacity: 0.3,
                className: 'grid-line'
            });
            this.gridOverlay.addLayer(line);
        }
    }

    createGridLabels() {
        if (!this.gridOverlay) return;

        const cols = Math.ceil(this.mapDimensions.width / this.gridSize);
        const rows = Math.ceil(this.mapDimensions.height / this.gridSize);

        // Create grid labels (A1, A2, B1, B2, etc.)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const letter = String.fromCharCode(65 + row); // A, B, C, etc.
                const number = col + 1;
                const gridId = `${letter}${number}`;
                
                const x = col * this.gridSize + this.gridSize / 2;
                const y = row * this.gridSize + this.gridSize / 2;
                
                const marker = L.marker([y, x], {
                    icon: L.divIcon({
                        className: 'grid-label',
                        html: `<span class="grid-text">${gridId}</span>`,
                        iconSize: [40, 20],
                        iconAnchor: [20, 10]
                    })
                });
                
                this.gridOverlay.addLayer(marker);
            }
        }
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        if (this.showGrid) {
            this.map.addLayer(this.gridOverlay);
        } else {
            this.map.removeLayer(this.gridOverlay);
        }
        
        // Update grid toggle button
        const gridBtn = document.querySelector('.grid-toggle-btn');
        if (gridBtn) {
            gridBtn.classList.toggle('active', this.showGrid);
            gridBtn.innerHTML = this.showGrid ? 
                '<i class="fas fa-th"></i> Hide Grid' : 
                '<i class="fas fa-th"></i> Show Grid';
        }
    }

    setGridSize(size) {
        this.gridSize = size;
        this.createGridLines();
        this.createGridLabels();
        if (this.showGrid) {
            this.map.removeLayer(this.gridOverlay);
            this.map.addLayer(this.gridOverlay);
        }
    }

    convertXYToGrid(coords) {
        const col = Math.floor(coords.x / this.gridSize);
        const row = Math.floor(coords.y / this.gridSize);
        const letter = String.fromCharCode(65 + row);
        const number = col + 1;
        return `${letter}${number}`;
    }

    convertGridToXY(gridId) {
        if (!gridId || gridId.length < 2) return { x: 0, y: 0 };
        
        const letter = gridId.charAt(0).toUpperCase();
        const number = parseInt(gridId.slice(1));
        
        if (isNaN(number)) return { x: 0, y: 0 };
        
        const row = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
        const col = number - 1; // 1=0, 2=1, etc.
        
        return {
            x: col * this.gridSize + this.gridSize / 2,
            y: row * this.gridSize + this.gridSize / 2
        };
    }

    getCurrentGrid() {
        return this.convertXYToGrid(this.currentPosition);
    }
}

// Make it globally available
window.FloorControl = FloorControl;
