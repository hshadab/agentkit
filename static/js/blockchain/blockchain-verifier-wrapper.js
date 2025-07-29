// Wrapper to export BlockchainVerifier class to window for non-module scripts
// This file bridges the gap between ES6 modules and regular scripts

import { BlockchainVerifier } from './blockchain-verifier.js';

// Export to window for backward compatibility
window.BlockchainVerifier = BlockchainVerifier;

// Log that the module is loaded
console.log('BlockchainVerifier module loaded and exposed to window');