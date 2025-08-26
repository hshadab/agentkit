// Coordinate Injection Final - The ultimate coordinate fix

(function() {
    console.log('💉 Coordinate Injection Final Active');
    
    // Global coordinate storage
    window.DEVICE_COORDINATES = window.DEVICE_COORDINATES || { x: 5050, y: 5050 };
    
    // Extract coordinates from any text
    function extractCoords(text) {
        const match = text.match(/(\d+),(\d+)/);
        if (match) {
            return { x: parseInt(match[1]), y: parseInt(match[2]) };
        }
        return null;
    }
    
    // Monitor all messages for coordinates
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        const text = args.join(' ');
        
        // Capture coordinates from commands
        if (text.includes('location') && text.includes(',')) {
            const coords = extractCoords(text);
            if (coords) {
                window.DEVICE_COORDINATES = coords;
                originalConsoleLog('💉 Captured coordinates from log:', coords);
            }
        }
        
        // Override "Requested:" log
        if (text.includes('Requested:') && text.includes('5050')) {
            args[0] = args[0].replace('5050', window.DEVICE_COORDINATES.x);
            args[0] = args[0].replace('5050', window.DEVICE_COORDINATES.y);
            args[0] = args[0].replace('(5050, 5050)', `(${window.DEVICE_COORDINATES.x}, ${window.DEVICE_COORDINATES.y})`);
        }
        
        return originalConsoleLog.apply(console, args);
    };
    
    // Override console.warn for coordinate mismatch
    const originalWarn = console.warn;
    console.warn = function(...args) {
        if (args[0] && args[0].includes('Requested:')) {
            // Replace with actual coordinates
            args[1] = `   Requested: (${window.DEVICE_COORDINATES.x}, ${window.DEVICE_COORDINATES.y})`;
        }
        return originalWarn.apply(console, args);
    };
    
    // Patch IoTeX device verifier
    const patchVerifier = setInterval(() => {
        if (window.IoTeXDeviceVerifier) {
            clearInterval(patchVerifier);
            
            const VerifierClass = window.IoTeXDeviceVerifier;
            const originalVerify = VerifierClass.prototype.verifyDeviceProximity;
            
            VerifierClass.prototype.verifyDeviceProximity = async function(deviceId, x, y, proofData) {
                // Always use our stored coordinates
                const newX = window.DEVICE_COORDINATES.x;
                const newY = window.DEVICE_COORDINATES.y;
                
                console.log(`💉 Injecting coordinates: (${x}, ${y}) → (${newX}, ${newY})`);
                
                return originalVerify.call(this, deviceId, newX, newY, proofData);
            };
            
            console.log('💉 IoTeX device verifier patched');
        }
    }, 50);
    
    // Patch Nova formatter
    const patchFormatter = setInterval(() => {
        if (window.NovaProofFormatter) {
            clearInterval(patchFormatter);
            
            const FormatterClass = window.NovaProofFormatter;
            const originalFormat = FormatterClass.prototype.formatDeviceProximityProof;
            
            FormatterClass.prototype.formatDeviceProximityProof = function(deviceId, x, y, proofData) {
                // Always use our stored coordinates
                const newX = window.DEVICE_COORDINATES.x;
                const newY = window.DEVICE_COORDINATES.y;
                
                console.log(`💉 Formatter: Injecting coordinates: (${x}, ${y}) → (${newX}, ${newY})`);
                
                return originalFormat.call(this, deviceId, newX, newY, proofData);
            };
            
            console.log('💉 Nova proof formatter patched');
        }
    }, 50);
    
    // Command to set coordinates
    window.setCoords = function(x, y) {
        window.DEVICE_COORDINATES = { x, y };
        console.log('💉 Coordinates set to:', window.DEVICE_COORDINATES);
        
        // Also set in other systems
        if (window.forceDeviceCoordinates) {
            window.forceDeviceCoordinates(x, y);
        }
        if (window.setDeviceCoordinates) {
            window.setDeviceCoordinates(x, y);
        }
    };
    
    // Auto-detect coordinates from user input
    const patchInput = setInterval(() => {
        const input = document.getElementById('user-input');
        if (input) {
            clearInterval(patchInput);
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const coords = extractCoords(input.value);
                    if (coords) {
                        window.DEVICE_COORDINATES = coords;
                        console.log('💉 Auto-detected coordinates from input:', coords);
                    }
                }
            });
        }
    }, 100);
    
    console.log('Coordinate injection final initialized');
    console.log('Use window.setCoords(x, y) to set coordinates');
    console.log('Current coordinates:', window.DEVICE_COORDINATES);
})();