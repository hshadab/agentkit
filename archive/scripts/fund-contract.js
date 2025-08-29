import { ethers } from 'ethers';

async function fundContract() {
    try {
        // Connect to IoTeX testnet
        const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
        
        // Contract address
        const contractAddress = '0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14';
        
        console.log('🏦 IoTeX Contract Funding Tool');
        console.log('===============================');
        console.log(`Contract: ${contractAddress}`);
        
        // Check current balance
        const currentBalance = await provider.getBalance(contractAddress);
        console.log(`Current Balance: ${ethers.utils.formatEther(currentBalance)} IOTX`);
        
        // Calculate needed amount
        const needed = ethers.utils.parseEther('1.0'); // Add 1 IOTX for multiple tests
        const current = currentBalance;
        
        console.log(`\n💡 FUNDING INSTRUCTIONS:`);
        console.log(`To fund this contract with 1.0 IOTX:`);
        console.log(`1. Open MetaMask`);
        console.log(`2. Send 1.0 IOTX to: ${contractAddress}`);
        console.log(`3. Or use IoTeX official faucet: https://faucet.iotex.io/`);
        console.log(`4. Current balance: ${ethers.utils.formatEther(current)} IOTX`);
        console.log(`5. Target balance: 1.0+ IOTX`);
        
        console.log(`\n🎯 QUICK FUND WITH METAMASK:`);
        console.log(`- Network: IoTeX Network Testnet`);
        console.log(`- To Address: ${contractAddress}`);
        console.log(`- Amount: 1.0 IOTX`);
        console.log(`- Gas Limit: 21000 (standard transfer)`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fundContract();