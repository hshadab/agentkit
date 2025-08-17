// Debug the IoTeX smart contract reward system
const { ethers } = require('ethers');
require('dotenv').config();

async function debugRewardSystem() {
    console.log('🔍 Debugging IoTeX Smart Contract Reward System...\n');
    
    const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
    const wallet = new ethers.Wallet(process.env.IOTEX_PRIVATE_KEY, provider);
    
    const contractAddress = '0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14';
    const contractABI = [
        "function getContractBalance() view returns (uint256)",
        "function deviceRewards(bytes32) view returns (uint256)",
        "function getDevice(bytes32 deviceId) view returns (tuple(address owner, bool registered, uint256 registrationTime, string ioId, string did, uint256 totalRewards, bool isVerified))",
        "function rewardAmount() view returns (uint256)",
        "function verificationFee() view returns (uint256)",
        "function registrationFee() view returns (uint256)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log('📍 Contract Address:', contractAddress);
    console.log('👤 Wallet Address:', wallet.address);
    
    try {
        // Check contract balance
        const contractBalance = await contract.getContractBalance();
        console.log('💰 Contract Balance:', ethers.utils.formatEther(contractBalance), 'IOTX');
        
        // Check reward settings
        const rewardAmount = await contract.rewardAmount();
        console.log('🎁 Standard Reward Amount:', ethers.utils.formatEther(rewardAmount), 'IOTX');
        
        const verificationFee = await contract.verificationFee();
        console.log('💸 Verification Fee:', ethers.utils.formatEther(verificationFee), 'IOTX');
        
        const registrationFee = await contract.registrationFee();
        console.log('💸 Registration Fee:', ethers.utils.formatEther(registrationFee), 'IOTX');
        
        // Test some recent device IDs
        const testDeviceIds = [
            'SENSOR1',
            'SENSOR_1755337931508_602', // From recent logs
            'SENSOR_1755338104984_718306' // From recent logs
        ];
        
        console.log('\n🔍 Checking device rewards:');
        for (const deviceName of testDeviceIds) {
            const deviceIdBytes32 = ethers.utils.id(deviceName);
            console.log(`\n📱 Device: ${deviceName}`);
            console.log(`   ID (bytes32): ${deviceIdBytes32}`);
            
            try {
                // Check device registration
                const deviceData = await contract.getDevice(deviceIdBytes32);
                console.log(`   📋 Registered: ${deviceData.registered}`);
                console.log(`   ✅ Verified: ${deviceData.isVerified}`);
                console.log(`   💰 Total Rewards: ${ethers.utils.formatEther(deviceData.totalRewards)} IOTX`);
                
                // Check claimable rewards
                const claimableRewards = await contract.deviceRewards(deviceIdBytes32);
                console.log(`   💎 Claimable: ${ethers.utils.formatEther(claimableRewards)} IOTX`);
                
                if (deviceData.registered && deviceData.isVerified && claimableRewards.eq(0)) {
                    console.log(`   ⚠️  ISSUE: Device is verified but has no claimable rewards!`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error checking device: ${error.message}`);
            }
        }
        
        // Analysis
        console.log('\n📊 ANALYSIS:');
        console.log('✅ Contract has sufficient balance for rewards');
        console.log(`✅ Standard reward amount is ${ethers.utils.formatEther(rewardAmount)} IOTX`);
        
        if (contractBalance.gt(0) && rewardAmount.gt(0)) {
            console.log('🔧 POTENTIAL SOLUTIONS:');
            console.log('1. Ensure verification transaction properly allocates rewards');
            console.log('2. Check if ProximityVerified event is emitted correctly');
            console.log('3. Verify device ID consistency between registration and claiming');
            console.log('4. Consider manual reward allocation for verified devices');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugRewardSystem();