# Arena Breakout Interactive Map - Multi-Floor System

## Overview
This interactive map system supports multiple floors with numeric level-based navigation, allowing users to switch between different floor levels on each map. The system includes per-map loot containers, user markers, and filtering based on floor levels.

## Features

### Multi-Floor Support
- **Numeric Level System**: Each floor has a numeric level (e.g., -1 for basement, 0 for ground, 1 for upper floors)
- **Per-Map Floor Configuration**: Each map can have its own set of available floors
- **Level-Based Navigation**: Individual level buttons for quick navigation between floors
- **Marker Layering**: Markers are layered using z-index based on floor level

### Floor Navigation
- **Level Buttons**: Dynamic buttons generated for each available floor level (highest to lowest)
- **Active State**: Current floor level is highlighted with active styling
- **Responsive Design**: Floor controls adapt to different screen sizes
- **Auto-Hide**: Floor controls are hidden when only one floor exists

### Marker Management
- **Floor Association**: Each marker is associated with a specific floor
- **Floor Filtering**: Only markers on the current floor are visible
- **Z-Index Layering**: Markers are layered based on floor level for proper visual hierarchy
- **User Markers**: Users can specify floor when creating custom markers

## File Structure

### Core Files
- `map.js` - Main interactive map logic with floor management
- `map.html` - Map interface with level button controls
- `map.css` - Styling for map UI and floor controls

### Loot Data Files
- `armory-loot.json` - Armory map floor and loot data
- `valley-loot.json` - Valley map floor and loot data
- `port-loot.json` - Port map floor and loot data
- `factory-loot.json` - Factory map floor and loot data
- `farm-loot.json` - Farm map floor and loot data
- `blackout-loot.json` - Blackout map floor and loot data

## JSON Structure

### Loot Data Format
```json
{
  "name": "Map Name",
  "image": "map.png",
  "description": "Map description",
  "floors": {
    "ground": {
      "name": "Ground Level",
      "level": 0,
      "image": "map.png",
      "lootContainers": [
        {
          "id": 1001,
          "type": "weapon-crate",
          "name": "Container Name",
          "x": 40,
          "y": 30,
          "contents": ["Item 1", "Item 2"],
          "rarity": "uncommon",
          "respawnTime": 600
        }
      ]
    },
    "basement": {
      "name": "Basement Level",
      "level": -1,
      "image": "map.png",
      "lootContainers": [...]
    },
    "upper": {
      "name": "Upper Level",
      "level": 1,
      "image": "map.png",
      "lootContainers": [...]
    }
  }
}
```

### Floor Level Mapping
- **-1**: Basement level (highest z-index for underground areas)
- **0**: Ground level (standard level)
- **1**: Upper level (lower z-index for elevated areas)

## Implementation Details

### Floor Level Detection
The system uses a hierarchical approach to determine floor levels:
1. Check JSON data for explicit `level` property
2. Fall back to default `floorLevels` mapping
3. Default to ground level (0) if not specified

### Marker Filtering
Markers are filtered based on:
1. **Type filters**: Selected marker categories (spawn points, loot areas, etc.)
2. **Quality filters**: Loot quality tiers (high, medium, low)
3. **Floor filters**: Only show markers on current floor level

### Z-Index Layering
```javascript
floorZIndex = {
  '-1': 10,  // Basement level
  '0': 20,   // Ground level  
  '1': 30    // Upper level
}
```

## User Interface

### Level Buttons
- Located at bottom left above zoom indicator
- Vertical stack of buttons showing available levels
- Active level highlighted with orange accent
- Hover effects for better user experience

### Floor Selection in Add Marker Form
- Dropdown to select floor when creating user markers
- "Current Floor" option for quick placement
- Updates dynamically based on available floors

### Responsive Design
- Mobile-optimized button sizing
- Scaled controls for smaller screens
- Touch-friendly interface

## Usage Instructions

### Navigating Floors
1. Use level buttons at bottom left to switch between floors
2. Buttons show numeric levels (e.g., -1, 0, 1)
3. Active floor is highlighted in orange
4. Only available floors for current map are shown

### Creating User Markers
1. Open right panel (Add Markers)
2. Fill in marker details
3. Select floor from dropdown (or use "Current Floor")
4. Click "Add Marker" and place on map

### Filtering Markers
1. Use left panel filters to show/hide marker types
2. Markers are automatically filtered by current floor
3. Only markers on active floor level are visible

## Technical Notes

### Browser Compatibility
- Modern browsers with ES6+ support
- Touch events for mobile devices
- Responsive CSS Grid and Flexbox

### Performance Optimizations
- Throttled rendering for smooth animations
- Efficient marker filtering using Sets
- Lazy loading of floor data

### Data Persistence
- Current floor saved to localStorage per map
- User markers saved per map and floor
- Map selection and zoom state preserved

## Development

### Adding New Maps
1. Create new loot JSON file with floor structure
2. Add map configuration to `loadMapData()` function
3. Update navigation to include new map option

### Adding New Floor Levels
1. Update JSON with new floor and level property
2. Add z-index mapping if needed
3. Floor buttons will generate automatically

### Customizing Appearance
- Modify CSS variables in `:root` for color scheme
- Adjust button sizes in `.level-btn` class
- Update responsive breakpoints as needed

## Troubleshooting

### Common Issues
- **Markers not showing**: Check if they're on the current floor
- **Floor buttons not appearing**: Verify JSON structure and level properties
- **Z-index conflicts**: Ensure proper floor level configuration

### Debug Tips
- Use browser console to check floor data loading
- Verify marker floor associations in DOM
- Test with different map configurations

## Future Enhancements

### Potential Features
- 3D floor visualization
- Animated floor transitions
- Multi-floor marker connections
- Floor-specific map images
- Advanced filtering options

### Performance Improvements
- Virtual scrolling for large marker sets
- Web Workers for complex calculations
- Improved caching strategies
