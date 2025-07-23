// Farm Loot GeoJSON data
var farm_loot_geojson = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "barn-cache-1",
        "name": "Barn Storage",
        "description": "Basic weapons and supplies",
        "loot_type": "weapons",
        "rarity": "common"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [800, 1200]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "farmhouse-1",
        "name": "Farmhouse",
        "description": "Food and basic medical supplies",
        "loot_type": "consumables",
        "rarity": "common"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [900, 1100]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "silo-1",
        "name": "Grain Silo",
        "description": "Hidden stash location",
        "loot_type": "mixed",
        "rarity": "rare"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [750, 1250]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "shed-1",
        "name": "Tool Shed",
        "description": "Tools and basic equipment",
        "loot_type": "tools",
        "rarity": "common"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [850, 1150]
      }
    }
  ]
}`;
