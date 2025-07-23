class ShareMarker {
    #interactive_map;
    #marker;
    #prevent_next_move = false;

    /**
     * @param {InteractiveMap} interactive_map The interactive map instance
     */
    constructor(interactive_map) {
        this.#interactive_map = interactive_map;
        this.#marker = L.marker([0, 0], {
            icon: L.divIcon({
                className: 'share-marker',
                html: '<div style="background: #ff0000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff;"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }),
            zIndexOffset: 1000
        });

        this.#interactive_map.getMap().on('click', (event) => {
            if (this.#prevent_next_move) {
                this.#prevent_next_move = false;
                return;
            }

            this.move(event.latlng);
            this.highlight();
        });
    }

    /**
     * Highlight the share marker.
     */
    highlight() {
        this.#marker.addTo(this.#interactive_map.getMap());
        
        // Update URL with share coordinates
        var url = new URL(window.location);
        var latlng = this.#marker.getLatLng();
        url.searchParams.set('share', `${latlng.lng},${latlng.lat}`);
        window.history.replaceState({}, '', url);
    }

    /**
     * Move the share marker to a specific location.
     * @param {L.LatLng|Array} latlng The coordinates to move to
     */
    move(latlng) {
        if (Array.isArray(latlng)) {
            latlng = L.latLng(latlng[0], latlng[1]);
        }
        this.#marker.setLatLng(latlng);
    }

    /**
     * Prevent the next move operation.
     */
    prevent() {
        this.#prevent_next_move = true;
    }

    /**
     * Remove the share marker from the map.
     */
    removeMarker() {
        this.#interactive_map.getMap().removeLayer(this.#marker);
        
        // Remove share parameter from URL
        var url = new URL(window.location);
        url.searchParams.delete('share');
        window.history.replaceState({}, '', url);
    }

    /**
     * Remove the highlight (same as removeMarker for now).
     */
    removeHighlight() {
        this.removeMarker();
    }

    /**
     * Zoom to the share marker location.
     */
    zoomTo() {
        this.#interactive_map.getMap().setView(this.#marker.getLatLng(), this.#interactive_map.getMaxZoom());
    }
}
