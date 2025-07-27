/**
 * A general interactive map layer which includes marker and polygons created from geoJSON features.
 */
class InteractiveLayer {
    #create_checkbox;
    #ignore_next_resize = new Set();
    #feature_group;
    #geojsons = new Array();
    #highlighted_layers = new Array();
    #interactive_map;
    #is_default;
    #layers = new Map();
    #polygon_style_highlights = new Map();
    #resize_observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            let feature_id = entry.target.closest('.popup-id').id.split(':')[2];

            if (this.#ignore_next_resize.has(feature_id)) {
                this.#ignore_next_resize.delete(feature_id);
                continue;
            }

            this.#getLayers(feature_id).forEach(layer => {
                if (layer.isPopupOpen()) {
                    this.#resize_observer.unobserve(entry.target);
                    layer.getPopup().update();

                    this.#ignore_next_resize.add(feature_id);
                    for (const element of document.getElementById(`popup:${this.id}:${feature_id}`).getElementsByClassName('popup-media')) {
                        this.#resize_observer.observe(element);
                    }
                }
            });
        }
    });
    #sidebar;
    #sidebar_list_html = undefined;
    #website_subdir;

    #default_onEachFeature = function (feature, layer) { };
    #default_pointToLayer = function (feature, latlng) {
        const marker = L.marker(latlng, {
            icon: Utils.getCustomIcon(this.id),
            riseOnHover: true
        });
        
        // Add tooltip with feature name
        const tooltipText = feature.properties?.name || feature.properties?.title || this.id || 'Marker';
        marker.bindTooltip(tooltipText, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'marker-tooltip'
        });
        
        return marker;
    };
    #default_polygon_style = function (feature) { return {}; };
    #default_polygon_style_highlight = function () {
        return {
            opacity: 1.0,
            fillOpacity: 0.7
        }
    };
    #default_sidebar_icon_html = function () {
        return `<img class="sidebar-image" src="../public/images/icons/${this.id}.png" />`;
    };

    /**
     * A layer containing marker and polygons created from geoJSON features.
     * @param {string} id Unique layer id
     * @param {string} geojson geoJSON including features to add to the layer
     * @param {InteractiveMap} interactive_map Interactive map
     * @param {object} [args] Object containing various optional arguments
     */
    constructor(id, geojson, interactive_map, args) {
        let defaults = {
            name: id,
            create_checkbox: false,
            create_feature_popup: false,
            is_default: false,
            sidebar_icon_html: this.#default_sidebar_icon_html,
            pointToLayer: this.#default_pointToLayer,
            onEachFeature: this.#default_onEachFeature,
            polygon_style: this.#default_polygon_style,
            polygon_style_highlight: this.#default_polygon_style_highlight,
            coordsToLatLng: L.GeoJSON.coordsToLatLng
        };

        let params = { ...defaults, ...args };

        this.id = id;
        this.name = params.name;
        this.#interactive_map = interactive_map;

        this.#create_checkbox = params.create_checkbox;
        this.#is_default = params.is_default;
        this.#feature_group = params.feature_group ? params.feature_group : L.featureGroup.subGroup(this.#interactive_map.getClusterGroup());
        this.#sidebar = this.#interactive_map.getSidebar();
        this.#website_subdir = this.#interactive_map.getWebsiteSubdir();

        if (this.#create_checkbox) {
            this.#sidebar_list_html = this.#createSidebarTab(params.sidebar_icon_html);
        }

        this.addGeoJson(geojson, {
            create_feature_popup: params.create_feature_popup,
            pointToLayer: params.pointToLayer,
            onEachFeature: params.onEachFeature,
            polygon_style: params.polygon_style,
            polygon_style_highlight: params.polygon_style_highlight,
            coordsToLatLng: params.coordsToLatLng
        });
    }

    /**
     * Add another geoJSON to this layer group.
     * @param {string} geojson geoJSON containing the features to add
     * @param {object} [args] Optional arguments
     */
    addGeoJson(geojson, args) {
        let defaults = {
            create_feature_popup: false,
            pointToLayer: this.#default_pointToLayer,
            onEachFeature: this.#default_onEachFeature,
            polygon_style: this.#default_polygon_style,
            polygon_style_highlight: this.#default_polygon_style_highlight,
            coordsToLatLng: L.GeoJSON.coordsToLatLng
        };

        let params = { ...defaults, ...args };

        let geojson_layer = L.geoJSON(JSON.parse(geojson), {
            pointToLayer: params.pointToLayer.bind(this),
            onEachFeature: (feature, layer) => {
                this.#setFeature(feature.properties.id, layer);

                if (params.create_feature_popup) {
                    this.#createFeaturePopup(feature, layer);
                }

                if (this.#create_checkbox) {
                    this.#createSidebarCheckbox(feature);
                }

                params.onEachFeature.bind(this)(feature, layer);
            },
            style: params.polygon_style.bind(this),
            coordsToLatLng: params.coordsToLatLng
        });

        this.#polygon_style_highlights.set(geojson_layer, params.polygon_style_highlight.bind(this));
        this.#geojsons.push(geojson_layer);
        geojson_layer.addTo(this.#feature_group);
    }

    /**
     * Get a map of all layers.
     * @returns Map<id, layers[]>
     */
    getAllLayers() {
        return this.#layers;
    }

    /**
     * Get the group layer which contains all markers and polygons.
     * @returns L.LayerGroup
     */
    getGroup() {
        return this.#feature_group;
    }

    /**
     * Get the outer bounds of this entire layer group.
     * @returns L.LatLngBounds
     */
    getGroupBounds() {
        var bounds = L.latLngBounds();

        this.#layers.forEach((layers, key) => {
            bounds.extend(this.#getLayerBounds(key));
        });

        return bounds;
    }

    /**
     * Check if this layer group has a feature.
     * @param {string} id Feature ID
     * @returns boolean
     */
    hasFeature(id) {
        return this.#layers.has(id);
    }

    /**
     * Highlight a feature.
     * @param {string} id Feature ID
     */
    highlightFeature(id) {
        this.#getLayers(id).forEach(layer => {
            if (layer instanceof L.Path) {
                this.#highlightPolygon(layer);
            } else {
                this.#highlightPoint(layer);
            }
        });

        this.#interactive_map.getMap().on('click', () => { this.removeFeatureHighlight(id); });
    }

    /**
     * Check if this is a layer which should be visible by default.
     * @returns boolean
     */
    isDefault() {
        return this.#is_default;
    }

    /**
     * Remove all currently active highlights for this layer group.
     */
    removeAllHighlights() {
        this.#highlighted_layers.forEach(layer => {
            if (layer instanceof L.Path) {
                this.#removePolygonHighlight(layer);
            } else {
                this.#removePointHighlight(layer);
            }
        });

        this.#highlighted_layers = [];
        this.#interactive_map.getMap().off('click', this.removeAllHighlights, this);
    }

    /**
     * Remove a active highlight for a feature.
     * @param {string} id Feature ID
     */
    removeFeatureHighlight(id) {
        var layers = this.#getLayers(id);

        for (const index of this.#reverseKeys(this.#highlighted_layers)) {
            var layer = this.#highlighted_layers[index];

            if (!layers.includes(layer)) {
                continue;
            }

            if (layer instanceof L.Path) {
                this.#removePolygonHighlight(layer);
                this.#highlighted_layers.splice(index, 1);
            } else {
                this.#removePointHighlight(layer);
                this.#highlighted_layers.splice(index, 1);
            }
        }

        this.#interactive_map.getMap().off('click', () => { this.removeFeatureHighlight(id); });
    }

    /**
     * Remove a layer from the layer group.
     * @param {L.Layer} layer L.Layer to remove.
     */
    removeLayer(layer) {
        this.#getGroupForEdit(layer).removeLayer(layer);
    }

    /**
     * Set the amount of columns of the sidebar grid.
     */
    setSidebarColumnCount() {
        if (!this.#sidebar_list_html) {
            return;
        }

        var length = 4;
        var columns = 1;

        this.#layers.forEach((layer, id) => {
            if (id.length > length) {
                length = id.length;
            }
        });

        if (length < 5) {
            columns = 3;
        } else if (length < 15) {
            columns = 2;
        }

        this.#sidebar_list_html.setAttribute('style', `grid-template-columns: repeat(${columns}, auto)`);
    }

    /**
     * Show this layer group on the map.
     */
    show() {
        this.getGroup().addTo(this.#interactive_map.getMap());
    }

    /**
     * Zoom to this layer group.
     */
    zoomTo() {
        this.#interactive_map.zoomToBounds(this.getGroupBounds());
    }

    /**
     * Zoom to a specific feature.
     * @param {string} id Feature ID
     */
    zoomToFeature(id) {
        var layers = this.#getLayers(id);

        if (layers.length > 1) {
            this.#interactive_map.zoomToBounds(this.#getLayerBounds(id));
            return;
        }

        var layer = layers[0];

        if (layer instanceof L.Path) {
            this.#interactive_map.zoomToBounds(this.#getLayerBounds(id));
            return;
        }

        var group = this.#getGroupForEdit(layer);

        if (group instanceof L.MarkerClusterGroup && group.hasLayer(layer)) {
            group.zoomToShowLayer(layer, () => {
                window.setTimeout(() => {
                    if (this.#interactive_map.getMap().getZoom() < this.#interactive_map.getMaxZoom()) {
                        this.#interactive_map.zoomToBounds(this.#getLayerBounds(id));
                    }
                }, 300);
            });
            return;
        }

        this.#interactive_map.zoomToBounds(this.#getLayerBounds(id));
    }

    /**
     * Add a layer back to the group it belongs to.
     * @param {L.Layer} layer L.Layer
     */
    #addLayer(layer) {
        this.#getGroupForEdit(layer).addLayer(layer);
    }

    /**
     * Create a popup for a feature.
     * @param {object} feature Original feature object
     * @param {L.Layer} layer Resulting layer
     */
    #createFeaturePopup(feature, layer) {
        var content = function () {
            var html = document.createElement('div');
            html.className = 'popup-id';
            html.id = `popup:${this.id}:${feature.properties.id}`;

            var title = document.createElement('h3');
            title.appendChild(document.createTextNode(feature.properties.id));
            html.appendChild(title);

            if (feature.properties.media) {
                var media = document.createElement('div');
                media.className = 'popup-media';
                media.innerHTML = feature.properties.media;
                html.appendChild(media);
            }

            if (feature.properties.description) {
                var description = document.createElement('div');
                var span = document.createElement('span');
                span.appendChild(document.createTextNode(feature.properties.description));
                description.appendChild(span);
                html.appendChild(description);
            }

            if (this.#create_checkbox && document.getElementById(this.id + ':' + feature.properties.id)) {
                var label = document.createElement('label');
                label.className = 'popup-checkbox is-fullwidth';

                var label_text = document.createTextNode('Hide this marker');

                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';

                if (localStorage.getItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`)) {
                    checkbox.checked = true;
                }

                checkbox.addEventListener('change', element => {
                    if (element.target.checked) {
                        document.getElementById(this.id + ':' + feature.properties.id).checked = true;
                        this.#getLayers(feature.properties.id).forEach(l => {
                            this.#getGroupForEdit(l).removeLayer(l);
                        });
                        localStorage.setItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`, true);
                    } else {
                        document.getElementById(this.id + ':' + feature.properties.id).checked = false;
                        this.#getLayers(feature.properties.id).forEach(l => {
                            this.#addLayer(l);
                        });
                        localStorage.removeItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`);
                    }
                });

                label.appendChild(checkbox);
                label.appendChild(label_text);
                html.appendChild(label);
            }

            return html;
        }.bind(this);

        layer.bindPopup(content, { maxWidth: "auto" });

        layer.on('popupopen', event => {
            this.#interactive_map.getShareMarker().removeMarker();
            Utils.setHistoryState(this.id, feature.properties.id);

            for (const entry of document.getElementById(`popup:${this.id}:${feature.properties.id}`).getElementsByClassName('popup-media')) {
                this.#resize_observer.observe(entry);
            }
        }, this);

        layer.on('popupclose', event => {
            this.#interactive_map.getShareMarker().prevent();
            Utils.setHistoryState(undefined, undefined, this.#website_subdir);
            this.#resize_observer.disconnect();
        }, this);
    }

    /**
     * Create a sidebar checkbox for a feature if it doesn't already exist.
     * @param {object} feature Original feature object
     */
    #createSidebarCheckbox(feature) {
        if (!document.getElementById(this.id + ':' + feature.properties.id)) {
            var list_entry = document.createElement('li');
            list_entry.className = 'flex-grow-1';

            var leave_function = () => { this.removeFeatureHighlight(feature.properties.id); };
            list_entry.addEventListener('mouseenter', () => { this.highlightFeature(feature.properties.id); });
            list_entry.addEventListener('mouseleave', leave_function);

            var checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.id = this.id + ':' + feature.properties.id;
            checkbox.className = 'flex-grow-0';

            var label = document.createElement('label')
            label.appendChild(document.createTextNode(feature.properties.id + ' '));
            label.htmlFor = checkbox.id;
            label.className = 'flex-grow-1';

            var icon = document.createElement('i');
            icon.className = 'fas fa-crosshairs fa-xs';

            var locate_button = document.createElement('button');
            locate_button.innerHTML = icon.outerHTML;
            locate_button.addEventListener('click', () => {
                if (window.matchMedia('(max-device-width: 767px)').matches) {
                    this.#sidebar.close();
                }

                Utils.setHistoryState(this.id, feature.properties.id);

                this.#interactive_map.removeAllHighlights();
                this.highlightFeature(feature.properties.id);
                this.zoomToFeature(feature.properties.id);

                list_entry.removeEventListener('mouseleave', leave_function);
                window.setTimeout(() => {
                    list_entry.addEventListener('mouseleave', leave_function);
                }, 3000);
            });
            locate_button.className = 'flex-grow-0';

            list_entry.appendChild(checkbox);
            list_entry.appendChild(label);
            list_entry.appendChild(locate_button);
            this.#sidebar_list_html.appendChild(list_entry);

            if (localStorage.getItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`)) {
                checkbox.checked = true;
            }

            if (document.getElementById(this.id + ':' + feature.properties.id) != null) {
                document.getElementById(this.id + ':' + feature.properties.id).addEventListener('change', element => {
                    if (element.target.checked) {
                        this.#getLayers(feature.properties.id).forEach(l => {
                            this.#getGroupForEdit(l).removeLayer(l);
                        });
                        localStorage.setItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`, true);
                    } else {
                        this.#getLayers(feature.properties.id).forEach(l => {
                            this.#addLayer(l);
                        });
                        localStorage.removeItem(`${this.#website_subdir}:${this.id}:${feature.properties.id}`);
                    }
                });
            }
        }
    }

    /**
     * Create a sidebar tab for this layer group.
     * @param {string} icon_html Icon html
     * @returns HTMLUListElement
     */
    #createSidebarTab(icon_html) {
        var list = document.createElement('ul');
        list.className = 'collectibles_list';

        var icon = icon_html;

        if (icon_html instanceof Function) {
            icon = icon_html.bind(this);
            icon = icon();
        }

        this.#sidebar.addPanel({
            id: this.id,
            tab: icon,
            title: this.name,
            pane: '<p></p>'
        });
        document.getElementById(this.id).appendChild(list);

        return list;
    }

    /**
     * Get the layer group for adding and removing layers.
     * @param {L.Layer} layer Layer
     * @returns L.LayerGroup
     */
    #getGroupForEdit(layer) {
        for (const geojson of this.#geojsons) {
            if (geojson.hasLayer(layer)) {
                if (this.#feature_group instanceof L.MarkerClusterGroup && this.#feature_group.hasLayer(geojson)) {
                    return this.#feature_group;
                } else {
                    return geojson;
                }
            }
        }

        return this.#feature_group;
    }

    /**
     * Get all layers with a specific feature ID.
     * @param {string} id ID of features to retrieve.
     * @returns Array of layers with that feature ID.
     */
    #getLayers(id) {
        return this.#layers.get(id);
    }

    /**
     * Get the bounds of all layers with a feature ID
     * @param {string} id Feature ID
     * @returns L.LatLngBounds
     */
    #getLayerBounds(id) {
        var bounds = L.latLngBounds();

        this.#getLayers(id).forEach(layer => {
            if (layer instanceof L.Polyline) {
                bounds.extend(layer.getBounds());
            } else if (layer instanceof L.Circle) {
                var position = layer._latlng;
                var radius = layer._mRadius;
                bounds.extend([[position.lat - radius, position.lng - radius], [position.lat + radius, position.lng + radius]]);
            } else {
                bounds.extend([layer.getLatLng()]);
            }
        });

        return bounds;
    }

    /**
     * Highlight a point (marker)
     * @param {L.Layer} layer Marker
     */
    #highlightPoint(layer) {
        if (this.#highlighted_layers.includes(layer)) {
            return;
        }

        var icon = layer.getIcon();
        icon.options.html = `<div class="map-marker-ping"></div>${icon.options.html}`;
        layer.setIcon(icon);

        this.#highlighted_layers.push(layer);
    }

    /**
     * Highlight a polygon
     * @param {L.Layer} layer Polygon
     */
    #highlightPolygon(layer) {
        if (this.#highlighted_layers.includes(layer)) {
            return;
        }

        this.#polygon_style_highlights.forEach((style, geojson) => {
            if (geojson.hasLayer(layer)) {
                if (style instanceof Function) {
                    layer.setStyle(style(layer.feature));
                } else {
                    layer.setStyle(style);
                }
            }
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        this.#highlighted_layers.push(layer);
    }

    /**
     * Remove a highlight from a point (marker)
     * @param {L.Layer} layer Marker
     */
    #removePointHighlight(layer) {
        if (!this.#highlighted_layers.includes(layer)) {
            return;
        }

        var icon = layer.getIcon();
        icon.options.html = icon.options.html.replace('<div class="map-marker-ping"></div>', '');
        layer.setIcon(icon);
    }

    /**
     * Remove a highlight from a polygon
     * @param {L.Layer} layer Polygon
     */
    #removePolygonHighlight(layer) {
        if (!this.#highlighted_layers.includes(layer)) {
            return;
        }

        this.#geojsons.forEach(geojson => {
            if (geojson.hasLayer(layer)) {
                layer.setStyle(geojson.options.style(layer.feature));
            }
        });
    }

    /**
     * Get reverse iteration keys for an array to avoid issues when removing during iteration.
     * @param {Array} array Array to get reverse keys for
     * @returns Array of reverse indices
     */
    #reverseKeys(array) {
        return Object.keys(array).map(Number).reverse();
    }

    /**
     * Map a layer to a feature ID.
     * @param {string} id Feature ID
     * @param {L.Layer} layer Feature layer
     */
    #setFeature(id, layer) {
        if (!this.#layers.has(id)) {
            this.#layers.set(id, new Array());
        }

        this.#layers.get(id).push(layer);
    }
}
