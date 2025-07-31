// Wrapper to expose Avalanche medical integrity module to window
import { avalancheMedicalIntegrity } from '../ui/avalanche-medical-integrity.js';

// Initialize and expose to window
(async () => {
    try {
        await avalancheMedicalIntegrity.init();
        window.avalancheMedicalIntegrity = avalancheMedicalIntegrity;
        console.log('Avalanche Medical Integrity module initialized and exposed to window');
    } catch (error) {
        console.error('Failed to initialize Avalanche Medical Integrity:', error);
    }
})();