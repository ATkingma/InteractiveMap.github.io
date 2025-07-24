/**
 * Vector2 class for handling 2D coordinates
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromObject(obj) {
        return new Vector2(obj.x || 0, obj.y || 0);
    }

    toObject() {
        return { x: this.x, y: this.y };
    }
}

/**
 * Marker class representing individual map markers
 */
class MapMarker {
    constructor(data = {}) {
        this.name = data.name || '';
        this.type = data.type || 'default';
        this.icon = data.icon || 'test.png';
        this.color = data.color || '#808080'; // Default gray
        this.fallbackColor = data.fallbackColor || '#606060';
        this.description = data.description || '';
        this.position = data.position instanceof Vector2 ? data.position : Vector2.fromObject(data.position || {});
        this.isUserCreated = data.isUserCreated || false;
    }

    static fromObject(obj) {
        return new MapMarker({
            ...obj,
            position: Vector2.fromObject(obj.position || {})
        });
    }

    toObject() {
        return {
            name: this.name,
            type: this.type,
            icon: this.icon,
            color: this.color,
            fallbackColor: this.fallbackColor,
            description: this.description,
            position: this.position.toObject(),
            isUserCreated: this.isUserCreated
        };
    }
}

/**
 * Level class representing floor levels with markers
 */
class MapLevel {
    constructor(data = {}) {
        this.name = data.name || '';
        this.floor = data.floor || 0; // Floor number (0, 1, 2, -1, etc.)
        this.mapImage = data.mapImage || 'map.png'; // Default map image
        this.markers = (data.markers || []).map(marker => 
            marker instanceof MapMarker ? marker : MapMarker.fromObject(marker)
        );
    }

    static fromObject(obj) {
        return new MapLevel({
            ...obj,
            markers: (obj.markers || []).map(marker => MapMarker.fromObject(marker))
        });
    }

    toObject() {
        return {
            name: this.name,
            floor: this.floor,
            mapImage: this.mapImage,
            markers: this.markers.map(marker => marker.toObject())
        };
    }

    addMarker(marker) {
        this.markers.push(marker instanceof MapMarker ? marker : MapMarker.fromObject(marker));
    }

    removeMarker(index) {
        if (index >= 0 && index < this.markers.length) {
            this.markers.splice(index, 1);
        }
    }

    getMarkersByType(type) {
        return this.markers.filter(marker => marker.type === type);
    }
}

/**
 * Difficulty class representing different map difficulties
 */
class MapDifficulty {
    constructor(data = {}) {
        this.name = data.name || 'normal'; // normal, lockdown, forbidden
        this.levels = (data.levels || []).map(level => 
            level instanceof MapLevel ? level : MapLevel.fromObject(level)
        );
    }

    static fromObject(obj) {
        return new MapDifficulty({
            ...obj,
            levels: (obj.levels || []).map(level => MapLevel.fromObject(level))
        });
    }

    toObject() {
        return {
            name: this.name,
            levels: this.levels.map(level => level.toObject())
        };
    }

    addLevel(level) {
        this.levels.push(level instanceof MapLevel ? level : MapLevel.fromObject(level));
    }

    getLevelByFloor(floor) {
        return this.levels.find(level => level.floor === floor);
    }

    getAllTypes() {
        const types = new Set();
        this.levels.forEach(level => {
            level.markers.forEach(marker => {
                types.add(marker.type);
            });
        });
        return Array.from(types);
    }
}

/**
 * MapData class representing complete map data structure
 */
class MapData {
    constructor(data = {}) {
        this.mapName = data.mapName || '';
        this.difficulties = {};
        
        // Initialize difficulties
        if (data.difficulties) {
            Object.keys(data.difficulties).forEach(key => {
                this.difficulties[key] = data.difficulties[key] instanceof MapDifficulty 
                    ? data.difficulties[key] 
                    : MapDifficulty.fromObject(data.difficulties[key]);
            });
        }
        
        // Ensure at least 'normal' difficulty exists
        if (!this.difficulties.normal) {
            this.difficulties.normal = new MapDifficulty({ name: 'normal' });
        }
    }

    static fromObject(obj) {
        const mapData = new MapData({ mapName: obj.mapName });
        
        if (obj.difficulties) {
            Object.keys(obj.difficulties).forEach(key => {
                mapData.difficulties[key] = MapDifficulty.fromObject(obj.difficulties[key]);
            });
        }
        
        return mapData;
    }

    toObject() {
        const difficulties = {};
        Object.keys(this.difficulties).forEach(key => {
            difficulties[key] = this.difficulties[key].toObject();
        });
        
        return {
            mapName: this.mapName,
            difficulties: difficulties
        };
    }

    addDifficulty(name, difficulty) {
        this.difficulties[name] = difficulty instanceof MapDifficulty 
            ? difficulty 
            : MapDifficulty.fromObject(difficulty);
    }

    getDifficulty(name) {
        return this.difficulties[name];
    }

    getAllDifficulties() {
        return Object.keys(this.difficulties);
    }

    getAllTypes(difficulty = 'normal') {
        const diff = this.getDifficulty(difficulty);
        return diff ? diff.getAllTypes() : [];
    }
}

/**
 * MapDataManager class for handling map data operations
 */
