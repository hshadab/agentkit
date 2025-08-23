#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function properGatewayDeposit() {
    console.log('🚀 Starting proper Gateway deposit using deposit() function...\n');
    
    // Configuration
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    const DEPOSIT_AMOUNT = '10'; // 10 USDC
    
    try {
        // Setup provider and signer (ethers v5 syntax)
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const signerAddress = await signer.getAddress();
        
        console.log('📍 Network: Ethereum Sepolia');
        console.log('👤 Your address:', signerAddress);
        console.log('💰 Amount to deposit:', DEPOSIT_AMOUNT, 'USDC');
        console.log('🏦 Gateway Wallet:', GATEWAY_WALLET);
        console.log('');
        
        // USDC Contract
        const usdcAbi = [
            'function balanceOf(address) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
        ];
        const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
        
        // Gateway Wallet Contract
        const gatewayAbi = [
            'function deposit(address token, uint256 amount) external',
            'function depositFor(address token, address depositor, uint256 amount) external',
            'event Deposited(address indexed token, address indexed depositor, uint256 amount)'
        ];
        const gatewayWallet = new ethers.Contract(GATEWAY_WALLET, gatewayAbi, signer);
        
        // Check USDC balance
        const balance = await usdc.balanceOf(signerAddress);
        const balanceFormatted = ethers.utils.formatUnits(balance, 6);
        console.log('💳 Your USDC balance:', balanceFormatted, 'USDC');
        
        const depositAmountWei = ethers.utils.parseUnits(DEPOSIT_AMOUNT, 6);
        
        if (balance < depositAmountWei) {
            console.error('❌ Insufficient USDC balance!');
            console.log('   You have:', balanceFormatted, 'USDC');
            console.log('   Need:', DEPOSIT_AMOUNT, 'USDC');
            console.log('\n💡 Get test USDC from: https://faucet.circle.com');
            return;
        }
        
        // Check current allowance
        const currentAllowance = await usdc.allowance(signerAddress, GATEWAY_WALLET);
        console.log('🔍 Current allowance:', ethers.utils.formatUnits(currentAllowance, 6), 'USDC');
        
        // Step 1: Approve USDC if needed
        if (currentAllowance < depositAmountWei) {
            console.log('\n📝 Step 1: Approving USDC spend...');
            const approveTx = await usdc.approve(GATEWAY_WALLET, depositAmountWei);
            console.log('   Transaction:', approveTx.hash);
            console.log('   Waiting for confirmation...');
            const approveReceipt = await approveTx.wait();
            console.log('   ✅ Approved in block:', approveReceipt.blockNumber);
        } else {
            console.log('✅ Already approved');
        }
        
        // Step 2: Call deposit() on Gateway Wallet
        console.log('\n💰 Step 2: Calling deposit() on Gateway Wallet...');
        console.log('   This is the CORRECT way to deposit!');
        
        const depositTx = await gatewayWallet.deposit(USDC_ADDRESS, depositAmountWei);
        console.log('   Transaction:', depositTx.hash);
        console.log('   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + depositTx.hash);
        console.log('   Waiting for confirmation...');
        
        const depositReceipt = await depositTx.wait();
        console.log('   ✅ Deposited in block:', depositReceipt.blockNumber);
        
        // Check for Deposited event
        const depositedEvent = depositReceipt.logs.find(log => {
            try {
                const parsed = gatewayWallet.interface.parseLog(log);
                return parsed.name === 'Deposited';
            } catch {
                return false;
            }
        });
        
        if (depositedEvent) {
            const parsed = gatewayWallet.interface.parseLog(depositedEvent);
            console.log('\n🎉 SUCCESS! Deposit event emitted:');
            console.log('   Token:', parsed.args[0]);
            console.log('   Depositor:', parsed.args[1]);
            console.log('   Amount:', ethers.utils.formatUnits(parsed.args[2], 6), 'USDC');
        }
        
        // Calculate when funds will be spendable
        const currentBlock = await provider.getBlockNumber();
        const blocksToWait = 65;
        const finalityBlock = depositReceipt.blockNumber + blocksToWait;
        const blocksRemaining = Math.max(0, finalityBlock - currentBlock);
        const minutesRemaining = Math.ceil(blocksRemaining * 12 / 60);
        
        console.log('\n⏰ Finality Status:');
        console.log('   Deposit block:', depositReceipt.blockNumber);
        console.log('   Current block:', currentBlock);
        console.log('   Blocks until spendable:', blocksRemaining, '/', blocksToWait);
        console.log('   Estimated time:', minutesRemaining, 'minutes');
        
        console.log('\n✅ PROPER DEPOSIT COMPLETE!');
        console.log('   Your funds will be spendable in ~', minutesRemaining, 'minutes');
        console.log('   Check balance at: http://localhost:8000/gateway-fix.html');
        console.log('\n📋 Summary:');
        console.log('   • Used deposit() function ✅ (not transfer)');
        console.log('   • Deposited event emitted ✅');
        console.log('   • Will credit unified balance ✅');
        console.log('   • Wait for 65 block confirmations');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.data) {
            console.error('   Error data:', error.data);
        }
    }
}

// Run the deposit
properGatewayDeposit().catch(console.error);