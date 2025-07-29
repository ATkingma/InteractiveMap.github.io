/**
 * Fixed Ad Blocker Detection Script
 * Enhanced version with better coordination and reliability
 * Usage: Include this script, then check window.adBlockerDetected
 */

(function() {
    'use strict';
    
    // ========== GLOBAL VARIABLES ==========
    window.adBlockerDetected = false;
    window.adBlockerChecked = false;
    window.adBlockerCallbacks = [];
    
    // Configuration
    const config = {
        recheckInterval: 5000,    // Re-check every 5 seconds
        maxRetries: 3,           // Maximum detection attempts
        timeout: 2000,           // Detection timeout in ms
        detectionDelay: 150      // Delay before checking elements
    };
    
    let retryCount = 0;
    let recheckTimer = null;
    let isDetecting = false;
    
    // ========== DETECTION FUNCTIONS ==========
    
    /**
     * Add callback function to be called when detection is complete
     */
    window.onAdBlockerDetected = function(callback) {
        if (typeof callback === 'function') {
            if (window.adBlockerChecked) {
                callback(window.adBlockerDetected);
            } else {
                window.adBlockerCallbacks.push(callback);
            }
        }
    };
    
    /**
     * Create test elements that ad blockers typically block
     */
    function createTestElements() {
        const elements = [];
        
        // Test element 1: Common ad class names
        const testAd1 = document.createElement('div');
        testAd1.className = 'ads advertisement banner-ads ad-container';
        testAd1.id = 'ad-test-element-1';
        testAd1.style.cssText = 'height:1px!important;width:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;visibility:visible!important;opacity:1!important;';
        testAd1.innerHTML = '&nbsp;';
        document.body.appendChild(testAd1);
        elements.push(testAd1);
        
        // Test element 2: Google Ads related
        const testAd2 = document.createElement('div');
        testAd2.className = 'google-ads adsense adsbygoogle';
        testAd2.id = 'ad-test-element-2';
        testAd2.style.cssText = 'height:1px!important;width:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;visibility:visible!important;opacity:1!important;';
        testAd2.innerHTML = '&nbsp;';
        document.body.appendChild(testAd2);
        elements.push(testAd2);
        
        // Test element 3: AdBlock Plus patterns
        const testAd3 = document.createElement('div');
        testAd3.className = 'adsbox ad-banner sponsor-ads';
        testAd3.id = 'ad-test-element-3';
        testAd3.style.cssText = 'height:1px!important;width:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;visibility:visible!important;opacity:1!important;';
        testAd3.innerHTML = '&nbsp;';
        document.body.appendChild(testAd3);
        elements.push(testAd3);
        
        // Test element 4: uBlock Origin patterns
        const testAd4 = document.createElement('div');
        testAd4.className = 'ad-placement promotional-content';
        testAd4.id = 'ad-test-element-4';
        testAd4.style.cssText = 'height:1px!important;width:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;visibility:visible!important;opacity:1!important;';
        testAd4.innerHTML = '&nbsp;';
        document.body.appendChild(testAd4);
        elements.push(testAd4);
        
        return elements;
    }
    
    /**
     * Check if elements are blocked/hidden
     */
    function checkElementsBlocked(elements) {
        let blockedCount = 0;
        
        elements.forEach(function(element) {
            if (!element || !element.parentNode) {
                blockedCount++;
                return;
            }
            
            try {
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                // Check multiple indicators of blocking
                if (rect.height === 0 || 
                    rect.width === 0 ||
                    element.offsetHeight === 0 || 
                    element.offsetWidth === 0 ||
                    computedStyle.display === 'none' || 
                    computedStyle.visibility === 'hidden' ||
                    computedStyle.opacity === '0' ||
                    element.clientHeight === 0) {
                    blockedCount++;
                }
            } catch (e) {
                // If we can't access the element, assume it's blocked
                blockedCount++;
            }
        });
        
        // Consider blocked if more than half of elements are blocked
        return blockedCount > (elements.length / 2);
    }
    
    /**
     * Test if ad-related scripts are blocked
     */
    function testScriptBlocking(callback) {
        const timeout = setTimeout(function() {
            callback(true); // Assume blocked if timeout
        }, config.timeout);
        
        const testScript = document.createElement('script');
        testScript.async = true;
        testScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?cache=' + Date.now();
        
        testScript.onload = function() {
            clearTimeout(timeout);
            if (testScript.parentNode) {
                document.head.removeChild(testScript);
            }
            callback(false); // Script loaded successfully
        };
        
        testScript.onerror = function() {
            clearTimeout(timeout);
            if (testScript.parentNode) {
                document.head.removeChild(testScript);
            }
            callback(true); // Script blocked
        };
        
        try {
            document.head.appendChild(testScript);
        } catch (e) {
            clearTimeout(timeout);
            callback(true); // Error adding script, assume blocked
        }
    }
    
    /**
     * Clean up test elements
     */
    function cleanupTestElements(elements) {
        elements.forEach(function(element) {
            try {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    }
    
    /**
     * Finalize detection and call callbacks
     */
    function finalizeDetection(detected) {
        isDetecting = false;
        window.adBlockerDetected = detected;
        window.adBlockerChecked = true;
        
        // Call all registered callbacks
        window.adBlockerCallbacks.forEach(function(callback) {
            try {
                callback(detected);
            } catch (e) {
                console.warn('Ad blocker callback error:', e);
            }
        });
        
        window.adBlockerCallbacks = [];
        
        // Setup periodic re-checking if ad blocker was detected
        if (detected && !recheckTimer) {
            recheckTimer = setInterval(function() {
                performDetection(true);
            }, config.recheckInterval);
        } else if (!detected && recheckTimer) {
            clearInterval(recheckTimer);
            recheckTimer = null;
        }
        
        console.log('🔍 Ad Blocker Detection Result:', detected ? 'DETECTED' : 'NOT DETECTED');
        
        // Dispatch custom event for other scripts to listen to
        try {
            const event = new CustomEvent('adBlockerDetectionComplete', {
                detail: { detected: detected, timestamp: Date.now() }
            });
            window.dispatchEvent(event);
        } catch (e) {
            // Fallback for older browsers
            console.log('📡 Ad Blocker Detection Complete:', detected);
        }
    }
    
    /**
     * Main detection function
     */
    function performDetection(isRecheck = false) {
        if (isDetecting) return; // Prevent concurrent detections
        
        if (!isRecheck && retryCount >= config.maxRetries) {
            finalizeDetection(false);
            return;
        }
        
        isDetecting = true;
        const testElements = createTestElements();
        
        // Wait for elements to be processed by ad blockers
        setTimeout(function() {
            const elementsBlocked = checkElementsBlocked(testElements);
            
            if (!elementsBlocked) {
                // Test script blocking as additional verification
                testScriptBlocking(function(scriptBlocked) {
                    cleanupTestElements(testElements);
                    
                    const detected = elementsBlocked || scriptBlocked;
                    
                    if (isRecheck && !detected && window.adBlockerDetected) {
                        // Ad blocker was disabled
                        finalizeDetection(false);
                    } else if (!isRecheck) {
                        finalizeDetection(detected);
                    } else {
                        isDetecting = false;
                    }
                });
            } else {
                cleanupTestElements(testElements);
                finalizeDetection(true);
            }
        }, config.detectionDelay);
        
        if (!isRecheck) retryCount++;
    }
    
    // ========== HELPER FUNCTIONS ==========
    
    window.AdBlockerHelpers = {
        /**
         * Check if user has ad blocker
         */
        hasAdBlocker: function() {
            return window.adBlockerDetected === true;
        },
        
        /**
         * Check if detection is complete
         */
        isDetectionComplete: function() {
            return window.adBlockerChecked === true;
        },
        
        /**
         * Wait for detection to complete, then execute callback
         */
        whenReady: function(callback, timeout = 10000) {
            if (typeof callback !== 'function') return;
            
            if (this.isDetectionComplete()) {
                callback(this.hasAdBlocker());
                return;
            }
            
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (this.isDetectionComplete()) {
                    clearInterval(checkInterval);
                    callback(this.hasAdBlocker());
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ Ad blocker detection timeout after', timeout + 'ms');
                    callback(false); // Assume no ad blocker on timeout
                }
            }, 50);
        },
        
        /**
         * Show content only if no ad blocker
         */
        showIfNoAdBlocker: function(element) {
            this.whenReady((hasAdBlocker) => {
                const el = typeof element === 'string' ? document.getElementById(element) : element;
                if (el) {
                    el.style.display = hasAdBlocker ? 'none' : 'block';
                }
            });
        },
        
        /**
         * Show content only if ad blocker detected
         */
        showIfAdBlocker: function(element) {
            this.whenReady((hasAdBlocker) => {
                const el = typeof element === 'string' ? document.getElementById(element) : element;
                if (el) {
                    el.style.display = hasAdBlocker ? 'block' : 'none';
                }
            });
        },
        
        /**
         * Protect a function - only execute if no ad blocker
         */
        protectFunction: function(func, fallback = null) {
            return (...args) => {
                if (this.isDetectionComplete()) {
                    if (this.hasAdBlocker()) {
                        if (fallback) fallback(...args);
                        return false;
                    } else {
                        return func(...args);
                    }
                } else {
                    this.whenReady((hasAdBlocker) => {
                        if (hasAdBlocker) {
                            if (fallback) fallback(...args);
                        } else {
                            func(...args);
                        }
                    });
                }
            };
        },
        
        /**
         * Track ad blocker usage with analytics
         */
        trackAdBlockerEvent: function(eventName = 'adblocker_detected') {
            this.whenReady((hasAdBlocker) => {
                // Google Analytics 4
                if (typeof gtag !== 'undefined') {
                    gtag('event', eventName, {
                        'adblocker_detected': hasAdBlocker,
                        'event_category': 'ad_blocker'
                    });
                }
                
                // Google Analytics Universal
                if (typeof ga !== 'undefined') {
                    ga('send', 'event', 'AdBlocker', eventName, hasAdBlocker ? 'Detected' : 'Not Detected');
                }
                
                // Custom tracking
                if (window.customAnalytics && typeof window.customAnalytics.track === 'function') {
                    window.customAnalytics.track(eventName, { adblocker_detected: hasAdBlocker });
                }
            });
        },
        
        /**
         * Get detection status info
         */
        getStatus: function() {
            return {
                detected: this.hasAdBlocker(),
                checked: this.isDetectionComplete(),
                timestamp: Date.now()
            };
        },
        
        /**
         * Force re-detection
         */
        redetect: function() {
            window.adBlockerChecked = false;
            window.adBlockerDetected = false;
            retryCount = 0;
            isDetecting = false;
            performDetection();
        }
    };
    
    // ========== INITIALIZATION ==========
    
    /**
     * Initialize detection when DOM is ready
     */
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(performDetection, 100);
            });
        } else {
            setTimeout(performDetection, 100);
        }
    }
    
    // Expose manual trigger function
    window.checkAdBlocker = function() {
        AdBlockerHelpers.redetect();
    };
    
    // Start detection
    initialize();
    
})();