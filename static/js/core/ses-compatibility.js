// SES Compatibility Script
// This helps handle SES (Secure ECMAScript) warnings from snarkjs

// Suppress SES warnings if they are not critical
if (typeof window !== 'undefined') {
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    // Filter out specific SES warnings that are not critical
    console.warn = function(...args) {
        const message = args[0];
        if (typeof message === 'string' && 
            (message.includes('SES') || 
             message.includes('lockdown') ||
             message.includes('dateTaming') ||
             message.includes('mathTaming') ||
             message.includes('intrinsics'))) {
            // Suppress these warnings as they are from snarkjs internals
            return;
        }
        originalConsoleWarn.apply(console, args);
    };
    
    console.log = function(...args) {
        const message = args[0];
        if (typeof message === 'string' && 
            (message.includes('SES_UNCAUGHT_EXCEPTION') ||
             message.includes('lockdown-install'))) {
            // Log these as debug instead of error
            console.debug('[SES Warning]', ...args);
            return;
        }
        originalConsoleLog.apply(console, args);
    };
}

// Add global error handler for uncaught SES exceptions
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('SES_UNCAUGHT_EXCEPTION')) {
        console.debug('[SES Exception Caught]', event.message);
        event.preventDefault(); // Prevent the default error handling
    }
});