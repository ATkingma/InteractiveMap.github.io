# Arena Breakout Interactive Maps

A modern, professional interactive map system for Arena Breakout with advanced multi-floor support, loot management, and mobile optimization.

## 🚀 Features

### 🎯 **Professional Landing Page**
- Modern hero section with animated background
- Interactive map selection with previews
- Responsive design for all devices
- Smooth animations and transitions
- Map difficulty indicators and statistics

### 🗺️ **Advanced Interactive Maps**
- **Canvas-based rendering** for smooth performance
- **Multi-map support** with 6 different Arena Breakout maps
- **Multi-floor system** with numeric level navigation
- **Precision zoom and pan** with smooth controls
- **Touch gesture support** for mobile devices
- **Fullscreen mode** for immersive experience

### 🏢 **Multi-Floor System**
- **Numeric level navigation** (-1 basement, 0 ground, 1 upper)
- **Per-map floor configuration** with custom level definitions
- **Level-based marker filtering** showing only current floor
- **Dynamic level buttons** for quick floor switching
- **Z-index marker layering** for proper visual hierarchy
- **Floor-specific loot containers** with respawn timers

### 📍 **Marker System**
- **5 Marker Types**: Spawn Points, Loot Areas, Extraction Points, Sniper Spots, Danger Zones
- **Loot Quality Levels**: High, Medium, Low tier classification
- **Floor association** - markers linked to specific floors
- **Custom descriptions** and detailed information
- **Persistent storage** - markers saved per map and floor
- **Click-to-place** intuitive interface

### 🔍 **Advanced Filtering**
- **Category filters** with live counts
- **Loot quality filters** for optimization
- **Floor-based filtering** showing only current level
- **Real-time search** across all markers
- **Bulk filter actions** (Clear All, Select All)
- **Visual feedback** with color-coded markers

### 📱 **Mobile Optimization**
- **Responsive design** that works on all screen sizes
- **Touch controls** for pan, zoom, and marker placement
- **Mobile navigation** with bottom tab bar
- **Optimized performance** for mobile devices
- **Swipe gestures** and touch-friendly interface

## 🏗️ **Project Structure**

```
arena-breakout-maps/
├── index.html          # Landing page with map selection
├── map.html           # Interactive map interface
├── landing.css        # Landing page styles
├── landing.js         # Landing page functionality
├── map.css           # Interactive map styles
├── map.js            # Interactive map functionality
├── map.png           # Map image (placeholder for all maps)
└── README.md         # This documentation
```

## 🎮 **How to Use**

### **Getting Started**
1. Open `index.html` in your web browser
2. Browse the available maps in the "Choose Your Battlefield" section
3. Click on any map card to open the interactive map
4. Use the controls to navigate, filter, and add markers

### **Navigation**
- **Pan**: Click and drag on the map
- **Zoom**: Use mouse wheel or zoom controls
- **Reset**: Click the reset button to return to default view
- **Fullscreen**: Press F11 or use the fullscreen button

### **Adding Markers**
1. Click the "Add" tab (mobile) or use the right panel (desktop)
2. Select marker type and fill in details
3. Choose the floor level (or use "Current Floor")
4. Click "Add Marker" button
5. Click on the map where you want to place the marker
6. Your marker is automatically saved with floor association

### **Multi-Floor Navigation**
1. Use level buttons at bottom-left to switch between floors
2. Buttons show numeric levels (e.g., -1, 0, 1)
3. Active floor is highlighted in orange
4. Only available floors for current map are shown
5. Markers filter automatically based on current floor

### **Filtering**
- Use checkboxes to show/hide different marker types
- Filter by loot quality for loot areas
- Floor-based filtering shows only current level markers
- Use the search box to find specific markers
- Use "Clear All" or "Select All" for bulk actions

### **Viewing Marker Details**
- Click on any marker to view detailed information
- See floor level and all associated data
- Edit or delete markers from the popup modal
- View coordinates and marker-specific information

## 🛠️ **Technical Features**

### **Multi-Floor Architecture**
- **JSON-based floor configuration** with level definitions
- **Dynamic floor detection** from loot data files
- **Marker layering** using z-index based on floor level
- **Persistent floor state** saved per map in localStorage
- **Floor-specific filtering** for optimal performance

### **Performance Optimizations**
- **Canvas rendering** for smooth graphics
- **Throttled animations** at 60fps
- **Efficient event handling** with debouncing
- **Lazy loading** for improved startup time
- **Memory management** to prevent leaks

