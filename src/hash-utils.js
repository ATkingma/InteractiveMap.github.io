/**
 * Basic Hashing Utilities
 * Simple hashing methods for client-side use with localStorage
 */

class HashUtils {
    /**
     * Simple string hash function (djb2 algorithm)
     * @param {string} str - String to hash
     * @returns {string} - Hexadecimal hash string
     */
    static simpleHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * FNV-1a hash algorithm (faster and better distribution)
     * @param {string} str - String to hash
     * @returns {string} - Hexadecimal hash string
     */
    static fnvHash(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash *= 16777619;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Create a hash from an object (useful for storing complex data)
     * @param {Object} obj - Object to hash
     * @returns {string} - Hexadecimal hash string
     */
    static objectHash(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return this.fnvHash(str);
    }

    /**
     * Create a timestamp-based hash (useful for unique IDs)
     * @param {string} prefix - Optional prefix for the hash
     * @returns {string} - Hexadecimal hash string with timestamp
     */
    static timestampHash(prefix = '') {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        const combined = prefix + timestamp + random;
        return this.fnvHash(combined);
    }

    /**
     * Hash user data for privacy (useful for GDPR compliance)
     * @param {Object} userData - User data object
     * @returns {string} - Hashed representation
     */
    static hashUserData(userData) {
        // Remove sensitive data and hash the rest
        const sanitized = {
            preferences: userData.preferences || {},
            settings: userData.settings || {},
            timestamp: userData.timestamp || Date.now()
        };
        return this.objectHash(sanitized);
    }

    /**
     * Create a hash for localStorage keys (prevents conflicts)
     * @param {string} key - Original key
     * @param {string} namespace - Optional namespace
     * @returns {string} - Hashed key
     */
    static createStorageKey(key, namespace = 'abm') {
        const combined = `${namespace}_${key}`;
        return `${namespace}_${this.simpleHash(combined)}`;
    }

    /**
     * Verify if two objects have the same hash (for data integrity)
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {boolean} - True if hashes match
     */
    static verifyIntegrity(obj1, obj2) {
        return this.objectHash(obj1) === this.objectHash(obj2);
    }

    /**
     * Generate a session hash for tracking (GDPR compliant)
     * @returns {string} - Session hash
     */
    static generateSessionHash() {
        const sessionData = {
            timestamp: Date.now(),
            random: Math.random(),
            userAgent: navigator.userAgent.substring(0, 50) // Limited UA info
        };
        return this.objectHash(sessionData);
    }

    /**
     * Encrypt/hash a value for localStorage storage
     * @param {any} value - Value to hash
     * @returns {string} - Base64 encoded hashed value
     */
    static hashValue(value) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        const hash = this.fnvHash(str);
        // Simple obfuscation with base64
        return btoa(hash + '|' + str);
    }

    /**
     * Decrypt/unhash a value from localStorage
     * @param {string} hashedValue - Hashed value from localStorage
     * @returns {any} - Original value or null if invalid
     */
    static unhashValue(hashedValue) {
        try {
            const decoded = atob(hashedValue);
            const [hash, originalStr] = decoded.split('|', 2);
            
            // Verify hash integrity
            const expectedHash = this.fnvHash(originalStr);
            if (hash === expectedHash) {
                // Try to parse as JSON, fallback to string
                try {
                    return JSON.parse(originalStr);
                } catch {
                    return originalStr;
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Secure localStorage setter with hashing
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @param {string} namespace - Optional namespace
     */
    static setSecureStorage(key, value, namespace = 'abm') {
        const hashedKey = this.createStorageKey(key, namespace);
        const hashedValue = this.hashValue(value);
        localStorage.setItem(hashedKey, hashedValue);
    }

    /**
     * Secure localStorage getter with unhashing
     * @param {string} key - Storage key
     * @param {string} namespace - Optional namespace
     * @returns {any} - Original value or null if not found/invalid
     */
    static getSecureStorage(key, namespace = 'abm') {
        const hashedKey = this.createStorageKey(key, namespace);
        const hashedValue = localStorage.getItem(hashedKey);
        
        if (!hashedValue) return null;
        
        return this.unhashValue(hashedValue);
    }

    /**
     * Remove item from secure storage
     * @param {string} key - Storage key
     * @param {string} namespace - Optional namespace
     */
    static removeSecureStorage(key, namespace = 'abm') {
        const hashedKey = this.createStorageKey(key, namespace);
        localStorage.removeItem(hashedKey);
    }

    /**
     * Check if secure storage item exists
     * @param {string} key - Storage key
     * @param {string} namespace - Optional namespace
     * @returns {boolean} - True if exists
     */
    static hasSecureStorage(key, namespace = 'abm') {
        const hashedKey = this.createStorageKey(key, namespace);
        return localStorage.getItem(hashedKey) !== null;
    }

    /**
     * Clear all secure storage items for a namespace
     * @param {string} namespace - Namespace to clear
     */
    static clearSecureStorage(namespace = 'abm') {
        const prefix = `${namespace}_`;
        const keysToRemove = [];
        
        for (let key in localStorage) {
            if (key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.HashUtils = HashUtils;
}

// Export for Node.js use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HashUtils;
}
