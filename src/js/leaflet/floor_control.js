/**
 * Floor Control for Arena Breakout Interactive Map
 * Displays floor switching buttons and current grid position in bottom left
 */

class FloorControl {
    constructor(map) {
        this.map = map;
        this.currentFloor = 'ground';
        this.mapDimensions = { width: 4078, height: 2158 };
        this.gridSize = 100; // Grid cell size in pixels
        this.gridOverlay = null;
        this.showGrid = false;
        this.gridLabels = [];
        this.floorData = {
            'ground': {
                name: 'Ground Floor',
                mapImage: '../public/images/maps/map.png',
                description: 'Main level with primary locations'
            },
            'basement1': {
                name: 'Basement 1',
                mapImage: '../public/images/maps/armory-ground.png', // Placeholder
                description: 'Underground storage areas'
            },
            'basement2': {
                name: 'Basement 2', 
                mapImage: '../public/images/maps/armory-basement2.png',
                description: 'Deep underground facilities'
            }
        };
        
        this.currentPosition = { x: 0, y: 0 };
        this.currentImageOverlay = null;
        
        this.init();
    }

    init() {
        this.createFloorControl();
        this.createGridDisplay();
        this.createGridOverlay();
        this.setupMouseTracking();
        this.setInitialView();
    }

    createFloorControl() {
        // Create floor control container
        const floorControl = L.control({ position: 'bottomleft' });
        
        floorControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'floor-control-container');
            div.innerHTML = `
                <div class="floor-control">
                    <div class="floor-title">
                        <i class="fas fa-building"></i>
                        <span>Floor Selection</span>
                    </div>
                    <div class="floor-buttons">
                        ${Object.entries(this.floorData).map(([key, floor]) => `
                            <button class="floor-btn ${key === this.currentFloor ? 'active' : ''}" 
                                    data-floor="${key}" 
                                    title="${floor.description}">
                                <i class="fas fa-layer-group"></i>
                                ${floor.name}
                            </button>
                        `).join('')}
                    </div>
                    <div class="grid-controls">
                        <div class="grid-title">
                            <i class="fas fa-th"></i>
                            <span>Grid System</span>
                        </div>
                        <div class="grid-options">
                            <button class="grid-toggle-btn" title="Toggle grid overlay">
                                <i class="fas fa-th"></i> Show Grid
                            </button>
                            <select class="grid-size-select" title="Grid size">
                                <option value="50">50px Grid</option>
                                <option value="100" selected>100px Grid</option>
                                <option value="200">200px Grid</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            // Prevent map interaction when clicking on control
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            // Add click events to floor buttons
            div.querySelectorAll('.floor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const floorId = e.currentTarget.getAttribute('data-floor');
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

            return div;
        };

        floorControl.addTo(this.map);
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
        // The image bounds should be exactly [0,0] to [2158,4078] (height,width)
        const bounds = [[0, 0], [2158, 4078]];
        
        // Map bounds are in Leaflet coordinate system: [south,west] to [north,east]
        // For our coordinate system: [0,0] to [2158,4078]
        const south = bounds[0][0];    // 0
        const west = bounds[0][1];     // 0  
        const north = bounds[1][0];    // 2158
        const east = bounds[1][1];     // 4078
        
        // Calculate relative position within bounds (0-1)
        const relX = (latlng.lng - west) / (east - west);
        const relY = (north - latlng.lat) / (north - south);
        
        // Convert to actual pixel coordinates
        const x = Math.round(Math.max(0, Math.min(this.mapDimensions.width, relX * this.mapDimensions.width)));
        const y = Math.round(Math.max(0, Math.min(this.mapDimensions.height, relY * this.mapDimensions.height)));
        
        return { x, y };
    }

    convertXYToLatLng(coords) {
        // Convert game coordinates to Leaflet LatLng based on 4078x2158 map
        // The image bounds should be exactly [0,0] to [2158,4078] (height,width)
        const bounds = [[0, 0], [2158, 4078]];
        
        const south = bounds[0][0];    // 0
        const west = bounds[0][1];     // 0  
        const north = bounds[1][0];    // 2158
        const east = bounds[1][1];     // 4078
        
        // Calculate relative position (0-1)
        const relX = coords.x / this.mapDimensions.width;
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
        if (floorId === this.currentFloor) return;
        
        const floorData = this.floorData[floorId];
        if (!floorData) return;

        console.log(`Switching to floor: ${floorId}`);
        
        // Update current floor
        this.currentFloor = floorId;
        
        // Update active button
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-floor') === floorId) {
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
        
        // Update enhanced features if available
        if (window.enhancedFeatures) {
            window.enhancedFeatures.switchFloor(floorId);
        }
    }

    updateMapImage(imagePath) {
        // Remove existing overlay if any
        if (this.currentImageOverlay) {
            this.map.removeLayer(this.currentImageOverlay);
        }

        // Calculate bounds for the map based on 4078x2158 dimensions
        const bounds = [
            [0, 0],
            [this.mapDimensions.height, this.mapDimensions.width] // Use actual coordinates
        ];

        // Add new image overlay
        this.currentImageOverlay = L.imageOverlay(imagePath, bounds, {
            attribution: 'Arena Breakout Map',
            opacity: 1.0
        }).addTo(this.map);

        console.log(`Map image updated to: ${imagePath} with bounds:`, bounds);
    }

    setInitialView() {
        // Set initial view to show full map (zoomed out) based on 4078x2158
        const bounds = [
            [0, 0],
            [this.mapDimensions.height, this.mapDimensions.width] // 2158x4078
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
