import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function checkDepositStatus() {
    const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Your deposit transaction
    const depositTxHash = '0x6f6dc8e201ba5d944a9196c2ba30ca790db8878d0eda68500ebf3c52a853954f';
    
    console.log('🔍 Checking your Gateway deposit status...\n');
    console.log('📄 Transaction:', depositTxHash);
    console.log('🔗 Etherscan: https://sepolia.etherscan.io/tx/' + depositTxHash);
    console.log('');
    
    try {
        // Get transaction receipt
        const receipt = await provider.getTransactionReceipt(depositTxHash);
        if (!receipt) {
            console.log('⏳ Transaction pending...');
            return;
        }
        
        // Get current block
        const currentBlock = await provider.getBlockNumber();
        
        // Parse deposit amount from logs
        const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
        const gatewayInterface = new ethers.utils.Interface([
            'event Deposited(address indexed token, address indexed depositor, uint256 amount)'
        ]);
        
        let depositAmount = '0';
        let depositor = '';
        
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === GATEWAY_WALLET.toLowerCase()) {
                try {
                    const parsed = gatewayInterface.parseLog(log);
                    if (parsed.name === 'Deposited') {
                        depositAmount = ethers.utils.formatUnits(parsed.args.amount, 6);
                        depositor = parsed.args.depositor;
                        break;
                    }
                } catch {}
            }
        }
        
        // Calculate finality
        const depositBlock = receipt.blockNumber;
        const blocksConfirmed = currentBlock - depositBlock;
        const requiredBlocks = 65;
        const blocksRemaining = Math.max(0, requiredBlocks - blocksConfirmed);
        const targetBlock = depositBlock + requiredBlocks;
        
        // Time calculations
        const secondsPerBlock = 12;
        const secondsRemaining = blocksRemaining * secondsPerBlock;
        const minutesRemaining = Math.ceil(secondsRemaining / 60);
        
        console.log('✅ DEPOSIT CONFIRMED\n');
        console.log('💰 Amount Deposited: ' + depositAmount + ' USDC');
        console.log('👤 Depositor: ' + depositor);
        console.log('📦 Deposit Block: ' + depositBlock);
        console.log('📊 Current Block: ' + currentBlock);
        console.log('✔️  Confirmations: ' + blocksConfirmed + ' / ' + requiredBlocks);
        console.log('');
        
        if (blocksRemaining > 0) {
            console.log('⏰ WAITING FOR FINALITY');
            console.log('   Blocks remaining: ' + blocksRemaining);
            console.log('   Target block: ' + targetBlock);
            console.log('   Time remaining: ~' + minutesRemaining + ' minutes');
            console.log('');
            console.log('📅 Estimated spendable time: ' + new Date(Date.now() + secondsRemaining * 1000).toLocaleTimeString());
        } else {
            console.log('🎉 FUNDS ARE SPENDABLE NOW!');
            console.log('   ✅ 65+ blocks confirmed');
            console.log('   ✅ Deposit finalized');
            console.log('   ✅ Should be credited to unified balance');
            console.log('');
            console.log('💡 Check your balance at: http://localhost:8000/gateway-fix.html');
        }
        
        // Check unified balance via API
        console.log('\n📊 Checking Gateway API balance...');
        const response = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: 'USDC',
                sources: [{ domain: 0, depositor: depositor }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const totalBalance = data.balances?.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0) || 0;
            console.log('💳 Current Unified Balance: ' + totalBalance.toFixed(6) + ' USDC');
            
            if (totalBalance >= 12.9) {
                console.log('✅ Deposit credited! Balance includes your 10 USDC');
            } else if (blocksRemaining === 0) {
                console.log('⏳ API may need a few more minutes to sync');
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkDepositStatus();
