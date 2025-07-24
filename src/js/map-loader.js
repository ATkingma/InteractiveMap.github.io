/**
 * Dynamic Map Loader for Main Page
 * Loads available maps from JSON files and generates map cards
 */
class MapLoader {
    constructor() {
        this.availableMaps = [];
        this.mapConfigs = new Map();
        
        // Default map configurations for display
        this.defaultConfigs = {
            'armory': {
                displayName: 'Armory',
                difficulty: 'hard',
                description: 'Industrial weapons facility with dense CQB areas',
                features: ['Hot Zone', 'High Loot', 'Multi-Level'],
                image: 'armory-ground.png'
            },
            'arena-breakout': {
                displayName: 'Arena Breakout',
                difficulty: 'medium',
                description: 'Main battle arena with tactical combat zones',
                features: ['Combat Zone', 'Tactical', 'Balanced'],
                image: 'map.png'
            }
        };
    }

    /**
     * Initialize the map loader
     */
    async init() {
        await this.loadAvailableMaps();
        this.generateMapCards();
        this.bindMapCardEvents();
    }

    /**
     * Load all available maps from the maps folder
     */
    async loadAvailableMaps() {
        // List of potential map files to check
        const potentialMaps = [
            'armory',
            'arena-breakout',
            'valley',
            'northridge',
            'tvstation',
            'farm',
            'warehouse',
            'factory'
        ];

        for (const mapName of potentialMaps) {
            try {
                const response = await fetch(`../maps/${mapName}.json`);
                if (response.ok) {
                    const mapData = await response.json();
                    
                    // Validate that the JSON follows our expected structure
                    if (this.validateMapStructure(mapData)) {
                        this.availableMaps.push(mapName);
                        
                        // Extract configuration from JSON
                        const config = this.extractMapConfig(mapData);
                        this.mapConfigs.set(mapName, config);
                        
                        console.log(`Loaded map: ${mapName}`);
                    } else {
                        console.log(`Map ${mapName} has invalid structure, skipping...`);
                    }
                }
            } catch (error) {
                console.log(`Map ${mapName} not available:`, error.message);
            }
        }

        console.log(`Found ${this.availableMaps.length} available maps:`, this.availableMaps);
    }

