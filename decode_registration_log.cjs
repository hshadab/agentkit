// Decode the actual device ID from Step 1 registration logs
const { ethers } = require('ethers');

// From the transaction logs, the ioID shows: "IOTX-1755339670-5fcb7c6051d8"
// The device ID bytes32 from transaction: 0x5fcb7c6051d878eabc5ba1fe61e8381659cb1214644f4871ffa3799ede8a3286

console.log('🔍 Decoding Registration Transaction Log\n');

// Let's try to find what actual device string generates this exact hash
const targetHash = '0x5fcb7c6051d878eabc5ba1fe61e8381659cb1214644f4871ffa3799ede8a3286';

// From the ioID pattern "IOTX-1755339670-5fcb7c6051d8", it seems like the device ID
// might be using the first part of the hash as an identifier

// Try different timestamp variations around 1755339670
const baseTimestamp = 1755339670;
for (let i = -10; i <= 10; i++) {
    for (let random = 0; random <= 1000; random++) {
        const deviceId = `SENSOR_${baseTimestamp + i}_${random}`;
        const hash = ethers.utils.id(deviceId);
        if (hash === targetHash) {
            console.log('✅ FOUND MATCH!');
            console.log(`Device ID: "${deviceId}"`);
            console.log(`Hash: ${hash}`);
            process.exit(0);
        }
    }
}

// If not found with that pattern, try simpler patterns
console.log('Testing other patterns...');

// Maybe it's just the timestamp
const deviceId1 = '1755339670';
const hash1 = ethers.utils.id(deviceId1);
console.log(`"${deviceId1}" -> ${hash1}`);

// Maybe it's a truncated version
const deviceId2 = 'SENSOR_1755339670';
const hash2 = ethers.utils.id(deviceId2);
console.log(`"${deviceId2}" -> ${hash2}`);

// Maybe the frontend is using undefined/null
const deviceId3 = 'undefined';
const hash3 = ethers.utils.id(deviceId3);
console.log(`"${deviceId3}" -> ${hash3}`);

const deviceId4 = 'null';
const hash4 = ethers.utils.id(deviceId4);
console.log(`"${deviceId4}" -> ${hash4}`);

console.log('\n❌ No exact match found. The device ID generation logic needs investigation.');