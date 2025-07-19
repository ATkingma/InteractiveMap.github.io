/**
 * Modern Marker System for Interactive Map
 * Handles both category markers (spawn-points, loot-areas, etc.) and container types separately
 */

class MarkerSystem {
    constructor(mapInstance) {
        this.map = mapInstance;
        this.markers = new Map(); // All markers
        this.containers = new Map(); // Container type markers
        this.categories = new Set(['spawn-points', 'loot-areas', 'extraction-points', 'sniper-spots', 'danger-zones']);
        this.containerTypes = new Set(); // Will be populated from JSON
        this.markerIcons = null;
        this.currentFilter = {
            categories: new Set(),
            containers: new Set(),
            rarity: new Set(),
            floor: 'all'
        };
    }

    /**
     * Initialize the marker system
     */
    async init() {
        console.log('Initializing Marker System...');
        await this.loadMarkerIcons();
        this.setupFilters();
        this.initializeEventListeners();
        
        // Sync floor filter with map's current floor
        this.syncFloorFilter();
    }

    /**
     * Sync the marker system's floor filter with the map's current floor
     */
    syncFloorFilter() {
        if (this.map && this.map.currentFloor) {
            console.log(`Syncing floor filter to: ${this.map.currentFloor}`);
            this.currentFilter.floor = this.map.currentFloor;
        }
    }

    /**
     * Load marker icons configuration
     */
    async loadMarkerIcons() {
        try {
            const response = await fetch('../maps/marker-icons.json');
            if (response.ok) {
                this.markerIcons = await response.json();
                console.log('Marker icons loaded successfully:', this.markerIcons);
                
                // Extract container types from icon config
                if (this.markerIcons.markerIcons['loot-container']) {
                    Object.keys(this.markerIcons.markerIcons['loot-container']).forEach(type => {
                        this.containerTypes.add(type);
                    });
                }
                console.log('Container types discovered:', Array.from(this.containerTypes));
            }
        } catch (error) {
            console.warn('Could not load marker icons:', error);
            this.markerIcons = null;
        }
    }

    /**
     * Create a category marker (spawn-points, loot-areas, etc.)
     */
    createCategoryMarker(data) {
        const marker = {
            id: data.id || `marker_${Date.now()}`,
            type: 'category',
            category: data.type || data.category, // spawn-points, loot-areas, etc.
            title: data.title || data.name,
            description: data.description,
            x: data.x,
            y: data.y,
            floor: data.floor || this.map.currentFloor,
            lootQuality: data.lootQuality || null,
            isUserMarker: data.isUserMarker || false
        };

        this.markers.set(marker.id, marker);
        const element = this.createMarkerElement(marker);
        return { marker, element };
    }

    /**
     * Create a container type marker (weapon-crate, armor-box, etc.)
     */
    createContainerMarker(data) {
        const container = {
            id: data.id || `container_${Date.now()}`,
            type: 'container',
            containerType: data.type || data.containerType, // weapon-crate, armor-box, etc.
            title: data.name || data.title,
            description: data.description || `Contents: ${(data.contents || []).join(', ')}`,
            x: data.x,
            y: data.y,
            floor: data.floor || this.map.currentFloor,
            rarity: data.rarity || 'common',
            respawnTime: data.respawnTime || 600,
            contents: data.contents || []
        };

        this.containers.set(container.id, container);
        const element = this.createContainerElement(container);
        return { container, element };
    }

