const { ethers } = require('ethers');

async function checkContracts() {
    const provider = new ethers.providers.JsonRpcProvider("https://babel-api.testnet.iotex.io");
    
    const contracts = {
        deviceVerifier: '0x4d36690090D365709eeEA35B90D5d81e481Aef79',
        novaDecider: '0x4EF6152c952dA7A27bb57E8b989348a73aB850d2',
        ioIDRegistry: '0x0A7e595C7889dF3652A19aF52C18377bF17e027D',
        ioID: '0x45Ce3E6f526e597628c73B731a3e9Af7Fc32f5b7'
    };

    console.log("🔍 Checking IoTeX Contract Addresses...\n");

    for (const [name, address] of Object.entries(contracts)) {
        try {
            const code = await provider.getCode(address);
            const balance = await provider.getBalance(address);
            
            if (code === '0x') {
                console.log(`❌ ${name}: ${address}`);
                console.log(`   No contract code deployed`);
            } else {
                console.log(`✅ ${name}: ${address}`);
                console.log(`   Code size: ${code.length} chars, Balance: ${ethers.utils.formatEther(balance)} IOTX`);
            }
        } catch (error) {
            console.log(`❌ ${name}: ${address}`);
            console.log(`   Error: ${error.message}`);
        }
        console.log("");
    }
}

checkContracts();