    /**
     * Validate that the map JSON follows the expected structure
     */
    validateMapStructure(mapData) {
        // Check required top-level properties
        if (!mapData.mapName || !mapData.difficulties) {
            return false;
        }

        // Check that difficulties object has at least one valid difficulty
        const difficulties = Object.keys(mapData.difficulties);
        if (difficulties.length === 0) {
            return false;
        }

        // Check that each difficulty has the required structure
        for (const difficultyName of difficulties) {
            const difficulty = mapData.difficulties[difficultyName];
            
            if (!difficulty.name || !difficulty.levels || !Array.isArray(difficulty.levels)) {
                return false;
            }

            // Check that each level has the required structure
            for (const level of difficulty.levels) {
                if (typeof level.floor !== 'number' || !level.name || !Array.isArray(level.markers)) {
                    return false;
                }

                // Check that each marker has the required structure
                for (const marker of level.markers) {
                    if (!marker.name || !marker.type || !marker.position || 
                        typeof marker.position.x !== 'number' || 
                        typeof marker.position.y !== 'number') {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Extract display configuration from map JSON data
     */
    extractMapConfig(mapData) {
        const config = this.defaultConfigs[mapData.mapName] || {};
        
        // Count total markers across all difficulties and levels
        let totalMarkers = 0;
        let allTypes = new Set();
        let hasMultipleLevels = false;
        let availableDifficulties = [];

        Object.keys(mapData.difficulties).forEach(difficultyName => {
            availableDifficulties.push(difficultyName);
            const difficulty = mapData.difficulties[difficultyName];
            
            if (difficulty.levels.length > 1) {
                hasMultipleLevels = true;
            }
            
            difficulty.levels.forEach(level => {
                totalMarkers += level.markers.length;
                level.markers.forEach(marker => {
                    allTypes.add(marker.type);
                });
            });
        });

        // Generate features based on map data
        const features = this.generateFeatures(allTypes, hasMultipleLevels, availableDifficulties);

        // Determine difficulty level
        const difficulty = this.determineDifficulty(availableDifficulties, totalMarkers);

        // Get primary map image
        const primaryLevel = mapData.difficulties.normal?.levels[0] || 
                           Object.values(mapData.difficulties)[0]?.levels[0];
        const mapImage = primaryLevel?.mapImage || 'map.png';

        return {
            displayName: config.displayName || this.formatMapName(mapData.mapName),
            difficulty: difficulty,
            description: config.description || `Interactive map for ${mapData.mapName}`,
            features: features,
            image: mapImage,
            totalMarkers: totalMarkers,
            difficulties: availableDifficulties,
            levels: Object.values(mapData.difficulties)[0]?.levels.length || 1
        };
    }

    /**
     * Generate feature tags based on map data
     */
    generateFeatures(types, hasMultipleLevels, difficulties) {
        const features = [];
        
        // Add features based on marker types
        if (types.has('loot') || types.has('weapons')) features.push('High Loot');
        if (types.has('spawn')) features.push('Spawn Points');
        if (types.has('extraction')) features.push('Extraction');
        if (types.has('vehicle')) features.push('Vehicles');
        if (types.has('medical')) features.push('Medical');
        if (types.has('objective')) features.push('Objectives');
        
        // Add structural features
        if (hasMultipleLevels) features.push('Multi-Level');
        
        // Add difficulty features
        if (difficulties.includes('forbidden')) features.push('Extreme Mode');
        else if (difficulties.includes('lockdown')) features.push('Lockdown Mode');
        
        // Ensure we have at least 3 features
        while (features.length < 3) {
            const defaultFeatures = ['Combat Zone', 'Tactical', 'Strategic', 'Balanced', 'Updated'];
            for (const feature of defaultFeatures) {
                if (!features.includes(feature)) {
                    features.push(feature);
                    break;
                }
            }
        }

        return features.slice(0, 3); // Limit to 3 features
    }

    /**
     * Determine difficulty level based on available modes and markers
     */
    determineDifficulty(difficulties, totalMarkers) {
        if (difficulties.includes('forbidden')) return 'extreme';
        if (difficulties.includes('lockdown') || totalMarkers > 40) return 'hard';
        if (totalMarkers > 20) return 'medium';
        return 'easy';
    }

    /**
     * Format map name for display
     */
    formatMapName(mapName) {
        return mapName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Generate map cards HTML
     */
    generateMapCards() {
        const mapsGrid = document.querySelector('.maps-grid');
        if (!mapsGrid) {
            console.error('Maps grid container not found');
            return;
        }

        // Clear existing content
        mapsGrid.innerHTML = '';

        // Generate cards for available maps
        this.availableMaps.forEach((mapName, index) => {
            const config = this.mapConfigs.get(mapName);
            const mapCard = this.createMapCard(mapName, config, index === 0);
            mapsGrid.appendChild(mapCard);
        });

        // Update hero stats with actual numbers
        this.updateHeroStats();

        console.log(`Generated ${this.availableMaps.length} map cards`);
    }

    /**
     * Update hero section stats with real data
     */
    updateHeroStats() {
        // Count total markers across all maps
        let totalMarkers = 0;
        this.mapConfigs.forEach(config => {
            totalMarkers += config.totalMarkers;
        });

        // Update the stats in the hero section
        const mapsStat = document.querySelector('[data-target="5"]');
        const markersStat = document.querySelector('[data-target="200"]');
        
        if (mapsStat) {
            mapsStat.setAttribute('data-target', this.availableMaps.length.toString());
            mapsStat.textContent = this.availableMaps.length.toString();
        }
        
        if (markersStat) {
            markersStat.setAttribute('data-target', totalMarkers.toString());
            markersStat.setAttribute('data-suffix', '+');
            markersStat.textContent = totalMarkers.toString() + '+';
        }
    }

    /**
     * Create a single map card element
     */
    createMapCard(mapName, config, isFeatured = false) {
        const mapCard = document.createElement('div');
        mapCard.className = `map-card${isFeatured ? ' featured' : ''}`;
        mapCard.setAttribute('data-map', mapName);

        const difficultyColors = {
            'easy': 'easy',
            'medium': 'medium', 
            'hard': 'hard',
            'extreme': 'extreme'
        };

        mapCard.innerHTML = `
            <div class="map-preview">
                <img src="images/maps/${config.image}" alt="${config.displayName} Map" class="map-image">
                <div class="map-overlay">
                    <div class="map-info">
                        <h3>${config.displayName}</h3>
                        <p>${config.description}</p>
                        <div class="map-stats">
                            <span class="stat">${config.totalMarkers} Markers</span>
                            <span class="stat">${config.levels} Level${config.levels > 1 ? 's' : ''}</span>
                            <span class="stat">Updated</span>
                        </div>
                    </div>
                    <button class="play-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="map-details">
                <div class="map-header">
                    <h3>${config.displayName}</h3>
                    <span class="map-difficulty ${difficultyColors[config.difficulty]}">${config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)}</span>
                </div>
                <p class="map-description">${config.description}</p>
                <div class="map-features">
                    ${config.features.map(feature => `<span class="feature">${feature}</span>`).join('')}
                </div>
            </div>
        `;

        return mapCard;
    }

    /**
     * Bind click events to map cards
     */
    bindMapCardEvents() {
        const mapCards = document.querySelectorAll('.map-card');
        
        mapCards.forEach(card => {
            const mapName = card.getAttribute('data-map');
            
            // Handle card click (including play button)
            card.addEventListener('click', (e) => {
                this.openMap(mapName);
            });

            // Handle hover effects
            card.addEventListener('mouseenter', () => {
                card.classList.add('hover');
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('hover');
            });
        });

        console.log(`Bound events to ${mapCards.length} map cards`);
    }

    /**
     * Open the selected map
     */
    openMap(mapName) {
        console.log(`Opening map: ${mapName}`);
        
        // Store selected map in sessionStorage for the map page
        sessionStorage.setItem('selectedMap', mapName);
        
        // Navigate to map page
        window.location.href = 'map-leaflet.html';
    }

    /**
     * Get list of available maps
     */
    getAvailableMaps() {
        return this.availableMaps;
    }

    /**
     * Get configuration for a specific map
     */
    getMapConfig(mapName) {
        return this.mapConfigs.get(mapName);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing dynamic map loader...');
    
    try {
        window.mapLoader = new MapLoader();
        await window.mapLoader.init();
        console.log('Map loader initialized successfully');
    } catch (error) {
        console.error('Error initializing map loader:', error);
        
        // Fallback: keep existing static content if dynamic loading fails
        console.log('Falling back to static map content');
    }
});

// Export for external use
if (typeof window !== 'undefined') {
    window.MapLoader = MapLoader;
}