    /**
     * Create visual marker element for categories
     */
    createMarkerElement(marker) {
        // Check if map dimensions are available
        if (!this.map.mapDimensions) {
            console.error('Map dimensions not available when creating marker');
            console.log('Available map object:', this.map);
            return null;
        }
        
        console.log('Creating marker with dimensions:', this.map.mapDimensions);
        console.log('Marker data:', marker);
        
        // Create a simple div element instead of custom web component
        const markerElement = document.createElement('div');
        
        // Calculate position as percentage
        const xPercent = (marker.x / this.map.mapDimensions.width) * 100;
        const yPercent = (marker.y / this.map.mapDimensions.height) * 100;
        
        console.log(`Positioning marker at ${xPercent}%, ${yPercent}% (from ${marker.x}, ${marker.y})`);
        
        // Get marker configuration from icons
        const markerConfig = this.getMarkerConfig(marker.category || marker.type);
        
        // Set basic positioning
        markerElement.style.position = 'absolute';
        markerElement.style.left = `${xPercent}%`;
        markerElement.style.top = `${yPercent}%`;
        markerElement.style.width = `${markerConfig.size}px`;
        markerElement.style.height = `${markerConfig.size}px`;
        
        // Add CSS classes for styling
        markerElement.className = `map-marker category-marker ${marker.category || marker.type} ${marker.lootQuality || ''}`.trim();
        
        // Set floor visibility
        const markerFloor = marker.floor || 'ground';
        markerElement.dataset.floor = markerFloor;
        
        // Set initial visibility based on current floor
        this.updateMarkerFloorVisibility(markerElement, markerFloor);
        
        // Set marker icon or color
        if (markerConfig.icon && markerConfig.icon !== 'test.png') {
            // Use actual icon file
            markerElement.style.backgroundImage = `url(../public/images/icons/${markerConfig.icon})`;
            markerElement.style.backgroundSize = 'contain';
            markerElement.style.backgroundRepeat = 'no-repeat';
            markerElement.style.backgroundPosition = 'center';
            markerElement.style.backgroundColor = 'transparent';
            markerElement.style.border = '2px solid rgba(255, 255, 255, 0.8)';
            markerElement.style.borderRadius = '4px';
        } else {
            // Use color-based marker with category-specific styling
            markerElement.style.backgroundColor = markerConfig.color;
            markerElement.style.border = `2px solid ${this.lightenColor(markerConfig.color, 20)}`;
            markerElement.style.borderRadius = '50%';
            
            // Add category icon or letter
            const categoryLetter = this.getCategoryLetter(marker.category || marker.type);
            markerElement.textContent = categoryLetter;
            markerElement.style.fontSize = '12px';
            markerElement.style.fontWeight = 'bold';
            markerElement.style.color = '#ffffff';
        }
        
        // Set data attributes
        markerElement.dataset.markerId = marker.id;
        markerElement.dataset.type = marker.type;
        markerElement.dataset.category = marker.category || marker.type;
        markerElement.dataset.x = marker.x;
        markerElement.dataset.y = marker.y;
        
        // Enhanced tooltip with more information
        const tooltipText = `${marker.name || marker.title || 'Marker'}${marker.description ? '\n' + marker.description : ''}${marker.floor ? '\nFloor: ' + marker.floor : ''}`;
        markerElement.title = tooltipText;
        
        // Add click handler
        markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Marker clicked:', marker);
            this.showMarkerDetails(marker);
        });
        
        // Add hover effects
        markerElement.addEventListener('mouseenter', (e) => {
            console.log('Marker hover:', marker.name || marker.title);
        });
        
        this.map.overlay.appendChild(markerElement);
        console.log(`Created category marker: ${marker.category || marker.type} - ${marker.name || marker.title} at ${xPercent}%, ${yPercent}%`);
        console.log('Marker element:', markerElement);
        console.log('Overlay children count:', this.map.overlay.children.length);
        
        return markerElement;
    }

    /**
     * Get category color
     */
    getCategoryColor(category) {
        const colors = {
            'spawn-points': '#00ff00',
            'extraction-points': '#ff8c00',
            'loot-areas': '#0080ff',
            'sniper-spots': '#9c27b0',
            'danger-zones': '#ff0000',
            'loot-area': '#ff8c00',
            'weapon-crate': '#ff0000', 
            'armor-box': '#0080ff',
            'ammo-box': '#ffff00',
            'supply-box': '#8000ff',
            'medkit': '#ff1493',
            'default': '#ff8c00'
        };
        return colors[category] || colors.default;
    }

    /**
     * Create visual container element for container types
     */
    createContainerElement(container) {
        // Create a simple div element instead of custom web component
        const containerElement = document.createElement('div');
        
        // Check if map dimensions are available
        if (!this.map.mapDimensions) {
            console.error('Map dimensions not available when creating container');
            return null;
        }
        
        // Calculate position as percentage
        const xPercent = (container.x / this.map.mapDimensions.width) * 100;
        const yPercent = (container.y / this.map.mapDimensions.height) * 100;
        
        // Get container configuration from icons
        const containerConfig = this.getContainerConfig(container.type || container.containerType, container.rarity);
        
        // Set basic positioning
        containerElement.style.position = 'absolute';
        containerElement.style.left = `${xPercent}%`;
        containerElement.style.top = `${yPercent}%`;
        containerElement.style.width = `${containerConfig.size}px`;
        containerElement.style.height = `${containerConfig.size}px`;
        
        // Add CSS classes for styling
        containerElement.className = `loot-container-marker ${container.type || container.containerType} ${container.rarity}`.trim();
        
        // Set floor visibility
        const containerFloor = container.floor || 'ground';
        containerElement.dataset.floor = containerFloor;
        
        // Set initial visibility based on current floor
        this.updateMarkerFloorVisibility(containerElement, containerFloor);
        
        // Set container icon or color
        if (containerConfig.icon && containerConfig.icon !== 'test.png') {
            // Use actual icon file
            containerElement.style.backgroundImage = `url(../public/images/icons/${containerConfig.icon})`;
            containerElement.style.backgroundSize = 'contain';
            containerElement.style.backgroundRepeat = 'no-repeat';
            containerElement.style.backgroundPosition = 'center';
            containerElement.style.backgroundColor = 'transparent';
            containerElement.style.border = '2px solid rgba(255, 255, 255, 0.8)';
        } else {
            // Use color-based container with rarity styling
            containerElement.style.backgroundColor = containerConfig.color;
            containerElement.style.border = `2px solid ${this.lightenColor(containerConfig.color, 20)}`;
            containerElement.style.borderRadius = '4px';
            
            // Add container type letter or symbol
            const containerLetter = this.getContainerLetter(container.type || container.containerType);
            containerElement.textContent = containerLetter;
            containerElement.style.fontSize = '10px';
            containerElement.style.fontWeight = 'bold';
            containerElement.style.color = '#ffffff';
        }
        
        // Set data attributes
        containerElement.dataset.markerId = container.id;
        containerElement.dataset.type = container.type;
        containerElement.dataset.containerType = container.containerType || container.type;
        containerElement.dataset.rarity = container.rarity;
        containerElement.dataset.x = container.x;
        containerElement.dataset.y = container.y;
        
        // Enhanced tooltip with more information
        const contentsList = Array.isArray(container.contents) ? container.contents.join(', ') : (container.contents || 'Various items');
        const respawnMinutes = container.respawnTime ? Math.floor(container.respawnTime / 60) : 'Unknown';
        const tooltipText = `${container.name}\nType: ${(container.type || container.containerType).replace('-', ' ')}\nRarity: ${container.rarity}\nContents: ${contentsList}\nRespawn: ${respawnMinutes} min${container.floor ? '\nFloor: ' + container.floor : ''}`;
        containerElement.title = tooltipText;
        
        // Add click handler
        containerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Container clicked:', container);
            this.showContainerDetails(container);
        });
        
        // Add hover effects
        containerElement.addEventListener('mouseenter', (e) => {
            console.log('Container hover:', container.name);
        });
        
        this.map.overlay.appendChild(containerElement);
        console.log(`Created container marker: ${container.type || container.containerType} - ${container.name} at ${xPercent}%, ${yPercent}%`);
        
        return containerElement;
    }

    /**
     * Get color based on rarity
     */
    getRarityColor(rarity) {
        const rarityColors = this.markerIcons?.rarityColors || {
            common: '#9E9E9E',
            uncommon: '#4CAF50',
            rare: '#2196F3',
            epic: '#9C27B0',
            legendary: '#FF9800'
        };
        return rarityColors[rarity] || rarityColors.common;
    }

    /**
     * Clear all markers from the map
     */
    clearAll() {
        this.map.overlay.innerHTML = '';
        this.markers.clear();
        this.containers.clear();
        console.log('All markers and containers cleared');
    }

    /**
     * Apply filters to show/hide markers
     */
    applyFilters() {
        console.log('Applying filters:', this.currentFilter);
        console.log('Total markers:', this.markers.size);
        console.log('Total containers:', this.containers.size);
        
        let visibleMarkers = 0;
        let visibleContainers = 0;
        
        // Show/hide category markers
        this.markers.forEach((marker, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                const shouldShow = this.shouldShowMarker(marker);
                // Always show markers - remove display: none hiding
                element.style.display = 'flex';
                element.style.visibility = 'visible';
                if (shouldShow) {
                    visibleMarkers++;
                    console.log(`Showing marker: ${marker.category} on floor ${marker.floor}`);
                } else {
                    console.log(`Marker would be hidden but showing anyway: ${marker.category} on floor ${marker.floor}`);
                }
            } else {
                console.warn(`No element found for marker ID: ${id}`);
            }
        });
        
        // Show/hide container markers
        this.containers.forEach((container, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                const shouldShow = this.shouldShowContainer(container);
                // Always show containers - remove display: none hiding
                element.style.display = 'flex';
                element.style.visibility = 'visible';
                if (shouldShow) {
                    visibleContainers++;
                    console.log(`Showing container: ${container.containerType} on floor ${container.floor}`);
                } else {
                    console.log(`Container would be hidden but showing anyway: ${container.containerType} on floor ${container.floor}`);
                }
            } else {
                console.warn(`No element found for container ID: ${id}`);
            }
        });
        
        console.log(`Visible after filtering: ${visibleMarkers} markers, ${visibleContainers} containers`);
        this.updateFilterCounts();
    }

    /**
     * Check if marker should be shown based on filters
     */
    shouldShowMarker(marker) {
        // Floor filter
        if (this.currentFilter.floor !== 'all' && marker.floor !== this.currentFilter.floor) {
            return false;
        }
        
        // Category filter
        if (this.currentFilter.categories.size > 0 && !this.currentFilter.categories.has(marker.category)) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if container should be shown based on filters
     */
    shouldShowContainer(container) {
        // Floor filter
        if (this.currentFilter.floor !== 'all' && container.floor !== this.currentFilter.floor) {
            return false;
        }
        
        // Container type filter
        if (this.currentFilter.containers.size > 0 && !this.currentFilter.containers.has(container.containerType)) {
            return false;
        }
        
        // Rarity filter
        if (this.currentFilter.rarity.size > 0 && !this.currentFilter.rarity.has(container.rarity)) {
            return false;
        }
        
        return true;
    }

    /**
     * Update filter counts in the UI
     */
    updateFilterCounts() {
        // Update category counts
        this.categories.forEach(category => {
            const count = Array.from(this.markers.values()).filter(m => 
                m.category === category && 
                (this.currentFilter.floor === 'all' || m.floor === this.currentFilter.floor)
            ).length;
            
            const countElement = document.getElementById(`${category.replace('-', '-')}-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
        
        // Update container type counts
        this.containerTypes.forEach(type => {
            const count = Array.from(this.containers.values()).filter(c => 
                c.containerType === type && 
                (this.currentFilter.floor === 'all' || c.floor === this.currentFilter.floor)
            ).length;
            
            const countElement = document.getElementById(`${type}-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
        
        console.log('Filter counts updated');
    }

    /**
     * Set up filter system
     */
    setupFilters() {
        // Initialize all filters as active
        this.categories.forEach(category => {
            this.currentFilter.categories.add(category);
        });
        
        this.containerTypes.forEach(type => {
            this.currentFilter.containers.add(type);
        });
        
        this.currentFilter.rarity.add('common');
        this.currentFilter.rarity.add('uncommon');
        this.currentFilter.rarity.add('rare');
        this.currentFilter.rarity.add('epic');
        this.currentFilter.rarity.add('legendary');
    }

    /**
     * Initialize event listeners for filters
     */
    initializeEventListeners() {
        // Category filters
        this.categories.forEach(category => {
            const checkbox = document.getElementById(category);
            if (checkbox) {
                checkbox.checked = true; // Default to checked
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.currentFilter.categories.add(category);
                    } else {
                        this.currentFilter.categories.delete(category);
                    }
                    this.applyFilters();
                });
            }
        });
        
        // Container type filters
        this.containerTypes.forEach(type => {
            const checkbox = document.getElementById(type);
            if (checkbox) {
                checkbox.checked = true; // Default to checked
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.currentFilter.containers.add(type);
                    } else {
                        this.currentFilter.containers.delete(type);
                    }
                    this.applyFilters();
                });
            }
        });
        
        // Rarity filters
        ['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(rarity => {
            const checkbox = document.getElementById(`${rarity}-tier`);
            if (checkbox) {
                checkbox.checked = true; // Default to checked
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.currentFilter.rarity.add(rarity);
                    } else {
                        this.currentFilter.rarity.delete(rarity);
                    }
                    this.applyFilters();
                });
            }
        });
    }

    /**
     * Show marker details modal
     */
    showMarkerDetails(marker) {
        const modal = document.getElementById('markerModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalTitle || !modalBody) {
            console.error('Modal elements not found');
            return;
        }
        
        modalTitle.textContent = marker.title;
        modalBody.innerHTML = `
            <div class="marker-details">
                <div class="detail-row">
                    <span class="label">Category:</span>
                    <span class="value">${marker.category.replace('-', ' ').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Description:</span>
                    <span class="value">${marker.description}</span>
                </div>
                ${marker.lootQuality ? `
                <div class="detail-row">
                    <span class="label">Loot Quality:</span>
                    <span class="value">${marker.lootQuality.replace('-', ' ').toUpperCase()}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="label">Floor:</span>
                    <span class="value">${marker.floor}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Coordinates:</span>
                    <span class="value">${Math.round(marker.x)}, ${Math.round(marker.y)}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    /**
     * Show container details modal
     */
    showContainerDetails(container) {
        const modal = document.getElementById('markerModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalTitle || !modalBody) {
            console.error('Modal elements not found');
            return;
        }
        
        modalTitle.textContent = container.title;
        modalBody.innerHTML = `
            <div class="container-details">
                <div class="detail-row">
                    <span class="label">Type:</span>
                    <span class="value">${container.containerType.replace('-', ' ').toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Rarity:</span>
                    <span class="value rarity-${container.rarity}">${container.rarity.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Respawn Time:</span>
                    <span class="value">${Math.floor(container.respawnTime / 60)} minutes</span>
                </div>
                <div class="detail-row">
                    <span class="label">Contents:</span>
                    <span class="value">${container.contents.join(', ')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Floor:</span>
                    <span class="value">${container.floor}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Coordinates:</span>
                    <span class="value">${Math.round(container.x)}, ${Math.round(container.y)}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    /**
     * Update all marker positions after map resize/zoom
     */
    updateAllPositions() {
        // Update category markers
        this.markers.forEach((marker, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                const xPercent = (marker.x / this.map.mapDimensions.width) * 100;
                const yPercent = (marker.y / this.map.mapDimensions.height) * 100;
                element.style.left = `${xPercent}%`;
                element.style.top = `${yPercent}%`;
            }
        });
        
        // Update container markers
        this.containers.forEach((container, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                const xPercent = (container.x / this.map.mapDimensions.width) * 100;
                const yPercent = (container.y / this.map.mapDimensions.height) * 100;
                element.style.left = `${xPercent}%`;
                element.style.top = `${yPercent}%`;
            }
        });
    }

    /**
     * Switch to a different floor
     */
    switchFloor(floorName) {
        console.log(`MarkerSystem: Switching from floor ${this.currentFilter.floor} to ${floorName}`);
        this.currentFilter.floor = floorName;
        
        // Update all markers for the new floor
        this.updateAllMarkersForFloor(floorName);
        
        // Apply other filters
        this.applyFilters();
        console.log(`MarkerSystem: Switched to floor: ${floorName}`);
    }

    /**
     * Get marker configuration from icons data
     */
    getMarkerConfig(type) {
        const defaultConfig = { size: 24, color: '#ff8c00', icon: null };
        
        if (!this.markerIcons || !this.markerIcons.markerIcons) {
            return defaultConfig;
        }
        
        return this.markerIcons.markerIcons[type] || defaultConfig;
    }

    /**
     * Get container configuration from icons data
     */
    getContainerConfig(type, rarity) {
        const defaultConfig = { size: 20, color: '#9e9e9e', icon: null };
        
        if (!this.markerIcons || !this.markerIcons.markerIcons || !this.markerIcons.markerIcons['loot-container']) {
            return defaultConfig;
        }
        
        const containerConfig = this.markerIcons.markerIcons['loot-container'][type];
        if (containerConfig) {
            return containerConfig;
        }
        
        // Fall back to rarity-based color
        const rarityColors = this.markerIcons.rarityColors || {
            'common': '#9e9e9e',
            'uncommon': '#4caf50', 
            'rare': '#2196f3',
            'epic': '#9c27b0',
            'legendary': '#ff9800'
        };
        
        return {
            size: 20,
            color: rarityColors[rarity] || defaultConfig.color,
            icon: null
        };
    }

    /**
     * Lighten a color by a percentage
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Get category letter for text-based markers
     */
    getCategoryLetter(category) {
        const letters = {
            'spawn-points': 'S',
            'extraction-points': 'E',
            'loot-areas': 'L',
            'sniper-spots': 'N',
            'danger-zones': 'D',
            'loot-area': 'L'
        };
        return letters[category] || '?';
    }

    /**
     * Get container letter for text-based containers
     */
    getContainerLetter(containerType) {
        const letters = {
            'weapon-crate': 'W',
            'armor-box': 'A',
            'ammo-box': 'M',
            'timed-safe': 'T',
            'normal-safe': 'S',
            'medical-box': 'H',
            'supply-box': 'B',
            'document-box': 'D',
            'computer': 'C',
            'toolbox': 'T',
            'jacket': 'J',
            'cash-register': '$',
            'airdrop': 'P',
            'grenade-box': 'G',
            'electronics-box': 'E',
            'rare-container': 'R'
        };
        return letters[containerType] || 'C';
    }

    /**
     * Add a marker to the system
     */
    addMarker(markerData) {
        console.log('Adding marker to system:', markerData);
        
        if (markerData.type === 'container' || markerData.containerType) {
            return this.createContainerMarker(markerData);
        } else {
            return this.createCategoryMarker(markerData);
        }
    }

    /**
     * Update marker visibility based on floor
     */
    updateMarkerFloorVisibility(element, markerFloor) {
        const currentFloor = this.map.currentFloor || 'ground';
        
        if (markerFloor === currentFloor) {
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            element.style.pointerEvents = 'auto';
        } else {
            element.style.opacity = '0.3';
            element.style.visibility = 'visible';
            element.style.pointerEvents = 'none';
        }
    }

    /**
     * Update all markers when floor changes
     */
    updateAllMarkersForFloor(newFloor) {
        console.log(`Updating all markers for floor: ${newFloor}`);
        
        // Update category markers
        this.markers.forEach((marker, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                this.updateMarkerFloorVisibility(element, marker.floor || 'ground');
            }
        });
        
        // Update container markers
        this.containers.forEach((container, id) => {
            const element = document.querySelector(`[data-marker-id="${id}"]`);
            if (element) {
                this.updateMarkerFloorVisibility(element, container.floor || 'ground');
            }
        });
    }
}