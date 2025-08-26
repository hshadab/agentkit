#!/usr/bin/env node

// Quick USDC balance checker for Ethereum Sepolia
import { ethers } from 'ethers';

const ETHEREUM_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const USDC_CONTRACT = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const YOUR_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';

const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
];

async function checkUSDCBalance() {
    try {
        console.log('🔍 Checking USDC balance on Ethereum Sepolia...');
        console.log(`   Wallet: ${YOUR_ADDRESS}`);
        console.log(`   USDC Contract: ${USDC_CONTRACT}\n`);

        const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_SEPOLIA_RPC);
        const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcAbi, provider);

        const [balance, symbol] = await Promise.all([
            usdcContract.balanceOf(YOUR_ADDRESS),
            usdcContract.symbol()
        ]);

        const formattedBalance = ethers.utils.formatUnits(balance, 6);
        
        console.log(`💰 ${symbol} Balance: ${formattedBalance}`);
        
        if (parseFloat(formattedBalance) >= 0.5) {
            console.log('✅ You have enough USDC for testing!');
            console.log('🚀 Ready to test real CCTP transfers');
        } else if (parseFloat(formattedBalance) > 0) {
            console.log('⚠️  You have some USDC but may need more for larger transfers');
            console.log(`   Try: "Transfer ${Math.min(parseFloat(formattedBalance) * 0.9, 0.1).toFixed(3)} USDC from ethereum to base"`);
        } else {
            console.log('❌ No USDC found. Please use the Circle faucet:');
            console.log('   https://faucet.circle.com/');
        }

    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
    }
}

checkUSDCBalance();