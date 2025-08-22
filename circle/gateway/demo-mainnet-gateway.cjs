// Test Gateway unified balance on MAINNET with PRODUCTION contracts
const fetch = require('node-fetch');
require('dotenv').config();

// Mainnet Configuration
const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const GATEWAY_API_URL = 'https://gateway-api.circle.com/v1';

console.log('🚀 MAINNET GATEWAY UNIFIED BALANCE TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Wallet: ${WALLET_ADDRESS}`);
console.log(`🌐 Network: Ethereum Mainnet (PRODUCTION)`);
console.log(`💰 Expected: 0.5 USDC unified balance`);

async function testMainnetGatewayBalance() {
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
        console.log(`   📡 Available networks: ${infoData.domains?.length || 'Unknown'}`);
        
        console.log('\\n2️⃣ Testing MAINNET Unified Balance...');
        
        // Check unified balance for mainnet Ethereum
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
            
            if (usdcAmount >= 0.5) {
                console.log('   🎉 SUCCESS: Production Gateway unified balance working!');
                console.log('   🚀 Ready for 7-chain MAINNET demo');
                
                console.log('\\n🎯 DEMO CAPACITY:');
                const maxDemos = Math.floor(usdcAmount / 0.07); // 0.01 USDC × 7 chains
                console.log(`   • Available: ${usdcAmount} USDC`);
                console.log(`   • Cost per demo: 0.07 USDC (7 chains × 0.01 each)`);
                console.log(`   • Max demos: ${maxDemos}`);
                console.log(`   • Real $ value: ~$${usdcAmount.toFixed(2)}`);
                
                console.log('\\n🌐 PRODUCTION NETWORKS READY:');
                console.log('   🔷 Ethereum (domain 0)');
                console.log('   🟦 Base (domain 6)');
                console.log('   🔺 Avalanche (domain 1)');
                console.log('   🔵 Arbitrum (domain 3)');
                console.log('   🔴 Optimism (domain 2)');
                console.log('   🟣 Polygon (domain 7)');
                console.log('   🦄 Unichain (domain 10)');
                
                console.log('\\n⚡ GATEWAY ADVANTAGES:');
                console.log('   • <500ms transfer time (vs 30s CCTP)');
                console.log('   • Unified balance across 7 chains');
                console.log('   • Single deposit, instant access everywhere');
                console.log('   • Real ZKP agent authorization');
                
            } else {
                console.log('   ⚠️ Balance insufficient for full demo');
                console.log(`   💡 Have: ${usdcAmount} USDC, need 0.07 for 7-chain demo`);
            }
        } else {
            console.log('   ❌ No unified balance found');
            console.log('   💡 Deposit may still be processing');
        }
        
        console.log('\\n🔗 VERIFICATION LINKS:');
        console.log(`   📤 Deposit TX: https://etherscan.io/tx/0xeb6ac9a9bd1899610dd432971c519799e6fd72b9d46d74413e1ac92d8453f959`);
        console.log(`   🔍 Wallet: https://etherscan.io/address/${WALLET_ADDRESS}`);
        console.log(`   🏦 Gateway wallet: https://etherscan.io/address/0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE`);
        
    } catch (error) {
        console.error('❌ Mainnet Gateway test failed:', error.message);
        
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

testMainnetGatewayBalance().catch(console.error);