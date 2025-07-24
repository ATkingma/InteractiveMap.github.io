/**
 * Enhanced Marker System for Interactive Maps
 * Handles rendering, filtering, and user interaction with map markers
 */
class EnhancedMarkerSystem {
    constructor(map, mapDataManager) {
        this.map = map;
        this.mapDataManager = mapDataManager;
        this.markerLayer = L.layerGroup().addTo(map);
        this.activeMarkers = new Map(); // Store active marker references
        this.isPlacingMarker = false;
        this.selectedMarkerTypes = new Set();
        
        // Bind event handlers
        this.map.on('click', this.onMapClick.bind(this));
        this.map.on('zoomend', this.updateMarkerSizes.bind(this));
        
        this.initializeUI();
    }

    /**
     * Initialize the marker system UI
     */
    initializeUI() {
        this.createFilterControls();
        this.createDifficultyControls();
        this.createUserMarkerControls();
    }

    /**
     * Create filter controls for marker types
     */
    createFilterControls() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Create filters section
        const filtersSection = document.createElement('div');
        filtersSection.className = 'filters-section';
        filtersSection.innerHTML = `
            <h3>🎯 Marker Filters</h3>
            <div id="marker-type-filters" class="filter-checkboxes">
                <!-- Will be populated dynamically -->
            </div>
        `;

