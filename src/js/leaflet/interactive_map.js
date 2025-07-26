class InteractiveMap {
    #cluster_group;
    #common_attribution = `
    <li><a href="https://github.com/Leaflet/Leaflet" title="Leaflet">Leaflet</a> under <a href="https://github.com/Leaflet/Leaflet/blob/ee71642691c2c71605bacff69456760cfbc80a2a/LICENSE">BSD2</a>.</li>
    <li><a href="https://github.com/Leaflet/Leaflet.markercluster" title="Leaflet.markercluster">Leaflet.markercluster</a> under <a href="https://github.com/Leaflet/Leaflet.markercluster/blob/31360f226e1a40c03c71d68b016891beb5e63370/MIT-LICENCE.txt">MIT</a>.</li>
    <li><a href="https://github.com/ghybs/Leaflet.FeatureGroup.SubGroup" title="Leaflet.FeatureGroup.SubGroup">Leaflet.FeatureGroup.SubGroup</a> under <a href="https://github.com/ghybs/Leaflet.FeatureGroup.SubGroup/blob/c7ec78b0cf13be39b00d46beb50c954b8b4c78bb/LICENSE">BSD2</a>.</li>
    <li><a href="https://github.com/noerw/leaflet-sidebar-v2" title="leaflet-sidebar-v2">leaflet-sidebar-v2</a> under <a href="https://github.com/noerw/leaflet-sidebar-v2/blob/4ceb0006647c33afff9982502fb5e572eb514158/LICENSE">MIT</a>.</li>
    <li><a href="https://github.com/geoman-io/leaflet-geoman" title="Leaflet-Geoman">Leaflet-Geoman</a> under <a href="https://github.com/geoman-io/leaflet-geoman/blob/1fdc918fa39ffa84327fdf639fa75865168f716d/LICENSE">MIT</a>.</li>
    <li>Icons from <a href="https://fontawesome.com/" title="Font Awesome">Font Awesome</a> under <a href="https://fontawesome.com/license">CCA4</a>.</li>
    `
    #custom_layers;
    #interactive_layers = new Map();
    #map;
    #overlay_maps = new Object();
    #share_marker;
    #sidebar;
    #tile_layers = new Object();
    #user_layers;
    #website_subdir = '';

    /**
     * @param {string} id ID of the html div this map gets added to
     * @param {object} [args] Optional arguments
     * @param {int} [args.maxClusterRadius=20] The maximum radius that a cluster will cover from the central marker (in pixels)
     * @param {string} [args.attribution=''] General attribution html list about used stuff
     * @param {int} [args.max_good_zoom=5] Specify the maximum good looking zoom which will be used for location events
     * @param {int} [args.max_map_zoom=8] Maximum zoom the user can zoom to even if it looks ugly
     * @param {string} [args.website_source] Where to find the source of this interactive map
     * @param {string} [args.website_subdir] Subdir this interactive map will be hosted in
     */
    constructor(id, args) {
        let defaults = {
            maxClusterRadius: 20,
            attribution: '',
            max_good_zoom: 5,
            website_source: '',
            website_subdir: '',
            max_map_zoom: 8,
            min_map_zoom: -2
        }
        let params = { ...defaults, ...args };

        this.#map = L.map(id, {
            crs: L.CRS.Simple,
            maxZoom: params.max_map_zoom,
            minZoom: params.min_map_zoom,
        });
        this.MAX_ZOOM = params.max_good_zoom;
        this.#website_subdir = params.website_subdir;

        this.#cluster_group = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            maxClusterRadius: params.maxClusterRadius
        }).addTo(this.#map);

        this.#setUpToolbar();
            //  <!-- side bar todo --> 
        // this.#setUpSidebar(params.attribution, params.website_source, this.#website_subdir);

        this.#user_layers = JSON.parse(localStorage.getItem(`${this.#website_subdir}:user_layers`));
        this.#share_marker = new ShareMarker(this);
        this.#custom_layers = new CustomLayers(this);

        this.#map.on('overlayadd', event => {
            this.addUserLayer(event.name);
        });
        this.#map.on('overlayremove', event => {
            this.removeUserLayer(event.name);

            if (this.hasLayer(this.#getLayerByName(event.name))) {
                this.#getLayerByName(event.name).removeAllHighlights();
            }
        });
    }

    /**
     * Add a new background tile layer from tiles.
     * @param {string} name Display name of this tile layer
     * @param {object} [args] Optional arguments
     * @param {string} [url='map_tiles/{z}/{x}/{y}.png'] URL pattern for the tiles
     */
    addTileLayer(name, args, url = `map_tiles/{z}/{x}/{y}.png`) {
        let defaults = {
            minZoom: 0,
            maxZoom: this.MAX_ZOOM,
            minNativeZoom: 0,
            maxNativeZoom: this.MAX_ZOOM,
            attribution: ''
        };
        let params = { ...defaults, ...args };

        // Special handling for Arena Breakout map - use image overlay
        if (name === 'Arena Breakout Map') {
            // Map bounds based on image dimensions (4078x2158) with 240 offset
            var imageBounds = [[0, 240], [2158, 4078]];
            
            this.#tile_layers[name] = L.imageOverlay('images/maps/map.png', imageBounds, {
                attribution: params.attribution
            });
        } else {
            this.#tile_layers[name] = L.tileLayer(url, params);
        }

        // Add the first tile layer to the map
        if (Object.keys(this.#tile_layers).length === 1) {
            this.#tile_layers[name].addTo(this.#map);
        }
    }

    /**
     * Add a new interactive layer to the interactive map from a geoJSON.
     * @param {string} id Unique layer id
     * @param {string} geojson geoJSON with features to add
     * @param {object} [args] Optional arguments
     * @returns InteractiveLayer
     */
    addInteractiveLayer(id, geojson, args) {
        let layer = new InteractiveLayer(id, geojson, this, args);
        this.#interactive_layers.set(layer.id, layer);
        return layer;
    }

    /**
     * Add a layer to the remembered user preferences.
     * @param {string} name Layer ID
     */
    addUserLayer(name) {
        if (!this.#user_layers.includes(name)) {
            this.#user_layers.push(name);
        }
        localStorage.setItem(`${this.#website_subdir}:user_layers`, JSON.stringify(this.#user_layers));
    }

    /**
     * Finalize the interactive map. Call this after adding all layers to the map.
     */
    finalize() {
        // Set the column size for each interactive layer sidebar
        this.getLayers().forEach((layer, id) => {
            layer.setSidebarColumnCount();
        });

        // Defining overlay maps - markers
        this.getLayers().forEach((layer, id) => {
            this.#overlay_maps[layer.name] = layer.getGroup();
        });

        // Add layer selection to map
        L.control.layers(this.#tile_layers, this.#overlay_maps, {
            hideSingleBase: true
        }).addTo(this.#map);

        // Add custom layers controls to map
        this.#custom_layers.updateControls();

        // Show remembered layers
        if (!this.#user_layers) {
            this.#user_layers = new Array();
            this.getLayers().forEach((layer, id) => {
                if (layer.isDefault()) {
                    this.#user_layers.push(layer.name);
                }
            });
        }

        this.getLayers().forEach((layer, id) => {
            if (this.#user_layers.includes(layer.name)) {
                layer.show();
            }
        });
        this.#custom_layers.addLayersToMap(this.#user_layers);

        // Center view over map
        this.zoomToBounds(this.#getBounds());

        // hide all previously checked marker
        this.getLayers().forEach((layer, layer_id) => {
            layer.getAllLayers().forEach((array, feature_id) => {
                // Remove if checked
                if (localStorage.getItem(`${this.#website_subdir}:${layer_id}:${feature_id}`)) {
                    array.forEach(feature => {
                        layer.removeLayer(feature);
                    });
                }
            });
        });

        // Search in url for marker and locate them
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        if (urlParams.has('share')) {
            const share = urlParams.get('share');
            let latlng = share.split(",");
            this.#share_marker.move([latlng[1], latlng[0]]);
            this.#share_marker.highlight();
            this.#share_marker.zoomTo();
        } else if (urlParams.has('list')) {
            const list = urlParams.get('list');

            if (this.hasLayer(list)) {
                var layer = this.getLayer(list);

                // make group visible
                layer.show();

                if (!urlParams.has('id')) {
                    layer.zoomTo();

                    // if no id open sidebar
                    this.#sidebar._tabitems.every(element => {
                        if (element._id == list) {
                            this.#sidebar.open(list);
                            return false;
                        }
                        return true;
                    });
                } else {
                    const id = urlParams.get('id');

                    if (layer.hasFeature(id)) {
                        layer.highlightFeature(id);
                        layer.zoomToFeature(id);
                        this.#map.on('click', this.removeAllHighlights, this);
                    }
                }
            }
        }
    }

    /**
     * Get the parent marker cluster.
     * @returns L.MarkerClusterGroup
     */
    getClusterGroup() {
        return this.#cluster_group;
    }

    /**
     * Get the layer with a specific ID.
     * @param {string} id Layer ID
     * @returns InteractiveLayer
     */
    getLayer(id) {
        if (!this.#interactive_layers.has(id)) {
            return undefined;
        }
        return this.#interactive_layers.get(id);
    }

    /**
     * Get all layers this interactive map is aware of.
     * @returns Map<id, layer>
     */
    getLayers() {
        return this.#interactive_layers;
    }

    /**
     * Get the leaflet map.
     * @returns L.Map
     */
    getMap() {
        return this.#map;
    }

    /**
     * Get the maximum good looking zoom value.
     * @returns integer
     */
    getMaxZoom() {
        return this.MAX_ZOOM;
    }

    /**
     * Get the share marker for this interactive map.
     * @returns ShareMarker
     */
    getShareMarker() {
        return this.#share_marker;
    }

    /**
     * Get the sidebar associated to this interactive map.
     * @returns L.Control.Sidebar
     */
    getSidebar() {
        return this.#sidebar;
    }

    /**
     * Get the subdirectory this interactive map is associated to.
     * @returns string
     */
    getWebsiteSubdir() {
        return this.#website_subdir;
    }

    /**
     * Check if this interactive map has a specific layer group.
     * @param {string} id Layer group ID
     * @returns boolean
     */
    hasLayer(id) {
        return this.#interactive_layers.has(id);
    }

    /**
     * Remove all currently active highlights.
     */
    removeAllHighlights() {
        this.getLayers().forEach((layer, id) => {
            layer.removeAllHighlights();
        });

        this.#share_marker.removeHighlight();
        this.#map.off('click', this.removeAllHighlights, this);
    }

    /**
     * Remove a layer from the remembered user preferences.
     * @param {string} name ID of the layer
     */
    removeUserLayer(name) {
        this.#user_layers = this.#user_layers.filter((value, index, array) => {
            return value != name;
        });
        localStorage.setItem(`${this.#website_subdir}:user_layers`, JSON.stringify(this.#user_layers));
    }

    /**
     * Zoom to given bounds on this interactive map.
     * @param {L.LatLngBounds | L.LatLng[] | L.Point[] | Array[]} bounds Bounds to zoom to
     */
    zoomToBounds(bounds) {
        this.#map.fitBounds(bounds, {
            maxZoom: this.MAX_ZOOM
        });
    }

    /**
     * Initialize the sidebar.
     * @param {string} attribution General attribution list
     * @param {string} website Where to find the source
     * @param {string} website_subdir Subdir this map will be hosted in
     */
    #setUpSidebar(attribution, website, website_subdir) {
        this.#sidebar = L.control.sidebar({
            autopan: true,
            closeButton: true,
            container: 'sidebar',
            position: 'left'
        }).addTo(this.#map);

        // Reset button
        this.#sidebar.addPanel({
            id: 'reset',
            tab: '<i class="fas fa-trash"></i>',
            position: 'bottom',
            button: () => {
                if (!confirm('Really delete all marked locations and all custom marker layers?')) {
                    return;
                }

                window.onbeforeunload = () => { };

                for (var key in localStorage) {
                    if (key.startsWith(`${website_subdir}:`)) {
                        localStorage.removeItem(key);
                    }
                }

                location.reload();
            }
        });

        // Edit button
        this.#sidebar.addPanel({
            id: 'edit',
            tab: '<i class="fas fa-map-marked"></i>',
            title: 'Add or edit marker',
            position: 'bottom',
            button: () => {
                if (!this.#custom_layers.isInEditMode()) {
                    this.#custom_layers.enableEditing();
                } else {
                    this.#custom_layers.disableEditing();
                }
            }
        });

        // Attribution panel
        this.#sidebar.addPanel({
            id: 'attributions',
            tab: '<i class="fas fa-info-circle"></i>',
            title: 'Attributions',
            position: 'bottom',
            pane: `<div><ul>${attribution}${this.#common_attribution}</ul><p>Source: <a href="${website}">${website}</a></p></div>`
        });

        this.#sidebar.on('opened', (event) => {
            if (event.id == 'attributions') return;

            this.#map.addLayer(this.#interactive_layers.get(event.id).getGroup());
            Utils.setHistoryState(event.id);
            this.getShareMarker().removeMarker();
        });

        this.#sidebar.on('closing', () => {
            Utils.setHistoryState(undefined, undefined, this.#website_subdir);
            this.getShareMarker().removeMarker();
        });
    }

    /**
     * Initialize the editing toolbar.
     */
    #setUpToolbar() {
        // Disable general editing
        L.PM.setOptIn(true);

        this.#map.pm.Toolbar.createCustomControl({
            name: 'add_layer',
            block: 'custom',
            title: 'Add custom layer',
            className: 'fas fa-plus',
            toggle: false,
            onClick: () => {
                this.#custom_layers.createLayer();
            }
        });

        this.#map.pm.Toolbar.createCustomControl({
            name: 'remove_layer',
            block: 'custom',
            title: 'Remove custom layer',
            className: 'fas fa-trash',
            toggle: false,
            onClick: () => {
                this.#custom_layers.removeLayer();
            }
        });

        this.#map.pm.Toolbar.createCustomControl({
            name: 'export_layer',
            block: 'custom',
            title: 'Export custom layer',
            className: 'fas fa-file-download',
            toggle: false,
            onClick: () => {
                this.#custom_layers.exportLayer();
            }
        });
    }

    /**
     * Get the outer bounds of all layers on a map.
     * @returns L.LatLngBounds
     */
    #getBounds() {
        var bounds = L.latLngBounds();

        this.getLayers().forEach((layer, id) => {
            bounds.extend(layer.getGroupBounds());
        });

        // If no layers or invalid bounds, return default bounds for Arena Breakout map with 240 offset
        if (!bounds.isValid()) {
            bounds = L.latLngBounds([[0, 240], [2158, 4078]]);
        }

        return bounds;
    }

    /**
     * Get a layer by its display name.
     * @param {string} name Display name
     * @returns string|undefined
     */
    #getLayerByName(name) {
        var result = undefined;

        this.getLayers().forEach((layer, id) => {
            if (layer.name == name) {
                result = id;
            }
        });

        return result;
    }
}
