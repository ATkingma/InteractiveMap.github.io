class Utils {
    /**
     * Get a custom icon for a marker type.
     * @param {string} type The marker type
     * @returns L.DivIcon
     */
    static getCustomIcon(type) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<img src="../public/images/icons/${type}.svg" style="width: 24px; height: 24px;" />`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
        });
    }

    /**
     * Set the browser history state for sharing URLs.
     * @param {string} list Layer ID
     * @param {string} id Feature ID
     * @param {string} website_subdir Website subdirectory
     */
    static setHistoryState(list, id, website_subdir) {
        var url = new URL(window.location);

        if (list && id) {
            url.searchParams.set('list', list);
            url.searchParams.set('id', id);
        } else if (list) {
            url.searchParams.set('list', list);
            url.searchParams.delete('id');
        } else {
            url.searchParams.delete('list');
            url.searchParams.delete('id');
        }

        if (website_subdir) {
            url.pathname = `/${website_subdir}/`;
        }

        window.history.replaceState({}, '', url);
    }

    /**
     * Convert game coordinates to Leaflet coordinates.
     * @param {Array} coords [x, y] coordinates from the game
     * @returns Array [lat, lng] coordinates for Leaflet
     */
    static gameToLeafletCoords(coords) {
        // Arena Breakout map is 4078x2158 pixels
        // Our map bounds are [[0, 0], [2158, 4078]] (height, width)
        // Game coordinates: x (0-4078), y (0-2158)
        // Leaflet coordinates: lat (0-2158), lng (0-4078)
        return [coords[1], coords[0]]; // [y, x] -> [lat, lng]
    }

    /**
     * Convert Leaflet coordinates to game coordinates.
     * @param {Array} coords [lat, lng] coordinates from Leaflet
     * @returns Array [x, y] coordinates for the game
     */
    static leafletToGameCoords(coords) {
        // Convert back from Leaflet coordinate system
        return [coords[1], coords[0]]; // [lat, lng] -> [x, y]
    }

    /**
     * Create a marker icon from SVG content.
     * @param {string} svgContent SVG content as string
     * @param {number} size Icon size in pixels
     * @returns L.DivIcon
     */
    static createSvgIcon(svgContent, size = 24) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: svgContent,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2]
        });
    }

    /**
     * Debounce function calls.
     * @param {Function} func Function to debounce
     * @param {number} wait Wait time in milliseconds
     * @returns Function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls.
     * @param {Function} func Function to throttle
     * @param {number} limit Limit in milliseconds
     * @returns Function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}
