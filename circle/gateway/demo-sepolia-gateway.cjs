// Test Gateway unified balance on Sepolia after proper deposit
const fetch = require('node-fetch');
require('dotenv').config();

// Sepolia Configuration
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const GATEWAY_API_URL = 'https://gateway-api.circle.com/v1';

console.log('🔍 SEPOLIA GATEWAY UNIFIED BALANCE TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Wallet: ${WALLET_ADDRESS}`);
console.log(`🌐 Network: Ethereum Sepolia`);
console.log(`💰 Expected: 1.0 USDC unified balance`);

async function testGatewayUnifiedBalance() {
    try {
        console.log('\\n1️⃣ Gateway API Connection Test...');
        
        // Test Gateway info endpoint
        const infoResponse = await fetch(`${GATEWAY_API_URL}/info`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!infoResponse.ok) {
            throw new Error(`Gateway API error: ${infoResponse.status}`);
        }
        
        const infoData = await infoResponse.json();
        console.log('   ✅ Gateway API connected');
        console.log('   📡 Available networks:', infoData.supportedNetworks?.length || 'Unknown');
        
        console.log('\\n2️⃣ Testing Unified Balance Check...');
        
        // Check unified balance for Sepolia
        const balanceRequestBody = {
            token: "USDC",
            sources: [{
                domain: 0, // Ethereum domain
                depositor: WALLET_ADDRESS
            }]
        };
        
        console.log('   📝 Balance request:', JSON.stringify(balanceRequestBody, null, 2));
        
        const balanceResponse = await fetch(`${GATEWAY_API_URL}/balances`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(balanceRequestBody)
        });
        
        if (!balanceResponse.ok) {
            const errorText = await balanceResponse.text();
            throw new Error(`Balance API error: ${balanceResponse.status} - ${errorText}`);
        }
        
        const balanceData = await balanceResponse.json();
        console.log('\\n📊 BALANCE RESULTS:');
        console.log(JSON.stringify(balanceData, null, 2));
        
        // Parse balance
        if (balanceData.balances && balanceData.balances.length > 0) {
            const balance = balanceData.balances[0];
            const usdcAmount = parseInt(balance.balance) / 1000000; // Convert from wei to USDC
            
            console.log('\\n✅ UNIFIED BALANCE FOUND:');
            console.log(`   💰 Amount: ${usdcAmount} USDC`);
            console.log(`   🌐 Domain: ${balance.domain} (Ethereum)`);
            console.log(`   📍 Depositor: ${balance.depositor}`);
            
            if (usdcAmount >= 1.0) {
                console.log('   🎉 SUCCESS: Gateway unified balance working!');
                console.log('   🚀 Ready for multi-chain demo');
                
                console.log('\\n🎯 DEMO CAPACITY:');
                const maxDemos = Math.floor(usdcAmount / 0.03); // 0.01 USDC × 3 chains
                console.log(`   • Available: ${usdcAmount} USDC`);
                console.log(`   • Cost per demo: 0.03 USDC (3 testnets × 0.01 each)`);
                console.log(`   • Max demos: ${maxDemos}`);
                
                console.log('\\n🌐 TESTNET NETWORKS READY:');
                console.log('   🔷 Ethereum Sepolia (domain 0)');
                console.log('   🟦 Base Sepolia (domain 6)');
                console.log('   🔺 Avalanche Fuji (domain 1)');
                
            } else {
                console.log('   ⚠️ Balance insufficient for demo');
            }
        } else {
            console.log('   ❌ No unified balance found');
            console.log('   💡 Deposit may still be processing');
        }
        
        console.log('\\n🔗 VERIFICATION LINKS:');
        console.log(`   📤 Deposit TX: https://sepolia.etherscan.io/tx/0x50fe86e77e0516c29592c8a0b242d1a2a4151bf839e55811af207e8de6fecd1a`);
        console.log(`   🔍 Wallet: https://sepolia.etherscan.io/address/${WALLET_ADDRESS}`);
        
    } catch (error) {
        console.error('❌ Sepolia Gateway test failed:', error.message);
        
        if (error.message.includes('401')) {
            console.log('\\n💡 Authentication issue - check CIRCLE_API_KEY');
        } else if (error.message.includes('400')) {
            console.log('\\n💡 Request format issue');
        } else if (error.message.includes('network')) {
            console.log('\\n💡 Network connectivity issue');
        } else {
            console.log('\\n💡 Balance may still be processing (wait 2-3 minutes)');
        }
    }
}

testGatewayUnifiedBalance().catch(console.error);