// Fallback map implementation for Arena Breakout
// This creates a simple image overlay instead of true tiles for initial testing

// Override the tile layer addition to use an image overlay
var original_addTileLayer = InteractiveMap.prototype.addTileLayer;

InteractiveMap.prototype.addTileLayer = function(name, args, url) {
    let defaults = {
        minZoom: 0,
        maxZoom: this.MAX_ZOOM,
        attribution: ''
    };
    let params = { ...defaults, ...args };

    // For Arena Breakout, use image overlay instead of tiles
    if (name === 'Arena Breakout Map') {
        // Map bounds based on image dimensions (4078x2158)
        var imageBounds = [[0, 0], [2158, 4078]];
        
        this.#tile_layers = this.#tile_layers || {};
        this.#tile_layers[name] = L.imageOverlay('../public/images/maps/map.png', imageBounds, {
            attribution: params.attribution
        });

        // Add the first tile layer to the map
        if (Object.keys(this.#tile_layers).length === 1) {
            this.#tile_layers[name].addTo(this.#map);
        }
    } else {
        // Use original method for other maps
        original_addTileLayer.call(this, name, args, url);
    }
};
