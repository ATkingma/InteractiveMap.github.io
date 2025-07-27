/**
 * Mobile enhancements for Arena Breakout Interactive Map
 * Provides touch optimization, gesture handling, and mobile-specific features
 */

class MobileEnhancements {
    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.isMobile = window.innerWidth <= 768;
        this.sidebarOverlay = null;
        
        this.init();
    }
    
    init() {
        if (this.isTouchDevice) {
            this.setupTouchOptimizations();
            this.setupGestureHandling();
            this.setupViewportHandling();
            this.setupOrientationHandling();
            this.setupIOSSpecifics();
            this.setupAccessibilityFeatures();
        }
        
        if (this.isMobile) {
            this.setupMobileSidebar();
        }
        
        this.setupResponsiveBreakpoints();
        this.addMobileClasses();
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    this.setupMobileSidebar();
                } else {
                    this.cleanupMobileSidebar();
                }
            }
        });
    }
    
    setupMobileSidebar() {
        // Create overlay for mobile sidebar
        this.createSidebarOverlay();
        
        // Handle sidebar tab clicks for mobile
        document.addEventListener('click', (e) => {
            const tabLink = e.target.closest('.leaflet-sidebar-tabs a[href]');
            if (tabLink && this.isMobile) {
                e.preventDefault();
                this.openMobileSidebar();
            }
        });

        // Handle sidebar close for mobile
        document.addEventListener('click', (e) => {
            if (e.target.closest('.leaflet-sidebar-close') && this.isMobile) {
                this.closeMobileSidebar();
            }
        });

        // Close sidebar when clicking overlay
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobile) {
                this.closeMobileSidebar();
            }
        });
        
        // Ensure sidebar starts collapsed on mobile
        setTimeout(() => {
            const sidebar = document.querySelector('.leaflet-sidebar');
            if (sidebar && this.isMobile) {
                sidebar.classList.add('collapsed');
            }
        }, 100);
    }

    createSidebarOverlay() {
        if (this.sidebarOverlay) return;
        
        this.sidebarOverlay = document.createElement('div');
        this.sidebarOverlay.className = 'mobile-sidebar-overlay';
        document.body.appendChild(this.sidebarOverlay);
    }

    openMobileSidebar() {
        const sidebar = document.querySelector('.leaflet-sidebar');
        if (sidebar) {
            sidebar.classList.remove('collapsed');
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.add('active');
            }
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.leaflet-sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
            if (this.sidebarOverlay) {
                this.sidebarOverlay.classList.remove('active');
            }
            // Restore body scroll
            document.body.style.overflow = '';
        }
    }

    cleanupMobileSidebar() {
        if (this.sidebarOverlay) {
            this.sidebarOverlay.remove();
            this.sidebarOverlay = null;
        }
        document.body.style.overflow = '';
    }
    
    addMobileClasses() {
        document.body.classList.add('touch-device');
        
        if (this.isIOS) {
            document.body.classList.add('ios-device');
        }
        
        if (this.isAndroid) {
            document.body.classList.add('android-device');
        }
        
        // Add pixel ratio class for different display densities
        if (this.devicePixelRatio >= 3) {
            document.body.classList.add('high-dpi');
        } else if (this.devicePixelRatio >= 2) {
            document.body.classList.add('retina');
        }
    }
    
    setupTouchOptimizations() {
        // Improve touch responsiveness
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
            }
            
            .touch-target {
                min-height: 44px;
                min-width: 44px;
                touch-action: manipulation;
            }
            
            .leaflet-container {
                -webkit-tap-highlight-color: transparent;
                touch-action: pan-x pan-y;
            }
            
            .leaflet-control-container .leaflet-control {
                touch-action: manipulation;
            }
            
            /* Prevent zoom on input focus */
            input, select, textarea {
                font-size: 16px !important;
                transform-origin: left top;
                transform: scale(1);
            }
            
            /* Improve scrolling on mobile */
            .panel-content {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            }
        `;
        document.head.appendChild(style);
        
        // Add touch-target class to interactive elements
        this.addTouchTargets();
    }
    
    addTouchTargets() {
        const selectors = [
            'button',
            '.nav-link',
            '.mobile-nav-item',
            '.filter-btn',
            '.map-controls .btn',
            '.marker-item',
            '.action-item',
            '.floor-btn',
            '.level-btn'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.classList.add('touch-target');
            });
        });
    }
    
    setupGestureHandling() {
        let touchStartY = 0;
        let touchEndY = 0;
        
        // Handle pull-to-refresh prevention
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            this.handleGesture();
        }, { passive: true });
        
        // Prevent accidental zoom on double tap for UI elements
        const preventZoomElements = document.querySelectorAll('.mobile-nav, .map-controls, .panel-header, .filter-buttons');
        preventZoomElements.forEach(element => {
            let lastTouchEnd = 0;
            element.addEventListener('touchend', (e) => {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
        });
    }
    
    handleGesture() {
        // Can be extended for custom gestures
        const minSwipeDistance = 50;
        const swipeDistance = touchEndY - touchStartY;
        
        if (Math.abs(swipeDistance) < minSwipeDistance) return;
        
        // Custom gesture handling can be added here
    }
    
    setupViewportHandling() {
        // Handle viewport changes and keyboard appearance
        let initialViewportHeight = window.innerHeight;
        
        const updateViewportHeight = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // Detect if keyboard is likely open (significant height reduction)
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                this.adjustForKeyboard(heightDifference);
            } else {
                document.body.classList.remove('keyboard-open');
                this.resetKeyboardAdjustments();
            }
        };
        
        window.addEventListener('resize', updateViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialViewportHeight = window.innerHeight;
                updateViewportHeight();
            }, 500);
        });
    }
    
    adjustForKeyboard(heightDifference) {
        // Adjust map container when keyboard is open
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.height = `calc(100vh - ${heightDifference}px - 120px)`;
        }
        
        // Adjust panels
        const panels = document.querySelectorAll('.left-panel, .right-panel');
        panels.forEach(panel => {
            if (panel.classList.contains('active')) {
                panel.style.height = `calc(100vh - ${heightDifference}px - 60px)`;
            }
        });
    }
    
    resetKeyboardAdjustments() {
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.height = '';
        }
        
        const panels = document.querySelectorAll('.left-panel, .right-panel');
        panels.forEach(panel => {
            panel.style.height = '';
        });
    }
    
    setupOrientationHandling() {
        const handleOrientationChange = () => {
            // Update CSS custom properties for orientation
            const isLandscape = window.innerWidth > window.innerHeight;
            document.documentElement.style.setProperty('--is-landscape', isLandscape ? '1' : '0');
            document.documentElement.style.setProperty('--is-portrait', isLandscape ? '0' : '1');
            
            // Trigger map resize if Leaflet is available
            setTimeout(() => {
                if (window.map && window.map.invalidateSize) {
                    window.map.invalidateSize();
                }
            }, 100);
            
            // Update mobile navigation layout
            this.updateMobileNavLayout(isLandscape);
        };
        
        window.addEventListener('orientationchange', () => {
            setTimeout(handleOrientationChange, 100);
        });
        
        window.addEventListener('resize', handleOrientationChange);
        
        // Initial call
        handleOrientationChange();
    }
    
    updateMobileNavLayout(isLandscape) {
        const mobileNav = document.querySelector('.mobile-nav');
        if (!mobileNav) return;
        
        if (isLandscape && window.innerHeight < 500) {
            mobileNav.classList.add('compact');
        } else {
            mobileNav.classList.remove('compact');
        }
    }
    
    setupIOSSpecifics() {
        if (!this.isIOS) return;
        
        // Handle iOS safe areas
        const style = document.createElement('style');
        style.textContent = `
            .app-container {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }
            
            .mobile-nav {
                padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
            }
            
            .navbar {
                padding-top: env(safe-area-inset-top);
            }
        `;
        document.head.appendChild(style);
        
        // Prevent iOS bounce scrolling on body
        document.body.addEventListener('touchmove', (e) => {
            if (e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle iOS status bar
        if ('standalone' in window.navigator && window.navigator.standalone) {
            document.body.classList.add('standalone');
        }
    }
    
    setupAccessibilityFeatures() {
        // Add accessibility enhancements for mobile
        const addAriaLabels = () => {
            const elements = [
                { selector: '.mobile-menu-btn', label: 'Toggle mobile menu' },
                { selector: '.panel-close', label: 'Close panel' },
                { selector: '.map-controls .btn', label: 'Map control' },
                { selector: '.mobile-nav-item', label: 'Navigation item' }
            ];
            
            elements.forEach(({ selector, label }) => {
                document.querySelectorAll(selector).forEach((element, index) => {
                    if (!element.getAttribute('aria-label')) {
                        element.setAttribute('aria-label', `${label} ${index + 1}`);
                    }
                });
            });
        };
        
        // Add focus indicators for keyboard navigation
        const style = document.createElement('style');
        style.textContent = `
            *:focus {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }
            
            .touch-device *:focus {
                outline: none;
            }
            
            .touch-device *:focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
        
        addAriaLabels();
        
        // Re-add labels when DOM changes
        const observer = new MutationObserver(addAriaLabels);
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    setupResponsiveBreakpoints() {
        const updateBreakpointClass = () => {
            const width = window.innerWidth;
            const classes = ['mobile-xs', 'mobile-sm', 'mobile-md', 'tablet', 'desktop'];
            
            // Remove all breakpoint classes
            document.body.classList.remove(...classes);
            
            // Add appropriate class
            if (width <= 360) {
                document.body.classList.add('mobile-xs');
            } else if (width <= 480) {
                document.body.classList.add('mobile-sm');
            } else if (width <= 768) {
                document.body.classList.add('mobile-md');
            } else if (width <= 1024) {
                document.body.classList.add('tablet');
            } else {
                document.body.classList.add('desktop');
            }
        };
        
        window.addEventListener('resize', updateBreakpointClass);
        updateBreakpointClass(); // Initial call
    }
    
    // Public methods for other scripts to use
    isMobile() {
        return window.innerWidth <= 768;
    }
    
    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }
    
    isLandscape() {
        return window.innerWidth > window.innerHeight;
    }
    
    optimizeMapForMobile(mapInstance) {
        if (!mapInstance || !this.isMobile()) return;
        
        // Optimize map settings for mobile
        mapInstance.options.zoomSnap = 0.5;
        mapInstance.options.zoomDelta = 0.5;
        mapInstance.options.wheelPxPerZoomLevel = 120;
        
        // Disable double click zoom to prevent accidental zooming
        mapInstance.doubleClickZoom.disable();
        
        // Add mobile-specific event handlers
        mapInstance.on('dragstart', () => {
            document.body.classList.add('map-dragging');
        });
        
        mapInstance.on('dragend', () => {
            document.body.classList.remove('map-dragging');
        });
    }
    
    showMobileOptimizedPopup(content, position) {
        // Create mobile-optimized popup
        const popup = document.createElement('div');
        popup.className = 'mobile-popup';
        popup.innerHTML = `
            <div class="mobile-popup-content">
                <div class="mobile-popup-header">
                    <button class="mobile-popup-close" aria-label="Close popup">&times;</button>
                </div>
                <div class="mobile-popup-body">
                    ${content}
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .mobile-popup {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                background: var(--bg-primary);
                border-top: 1px solid var(--border-color);
                border-radius: 12px 12px 0 0;
                max-height: 80vh;
                overflow: hidden;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }
            
            .mobile-popup.active {
                transform: translateY(0);
            }
            
            .mobile-popup-content {
                padding: 1rem;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .mobile-popup-header {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 1rem;
            }
            
            .mobile-popup-close {
                background: none;
                border: none;
                color: var(--text-primary);
                font-size: 1.5rem;
                cursor: pointer;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(popup);
        
        // Show popup
        setTimeout(() => popup.classList.add('active'), 10);
        
        // Handle close
        popup.querySelector('.mobile-popup-close').addEventListener('click', () => {
            popup.classList.remove('active');
            setTimeout(() => popup.remove(), 300);
        });
        
        return popup;
    }
}

// Initialize mobile enhancements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileEnhancements = new MobileEnhancements();
    });
} else {
    window.mobileEnhancements = new MobileEnhancements();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileEnhancements;
}