        // Insert after coordinates section
        const coordinatesSection = sidebar.querySelector('.coordinates-section');
        if (coordinatesSection) {
            coordinatesSection.insertAdjacentElement('afterend', filtersSection);
        } else {
            sidebar.appendChild(filtersSection);
        }
    }

    /**
     * Create difficulty selection controls
     */
    createDifficultyControls() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const difficultySection = document.createElement('div');
        difficultySection.className = 'difficulty-section';
        difficultySection.innerHTML = `
            <h3>⚔️ Difficulty Mode</h3>
            <div id="difficulty-selector" class="difficulty-buttons">
                <!-- Will be populated dynamically -->
            </div>
        `;

        // Insert after filters section
        const filtersSection = sidebar.querySelector('.filters-section');
        if (filtersSection) {
            filtersSection.insertAdjacentElement('afterend', difficultySection);
        } else {
            sidebar.appendChild(difficultySection);
        }
    }

    /**
     * Create user marker controls
     */
    createUserMarkerControls() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const userMarkerSection = document.createElement('div');
        userMarkerSection.className = 'user-markers-section';
        userMarkerSection.innerHTML = `
            <h3>📍 Custom Markers</h3>
            <div class="user-marker-controls">
                <button id="add-marker-btn" class="action-btn">
                    ➕ Add Marker
                </button>
                <div id="marker-creation-form" class="marker-form" style="display: none;">
                    <input type="text" id="marker-name" placeholder="Marker name" maxlength="50">
                    <textarea id="marker-description" placeholder="Description (optional)" maxlength="200"></textarea>
                    <input type="color" id="marker-color" value="#ff8c00">
                    <div class="form-actions">
                        <button id="confirm-marker" class="confirm-btn">✅ Confirm</button>
                        <button id="cancel-marker" class="cancel-btn">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(userMarkerSection);

        // Bind event handlers
        document.getElementById('add-marker-btn').addEventListener('click', () => {
            this.startMarkerPlacement();
        });

        document.getElementById('confirm-marker').addEventListener('click', () => {
            this.confirmMarkerPlacement();
        });

        document.getElementById('cancel-marker').addEventListener('click', () => {
            this.cancelMarkerPlacement();
        });
    }

    /**
     * Update filter controls based on available marker types
     */
    updateFilterControls() {
        const filtersContainer = document.getElementById('marker-type-filters');
        if (!filtersContainer) return;

        const types = this.mapDataManager.getAllTypes();
        filtersContainer.innerHTML = '';

        types.forEach(type => {
            const checkbox = document.createElement('label');
            checkbox.className = 'filter-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" value="${type}" ${this.selectedMarkerTypes.has(type) ? 'checked' : ''}>
                <span class="checkmark"></span>
                ${this.formatTypeName(type)}
            `;

            const input = checkbox.querySelector('input');
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedMarkerTypes.add(type);
                    this.mapDataManager.enabledTypes.add(type);
                } else {
                    this.selectedMarkerTypes.delete(type);
                    this.mapDataManager.enabledTypes.delete(type);
                }
                this.updateMarkers();
            });

            filtersContainer.appendChild(checkbox);
        });

        // Enable all types by default if none selected
        if (this.selectedMarkerTypes.size === 0) {
            types.forEach(type => {
                this.selectedMarkerTypes.add(type);
                this.mapDataManager.enabledTypes.add(type);
            });
            // Update checkboxes
            filtersContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        }
    }

    /**
     * Update difficulty controls
     */
    updateDifficultyControls() {
        const difficultyContainer = document.getElementById('difficulty-selector');
        if (!difficultyContainer || !this.mapDataManager.mapData) return;

        const difficulties = this.mapDataManager.mapData.getAllDifficulties();
        difficultyContainer.innerHTML = '';

        difficulties.forEach(difficulty => {
            const button = document.createElement('button');
            button.className = `difficulty-btn ${this.mapDataManager.currentDifficulty === difficulty ? 'active' : ''}`;
            button.textContent = this.formatDifficultyName(difficulty);
            button.addEventListener('click', () => {
                this.setDifficulty(difficulty);
            });
            difficultyContainer.appendChild(button);
        });
    }

    /**
     * Set current difficulty and update markers
     */
    setDifficulty(difficulty) {
        if (this.mapDataManager.setDifficulty(difficulty)) {
            // Update floor control if available
            if (window.floorControl) {
                window.floorControl.setDifficulty(difficulty);
            }
            
            this.updateDifficultyControls();
            this.updateFilterControls();
            this.updateMarkers();
        }
    }

    /**
     * Load map data and initialize markers
     */
    async loadMapData(mapName) {
        try {
            await this.mapDataManager.loadMapData(mapName);
            this.updateDifficultyControls();
            this.updateFilterControls();
            this.updateMarkers();
            console.log(`Loaded map data for: ${mapName}`);
        } catch (error) {
            console.error('Error loading map data:', error);
        }
    }

    /**
     * Update markers based on current floor and filters
     */
    updateMarkers() {
        // Clear existing markers
        this.clearMarkers();

        // Get visible markers for current state
        const markers = this.mapDataManager.getVisibleMarkers();

        markers.forEach(marker => {
            this.createMarker(marker);
        });
    }

    /**
     * Create a visual marker on the map
     */
    createMarker(markerData) {
        // Convert game coordinates to map coordinates
        const latLng = this.convertGameCoordsToLatLng(markerData.position);

        // Create custom icon
        const iconHtml = this.createMarkerIcon(markerData);
        const customIcon = L.divIcon({
            html: iconHtml,
            className: `custom-marker marker-type-${markerData.type}`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        // Create marker
        const marker = L.marker(latLng, { 
            icon: customIcon,
            draggable: markerData.isUserCreated || false
        });

        // Add popup with marker info
        const popupContent = this.createMarkerPopup(markerData);
        marker.bindPopup(popupContent);

        // Handle drag events for user markers
        if (markerData.isUserCreated) {
            marker.on('dragend', (e) => {
                const newLatLng = e.target.getLatLng();
                const newGameCoords = this.convertLatLngToGameCoords(newLatLng);
                markerData.position.x = newGameCoords.x;
                markerData.position.y = newGameCoords.y;
                this.mapDataManager.saveUserMarkers(this.mapDataManager.mapData.mapName);
            });
        }

        // Add to map and tracking
        marker.addTo(this.markerLayer);
        this.activeMarkers.set(marker._leaflet_id, { marker, data: markerData });
    }

    /**
     * Create marker icon HTML
     */
    createMarkerIcon(markerData) {
        if (markerData.icon) {
            return `
                <div class="marker-icon" style="background-color: ${markerData.color};">
                    <img src="../public/images/icons/${markerData.icon}" alt="${markerData.name}" 
                         onerror="this.parentElement.outerHTML='<div class=\\"marker-circle\\" style=\\"background-color: ${markerData.color}; border-color: ${markerData.fallbackColor};\\"><div class=\\"marker-inner\\"></div></div>'" />
                </div>
            `;
        } else {
            return `
                <div class="marker-circle" style="background-color: ${markerData.color}; border-color: ${markerData.fallbackColor};">
                    <div class="marker-inner"></div>
                </div>
            `;
        }
    }

    /**
     * Create marker popup content
     */
    createMarkerPopup(markerData) {
        const deleteButton = markerData.isUserCreated ? 
            `<button class="delete-marker-btn" onclick="window.markerSystem.deleteUserMarker(${markerData.position.x}, ${markerData.position.y})">🗑️ Delete</button>` : '';

        return `
            <div class="marker-popup">
                <h4>${markerData.name}</h4>
                <p class="marker-type">Type: ${this.formatTypeName(markerData.type)}</p>
                <p class="marker-coords">Position: (${Math.round(markerData.position.x)}, ${Math.round(markerData.position.y)})</p>
                ${markerData.description ? `<p class="marker-description">${markerData.description}</p>` : ''}
                ${deleteButton}
            </div>
        `;
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markerLayer.clearLayers();
        this.activeMarkers.clear();
    }

    /**
     * Update marker sizes based on zoom level
     */
    updateMarkerSizes() {
        const zoom = this.map.getZoom();
        const scale = Math.max(0.5, Math.min(2, zoom / 3));

        this.activeMarkers.forEach(({ marker }) => {
            const icon = marker.getIcon();
            const newSize = [24 * scale, 24 * scale];
            icon.options.iconSize = newSize;
            icon.options.iconAnchor = [newSize[0] / 2, newSize[1] / 2];
            marker.setIcon(icon);
        });
    }

    /**
     * Start user marker placement mode
     */
    startMarkerPlacement() {
        this.isPlacingMarker = true;
        this.map.getContainer().style.cursor = 'crosshair';
        document.getElementById('marker-creation-form').style.display = 'block';
        document.getElementById('add-marker-btn').style.display = 'none';
    }

    /**
     * Handle map click for marker placement
     */
    onMapClick(e) {
        if (!this.isPlacingMarker) return;

        this.pendingMarkerPosition = this.convertLatLngToGameCoords(e.latlng);
        
        // Show temporary marker
        this.tempMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                html: '<div class="temp-marker">📍</div>',
                className: 'temp-marker-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
    }

    /**
     * Confirm marker placement
     */
    confirmMarkerPlacement() {
        if (!this.pendingMarkerPosition) return;

        const name = document.getElementById('marker-name').value.trim();
        const description = document.getElementById('marker-description').value.trim();
        const color = document.getElementById('marker-color').value;

        if (!name) {
            alert('Please enter a marker name');
            return;
        }

        const newMarker = {
            name: name,
            type: 'user-marker',
            icon: 'test.png',
            color: color,
            fallbackColor: this.adjustColor(color, -0.3),
            description: description,
            position: new Vector2(this.pendingMarkerPosition.x, this.pendingMarkerPosition.y),
            isUserCreated: true
        };

        this.mapDataManager.addUserMarker(newMarker);
        this.cancelMarkerPlacement();
        this.updateMarkers();
    }

    /**
     * Cancel marker placement
     */
    cancelMarkerPlacement() {
        this.isPlacingMarker = false;
        this.map.getContainer().style.cursor = '';
        document.getElementById('marker-creation-form').style.display = 'none';
        document.getElementById('add-marker-btn').style.display = 'block';
        
        // Clear form
        document.getElementById('marker-name').value = '';
        document.getElementById('marker-description').value = '';
        document.getElementById('marker-color').value = '#ff8c00';

        // Remove temporary marker
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }

        this.pendingMarkerPosition = null;
    }

    /**
     * Delete user marker
     */
    deleteUserMarker(x, y) {
        const userMarkers = this.mapDataManager.getUserMarkers(
            this.mapDataManager.mapData.mapName,
            this.mapDataManager.currentDifficulty,
            this.mapDataManager.currentFloor
        );

        const index = userMarkers.findIndex(marker => 
            Math.abs(marker.position.x - x) < 5 && Math.abs(marker.position.y - y) < 5
        );

        if (index >= 0) {
            this.mapDataManager.removeUserMarker(index);
            this.updateMarkers();
        }
    }

    /**
     * Convert game coordinates to Leaflet LatLng
     */
    convertGameCoordsToLatLng(position) {
        // Assuming map bounds are [0,0] to [2158, 4078]
        const lat = (2158 - position.y); // Flip Y coordinate
        const lng = position.x;
        return [lat, lng];
    }

    /**
     * Convert Leaflet LatLng to game coordinates
     */
    convertLatLngToGameCoords(latlng) {
        return {
            x: Math.round(latlng.lng),
            y: Math.round(2158 - latlng.lat) // Flip Y coordinate back
        };
    }

    /**
     * Format type name for display
     */
    formatTypeName(type) {
        return type.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Format difficulty name for display
     */
    formatDifficultyName(difficulty) {
        const names = {
            'normal': '🟢 Normal',
            'lockdown': '🟡 Lockdown',
            'forbidden': '🔴 Forbidden'
        };
        return names[difficulty] || difficulty;
    }

    /**
     * Adjust color brightness
     */
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(amount * 255)));
        const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + Math.round(amount * 255)));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + Math.round(amount * 255)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    /**
     * Set current floor and update markers
     */
    setFloor(floor) {
        this.mapDataManager.setFloor(floor);
        this.updateMarkers();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.EnhancedMarkerSystem = EnhancedMarkerSystem;
}
