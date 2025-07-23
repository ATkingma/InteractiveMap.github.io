/**
 * Enhanced Map Features
 * Adds custom marker creation, coordinate display, filtering, and floor switching
 */

class EnhancedMapFeatures {
    constructor(map, sidebar) {
        this.map = map;
        this.sidebar = sidebar;
        this.customMarkers = [];
        this.currentFloor = 'ground';
        this.currentFilters = {
            lootType: [],
            rarity: [],
            location: []
        };
        this.isCreatingMarker = false;
        this.tempMarker = null;
        this.allMarkerData = [];
        this.mapDimensions = { width: 4078, height: 2158 }; // Arena Breakout map dimensions
        
        this.init();
    }

    init() {
        this.setupCoordinateDisplay();
        this.setupMarkerCreation();
        this.setupFiltering();
        this.setupFloorSwitching();
        this.setupControls();
        this.loadCustomMarkers();
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
                    
                    // Add temporary marker to show position
                    if (this.tempMarker) {
                        this.map.removeLayer(this.tempMarker);
                    }
                    
                    this.tempMarker = L.marker(latlng, {
                        icon: L.divIcon({
                            html: '<i class="fas fa-crosshairs" style="color: #ff0000; font-size: 20px;"></i>',
                            className: 'custom-div-icon',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                    
                    setTimeout(() => {
                        if (this.tempMarker) {
                            this.map.removeLayer(this.tempMarker);
                            this.tempMarker = null;
                        }
                    }, 3000);
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

    // Custom Marker Creation
    setupMarkerCreation() {
        const markerForm = document.getElementById('marker-form');
        const cancelButton = document.getElementById('cancel-create');
        
        if (markerForm) {
            markerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.enableMarkerCreation();
            });
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.disableMarkerCreation();
            });
        }

        // Map click handler for marker creation
        this.map.on('click', (e) => {
            if (this.isCreatingMarker) {
                this.createMarkerAtPosition(e.latlng);
            }
        });
    }

    enableMarkerCreation() {
        this.isCreatingMarker = true;
        this.map.getContainer().style.cursor = 'crosshair';
        
        // Update instructions
        const instructions = document.querySelector('.create-instructions p');
        if (instructions) {
            instructions.innerHTML = '<i class="fas fa-crosshairs"></i> Click on the map to place your marker';
            instructions.style.color = '#00ff88';
        }
    }

    disableMarkerCreation() {
        this.isCreatingMarker = false;
        this.map.getContainer().style.cursor = '';
        
        // Reset form
        document.getElementById('marker-form').reset();
        
        // Update instructions
        const instructions = document.querySelector('.create-instructions p');
        if (instructions) {
            instructions.innerHTML = '<i class="fas fa-info-circle"></i> Click on the map to place a new marker';
            instructions.style.color = '';
        }
    }

    createMarkerAtPosition(latlng) {
        const form = document.getElementById('marker-form');
        const formData = new FormData(form);
        
        const markerData = {
            id: `custom-${Date.now()}`,
            name: formData.get('marker-name') || document.getElementById('marker-name').value,
            description: formData.get('marker-description') || document.getElementById('marker-description').value,
            loot_type: document.getElementById('marker-type').value,
            rarity: document.getElementById('marker-rarity').value,
            icon: document.getElementById('marker-icon').value,
            coordinates: this.convertLatLngToXY(latlng),
            floor: this.currentFloor,
            custom: true
        };

        if (!markerData.name) {
            alert('Please enter a marker name');
            return;
        }

        // Create marker
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                html: `<i class="${markerData.icon}" style="color: ${this.getRarityColor(markerData.rarity)}; font-size: 16px;"></i>`,
                className: 'custom-div-icon',
                iconSize: [20, 20]
            })
        }).addTo(this.map);

        // Add popup
        marker.bindPopup(`
            <div class="marker-popup">
                <h3>${markerData.name}</h3>
                <p>${markerData.description}</p>
                <div class="marker-details">
                    <span class="marker-type">${markerData.loot_type}</span>
                    <span class="marker-rarity ${markerData.rarity}">${markerData.rarity}</span>
                </div>
                <div class="marker-coords">
                    <small>X: ${markerData.coordinates.x}, Y: ${markerData.coordinates.y}</small>
                </div>
                <button onclick="window.enhancedFeatures.deleteCustomMarker('${markerData.id}')" class="delete-marker-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `);

        // Store marker data
        markerData.leafletMarker = marker;
        this.customMarkers.push(markerData);
        
        // Update custom markers list
        this.updateCustomMarkersList();
        
        // Save to localStorage
        this.saveCustomMarkers();
        
        // Disable creation mode
        this.disableMarkerCreation();
    }

    deleteCustomMarker(markerId) {
        const markerIndex = this.customMarkers.findIndex(m => m.id === markerId);
        if (markerIndex !== -1) {
            const marker = this.customMarkers[markerIndex];
            if (marker.leafletMarker) {
                this.map.removeLayer(marker.leafletMarker);
            }
            this.customMarkers.splice(markerIndex, 1);
            this.updateCustomMarkersList();
            this.saveCustomMarkers();
        }
    }

    updateCustomMarkersList() {
        const container = document.getElementById('custom-markers-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.customMarkers.forEach(marker => {
            const item = document.createElement('div');
            item.className = 'custom-marker-item';
            item.innerHTML = `
                <div class="custom-marker-info">
                    <strong>${marker.name}</strong>
                    <small>${marker.loot_type} - ${marker.rarity}</small>
                </div>
                <div class="custom-marker-actions">
                    <button onclick="window.enhancedFeatures.jumpToMarker('${marker.id}')" class="control-btn" title="Go to marker">
                        <i class="fas fa-location-arrow"></i>
                    </button>
                    <button onclick="window.enhancedFeatures.deleteCustomMarker('${marker.id}')" class="control-btn danger" title="Delete marker">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    jumpToMarker(markerId) {
        const marker = this.customMarkers.find(m => m.id === markerId);
        if (marker && marker.leafletMarker) {
            this.map.setView(marker.leafletMarker.getLatLng(), Math.max(this.map.getZoom(), 3));
            marker.leafletMarker.openPopup();
        }
    }

    // Filtering System
    setupFiltering() {
        this.generateFilterOptions();
        
        const applyButton = document.getElementById('apply-filters');
        const clearButton = document.getElementById('clear-filters');
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    generateFilterOptions() {
        // Collect all available filter options from marker data
        const lootTypes = new Set();
        const rarities = new Set();
        const locations = new Set();
        
        // Process all marker files (you would need to modify this based on your actual marker data structure)
        this.allMarkerData.forEach(marker => {
            if (marker.properties) {
                if (marker.properties.loot_type) lootTypes.add(marker.properties.loot_type);
                if (marker.properties.rarity) rarities.add(marker.properties.rarity);
                if (marker.properties.location) locations.add(marker.properties.location);
            }
        });
        
        // Add custom marker data
        this.customMarkers.forEach(marker => {
            lootTypes.add(marker.loot_type);
            rarities.add(marker.rarity);
        });
        
        // Generate filter checkboxes
        this.createFilterCheckboxes('loot-type-filters', Array.from(lootTypes), 'lootType');
        this.createFilterCheckboxes('rarity-filters', Array.from(rarities), 'rarity');
        this.createFilterCheckboxes('location-filters', Array.from(locations), 'location');
    }

    createFilterCheckboxes(containerId, options, filterType) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        options.forEach(option => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '8px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${filterType}-${option}`;
            checkbox.value = option;
            checkbox.addEventListener('change', () => {
                this.updateFilter(filterType, option, checkbox.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = option.charAt(0).toUpperCase() + option.slice(1);
            label.style.marginLeft = '8px';
            label.style.color = '#ffffff';
            label.style.cursor = 'pointer';
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            container.appendChild(wrapper);
        });
    }

    updateFilter(filterType, value, isChecked) {
        if (isChecked) {
            if (!this.currentFilters[filterType].includes(value)) {
                this.currentFilters[filterType].push(value);
            }
        } else {
            const index = this.currentFilters[filterType].indexOf(value);
            if (index > -1) {
                this.currentFilters[filterType].splice(index, 1);
            }
        }
    }

    applyFilters() {
        // Apply all active filters including floor
        console.log('Applying filters:', this.currentFilters, 'Current floor:', this.currentFloor);
        
        // Filter all interactive layers
        if (window.interactive_map) {
            window.interactive_map.getLayers().forEach((layer) => {
                layer.getAllLayers().forEach((featureArray, featureId) => {
                    featureArray.forEach(feature => {
                        const props = feature.feature.properties;
                        let shouldShow = true;
                        
                        // Floor filter
                        if (props.floor && props.floor !== this.currentFloor) {
                            shouldShow = false;
                        }
                        
                        // Type filters
                        if (this.currentFilters.lootType.length > 0) {
                            if (!this.currentFilters.lootType.includes(props.loot_type)) {
                                shouldShow = false;
                            }
                        }
                        
                        // Rarity filters
                        if (this.currentFilters.rarity.length > 0) {
                            if (!this.currentFilters.rarity.includes(props.rarity)) {
                                shouldShow = false;
                            }
                        }
                        
                        // Show/hide marker
                        if (shouldShow) {
                            if (!layer.hasLayer(feature)) {
                                layer.addLayer(feature);
                            }
                        } else {
                            if (layer.hasLayer(feature)) {
                                layer.removeLayer(feature);
                            }
                        }
                    });
                });
            });
        }
        
        // Also filter custom markers
        this.customMarkers.forEach(marker => {
            let shouldShow = true;
            
            // Floor filter
            if (marker.floor && marker.floor !== this.currentFloor) {
                shouldShow = false;
            }
            
            // Type and rarity filters
            if (this.currentFilters.lootType.length > 0 && !this.currentFilters.lootType.includes(marker.loot_type)) {
                shouldShow = false;
            }
            
            if (this.currentFilters.rarity.length > 0 && !this.currentFilters.rarity.includes(marker.rarity)) {
                shouldShow = false;
            }
            
            // Show/hide custom marker
            if (marker.leafletMarker) {
                if (shouldShow) {
                    if (!this.map.hasLayer(marker.leafletMarker)) {
                        this.map.addLayer(marker.leafletMarker);
                    }
                } else {
                    if (this.map.hasLayer(marker.leafletMarker)) {
                        this.map.removeLayer(marker.leafletMarker);
                    }
                }
            }
        });
    }

    clearFilters() {
        this.currentFilters = {
            lootType: [],
            rarity: [],
            location: []
        };
        
        // Uncheck all checkboxes
        document.querySelectorAll('#filters input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Show all markers
        this.applyFilters();
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
        
        // Apply filters to show only markers for current floor
        this.applyFilters();
        
        // Also trigger floor control if available
        if (window.floorControl && window.floorControl.switchFloor) {
            window.floorControl.switchFloor(floorId);
        }
    }

    getFloorData(floorId) {
        const floors = {
            'ground': { name: 'Ground Floor', description: 'Main level with primary locations' },
            'basement1': { name: 'Basement Level 1', description: 'Underground storage areas' },
            'basement2': { name: 'Basement Level 2', description: 'Deep underground facilities' },
            'floor1': { name: 'Floor 1', description: 'Second level offices and rooms' },
            'floor2': { name: 'Floor 2', description: 'Upper level facilities' }
        };
        return floors[floorId] || floors['ground'];
    }

    filterMarkersByFloor(floorId) {
        // Filter custom markers by floor
        this.customMarkers.forEach(marker => {
            if (marker.leafletMarker) {
                if (marker.floor === floorId) {
                    if (!this.map.hasLayer(marker.leafletMarker)) {
                        this.map.addLayer(marker.leafletMarker);
                    }
                } else {
                    if (this.map.hasLayer(marker.leafletMarker)) {
                        this.map.removeLayer(marker.leafletMarker);
                    }
                }
            }
        });
    }

    // Utility functions
    setupControls() {
        // Toggle all markers
        const toggleAllButton = document.getElementById('toggle-all-markers');
        if (toggleAllButton) {
            toggleAllButton.addEventListener('click', () => {
                // Implementation depends on your marker layer structure
                console.log('Toggle all markers');
            });
        }
        
        // Clear custom markers
        const clearCustomButton = document.getElementById('clear-custom-markers');
        if (clearCustomButton) {
            clearCustomButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete all custom markers?')) {
                    this.clearAllCustomMarkers();
                }
            });
        }
        
        // Export JSON
        const exportButton = document.getElementById('export-json');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportMarkersAsJSON();
            });
        }
        
        // Reset view
        const resetViewButton = document.getElementById('reset-view');
        if (resetViewButton) {
            resetViewButton.addEventListener('click', () => {
                this.map.setView([0, 0], 1); // Reset to default view
            });
        }
    }

    clearAllCustomMarkers() {
        this.customMarkers.forEach(marker => {
            if (marker.leafletMarker) {
                this.map.removeLayer(marker.leafletMarker);
            }
        });
        this.customMarkers = [];
        this.updateCustomMarkersList();
        this.saveCustomMarkers();
    }

    exportMarkersAsJSON() {
        const exportData = {
            custom_markers: this.customMarkers.map(marker => ({
                id: marker.id,
                name: marker.name,
                description: marker.description,
                loot_type: marker.loot_type,
                rarity: marker.rarity,
                coordinates: marker.coordinates,
                floor: marker.floor
            })),
            exported_at: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom_markers_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Coordinate conversion utilities
    convertLatLngToXY(latlng) {
        // Use FloorControl conversion if available, otherwise fallback
        if (window.floorControl && window.floorControl.convertLatLngToXY) {
            return window.floorControl.convertLatLngToXY(latlng);
        }
        
        // Fallback conversion based on map bounds
        const bounds = this.map.getBounds();
        const mapSize = this.map.getSize();
        
        if (!bounds || !mapSize.x || !mapSize.y) {
            return { x: 0, y: 0 };
        }
        
        // Calculate relative position (0-1)
        const relX = (latlng.lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest());
        const relY = (bounds.getNorth() - latlng.lat) / (bounds.getNorth() - bounds.getSouth());
        
        // Convert to game coordinates
        const x = Math.round(relX * this.mapDimensions.width);
        const y = Math.round(relY * this.mapDimensions.height);
        
        return { 
            x: Math.max(0, Math.min(this.mapDimensions.width, x)), 
            y: Math.max(0, Math.min(this.mapDimensions.height, y))
        };
    }

    convertXYToLatLng(coords) {
        // Use FloorControl conversion if available, otherwise fallback
        if (window.floorControl && window.floorControl.convertXYToLatLng) {
            return window.floorControl.convertXYToLatLng(coords);
        }
        
        // Fallback conversion based on map bounds
        const bounds = this.map.getBounds();
        
        if (!bounds) {
            return L.latLng(0, 0);
        }
        
        const relX = coords.x / this.mapDimensions.width;
        const relY = coords.y / this.mapDimensions.height;
        
        const lng = bounds.getWest() + relX * (bounds.getEast() - bounds.getWest());
        const lat = bounds.getNorth() - relY * (bounds.getNorth() - bounds.getSouth());
        
        return L.latLng(lat, lng);
    }

    getRarityColor(rarity) {
        const colors = {
            'common': '#ffffff',
            'rare': '#0088ff',
            'epic': '#8800ff',
            'legendary': '#ff8c00'  // Orange theme
        };
        return colors[rarity] || '#ffffff';
    }

    // Storage functions
    saveCustomMarkers() {
        const markersData = this.customMarkers.map(marker => ({
            id: marker.id,
            name: marker.name,
            description: marker.description,
            loot_type: marker.loot_type,
            rarity: marker.rarity,
            icon: marker.icon,
            coordinates: marker.coordinates,
            floor: marker.floor
        }));
        localStorage.setItem('arena_breakout_custom_markers', JSON.stringify(markersData));
    }

    loadCustomMarkers() {
        const savedMarkers = localStorage.getItem('arena_breakout_custom_markers');
        if (savedMarkers) {
            try {
                const markersData = JSON.parse(savedMarkers);
                markersData.forEach(markerData => {
                    const latlng = this.convertXYToLatLng(markerData.coordinates);
                    
                    const marker = L.marker(latlng, {
                        icon: L.divIcon({
                            html: `<i class="${markerData.icon}" style="color: ${this.getRarityColor(markerData.rarity)}; font-size: 16px;"></i>`,
                            className: 'custom-div-icon',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);

                    marker.bindPopup(`
                        <div class="marker-popup">
                            <h3>${markerData.name}</h3>
                            <p>${markerData.description}</p>
                            <div class="marker-details">
                                <span class="marker-type">${markerData.loot_type}</span>
                                <span class="marker-rarity ${markerData.rarity}">${markerData.rarity}</span>
                            </div>
                            <div class="marker-coords">
                                <small>X: ${markerData.coordinates.x}, Y: ${markerData.coordinates.y}</small>
                            </div>
                            <button onclick="window.enhancedFeatures.deleteCustomMarker('${markerData.id}')" class="delete-marker-btn">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `);

                    markerData.leafletMarker = marker;
                    this.customMarkers.push(markerData);
                });
                
                this.updateCustomMarkersList();
            } catch (e) {
                console.error('Error loading custom markers:', e);
            }
        }
    }
}

// Make it globally available
window.EnhancedMapFeatures = EnhancedMapFeatures;
