// Spawn Points GeoJSON data
var spawn_points_geojson = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-armory-1",
        "name": "Armory Main",
        "description": "Primary spawn for armory raids",
        "spawn_type": "main",
        "floor": "ground"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [1000, 500]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-armory-2",
        "name": "Armory Side",
        "description": "Secondary armory spawn",
        "spawn_type": "secondary",
        "floor": "ground"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [3000, 800]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-farm-1",
        "name": "Farm Entry",
        "description": "Farm area spawn point",
        "spawn_type": "main",
        "floor": "ground"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [1500, 1200]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-northridge-1",
        "name": "Northridge Main",
        "description": "Primary northridge spawn",
        "spawn_type": "main",
        "floor": "ground"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [2500, 1000]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-basement-1",
        "name": "Basement Access",
        "description": "Basement level spawn",
        "spawn_type": "secondary",
        "floor": "basement1"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [2000, 1000]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "id": "spawn-deep-1",
        "name": "Deep Basement",
        "description": "Deep basement spawn point",
        "spawn_type": "secondary", 
        "floor": "basement2"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [1800, 900]
      }
    }
  ]
}`;
