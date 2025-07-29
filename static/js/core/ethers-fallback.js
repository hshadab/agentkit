// Fallback script to check if ethers.js loaded properly
// This handles the case where the CDN might be down or blocked

window.addEventListener('DOMContentLoaded', function() {
    // Check if ethers loaded
    if (typeof window.ethers === 'undefined') {
        console.error('Ethers.js failed to load from CDN. Some blockchain features may not work.');
        
        // Create a stub to prevent errors
        window.ethers = {
            utils: {},
            providers: {},
            Contract: function() {
                console.warn('Ethers.js not loaded - contract operations will fail');
                return {};
            }
        };
        
        // Show warning to user
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #ff9800; color: white; padding: 10px 20px; border-radius: 4px; z-index: 10000;';
        warningDiv.textContent = 'Warning: Ethers.js library failed to load. Some features may be limited.';
        document.body.appendChild(warningDiv);
        
        // Auto-hide after 5 seconds
        setTimeout(() => warningDiv.remove(), 5000);
    } else {
        console.log('Ethers.js loaded successfully:', ethers.version);
    }
});