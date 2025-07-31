// Emergency script to stop page refresh loop
console.log('[STOP-REFRESH] Disabling chain change reloads...');

// Override the reload function temporarily
const originalReload = window.location.reload;
window.location.reload = function() {
    console.log('[STOP-REFRESH] Blocked a reload attempt');
    console.trace('Reload blocked from:');
};

// Try to block href changes if possible
let reloadCount = 0;
try {
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    if (originalHref && originalHref.configurable) {
        Object.defineProperty(window.location, 'href', {
            get: function() {
                return originalHref.get.call(this);
            },
            set: function(value) {
                reloadCount++;
                console.log(`[STOP-REFRESH] Blocked href change attempt #${reloadCount} to:`, value);
                console.trace('Href change blocked from:');
                // Don't actually change the href
            }
        });
    } else {
        console.log('[STOP-REFRESH] Cannot redefine location.href - property is non-configurable');
    }
} catch (e) {
    console.log('[STOP-REFRESH] Error blocking href changes:', e.message);
}

// Remove ethereum event listeners after a delay
setTimeout(() => {
    if (window.ethereum) {
        console.log('[STOP-REFRESH] Removing chainChanged listeners...');
        window.ethereum.removeAllListeners('chainChanged');
    }
}, 1000);

console.log('[STOP-REFRESH] Protection active');