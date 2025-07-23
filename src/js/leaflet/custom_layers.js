class CustomLayers {
    #interactive_map;
    #layers = new Map();
    #current_layer = '';
    #edit_mode = false;

    /**
     * @param {InteractiveMap} interactive_map The interactive map instance
     */
    constructor(interactive_map) {
        this.#interactive_map = interactive_map;
    }

    /**
     * Add layers to the map from user preferences.
     * @param {Array} user_layers Array of layer names to add
     */
    addLayersToMap(user_layers) {
        this.#layers.forEach((layer, name) => {
            if (user_layers.includes(name)) {
                layer.addTo(this.#interactive_map.getMap());
            }
        });
    }

    /**
     * Create a new custom layer.
     */
    createLayer() {
        var name = prompt('Enter layer name:');
        if (!name || this.#layers.has(name)) {
            return;
        }

        var layer = L.featureGroup();
        this.#layers.set(name, layer);
        this.#current_layer = name;
        
        this.updateControls();
        this.enableEditing();
    }

    /**
     * Disable editing mode.
     */
    disableEditing() {
        this.#edit_mode = false;
        this.#interactive_map.getMap().pm.removeControls();
        this.#interactive_map.getMap().pm.setGlobalRemovalMode(false);
    }

    /**
     * Enable editing mode.
     */
    enableEditing() {
        this.#edit_mode = true;
        this.#interactive_map.getMap().pm.addControls({
            position: 'topright',
            drawCircle: false,
            drawCircleMarker: false,
            drawPolyline: true,
            drawRectangle: true,
            drawPolygon: true,
            drawMarker: true,
            editMode: true,
            dragMode: true,
            cutPolygon: true,
            removalMode: true,
        });

        // Add created features to current layer
        this.#interactive_map.getMap().on('pm:create', (event) => {
            if (this.#current_layer && this.#layers.has(this.#current_layer)) {
                this.#layers.get(this.#current_layer).addLayer(event.layer);
            }
        });
    }

    /**
     * Export the current layer as GeoJSON.
     */
    exportLayer() {
        if (!this.#current_layer || !this.#layers.has(this.#current_layer)) {
            alert('No layer selected');
            return;
        }

        var layer = this.#layers.get(this.#current_layer);
        var geojson = layer.toGeoJSON();
        
        var blob = new Blob([JSON.stringify(geojson, null, 2)], {
            type: 'application/json'
        });
        
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = `${this.#current_layer}.geojson`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Check if currently in edit mode.
     * @returns boolean
     */
    isInEditMode() {
        return this.#edit_mode;
    }

    /**
     * Remove the current layer.
     */
    removeLayer() {
        if (!this.#current_layer || !this.#layers.has(this.#current_layer)) {
            alert('No layer selected');
            return;
        }

        if (confirm(`Delete layer "${this.#current_layer}"?`)) {
            var layer = this.#layers.get(this.#current_layer);
            this.#interactive_map.getMap().removeLayer(layer);
            this.#layers.delete(this.#current_layer);
            this.#current_layer = '';
            this.updateControls();
        }
    }

    /**
     * Update the layer controls.
     */
    updateControls() {
        // This would typically update a UI control for layer selection
        // For now, we'll just use the current layer as the active one
    }
}
