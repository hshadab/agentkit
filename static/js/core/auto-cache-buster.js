/**
 * Auto Cache Buster - Forces cache refresh in browser
 */

class AutoCacheBuster {
    constructor() {
        this.cacheBusterKey = 'agentkit_cache_buster';
        this.init();
    }

    init() {
        console.log('🔄 Auto Cache Buster - Initializing...');
        
        // Check if we need to force refresh
        if (this.shouldForceRefresh()) {
            this.forceRefresh();
        }
        
        // Store current cache buster
        this.storeCacheBuster();
        
        // Listen for server restarts
        this.listenForServerRestarts();
    }

    getCurrentCacheBuster() {
        // Extract cache buster from script tag or meta tag
        const scripts = document.querySelectorAll('script[src*="?v="]');
        if (scripts.length > 0) {
            const match = scripts[0].src.match(/\?v=([^&]+)/);
            return match ? match[1] : null;
        }
        
        const metaTag = document.querySelector('meta[content*="timestamp:"]');
        if (metaTag) {
            const match = metaTag.content.match(/timestamp:\s*([^\s]+)/);
            return match ? match[1] : null;
        }
        
        return Date.now().toString();
    }

    getStoredCacheBuster() {
        return localStorage.getItem(this.cacheBusterKey);
    }

    storeCacheBuster() {
        const current = this.getCurrentCacheBuster();
        localStorage.setItem(this.cacheBusterKey, current);
        console.log(`💾 Stored cache buster: ${current}`);
    }

    shouldForceRefresh() {
        const current = this.getCurrentCacheBuster();
        const stored = this.getStoredCacheBuster();
        
        console.log(`🔍 Cache buster check - Current: ${current}, Stored: ${stored}`);
        
        return current && stored && current !== stored;
    }

    forceRefresh() {
        console.log('🔄 Cache buster detected change - forcing refresh...');
        
        // Clear all caches
        this.clearAllCaches();
        
        // Force page reload
        setTimeout(() => {
            window.location.reload(true);
        }, 100);
    }

    clearAllCaches() {
        console.log('🧹 Clearing all caches...');
        
        // Clear localStorage (except essential items)
        const essential = ['wallet_address', 'user_settings'];
        const toKeep = {};
        essential.forEach(key => {
            if (localStorage.getItem(key)) {
                toKeep[key] = localStorage.getItem(key);
            }
        });
        
        localStorage.clear();
        
        // Restore essential items
        Object.entries(toKeep).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear browser cache (if possible)
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
    }

    listenForServerRestarts() {
        // Check for server restarts every 10 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/health-check?' + Date.now());
                if (response.ok) {
                    const data = await response.text();
                    if (data.includes('cache_buster')) {
                        const match = data.match(/cache_buster:\s*([^\s]+)/);
                        if (match) {
                            const serverCacheBuster = match[1];
                            const storedCacheBuster = this.getStoredCacheBuster();
                            
                            if (serverCacheBuster !== storedCacheBuster) {
                                console.log('🔄 Server restart detected - refreshing...');
                                this.forceRefresh();
                            }
                        }
                    }
                }
            } catch (error) {
                // Server might be restarting, ignore errors
            }
        }, 10000);
    }
}

// Initialize auto cache buster when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.autoCacheBuster = new AutoCacheBuster();
    });
} else {
    window.autoCacheBuster = new AutoCacheBuster();
}

export { AutoCacheBuster };