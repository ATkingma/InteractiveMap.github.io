function addArmoryLoot(interactive_map) {
    // Load actual JSON data from the maps folder
    fetch('../maps/armory-loot.json')
        .then(response => response.json())
        .then(data => {
            // Convert JSON data to GeoJSON format
            const features = [];
            
            // Add markers from different modes and floors
            if (data.modes && data.modes.normal && data.modes.normal.categoryMarkers) {
                data.modes.normal.categoryMarkers.forEach(marker => {
                    features.push({
                        type: "Feature",
                        properties: {
                            id: marker.id,
                            name: marker.name,
                            description: marker.description || "",
                            loot_type: marker.type,
                            rarity: marker.rarity || "common",
                            floor: marker.floor || "ground"
                        },
                        geometry: {
                            type: "Point",
                            coordinates: [marker.x, marker.y] // Direct coordinates
                        }
                    });
                });
            }
            
            const geojsonData = {
                type: "FeatureCollection",
                features: features
            };
            
            // Add layer to map
            interactive_map.addInteractiveLayer('armory-loot', JSON.stringify(geojsonData), {
                name: 'Armory Loot',
                create_checkbox: true,
                create_feature_popup: true,
                is_default: true,
                sidebar_icon_html: '<i class="fas fa-shield-alt" style="color: #00ff88;"></i>',
                pointToLayer: function(feature, latlng) {
                    // Convert coordinates using our utility function
                    var leafletCoords = Utils.gameToLeafletCoords([latlng.lng, latlng.lat]);
                    var convertedLatLng = L.latLng(leafletCoords[0], leafletCoords[1]);
                    
                    // Different icons based on loot type
                    var iconClass = 'fas fa-box';
                    var iconColor = '#00ff88';
                    
                    switch(feature.properties.loot_type) {
                        case 'weapons':
                        case 'spawn-points':
                            iconClass = 'fas fa-crosshairs';
                            iconColor = '#ff4444';
                            break;
                        case 'armor':
                            iconClass = 'fas fa-shield-alt';
                            iconColor = '#4444ff';
                            break;
                        case 'medical':
                            iconClass = 'fas fa-plus-square';
                            iconColor = '#44ff44';
                            break;
                        case 'ammo':
                            iconClass = 'fas fa-circle';
                            iconColor = '#ffaa00';
                            break;
                        case 'electronics':
                            iconClass = 'fas fa-microchip';
                            iconColor = '#00aaff';
                            break;
                        default:
                            iconClass = 'fas fa-box';
                    }
            
                    return L.marker(convertedLatLng, {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: `<i class="${iconClass}" style="color: ${iconColor}; font-size: 16px;"></i>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                            popupAnchor: [0, -10]
                        }),
                        riseOnHover: true
                    });
                }
            });
        })
        .catch(error => {
            console.error('Error loading armory loot data:', error);
            // Fallback to static data if JSON fails
            interactive_map.addInteractiveLayer('armory-loot', armory_loot_geojson, {
                name: 'Armory Loot',
                create_checkbox: true,
                create_feature_popup: true,
                is_default: true,
                sidebar_icon_html: '<i class="fas fa-shield-alt" style="color: #00ff88;"></i>'
            });
        });
}
