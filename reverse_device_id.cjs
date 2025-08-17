// Try to reverse the device ID hash to find the original string
const { ethers } = require('ethers');

const targetHash = '0xcfffa5357c5fd43786eb12ddcdb329fbdf64bc22572e7df40f42c05f3eea6ba8';

console.log('🔍 Trying to reverse device ID hash:', targetHash);

// Test various patterns that might generate this hash
const testPatterns = [
    // Common device ID patterns
    'undefined',
    'null',
    '',
    'PROXIMITY123',
    'device',
    'sensor',
    
    // Numeric patterns
    '123',
    '456', 
    '5050',
    '77777',
    '999999',
    
    // Timestamp-based patterns (around current time)
    'SENSOR_1755341000_123',
    'SENSOR_1755341000_456',
    'SENSOR_1755341000_789',
    
    // Hash might be from a numeric device ID conversion
    '77777', // This could be the hash result from Step 2
    '123456',
    '456789',
    '789012',
];

console.log('\nTesting possible device ID strings:');

for (const pattern of testPatterns) {
    const hash = ethers.utils.id(pattern);
    if (hash === targetHash) {
        console.log(`✅ FOUND MATCH: "${pattern}" -> ${hash}`);
        process.exit(0);
    }
}

console.log('❌ No matches found with common patterns');

// The hash might be from the numeric conversion in the workflow executor
// Let's test if it's from the hash function in workflowExecutor.js
console.log('\nTesting numeric hash conversion from workflowExecutor.js:');

// Test various device ID strings converted to numeric hash
const testDeviceIds = ['PROXIMITY123', 'SENSOR_1755341000_123', 'undefined', 'null'];

for (const deviceIdStr of testDeviceIds) {
    // Replicate the hash function from workflowExecutor.js
    let hash = 0;
    for (let c of deviceIdStr) {
        hash = ((hash * 31) + c.charCodeAt(0)) % 999999;
    }
    const numericId = String(hash);
    
    console.log(`"${deviceIdStr}" -> numeric: ${numericId}`);
    
    // Now hash the numeric string
    const finalHash = ethers.utils.id(numericId);
    console.log(`  -> ethers.utils.id("${numericId}") = ${finalHash}`);
    
    if (finalHash === targetHash) {
        console.log(`✅ FOUND MATCH via numeric conversion: "${deviceIdStr}" -> ${numericId} -> ${finalHash}`);
        process.exit(0);
    }
}

console.log('\n🎯 Conclusion: This device ID hash was likely generated from a numeric conversion that doesn\'t match the registered device ID.');
console.log('This confirms the device ID consistency bug is still present.');