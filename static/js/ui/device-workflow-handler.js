// Device Workflow Handler - Manages IoTeX device operations without premature network switching

class DeviceWorkflowHandler {
    constructor() {
        this.pendingDevices = new Map(); // Store device info during proof generation
    }
    
    // Called during proof generation - just store info, don't connect to network
    prepareDeviceProof(deviceId, x, y) {
        console.log(`Preparing device ${deviceId} for proof generation at (${x}, ${y})`);
        this.pendingDevices.set(deviceId, { x, y, timestamp: Date.now() });
        return { success: true, message: 'Device prepared for proof generation' };
    }
    
    // Called when user clicks "Verify on IoTeX" - now we switch networks
    async verifyDeviceOnChain(deviceId, proofData) {
        console.log(`Starting on-chain verification for device ${deviceId}`);
        
        const deviceInfo = this.pendingDevices.get(deviceId);
        if (!deviceInfo) {
            console.error('Device info not found');
            return { success: false, error: 'Device info not found' };
        }
        
        // Now trigger the actual IoTeX verification with network switch
        return await window.verifyDeviceProximityOnIoTeX(
            deviceId, 
            deviceInfo.x, 
            deviceInfo.y, 
            proofData
        );
    }
    
    // Register device on IoTeX (separate from proof generation)
    async registerDevice(deviceId) {
        console.log(`Registering device ${deviceId} on IoTeX`);
        return await window.registerDeviceOnIoTeX(deviceId);
    }
}

// Create global instance
window.deviceWorkflowHandler = new DeviceWorkflowHandler();

// Override the proof generation hook to avoid network switching
const originalVerifyDevice = window.verifyDeviceProximityOnIoTeX;
window.verifyDeviceProximityOnIoTeXDuringProof = function(deviceId, x, y) {
    // During proof generation, just prepare the device
    return window.deviceWorkflowHandler.prepareDeviceProof(deviceId, x, y);
};

console.log('Device workflow handler initialized');