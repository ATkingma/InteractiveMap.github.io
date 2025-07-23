/**
 * Ad Blocker Detection and Monetization System
 * Detects ad blockers and manages alternative monetization for custom markers
 */

class AdBlockerManager {
    constructor() {
        this.adBlockDetected = false;
        this.consentGiven = false;
        this.userHash = null;
        this.popupShown = false;
        this.init();
    }

    async init() {
        // Only check GDPR consent if not already given
        if (!this.hasGDPRConsent()) {
            await this.checkGDPRConsent();
        } else {
            // Load existing consent
            const consent = this.getStoredConsent();
            if (consent) {
                this.consentGiven = consent.advertising || false;
                console.log('Using existing GDPR consent:', consent);
            }
        }
        
        await this.detectAdBlocker();
        this.generateUserHash();
        this.setupEventListeners();
    }

    async checkGDPRConsent() {
        const consent = this.getStoredConsent();
        const consentGiven = localStorage.getItem('gdpr_consent_given');
        
        if (consent && consentGiven === 'true') {
            this.consentGiven = consent.advertising || false;
            console.log('GDPR consent already given - loading from storage:', consent);
            return true;
        } else {
            console.log('No GDPR consent found - showing mandatory popup');
            this.showMandatoryGDPRPopup();
            return false;
        }
    }

