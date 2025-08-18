// Emergency CCTP Disable - Completely replace the problematic workflow
console.log('🚨 EMERGENCY CCTP DISABLE LOADING...');

function tryEmergencyOverride() {
    console.log('🚨 Attempting to disable problematic CCTP workflow...');
    
    // Replace executeRealCCTPTransfer with a safe version that skips proof generation
    if (typeof window.executeRealCCTPTransfer === 'function') {
        console.log('🚨 Found and overriding executeRealCCTPTransfer...');
        
        window.executeRealCCTPTransfer = async function(parsedCommand) {
            console.log('🚨 EMERGENCY CCTP: Proof generation disabled, blocking with clear error');
            alert('🚨 CCTP workflow disabled to prevent PENDING errors. Check console for details.');
            throw new Error('EMERGENCY: CCTP workflow disabled to prevent PENDING value errors');
        };
        
        console.log('✅ EMERGENCY CCTP: executeRealCCTPTransfer replaced with safe version');
        
    } else {
        console.log('⚠️ executeRealCCTPTransfer not found, will try again in 2 seconds...');
        setTimeout(tryEmergencyOverride, 2000);
    }
}

// Start trying to override after 3 seconds
setTimeout(tryEmergencyOverride, 3000);

// Also try to override after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof window.executeRealCCTPTransfer === 'function' && !window.executeRealCCTPTransfer.emergency_patched) {
            console.log('🚨 Post-load CCTP emergency patch...');
            const original = window.executeRealCCTPTransfer;
            window.executeRealCCTPTransfer = async function(...args) {
                console.log('🚨 EMERGENCY: Blocking CCTP workflow to prevent PENDING errors');
                alert('🚨 CCTP workflow disabled to prevent PENDING errors. Check console for details.');
                throw new Error('CCTP workflow disabled to prevent PENDING value errors');
            };
            window.executeRealCCTPTransfer.emergency_patched = true;
            console.log('✅ EMERGENCY: CCTP workflow disabled');
        }
    }, 5000);
});

console.log('✅ EMERGENCY CCTP disable script loaded');