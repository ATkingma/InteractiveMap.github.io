/**
 * Enhanced Map Features
 * Adds coordinate display, grid system, and floor switching
 */

class EnhancedMapFeatures {
    constructor(map, sidebar) {
        this.map = map;
        this.sidebar = sidebar;
        this.currentFloor = 'ground';
        this.mapDimensions = { width: 4078, height: 2158 }; // Arena Breakout map dimensions
        
        this.init();
    }

    init() {
        this.setupCoordinateDisplay();
        this.setupFloorSwitching();
        this.setupControls();
    }

    // Coordinate Display & Tracking
    setupCoordinateDisplay() {
        const currentXSpan = document.getElementById('current-x');
        const currentYSpan = document.getElementById('current-y');
        
        if (currentXSpan && currentYSpan) {
            this.map.on('mousemove', (e) => {
                const coords = this.convertLatLngToXY(e.latlng);
                currentXSpan.textContent = Math.round(coords.x);
                currentYSpan.textContent = Math.round(coords.y);
            });
        }

        // Go to coordinates functionality
        const gotoButton = document.getElementById('goto-button');
        if (gotoButton) {
            gotoButton.addEventListener('click', () => {
                const x = parseFloat(document.getElementById('goto-x').value);
                const y = parseFloat(document.getElementById('goto-y').value);
                
                if (!isNaN(x) && !isNaN(y)) {
                    const latlng = this.convertXYToLatLng({x, y});
                    this.map.setView(latlng, this.map.getZoom());
                }
            });
        }

        // Copy coordinates
        const copyButton = document.getElementById('copy-coords');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const x = document.getElementById('current-x').textContent;
                const y = document.getElementById('current-y').textContent;
                navigator.clipboard.writeText(`X: ${x}, Y: ${y}`);
                
                // Visual feedback
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Current Position';
                }, 2000);
            });
        }
    }

    // Floor Switching
    setupFloorSwitching() {
        const floorSelect = document.getElementById('floor-select');
        if (floorSelect) {
            floorSelect.addEventListener('change', (e) => {
                this.switchFloor(e.target.value);
            });
        }
    }

    switchFloor(floorId) {
        this.currentFloor = floorId;
        console.log('Switching to floor:', floorId);
        
        // Update floor info in sidebar if the floors panel exists
        const floorInfo = document.getElementById('current-floor-info');
        if (floorInfo && window.floorControl) {
            const floorData = window.floorControl.getFloorData(floorId);
            floorInfo.innerHTML = `
                <strong>${floorData.name}</strong>
                <p>${floorData.description}</p>
            `;
        }
        
        // Update floor select in sidebar if it exists
        const floorSelect = document.getElementById('floor-select');
        if (floorSelect) {
            floorSelect.value = floorId;
        }
        
        // Also trigger floor control if available
        if (window.floorControl && window.floorControl.switchFloor) {
            window.floorControl.switchFloor(floorId);
        }
    }

    // Setup Controls
    setupControls() {
        // Reset map button
        const resetButton = document.getElementById('reset-map');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetMap();
            });
        }
    }

    resetMap() {
        // Reset to default view
        this.map.setView([1079, 2039], 0);
        
        // Reset to ground floor
        this.switchFloor('ground');
        
        console.log('Map reset to default view');
    }

    // Coordinate conversion utilities
    convertLatLngToXY(latlng) {
        // Use FloorControl conversion if available, otherwise fallback
        if (window.floorControl && window.floorControl.convertLatLngToXY) {
            return window.floorControl.convertLatLngToXY(latlng);
        }
        
        // Fallback conversion based on map bounds
        const bounds = [[0, 0], [2158, 4078]];
        const south = bounds[0][0];
        const west = bounds[0][1];
        const north = bounds[1][0];
        const east = bounds[1][1];
        
        const relX = (latlng.lng - west) / (east - west);
        const relY = (north - latlng.lat) / (north - south);
        
        const x = Math.round(Math.max(0, Math.min(this.mapDimensions.width, relX * this.mapDimensions.width)));
        const y = Math.round(Math.max(0, Math.min(this.mapDimensions.height, relY * this.mapDimensions.height)));
        
        return { x, y };
    }

    convertXYToLatLng(coords) {
        // Use FloorControl conversion if available, otherwise fallback
        if (window.floorControl && window.floorControl.convertXYToLatLng) {
            return window.floorControl.convertXYToLatLng(coords);
        }
        
        // Fallback conversion
        const bounds = [[0, 0], [2158, 4078]];
        const south = bounds[0][0];
        const west = bounds[0][1];
        const north = bounds[1][0];
        const east = bounds[1][1];
        
        const relX = coords.x / this.mapDimensions.width;
        const relY = coords.y / this.mapDimensions.height;
        
        const lng = west + relX * (east - west);
        const lat = north - relY * (north - south);
        
        return L.latLng(lat, lng);
    }
}

// Make it globally available
window.EnhancedMapFeatures = EnhancedMapFeatures;
