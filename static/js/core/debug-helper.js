// Debug helper to test WebSocket connection
console.log('=== AgentKit Debug Helper Loading ===');

// Add error handler for module loading
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('.js')) {
        console.error('Module loading error:', event.message, 'in', event.filename, 'at line', event.lineno);
    }
});

// Wait for page load
window.addEventListener('DOMContentLoaded', function() {
    console.log('=== Page loaded, checking WebSocket... ===');
    
    // Give modules time to load
    setTimeout(() => {
        // Check if WebSocket manager exists
        if (window.wsManager) {
            console.log('✓ WebSocket Manager found');
            console.log('WebSocket URL:', window.config?.websocket?.url || 'CONFIG NOT FOUND');
            console.log('WebSocket state:', window.wsManager.ws ? window.wsManager.ws.readyState : 'No WebSocket created');
            
            // Log WebSocket states
            if (window.wsManager.ws) {
                const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
                console.log('WebSocket status:', states[window.wsManager.ws.readyState]);
            }
        } else {
            console.error('✗ WebSocket Manager NOT found - modules may not be loaded');
        }
        
        // Test direct WebSocket connection
        console.log('=== Testing direct WebSocket connection ===');
        const testWs = new WebSocket('ws://localhost:8001/ws');
        
        testWs.onopen = () => {
            console.log('✓ Direct WebSocket test: CONNECTION SUCCESS');
            testWs.close();
        };
        
        testWs.onerror = (error) => {
            console.error('✗ Direct WebSocket test: CONNECTION FAILED', error);
        };
        
        testWs.onclose = (event) => {
            console.log('Direct WebSocket test closed:', event.code, event.reason);
        };
        
    }, 2000);
});