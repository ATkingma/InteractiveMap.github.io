/**
 * Fixed Ad Blocker Popup Script - Improved Version
 * Properly coordinates with the detection script
 * Just include this script and it will automatically show the popup when needed
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        message: "Have you tried our website without an ad blocker yet?",
        yesButtonText: "Yes, but I didn't like it",
        noButtonText: "No, I will never!",
        showDelay: 800,           // Delay before showing popup (ms)
        reshowDelay: 30000,       // Show again after this time if no response (ms)
        pulseDelay: 3000,         // Add pulse animation after this time (ms)
        sessionTimeout: 600000    // 10 minutes - how long to remember user response
    };

    let userResponded = false;
    let popupShown = false;
    let popupCreated = false;
    let reshowTimer = null;

    // ========== POPUP CREATION & MANAGEMENT ==========

    /**
     * Create popup HTML (Arena Breakout Orange Theme - Centered)
     */
    function createPopup() {
        if (popupCreated) return;
        
        const popupHTML = `
            <div id="adblocker-popup-overlay" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2d2d2d;
                border: 2px solid #ff8c00;
                border-radius: 18px;
                padding: 28px 28px 22px 28px;
                box-shadow: 0 10px 32px rgba(0,0,0,0.45);
                z-index: 10000;
                max-width: 370px;
                width: 90vw;
                display: none;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                animation: slideIn 0.5s cubic-bezier(.4,1.4,.6,1);
                color: #fff;
            ">
                <div style="text-align: center; margin-bottom: 18px;">
                    <span style="font-size: 48px; margin-bottom: 10px; display: block;">🙏</span>
                    <h3 style="color: #ff8c00; margin: 0 0 10px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                        Ad Blocker Detected
                    </h3>
                </div>
                <p style="color: #e0e0e0; line-height: 1.5; margin: 0 0 20px 0; text-align: center; font-size: 15px;">
                    ${config.message}
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="adblocker-yes-btn" style="
                        padding: 12px 20px;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: 600;
                        transition: all 0.2s cubic-bezier(.4,1.4,.6,1);
                        min-width: 120px;
                        background: #ff6b35;
                        color: #fff;
                        box-shadow: 0 2px 8px rgba(255,140,0,0.12);
                    ">
                        ${config.yesButtonText}
                    </button>
                    <button id="adblocker-no-btn" style="
                        padding: 12px 20px;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: 600;
                        transition: all 0.2s cubic-bezier(.4,1.4,.6,1);
                        min-width: 120px;
                        background: #ff8c00;
                        color: #fff;
                        box-shadow: 0 2px 8px rgba(255,140,0,0.12);
                    ">
                        ${config.noButtonText}
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                #adblocker-yes-btn:hover {
                    background: #ffb347 !important;
                    color: #222 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(255,179,71,0.25);
                }
                #adblocker-no-btn:hover {
                    background: #ffb347 !important;
                    color: #222 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(255,179,71,0.25);
                }
                @keyframes pulse {
                    0% { box-shadow: 0 10px 32px rgba(255,140,0,0.15); }
                    50% { box-shadow: 0 10px 32px rgba(255,140,0,0.45); }
                    100% { box-shadow: 0 10px 32px rgba(255,140,0,0.15); }
                }
                .popup-pulse {
                    animation: pulse 2s infinite !important;
                }
                @media (max-width: 768px) {
                    #adblocker-popup-overlay {
                        width: 85vw !important;
                        max-width: 320px !important;
                        padding: 20px 16px 16px 16px !important;
                    }
                    #adblocker-popup-overlay > div:last-child {
                        flex-direction: column !important;
                        gap: 8px !important;
                    }
                    #adblocker-yes-btn, #adblocker-no-btn {
                        min-width: auto !important;
                        width: 100% !important;
                        padding: 14px 20px !important;
                    }
                    #adblocker-popup-overlay h3 {
                        font-size: 18px !important;
                    }
                    #adblocker-popup-overlay p {
                        font-size: 14px !important;
                    }
                }
                @media (max-width: 480px) {
                    #adblocker-popup-overlay {
                        width: 90vw !important;
                        max-width: 280px !important;
                        padding: 18px 14px 14px 14px !important;
                    }
                    #adblocker-popup-overlay span {
                        font-size: 40px !important;
                    }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        popupCreated = true;
        
        // Add event listeners
        document.getElementById('adblocker-yes-btn').addEventListener('click', handleYesResponse);
        document.getElementById('adblocker-no-btn').addEventListener('click', handleNoResponse);
        
        console.log('✅ Ad blocker popup created');
    }
    
    // ========== DETECTION INTEGRATION ==========
    
    /**
     * Initialize ad blocker detection integration
     */
    function initializeDetection() {
        // Method 1: Use global detection if available
        if (window.AdBlockerHelpers && typeof window.AdBlockerHelpers.whenReady === 'function') {
            console.log('🔗 Using global AdBlockerHelpers detection');
            window.AdBlockerHelpers.whenReady(function(hasAdBlocker) {
                handleDetectionResult(hasAdBlocker);
            });
        }
        // Method 2: Listen for custom event from detection script
        else if (window.addEventListener) {
            console.log('🔗 Listening for adBlockerDetectionComplete event');
            window.addEventListener('adBlockerDetectionComplete', function(event) {
                if (event.detail && typeof event.detail.detected === 'boolean') {
                    handleDetectionResult(event.detail.detected);
                }
            });
        }
        // Method 3: Poll for detection results
        else {
            console.log('🔗 Polling for detection results');
            let pollCount = 0;
            const maxPolls = 100; // 5 seconds max
            const pollInterval = setInterval(() => {
                pollCount++;
                if (window.adBlockerChecked === true) {
                    clearInterval(pollInterval);
                    handleDetectionResult(window.adBlockerDetected === true);
                } else if (pollCount >= maxPolls) {
                    clearInterval(pollInterval);
                    console.warn('⚠️ Ad blocker detection polling timeout');
                    handleDetectionResult(false); // Assume no ad blocker
                }
            }, 50);
        }
        
        // Fallback: Simple detection if nothing else works
        setTimeout(() => {
            if (!userResponded && !popupShown && !window.adBlockerChecked) {
                console.log('🔗 Using fallback detection method');
                performFallbackDetection();
            }
        }, 3000);
    }
    
    /**
     * Handle detection result
     */
    function handleDetectionResult(hasAdBlocker) {
        console.log('📊 Detection result received:', hasAdBlocker ? 'HAS AD BLOCKER' : 'NO AD BLOCKER');
        
        if (hasAdBlocker && !userResponded && !popupShown) {
            if (checkPreviousResponse()) {
                console.log('📝 User already responded in this session');
                return;
            }
            
            setTimeout(() => {
                if (!userResponded && !popupShown) {
                    showPopup();
                }
            }, config.showDelay);
        }
    }
    
    /**
     * Fallback detection method
     */
    function performFallbackDetection() {
        const test = document.createElement('div');
        test.className = 'ads advertisement banner-ads';
        test.style.cssText = 'height:1px!important;position:absolute!important;left:-9999px!important;visibility:visible!important;';
        test.innerHTML = '&nbsp;';
        document.body.appendChild(test);
        
        setTimeout(() => {
            const adBlockerDetected = test.offsetHeight === 0 || test.clientHeight === 0;
            document.body.removeChild(test);
            handleDetectionResult(adBlockerDetected);
        }, 200);
    }
    
    // ========== POPUP DISPLAY FUNCTIONS ==========
    
    /**
     * Show the popup
     */
    function showPopup() {
        if (userResponded || popupShown) return;
        
        if (!popupCreated) {
            createPopup();
        }
        
        const popup = document.getElementById('adblocker-popup-overlay');
        if (!popup) {
            console.error('❌ Could not find popup element');
            return;
        }
        
        popup.style.display = 'block';
        popupShown = true;
        
        // Add pulse animation for attention
        setTimeout(() => {
            if (popupShown && !userResponded) {
                popup.classList.add('popup-pulse');
            }
        }, config.pulseDelay);
        
        // Set up reshow timer
        if (reshowTimer) clearTimeout(reshowTimer);
        reshowTimer = setTimeout(() => {
            if (!userResponded) {
                hidePopup();
                setTimeout(showPopup, 1000); // Show again after 1 second
            }
        }, config.reshowDelay);
        
        console.log('📢 Ad blocker popup shown');
    }
    
    /**
     * Hide the popup
     */
    function hidePopup() {
        const popup = document.getElementById('adblocker-popup-overlay');
        if (popup) {
            popup.style.display = 'none';
            popup.classList.remove('popup-pulse');
        }
        popupShown = false;
        
        if (reshowTimer) {
            clearTimeout(reshowTimer);
            reshowTimer = null;
        }
    }
    
    // ========== RESPONSE HANDLERS ==========
    
    /**
     * Handle "Yes, but I didn't like it" response
     */
    function handleYesResponse() {
        userResponded = true;
        hidePopup();
        
        console.log('👤 User response: Tried without ad blocker but didn\'t like it');
        
        // Save response for current session
        saveResponseForSession('tried_disliked');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'adblocker_response', {
                'event_category': 'user_feedback',
                'event_label': 'tried_but_disliked'
            });
        }
        
        // Optional: Custom callback
        if (typeof window.onAdBlockerYesResponse === 'function') {
            window.onAdBlockerYesResponse();
        }
    }
    
    /**
     * Handle "No, I will never!" response
     */
    function handleNoResponse() {
        userResponded = true;
        hidePopup();
        
        console.log('👤 User response: Will never disable ad blocker');
        
        // Save response for current session
        saveResponseForSession('never_disable');
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'adblocker_response', {
                'event_category': 'user_feedback',
                'event_label': 'never_disable'
            });
        }
        
        // Optional: Custom callback
        if (typeof window.onAdBlockerNoResponse === 'function') {
            window.onAdBlockerNoResponse();
        }
    }
    
    // ========== SESSION MANAGEMENT ==========
    
    /**
     * Save response for current session only
     */
    function saveResponseForSession(response) {
        try {
            const responseData = {
                response: response,
                time: Date.now(),
                url: window.location.href
            };
            sessionStorage.setItem('adblocker_response_session', JSON.stringify(responseData));
        } catch (e) {
            // Fallback to memory storage if sessionStorage not available
            window.adBlockerSessionResponse = {
                response: response,
                time: Date.now(),
                url: window.location.href
            };
        }
    }
    
    /**
     * Check if user already responded in current session
     */
    function checkPreviousResponse() {
        try {
            const sessionData = sessionStorage.getItem('adblocker_response_session');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                const timeDiff = Date.now() - data.time;
                
                // Only consider response valid if it's less than session timeout
                if (timeDiff < config.sessionTimeout) {
                    userResponded = true;
                    console.log('📝 Found previous session response:', data.response, `(${Math.round(timeDiff/1000)}s ago)`);
                    return true;
                }
            }
        } catch (e) {
            // Check fallback memory storage
            if (window.adBlockerSessionResponse) {
                const timeDiff = Date.now() - window.adBlockerSessionResponse.time;
                if (timeDiff < config.sessionTimeout) {
                    userResponded = true;
                    console.log('📝 Found previous memory response:', window.adBlockerSessionResponse.response);
                    return true;
                }
            }
        }
        return false;
    }
    
    // ========== PUBLIC API ==========
    
    /**
     * Expose functions for customization
     */
    window.AdBlockerPopup = {
        show: showPopup,
        hide: hidePopup,
        isShown: function() {
            return popupShown;
        },
        hasUserResponded: function() {
            return userResponded;
        },
        resetResponse: function() {
            userResponded = false;
            popupShown = false;
            // Clear session storage
            try {
                sessionStorage.removeItem('adblocker_response_session');
            } catch (e) {
                // Clear memory fallback
                delete window.adBlockerSessionResponse;
            }
            console.log('🔄 User response reset');
        },
        getSessionResponse: function() {
            try {
                const sessionData = sessionStorage.getItem('adblocker_response_session');
                if (sessionData) {
                    const data = JSON.parse(sessionData);
                    return data.response;
                }
            } catch (e) {
                return window.adBlockerSessionResponse ? window.adBlockerSessionResponse.response : null;
            }
            return null;
        },
        forceShow: function() {
            userResponded = false;
            popupShown = false;
            showPopup();
        }
    };
    
    // ========== INITIALIZATION ==========
    
    /**
     * Initialize the popup system
     */
    function initialize() {
        // Check if user already responded
        if (checkPreviousResponse()) {
            console.log('📝 User already responded, popup will not be shown');
            return;
        }
        
        // Start detection integration
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDetection);
        } else {
            initializeDetection();
        }
        
        console.log('🚀 Ad blocker popup system initialized');
    }
    
    // Start initialization
    initialize();
    
})();

// ========== AUTO-DEMONSTRATION (Remove in production) ==========
// This section can be removed or commented out for production use

// Uncomment the following line to automatically show popup for testing
// setTimeout(() => { if (window.AdBlockerPopup) window.AdBlockerPopup.forceShow(); }, 2000);