class MapDataManager {
    constructor() {
        this.mapData = null;
        this.currentDifficulty = 'normal';
        this.currentFloor = 0;
        this.enabledTypes = new Set();
        this.userMarkers = new Map(); // Map storage: mapName -> difficulty -> floor -> markers[]
    }

    /**
     * Load map data from JSON file
     */
    async loadMapData(mapName) {
        try {
            const response = await fetch(`../maps/${mapName}.json`);
            const data = await response.json();
            this.mapData = MapData.fromObject(data);
            this.loadUserMarkers(mapName);
            this.enabledTypes = new Set(this.mapData.getAllTypes(this.currentDifficulty));
            return this.mapData;
        } catch (error) {
            console.error('Error loading map data:', error);
            // Create empty map data if file doesn't exist
            this.mapData = new MapData({ mapName: mapName });
            this.loadUserMarkers(mapName);
            return this.mapData;
        }
    }

    /**
     * Save map data to JSON (for development/admin purposes)
     */
    getMapDataJSON() {
        return JSON.stringify(this.mapData.toObject(), null, 2);
    }

    /**
     * Set current difficulty
     */
    setDifficulty(difficulty) {
        if (this.mapData && this.mapData.difficulties[difficulty]) {
            this.currentDifficulty = difficulty;
            this.enabledTypes = new Set(this.mapData.getAllTypes(difficulty));
            return true;
        }
        return false;
    }

    /**
     * Set current floor
     */
    setFloor(floor) {
        this.currentFloor = floor;
    }

    /**
     * Toggle marker type visibility
     */
    toggleType(type) {
        if (this.enabledTypes.has(type)) {
            this.enabledTypes.delete(type);
        } else {
            this.enabledTypes.add(type);
        }
    }

    /**
     * Get visible markers for current difficulty and floor
     */
    getVisibleMarkers() {
        if (!this.mapData) return [];

        const difficulty = this.mapData.getDifficulty(this.currentDifficulty);
        if (!difficulty) return [];

        const level = difficulty.getLevelByFloor(this.currentFloor);
        if (!level) return [];

        // Filter by enabled types
        const markers = level.markers.filter(marker => 
            this.enabledTypes.has(marker.type)
        );

        // Add user markers for current map/difficulty/floor
        const userMarkers = this.getUserMarkers(this.mapData.mapName, this.currentDifficulty, this.currentFloor);
        markers.push(...userMarkers);

        return markers;
    }

    /**
     * Get all available types for current difficulty
     */
    getAllTypes() {
        return this.mapData ? this.mapData.getAllTypes(this.currentDifficulty) : [];
    }

    /**
     * Add user marker
     */
    addUserMarker(marker, mapName = null, difficulty = null, floor = null) {
        mapName = mapName || this.mapData?.mapName;
        difficulty = difficulty || this.currentDifficulty;
        floor = floor !== null ? floor : this.currentFloor;

        if (!mapName) return false;

        const key = `${mapName}_${difficulty}_${floor}`;
        if (!this.userMarkers.has(key)) {
            this.userMarkers.set(key, []);
        }

        const userMarker = new MapMarker({
            ...marker,
            isUserCreated: true
        });

        this.userMarkers.get(key).push(userMarker);
        this.saveUserMarkers(mapName);
        return true;
    }

    /**
     * Remove user marker
     */
    removeUserMarker(index, mapName = null, difficulty = null, floor = null) {
        mapName = mapName || this.mapData?.mapName;
        difficulty = difficulty || this.currentDifficulty;
        floor = floor !== null ? floor : this.currentFloor;

        const key = `${mapName}_${difficulty}_${floor}`;
        const markers = this.userMarkers.get(key);
        
        if (markers && index >= 0 && index < markers.length) {
            markers.splice(index, 1);
            this.saveUserMarkers(mapName);
            return true;
        }
        return false;
    }

    /**
     * Get user markers for specific map/difficulty/floor
     */
    getUserMarkers(mapName, difficulty, floor) {
        const key = `${mapName}_${difficulty}_${floor}`;
        return this.userMarkers.get(key) || [];
    }

    /**
     * Save user markers to localStorage
     */
    saveUserMarkers(mapName) {
        const userMarkersData = {};
        this.userMarkers.forEach((markers, key) => {
            if (key.startsWith(mapName)) {
                userMarkersData[key] = markers.map(marker => marker.toObject());
            }
        });
        localStorage.setItem(`map_user_markers_${mapName}`, JSON.stringify(userMarkersData));
    }

    /**
     * Load user markers from localStorage
     */
    loadUserMarkers(mapName) {
        try {
            const stored = localStorage.getItem(`map_user_markers_${mapName}`);
            if (stored) {
                const userMarkersData = JSON.parse(stored);
                Object.keys(userMarkersData).forEach(key => {
                    const markers = userMarkersData[key].map(marker => MapMarker.fromObject(marker));
                    this.userMarkers.set(key, markers);
                });
            }
        } catch (error) {
            console.error('Error loading user markers:', error);
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Vector2 = Vector2;
    window.MapMarker = MapMarker;
    window.MapLevel = MapLevel;
    window.MapDifficulty = MapDifficulty;
    window.MapData = MapData;
    window.MapDataManager = MapDataManager;
}
