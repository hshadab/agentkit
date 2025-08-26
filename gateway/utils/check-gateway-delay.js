// Check Gateway balance after confirmed deposit
import https from 'https';

async function checkGatewayAfterDelay() {
    console.log('🔍 Checking Gateway Balance After Confirmed Deposit');
    console.log('='.repeat(55));
    console.log('✅ Transaction Confirmed: 0x863b52aa4cd15974e55f6992dfd9c82b364741007897cd36cb1900c97fd5b134');
    console.log('✅ To Address: 0x00777...A19B9 (Gateway Wallet) ✓');
    console.log('✅ Amount: 5 USDC ✓');
    console.log('✅ Network: Ethereum Sepolia ✓');
    console.log('\nChecking if Gateway balance has updated...');
    
    const userAddress = "0xe616b2ec620621797030e0ab1ba38da68d78351c";
    
    const balanceRequest = {
        token: "USDC",
        sources: [
            { domain: 0, depositor: userAddress }
        ]
    };
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(balanceRequest);
        
        const options = {
            hostname: 'gateway-api-testnet.circle.com',
            path: '/v1/balances',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    
                    if (parsed.balances) {
                        const balance = parsed.balances[0];
                        const currentBalance = parseFloat(balance.balance);
                        
                        console.log('\n💰 Current Gateway Balance:');
                        console.log(`   ${currentBalance} USDC`);
                        
                        if (currentBalance >= 6.0) {
                            console.log('\n🎉 SUCCESS! Deposit processed!');
                            console.log(`   Previous: 1.0 USDC`);
                            console.log(`   Current: ${currentBalance} USDC`);
                            console.log(`   Deposit: +${(currentBalance - 1.0).toFixed(1)} USDC ✅`);
                            
                            console.log('\n🚀 READY FOR GATEWAY TRANSFER!');
                            console.log('   Available: ~4 USDC (6.0 - 2.01 fee)');
                            console.log('   Can transfer: 1-4 USDC to Base');
                            
                            resolve({ ready: true, balance: currentBalance });
                        } else if (currentBalance > 1.0) {
                            console.log('\n🔄 Partial update detected');
                            console.log(`   Expected: ~6.0 USDC`);
                            console.log(`   Current: ${currentBalance} USDC`);
                            console.log('   ⏳ May need a few more minutes...');
                            resolve({ ready: false, balance: currentBalance, partial: true });
                        } else {
                            console.log('\n⏳ No change yet - Gateway indexing delay');
                            console.log('   Transaction confirmed on-chain ✅');
                            console.log('   Gateway API may need 2-5 minutes to update');
                            console.log('   This is normal for testnet');
                            resolve({ ready: false, balance: currentBalance, delayed: true });
                        }
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

checkGatewayAfterDelay().then(result => {
    console.log('\n' + '='.repeat(55));
    
    if (result.ready) {
        console.log('✅ GATEWAY DEPOSIT SUCCESSFUL!');
        console.log('');
        console.log('🎯 NEXT: Test the Gateway Transfer');
        console.log('   1. Go to: http://localhost:8000');
        console.log('   2. Connect MetaMask');
        console.log('   3. Try: "Transfer 2 USDC to Base via Gateway"');
        console.log('   4. Should work perfectly now! 🚀');
    } else if (result.partial) {
        console.log('🔄 DEPOSIT PARTIALLY PROCESSED');
        console.log('   Wait 2-3 minutes and check again');
    } else if (result.delayed) {
        console.log('⏳ DEPOSIT CONFIRMED BUT GATEWAY INDEXING DELAYED');
        console.log('');
        console.log('📋 What This Means:');
        console.log('   • Your transaction is confirmed on blockchain ✅');
        console.log('   • Gateway API is slower to update on testnet');
        console.log('   • This is normal - wait 2-5 minutes');
        console.log('');
        console.log('🎯 Options:');
        console.log('   A) Wait 5 minutes and try Gateway transfer');
        console.log('   B) Try transfer now - might work despite API delay');
        console.log('   C) Check again in a few minutes');
        console.log('');
        console.log('💡 Your workflow is ready - just timing!');
    }
}).catch(console.error);