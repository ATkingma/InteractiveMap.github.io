function addSpawnPoints(interactive_map) {
    interactive_map.addInteractiveLayer('spawn-points', spawn_points_geojson, {
        name: 'Spawn Points',
        create_checkbox: true,
        create_feature_popup: true,
        is_default: true,
        sidebar_icon_html: '<i class="fas fa-map-marker-alt" style="color: #00ff88;"></i>',
        pointToLayer: function(feature, latlng) {
            var leafletCoords = Utils.gameToLeafletCoords([latlng.lng, latlng.lat]);
            var convertedLatLng = L.latLng(leafletCoords[0], leafletCoords[1]);
            
            var iconClass = 'fas fa-map-marker-alt';
            var iconColor = '#00ff88';
            
            switch(feature.properties.spawn_type) {
                case 'main':
                    iconColor = '#00ff88';
                    break;
                case 'secondary':
                    iconColor = '#ffaa00';
                    break;
                default:
                    iconColor = '#ffffff';
            }
            
            return L.marker(convertedLatLng, {
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<i class="${iconClass}" style="color: ${iconColor}; font-size: 18px;"></i>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12]
                }),
                riseOnHover: true
            });
        }
    });
}
