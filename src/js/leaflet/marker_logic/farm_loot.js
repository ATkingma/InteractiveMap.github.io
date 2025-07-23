function addFarmLoot(interactive_map) {
    interactive_map.addInteractiveLayer('farm-loot', farm_loot_geojson, {
        name: 'Farm Loot',
        create_checkbox: true,
        create_feature_popup: true,
        is_default: true,
        sidebar_icon_html: '<i class="fas fa-seedling" style="color: #00ff88;"></i>',
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
                case 'consumables':
                    iconClass = 'fas fa-apple-alt';
                    iconColor = '#44ff44';
                    break;
                case 'tools':
                    iconClass = 'fas fa-tools';
                    iconColor = '#ffaa00';
                    break;
                case 'mixed':
                    iconClass = 'fas fa-boxes';
                    iconColor = '#aa44ff';
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