    showMandatoryGDPRPopup() {
        // Double-check if consent was already given
        const consentGiven = localStorage.getItem('gdpr_consent_given');
        if (consentGiven === 'true') {
            console.log('Consent already given - not showing popup');
            return;
        }

        // Check if popup already exists
        if (document.getElementById('mandatory-gdpr-popup')) return;

        const popup = document.createElement('div');
        popup.id = 'mandatory-gdpr-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 50000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        popup.innerHTML = `
            <div style="
           background: linear-gradient(135deg, #000000, #333333);
                border-radius: 16px;
                padding: 2.5rem;
                max-width: 600px;
                width: 90%;
                margin: 1rem;
                border: 2px solid var(--primary-color, #ff8c00);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
                position: relative;
            ">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="color: var(--primary-color, #ff8c00); font-size: 3rem; margin-bottom: 1rem;">GDPR</div>
                    <h2 style="color: white; margin-bottom: 0.5rem; font-size: 1.5rem;">Cookie Consent Required</h2>
                    <p style="color: #ccc; margin: 0; font-size: 0.9rem;">We need your consent to continue</p>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <p style="color: #ddd; margin-bottom: 1.5rem; line-height: 1.5;">
                        We use cookies to provide our interactive map service and show relevant advertisements. 
                        Please choose your preferences below:
                    </p>
                    
                    <div style="space-y: 1rem;">
                        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #4CAF50;">
                            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: not-allowed; opacity: 0.7;">
                                <input type="checkbox" id="popup-essential" checked disabled style="margin-top: 0.25rem; cursor: not-allowed;">
                                <div style="color: #ddd;">
                                    <strong style="color: white;">Essential Cookies (Required)</strong><br>
                                    <small style="color: #aaa;">Necessary for website functionality</small>
                                </div>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="popup-analytics" checked style="margin-top: 0.25rem;">
                                <div style="color: #ddd;">
                                    <strong style="color: white;">Analytics Cookies</strong><br>
                                    <small style="color: #aaa;">Help us improve the website</small>
                                </div>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="popup-advertising" checked style="margin-top: 0.25rem;">
                                <div style="color: #ddd;">
                                    <strong style="color: white;">Advertising Cookies</strong><br>
                                    <small style="color: #aaa;">Support our free service with relevant ads</small>
                                </div>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                                <input type="checkbox" id="popup-functional" style="margin-top: 0.25rem;">
                                <div style="color: #ddd;">
                                    <strong style="color: white;">Functional Cookies</strong><br>
                                    <small style="color: #aaa;">Remember your preferences and settings</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button id="popup-accept-selected" style="
                        background: var(--primary-color, #ff8c00);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                        min-width: 120px;
                    ">Accept Selected</button>
                    <button id="popup-accept-all" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                        min-width: 120px;
                    ">Accept All</button>
                    <button id="popup-essential-only" style="
                        background: transparent;
                        color: #ccc;
                        border: 1px solid #555;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                        min-width: 120px;
                    ">Essential Only</button>
                </div>
                
                <div style="margin-top: 1.5rem; text-align: center;">
                    <p style="color: #888; font-size: 0.8rem; margin: 0;">
                        You can change your preferences anytime in our 
                        <a href="gdpr.html" style="color: var(--primary-color, #ff8c00); text-decoration: none;">GDPR settings</a> or 
                        <a href="privacy-policy.html" style="color: var(--primary-color, #ff8c00); text-decoration: none;">Privacy Policy</a>
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Add event listeners
        document.getElementById('popup-accept-selected').onclick = () => this.acceptSelectedCookies();
        document.getElementById('popup-accept-all').onclick = () => this.acceptAllCookiesFromPopup();
        document.getElementById('popup-essential-only').onclick = () => this.acceptEssentialOnly();

        // Add hover effects
        const buttons = popup.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });
        });

        // Prevent closing by clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    showGDPRBanner() {
        if (document.getElementById('gdpr-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'gdpr-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 1rem;
            z-index: 10000;
            border-top: 2px solid var(--primary-color);
            backdrop-filter: blur(10px);
        `;

        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="flex: 1; min-width: 300px;">
                    <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">Cookie Notice</h3>
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">
                        We use cookies and similar technologies to provide our interactive map service and show relevant ads. 
                        <a href="privacy-policy.html" style="color: var(--primary-color);">Privacy Policy</a> | 
                        <a href="gdpr.html" style="color: var(--primary-color);">GDPR Info</a>
                    </p>
                </div>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button id="gdpr-accept" style="
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">Accept All</button>
                    <button id="gdpr-essential" style="
                        background: transparent;
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">Essential Only</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('gdpr-accept').onclick = () => this.acceptGDPR(true);
        document.getElementById('gdpr-essential').onclick = () => this.acceptGDPR(false);
    }

    acceptSelectedCookies() {
        const consent = {
            essential: true, // Always true
            analytics: document.getElementById('popup-analytics').checked,
            advertising: document.getElementById('popup-advertising').checked,
            functional: document.getElementById('popup-functional').checked,
            timestamp: Date.now(),
            version: '1.0'
        };

        this.saveConsent(consent);
        this.removeMandatoryPopup();
    }

    acceptAllCookiesFromPopup() {
        const consent = {
            essential: true,
            analytics: true,
            advertising: true,
            functional: true,
            timestamp: Date.now(),
            version: '1.0'
        };

        this.saveConsent(consent);
        this.removeMandatoryPopup();
    }

    acceptEssentialOnly() {
        const consent = {
            essential: true,
            analytics: false,
            advertising: false,
            functional: false,
            timestamp: Date.now(),
            version: '1.0'
        };

        this.saveConsent(consent);
        this.removeMandatoryPopup();
    }

    saveConsent(consent) {
        localStorage.setItem('gdpr_consent', JSON.stringify(consent));
        localStorage.setItem('gdpr_consent_given', 'true');
        
        this.consentGiven = consent.advertising;
        
        console.log('GDPR consent saved to localStorage:', consent);
        
        if (consent.advertising) {
            this.loadAdvertisements();
        }
        
        this.showNotification('Your cookie preferences have been saved', 'success');
    }

    removeMandatoryPopup() {
        const popup = document.getElementById('mandatory-gdpr-popup');
        if (popup) {
            popup.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => popup.remove(), 300);
        }
    }

    updateConsent(newConsent) {
        this.consentGiven = newConsent.advertising;
        if (newConsent.advertising && !this.adBlockDetected) {
            this.loadAdvertisements();
        }
    }

    async detectAdBlocker() {
        return new Promise((resolve) => {
            // Method 1: Try to load a fake ad element
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox adsbygoogle adnxs';
            testAd.style.cssText = 'width: 1px; height: 1px; position: absolute; left: -9999px;';
            
            document.body.appendChild(testAd);

            setTimeout(() => {
                const detected1 = testAd.offsetHeight === 0;
                testAd.remove();

                // Method 2: Check for common ad blocker indicators
                const detected2 = this.checkAdBlockerIndicators();

                // Method 3: Try to create a fake ad request
                this.testAdRequest().then(detected3 => {
                    this.adBlockDetected = detected1 || detected2 || detected3;
                    this.storeAdBlockerStatus();
                    resolve(this.adBlockDetected);
                });
            }, 100);
        });
    }

    checkAdBlockerIndicators() {
        // Check for common ad blocker extensions
        const adBlockerSelectors = [
            '#adblock',
            '.adblock',
            '[class*="adblock"]',
            '[id*="adblock"]'
        ];

        for (const selector of adBlockerSelectors) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // Check if common ad domains are blocked
        try {
            const img = new Image();
            img.src = 'https://googleads.g.doubleclick.net/pagead/id';
            return false; // If this doesn't throw, no blocker
        } catch (e) {
            return true;
        }
    }

    async testAdRequest() {
        try {
            const response = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return false; // If successful, no ad blocker
        } catch (e) {
            return true; // If blocked, ad blocker present
        }
    }

    generateUserHash() {
        const stored = localStorage.getItem('user_hash');
        if (stored) {
            this.userHash = stored;
            return;
        }

        // Create a hash based on browser characteristics and timestamp
        const data = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: Date.now(),
            random: Math.random()
        };

        // Simple hash function
        this.userHash = this.simpleHash(JSON.stringify(data));
        localStorage.setItem('user_hash', this.userHash);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    storeAdBlockerStatus() {
        const data = {
            detected: this.adBlockDetected,
            timestamp: Date.now(),
            userHash: this.userHash
        };
        
        localStorage.setItem('adblocker_status', JSON.stringify(data));
    }

    getAdBlockerStatus() {
        const stored = localStorage.getItem('adblocker_status');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // Refresh detection every 24 hours
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    return data.detected;
                }
            } catch (e) {
                console.log('Error parsing adblocker status:', e);
            }
        }
        return this.adBlockDetected;
    }

    shouldShowPopupAd() {
        if (!this.adBlockDetected || !this.consentGiven) return false;
        
        const lastPopup = localStorage.getItem('last_popup_ad');
        if (lastPopup) {
            const timeSince = Date.now() - parseInt(lastPopup);
            // Show popup max once per hour
            if (timeSince < 60 * 60 * 1000) return false;
        }

        return true;
    }

    showPopupAd() {
        if (!this.shouldShowPopupAd() || this.popupShown) return;

        this.popupShown = true;
        localStorage.setItem('last_popup_ad', Date.now().toString());

        const popup = document.createElement('div');
        popup.id = 'popup-ad';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        popup.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #000000, #333333);
                border-radius: 12px;
                padding: 2rem;
                max-width: 500px;
                margin: 1rem;
                text-align: center;
                border: 1px solid var(--primary-color);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            ">
                <div style="color: var(--primary-color); font-size: 3rem; margin-bottom: 1rem;">AD</div>
                <h2 style="color: white; margin-bottom: 1rem;">Support Arena Breakout Maps</h2>
                <p style="color: #ccc; margin-bottom: 1.5rem; line-height: 1.5;">
                    We noticed you're using an ad blocker. Our interactive maps are free thanks to advertising revenue. 
                    Please consider supporting us by whitelisting our site or disabling your ad blocker.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button id="popup-disable-blocker" style="
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">How to Disable</button>
                    <button id="popup-continue" style="
                        background: transparent;
                        color: #ccc;
                        border: 1px solid #444;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Continue Anyway</button>
                </div>
                <p style="color: #666; font-size: 0.8rem; margin-top: 1rem;">
                    This message appears when using custom marker features with an ad blocker.
                </p>
            </div>
        `;

        document.body.appendChild(popup);

        document.getElementById('popup-disable-blocker').onclick = () => this.showAdBlockerInstructions();
        document.getElementById('popup-continue').onclick = () => popup.remove();

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (document.getElementById('popup-ad')) {
                popup.remove();
            }
        }, 10000);
    }