### **Modern JavaScript Features**
- **ES6+ Classes** for clean code structure
- **Async/await** for smooth loading
- **Local Storage** for data persistence
- **Event delegation** for efficient handling
- **Modular architecture** for maintainability

### **Responsive Design**
- **Mobile-first approach** with progressive enhancement
- **Flexible grid system** that adapts to any screen
- **Touch-optimized controls** for mobile devices
- **Scalable vector graphics** for crisp icons
- **Adaptive layouts** for different orientations

## 🎨 **Customization**

### **Adding New Maps**
1. Add map image to the project folder
2. Update `mapConfigs` in `map.js` with new map data
3. Add map card to the landing page HTML
4. Update the map selector dropdown

### **Styling**
- Modify CSS variables in `:root` for global theme changes
- Update marker colors in the CSS classes
- Customize animations and transitions
- Add new marker types by extending the system

### **Functionality**
- Extend marker types in both HTML and JavaScript
- Add new filter categories
- Implement additional map features
- Create custom overlays and tools

## 📱 **Mobile Experience**

### **Responsive Breakpoints**
- **Desktop**: > 768px - Full sidebar layout
- **Tablet**: 481px - 768px - Adapted layout
- **Mobile**: ≤ 480px - Mobile navigation

### **Touch Gestures**
- **Tap**: Select markers or place new ones
- **Drag**: Pan around the map
- **Pinch**: Zoom in and out
- **Double-tap**: Quick zoom

### **Mobile Navigation**
- **Bottom tab bar** for easy thumb access
- **Swipe panels** for filters and tools
- **Optimized hit targets** for touch interaction
- **Haptic feedback** support (where available)

## 🔧 **Browser Support**

### **Supported Browsers**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Android Chrome)

### **Required Features**
- HTML5 Canvas support
- CSS Grid and Flexbox
- JavaScript ES6+
- Local Storage
- Touch events (for mobile)

## 🚀 **Installation & Setup**

### **Basic Setup**
1. Download all files to a folder
2. Ensure `map.png` is in the same directory
3. Open `index.html` in a web browser
4. No server required - runs entirely client-side

### **Web Server Setup** (Optional)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

### **Adding Your Maps**
1. Replace `map.png` with your actual map images
2. Update the `mapConfigs` object in `map.js`
3. Modify the landing page cards to match your maps
4. Adjust marker positions for each map

## 🎯 **Advanced Features**

### **Keyboard Shortcuts**
- **Escape**: Cancel marker placement or close modals
- **Ctrl + F**: Toggle fullscreen mode
- **Ctrl + R**: Reset map view
- **Space**: Quick center on map

### **URL Parameters**
- `?map=mapname`: Load specific map directly
- Deep linking support for sharing specific maps
- Browser history integration

### **Data Persistence**
- Markers saved per map in localStorage
- User preferences remembered
- Session state maintained across page reloads

### **Performance Monitoring**
- Built-in performance metrics
- FPS monitoring for smooth animations
- Memory usage tracking
- Load time optimization

## 🐛 **Troubleshooting**

### **Common Issues**

**Map not loading:**
- Check that `map.png` exists in the project folder
- Verify file paths are correct
- Check browser console for errors

**Markers not saving:**
- Ensure localStorage is enabled in browser
- Check for private browsing mode
- Verify JavaScript is enabled

**Performance issues:**
- Try reducing marker count
- Check browser memory usage
- Disable animations in CSS for slower devices

**Mobile issues:**
- Test on actual mobile devices
- Check touch event support
- Verify viewport meta tag is present

### **Debug Mode**
Add `?debug=true` to the URL to enable debug information:
- Console logging for all actions
- Performance metrics display
- Marker data inspection
- Event tracking

## 🔮 **Future Enhancements**

### **Planned Features**
- **Multi-user collaboration** with real-time updates
- **Import/export** marker data
- **Advanced route planning** with pathfinding
- **Heat maps** for popular areas
- **Custom marker icons** and shapes
- **Measurement tools** for distances
- **Offline mode** with service worker
- **Voice annotations** for markers

### **Integration Possibilities**
- **Discord bot** for sharing maps
- **API endpoints** for external tools
- **Database backend** for shared markers
- **User accounts** and profiles
- **Community features** and ratings

## 📄 **License**

This project is open source and available under the MIT License.

## 🙏 **Credits**

- **Inter Font** - Google Fonts
- **Heroicons** - Icon system
- **Arena Breakout** - Game content inspiration
- **Community** - For feedback and suggestions

---

**Built with ❤️ for the Arena Breakout community**

For questions, suggestions, or contributions, please feel free to reach out!
