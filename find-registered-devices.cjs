const { ethers } = require('ethers');
require('dotenv').config();

async function findRegisteredDevices() {
    console.log("🔍 Finding all registered devices...\n");

    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const contractAddress = "0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14";
    
    const contractABI = [
        "event DeviceRegistered(bytes32 indexed deviceId, address indexed owner, uint256 timestamp, string ioId, string did)",
        "event ProximityVerified(bytes32 indexed deviceId, address indexed verifier, bool withinProximity, uint256 reward, uint256 timestamp)",
        "function getDevice(bytes32 deviceId) view returns (tuple(address owner, bool registered, uint256 registrationTime, string ioId, string did, uint256 totalRewards, bool isVerified))",
        "function totalDevicesRegistered() view returns (uint256)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log("📍 Contract Address:", contractAddress);
    console.log("👤 Checking from wallet:", wallet.address);

    try {
        // Get total devices
        const totalDevices = await contract.totalDevicesRegistered();
        console.log("📊 Total Devices Registered:", totalDevices.toString());

        // Get recent events from the contract (much smaller range)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - 1000; // Last 1000 blocks
        const toBlock = 'latest';
        console.log(`Searching blocks ${fromBlock} to ${currentBlock}`);

        console.log("\n🔍 Searching for DeviceRegistered events...");
        const registrationFilter = contract.filters.DeviceRegistered();
        const registrationEvents = await contract.queryFilter(registrationFilter, fromBlock, toBlock);

        console.log(`Found ${registrationEvents.length} registration events:`);
        for (const event of registrationEvents) {
            console.log(`\n📱 Device Registration:`);
            console.log(`  🆔 Device ID: ${event.args.deviceId}`);
            console.log(`  👤 Owner: ${event.args.owner}`);
            console.log(`  ⏰ Timestamp: ${new Date(Number(event.args.timestamp) * 1000).toISOString()}`);
            console.log(`  🏷️  ioID: ${event.args.ioId}`);
            console.log(`  🔒 DID: ${event.args.did}`);
            console.log(`  🧾 Transaction: https://testnet.iotexscan.io/tx/${event.transactionHash}`);

            // Check device data
            try {
                const deviceData = await contract.getDevice(event.args.deviceId);
                console.log(`  📋 Current Device Data:`);
                console.log(`    ✅ Registered: ${deviceData.registered}`);
                console.log(`    💰 Total Rewards: ${ethers.utils.formatEther(deviceData.totalRewards)} IOTX`);
                console.log(`    ✅ Is Verified: ${deviceData.isVerified}`);
            } catch (err) {
                console.log(`    ❌ Error getting device data: ${err.message}`);
            }
        }

        console.log("\n🔍 Searching for ProximityVerified events...");
        const verificationFilter = contract.filters.ProximityVerified();
        const verificationEvents = await contract.queryFilter(verificationFilter, fromBlock, toBlock);

        console.log(`Found ${verificationEvents.length} verification events:`);
        for (const event of verificationEvents) {
            console.log(`\n✅ Proximity Verification:`);
            console.log(`  🆔 Device ID: ${event.args.deviceId}`);
            console.log(`  👤 Verifier: ${event.args.verifier}`);
            console.log(`  📍 Within Proximity: ${event.args.withinProximity}`);
            console.log(`  💰 Reward: ${ethers.utils.formatEther(event.args.reward)} IOTX`);
            console.log(`  ⏰ Timestamp: ${new Date(Number(event.args.timestamp) * 1000).toISOString()}`);
            console.log(`  🧾 Transaction: https://testnet.iotexscan.io/tx/${event.transactionHash}`);
        }

        // Test specific device IDs
        console.log("\n🧪 Testing specific device IDs:");
        const testDeviceIds = [
            { name: "SENSOR1", id: ethers.utils.id("SENSOR1") },
            { name: "878455", id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("878455")) }
        ];

        for (const testDevice of testDeviceIds) {
            console.log(`\n🔍 Testing device ${testDevice.name}:`);
            console.log(`  📱 Device ID: ${testDevice.id}`);
            try {
                const deviceData = await contract.getDevice(testDevice.id);
                console.log(`  👤 Owner: ${deviceData.owner}`);
                console.log(`  ✅ Registered: ${deviceData.registered}`);
                console.log(`  💰 Total Rewards: ${ethers.utils.formatEther(deviceData.totalRewards)} IOTX`);
            } catch (err) {
                console.log(`  ❌ Error: ${err.message}`);
            }
        }

    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

findRegisteredDevices();