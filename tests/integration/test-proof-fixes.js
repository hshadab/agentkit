#!/usr/bin/env node

console.log('🧪 Testing Proof Generation Fixes');
console.log('==================================\n');

console.log('We fixed two issues:');
console.log('1. Location proof was concatenating coordinates incorrectly');
console.log('   - Now properly packs lat/lon/deviceId into 32-bit integer');
console.log('   - NYC (40.7°, -74.0°) -> packed as normalized values\n');

console.log('2. KYC proof parameters are now properly documented');
console.log('   - Takes wallet_hash and kyc_approved as integers\n');

console.log('Manual Test Instructions:');
console.log('-------------------------\n');

console.log('1. Refresh the UI page');
console.log('2. Test location proof with: "Prove location: NYC (40.7°, -74.0°)"');
console.log('   - Should generate proof without parsing errors');
console.log('3. Test KYC proof with: "Generate KYC proof"');
console.log('   - Should work if WASM expects 2 parameters\n');

console.log('Expected packed location format:');
const lat = 103; // ~40.7°N normalized to 0-255
const lon = 182; // ~-74.0°W normalized to 0-255  
const deviceId = 5000;
const packedInput = ((lat & 0xFF) << 24) | ((lon & 0xFF) << 16) | (deviceId & 0xFFFF);
console.log(`NYC coordinates packed: ${packedInput}`);
console.log(`Binary: ${packedInput.toString(2).padStart(32, '0')}`);
console.log(`Lat: ${lat}, Lon: ${lon}, Device: ${deviceId}\n`);

console.log('If KYC still fails with WasmiError:');
console.log('- The compiled WASM might be incompatible');
console.log('- Try recompiling from prove_kyc.wat');
console.log('- Or check zkEngine logs for more details');