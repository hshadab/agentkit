// Force reload with cache busting
(function() {
    // Use a fixed version that we manually update when needed
    const CACHE_VERSION = '20250824-0847';
    
    // Check if we need to force reload
    const lastVersion = localStorage.getItem('app_cache_version');
    
    if (lastVersion && lastVersion !== CACHE_VERSION) {
        console.log('🔄 Cache version changed from', lastVersion, 'to', CACHE_VERSION, '- forcing hard reload...');
        localStorage.setItem('app_cache_version', CACHE_VERSION);
        
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Force hard reload ONCE
        window.location.reload(true);
    } else if (!lastVersion) {
        // First visit - just set the version
        localStorage.setItem('app_cache_version', CACHE_VERSION);
        console.log('✅ Initial cache version set:', CACHE_VERSION);
    } else {
        console.log('✅ Cache version unchanged:', CACHE_VERSION);
    }
    
    // Also add cache-busting to dynamic imports
    const originalImport = window.import;
    if (originalImport) {
        window.import = function(url) {
            if (typeof url === 'string' && url.includes('.js')) {
                const separator = url.includes('?') ? '&' : '?';
                url = url + separator + 'cb=' + CACHE_VERSION;
            }
            return originalImport.call(this, url);
        };
    }
})();