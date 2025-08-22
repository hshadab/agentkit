#!/usr/bin/env node
/**
 * Fix locked funds in Circle Gateway by implementing proper deposit activation
 */

const fetch = require('node-fetch');

// Configuration
const CONFIG = {
    apiKey: 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838',
    baseUrl: 'https://gateway-api-testnet.circle.com/v1',
    userAddress: '0xE616B2eC620621797030E0AB1BA38DA68D78351C',
    gatewayWallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    usdcSepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
};

async function fixLockedFunds() {
    console.log('🔧 Circle Gateway: Fixing Locked Funds Issue');
    console.log('=' * 60);
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
    };
    
    // Step 1: Confirm the issue
    console.log('📊 STEP 1: Confirming Locked Funds Issue');
    console.log('-'.repeat(50));
    
    const balancePayload = {
        token: "USDC",
        sources: [
            { domain: 0, depositor: CONFIG.userAddress }  // Ethereum Sepolia
        ]
    };
    
    try {
        const response = await fetch(`${CONFIG.baseUrl}/balances`, {
            method: 'POST',
            headers,
            body: JSON.stringify(balancePayload)
        });
        
        const balanceData = await response.json();
        console.log('Balance Response:', JSON.stringify(balanceData, null, 2));
        
        const sepoliaBalance = balanceData.balances?.find(b => b.domain === 0);
        if (sepoliaBalance) {
            const deposited = parseFloat(sepoliaBalance.balance || 0);
            const available = parseFloat(sepoliaBalance.available || 0);
            
            console.log(`💰 Sepolia Balance Summary:`);
            console.log(`   Deposited: ${deposited.toFixed(6)} USDC`);
            console.log(`   Available: ${available.toFixed(6)} USDC`);
            console.log(`   Status: ${available === 0 ? '🚨 LOCKED' : '✅ AVAILABLE'}`);
            
            if (deposited > 0 && available === 0) {
                console.log('\n🚨 CONFIRMED: Funds are deposited but locked!');
                return await implementFix(deposited);
            } else if (available > 0) {
                console.log('\n✅ Funds are available - transfer issue must be elsewhere');
                return { status: 'funds_available', available };
            } else {
                console.log('\n❌ No funds found - need to deposit first');
                return { status: 'no_funds' };
            }
        }
    } catch (error) {
        console.error('❌ Balance check failed:', error);
        return { status: 'error', error: error.message };
    }
}

async function implementFix(depositedAmount) {
    console.log('\n🔧 STEP 2: Implementing Locked Funds Fix');
    console.log('-'.repeat(50));
    
    console.log(`Attempting to unlock ${depositedAmount} USDC...`);
    
    // Approach 1: Check for activation endpoint
    console.log('\n🔍 Approach 1: API Activation');
    
    const activationPayload = {
        token: "USDC",
        amount: Math.floor(depositedAmount * 1000000).toString(), // Convert to micro-USDC
        depositor: CONFIG.userAddress,
        domain: 0
    };
    
    console.log('Activation payload:', JSON.stringify(activationPayload, null, 2));
    
    // Try different potential endpoints
    const endpointsToTry = [
        '/activate',
        '/unlock', 
        '/deposits/activate',
        '/balances/unlock'
    ];
    
    for (const endpoint of endpointsToTry) {
        try {
            console.log(`\nTrying endpoint: ${endpoint}`);
            const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKey}`
                },
                body: JSON.stringify(activationPayload)
            });
            
            console.log(`   Status: ${response.status}`);
            const responseText = await response.text();
            console.log(`   Response: ${responseText}`);
            
            if (response.status === 200) {
                console.log(`✅ Success with ${endpoint}!`);
                return await verifyFix();
            }
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }
    }
    
    // Approach 2: Manual instructions
    console.log('\n🔧 Approach 2: Manual Fix Instructions');
    console.log('-'.repeat(40));
    
    console.log('Since API activation failed, here are manual steps:');
    console.log();
    console.log('Option A: Use Circle Faucet (Recommended)');
    console.log('1. Go to https://faucet.circle.com/');
    console.log(`2. Enter wallet: ${CONFIG.userAddress}`);
    console.log('3. Select "Sepolia" network');
    console.log('4. Request fresh testnet USDC');
    console.log('5. This should create "available" balance');
    
    console.log('\nOption B: Contract Interaction');
    console.log('1. Connect MetaMask to Sepolia testnet');
    console.log(`2. Interact with Gateway contract: ${CONFIG.gatewayWallet}`);
    console.log('3. Call deposit function with proper parameters');
    console.log('4. Ensure transaction completes fully');
    
    console.log('\nOption C: Fresh Wallet');
    console.log('1. Create new wallet address');
    console.log('2. Fund directly with Circle faucet');
    console.log('3. Test Gateway transfers immediately');
    
    return {
        status: 'manual_fix_required',
        depositedAmount,
        recommendations: [
            'Use Circle testnet faucet for fresh deposit',
            'Try direct contract interaction',
            'Use different wallet address'
        ]
    };
}

async function verifyFix() {
    console.log('\n✅ STEP 3: Verifying Fix');
    console.log('-'.repeat(30));
    
    // Wait a moment for changes to propagate
    console.log('⏳ Waiting 5 seconds for changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Re-check balance
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
    };
    
    const balancePayload = {
        token: "USDC",
        sources: [
            { domain: 0, depositor: CONFIG.userAddress }
        ]
    };
    
    try {
        const response = await fetch(`${CONFIG.baseUrl}/balances`, {
            method: 'POST',
            headers,
            body: JSON.stringify(balancePayload)
        });
        
        const balanceData = await response.json();
        const sepoliaBalance = balanceData.balances?.find(b => b.domain === 0);
        
        if (sepoliaBalance) {
            const available = parseFloat(sepoliaBalance.available || 0);
            
            if (available > 0) {
                console.log(`🎉 SUCCESS! Available balance: ${available} USDC`);
                console.log('✅ Funds are now unlocked and ready for transfers!');
                return { status: 'fixed', availableBalance: available };
            } else {
                console.log('⚠️ Funds still locked - may need manual intervention');
                return { status: 'still_locked' };
            }
        }
    } catch (error) {
        console.error('❌ Verification failed:', error);
        return { status: 'verification_failed', error: error.message };
    }
}

// Main execution
if (require.main === module) {
    fixLockedFunds()
        .then(result => {
            console.log('\n' + '='.repeat(60));
            console.log('🎯 FIX RESULT');
            console.log('='.repeat(60));
            console.log(JSON.stringify(result, null, 2));
            
            if (result.status === 'funds_available') {
                console.log('\n✅ SOLUTION: Funds are already available!');
                console.log('   The transfer issue must be in the EIP-712 signature or API format.');
                console.log('   Available balance:', result.available, 'USDC');
            } else if (result.status === 'manual_fix_required') {
                console.log('\n🚨 ACTION REQUIRED: Manual intervention needed');
                console.log('   Follow the manual fix instructions above');
                console.log(`   Locked amount: ${result.depositedAmount} USDC`);
            }
        })
        .catch(error => {
            console.error('\n❌ Fix process failed:', error);
        });
}

module.exports = { fixLockedFunds };