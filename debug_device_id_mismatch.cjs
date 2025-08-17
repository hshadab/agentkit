// Debug device ID mismatch between Step 1 and Step 3
const { ethers } = require('ethers');

// From Step 1 registration transaction 0x44d26801b0d78b1f129e7f447a1bf8c1d0768e45a24d66925ad2ef47b5fb88c3
// Input data shows function call with deviceId and deviceType
const inputData = "0x84e3c5c95fcb7c6051d878eabc5ba1fe61e8381659cb1214644f4871ffa3799ede8a32860000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000673656e736f720000000000000000000000000000000000000000000000000000";

console.log('🔍 Debugging Device ID Mismatch\n');

// The first parameter (after function selector) is the deviceId (bytes32)
const deviceIdFromStep1 = inputData.slice(10, 74); // Skip 4-byte function selector (84e3c5c9), take next 32 bytes
const deviceIdBytes32 = '0x' + deviceIdFromStep1;

console.log('Step 1 Registration:');
console.log('  - Device ID (bytes32):', deviceIdBytes32);

// From the transaction logs, we can see the actual device string used
// Let's decode what device string would generate this bytes32
// The logs show ioID: "IOTX-1755339670-5fcb7c6051d8" 
// This suggests the device string was truncated or different

// Common device ID patterns to test
const possibleDeviceIds = [
    'SENSOR_1755339670_823',  // Pattern we expect
    'SENSOR1',                // Old hardcoded value
    'SENSOR_1755339673_SENSOR', // From the ioID pattern
];

console.log('\nDevice ID Hash Testing:');
possibleDeviceIds.forEach(deviceId => {
    const hash = ethers.utils.id(deviceId);
    const match = hash === deviceIdBytes32;
    console.log(`  - "${deviceId}"`);
    console.log(`    Hash: ${hash}`);
    console.log(`    Match: ${match ? '✅ YES' : '❌ NO'}`);
});

console.log('\n🎯 Root Cause Analysis:');
console.log('The issue is that Step 1 and Step 3 are using DIFFERENT device IDs');
console.log('This causes Step 3 verification to fail with "Device not registered"');
console.log('\n💡 Solution: Ensure the SAME device ID is used throughout the workflow');