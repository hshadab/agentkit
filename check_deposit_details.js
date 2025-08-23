import { ethers } from 'ethers';

async function checkDepositDetails() {
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const txHash = '0x6f6dc8e201ba5d944a9196c2ba30ca790db8878d0eda68500ebf3c52a853954f';
    
    console.log('🔍 Analyzing deposit transaction...\n');
    
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    const currentBlock = await provider.getBlockNumber();
    
    // Decode the deposit function call
    const iface = new ethers.utils.Interface([
        'function deposit(address token, uint256 amount)'
    ]);
    
    try {
        const decoded = iface.parseTransaction({ data: tx.data });
        const amount = ethers.utils.formatUnits(decoded.args.amount, 6);
        
        console.log('✅ DEPOSIT DETAILS:');
        console.log('   Method: deposit()');
        console.log('   Token:', decoded.args.token);
        console.log('   Amount:', amount, 'USDC');
        console.log('   From:', tx.from);
        console.log('   To (Gateway):', tx.to);
        console.log('   Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
        console.log('');
        
        const blocksConfirmed = currentBlock - receipt.blockNumber;
        const blocksRemaining = Math.max(0, 65 - blocksConfirmed);
        const minutesRemaining = Math.ceil(blocksRemaining * 12 / 60);
        
        console.log('⏰ FINALITY STATUS:');
        console.log('   Deposit Block:', receipt.blockNumber);
        console.log('   Current Block:', currentBlock);
        console.log('   Confirmations:', blocksConfirmed, '/ 65');
        
        if (blocksRemaining > 0) {
            console.log('   ⏳ Wait:', minutesRemaining, 'more minutes');
            console.log('   🎯 Spendable at block:', receipt.blockNumber + 65);
        } else {
            console.log('   🎉 READY! 65+ blocks confirmed');
            console.log('   ✅ Funds should be spendable now!');
        }
        
    } catch (e) {
        console.log('Error decoding:', e.message);
    }
}

checkDepositDetails();
