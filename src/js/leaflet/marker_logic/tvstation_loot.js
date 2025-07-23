function addTvStationLoot(interactive_map) {
    interactive_map.addInteractiveLayer('tvstation-loot', tvstation_loot_geojson, {
        name: 'TV Station Loot',
        create_checkbox: true,
        create_feature_popup: true,
        is_default: true,
        sidebar_icon_html: '<i class="fas fa-broadcast-tower" style="color: #00ff88;"></i>',
        pointToLayer: function(feature, latlng) {
            var leafletCoords = Utils.gameToLeafletCoords([latlng.lng, latlng.lat]);
            var convertedLatLng = L.latLng(leafletCoords[0], leafletCoords[1]);
            
            var iconClass = 'fas fa-box';
            var iconColor = '#00ff88';
            
            switch(feature.properties.loot_type) {
                case 'weapons':
                    iconClass = 'fas fa-crosshairs';
                    iconColor = '#ff4444';
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
}