    showAdBlockerInstructions() {
        document.getElementById('popup-ad')?.remove();
        
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            color: black;
            padding: 2rem;
            border-radius: 12px;
            max-width: 600px;
            z-index: 20001;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;

        instructions.innerHTML = `
            <h3>How to Disable Ad Blocker for Our Site</h3>
            <div style="text-align: left; margin: 1rem 0;">
                <h4>uBlock Origin:</h4>
                <ol>
                    <li>Click the uBlock Origin icon in your browser</li>
                    <li>Click the power button to disable it for this site</li>
                    <li>Refresh the page</li>
                </ol>
                
                <h4>AdBlock Plus:</h4>
                <ol>
                    <li>Click the AdBlock Plus icon</li>
                    <li>Click "Enabled on this site" to toggle it off</li>
                    <li>Refresh the page</li>
                </ol>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 6px;
                cursor: pointer;
            ">Got it!</button>
        `;

        document.body.appendChild(instructions);
    }

    loadAdvertisements() {
        if (!this.consentGiven || this.adBlockDetected) return;

        // Load Google AdSense or other ad networks
        const adScript = document.createElement('script');
        adScript.async = true;
        adScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX';
        adScript.crossOrigin = 'anonymous';
        document.head.appendChild(adScript);
    }

    hasGDPRConsent() {
        const consent = localStorage.getItem('gdpr_consent_given');
        const consentData = this.getStoredConsent();
        
        if (consent === 'true' && consentData) {
            // Check if consent is not too old (optional: expire after 1 year)
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            if (consentData.timestamp && (Date.now() - consentData.timestamp) > oneYear) {
                console.log('GDPR consent expired - clearing storage');
                localStorage.removeItem('gdpr_consent_given');
                localStorage.removeItem('gdpr_consent');
                return false;
            }
            return true;
        }
        return false;
    }

    needsGDPRConsent() {
        return !this.hasGDPRConsent();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `gdpr-notification gdpr-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    setupEventListeners() {
        // Monitor custom marker usage
        document.addEventListener('customMarkerUsed', () => {
            if (this.adBlockDetected) {
                this.showPopupAd();
            }
        });
    }

    // Public method to check if user can use premium features
    canUsePremiumFeatures() {
        return !this.adBlockDetected || this.popupShown;
    }

    // Public method to trigger popup when using custom markers
    handleCustomMarkerUsage() {
        if (this.adBlockDetected && this.consentGiven) {
            this.showPopupAd();
        }
        
        // Dispatch event for tracking
        document.dispatchEvent(new CustomEvent('customMarkerUsed', {
            detail: { userHash: this.userHash, adBlockDetected: this.adBlockDetected }
        }));
    }

    // Debug method to clear all consent (for testing)
    clearAllConsent() {
        localStorage.removeItem('gdpr_consent_given');
        localStorage.removeItem('gdpr_consent');
        this.consentGiven = false;
        console.log('All GDPR consent cleared - reload page to see popup again');
    }

    // Helper method to get stored consent data
    getStoredConsent() {
        try {
            const stored = localStorage.getItem('gdpr_consent');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.log('Error parsing stored consent:', e);
            return null;
        }
    }
}

// Initialize the ad blocker manager
window.adBlockerManager = new AdBlockerManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdBlockerManager;
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
        return AdBlockerManager;
    });
}
