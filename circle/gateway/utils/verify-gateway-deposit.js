// Verify Gateway deposit was successful
import https from 'https';

async function verifyGatewayDeposit() {
    const userAddress = "0xe616b2ec620621797030e0ab1ba38da68d78351c";
    
    console.log('🔍 Verifying Your Gateway Deposit');
    console.log('='.repeat(50));
    console.log(`Your Address: ${userAddress}`);
    console.log('Checking updated Gateway balance...');
    
    // Check Gateway balance via Circle API
    const balanceRequest = {
        token: "USDC",
        sources: [
            { domain: 0, depositor: userAddress } // Ethereum Sepolia
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
        
        console.log('\n📡 Checking Gateway balance...');
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('\n🎯 Gateway Balance Response:');
                console.log('   Status:', res.statusCode);
                console.log('   Response:', data);
                
                try {
                    const parsed = JSON.parse(data);
                    
                    if (res.statusCode === 200 && parsed.balances) {
                        const balance = parsed.balances[0];
                        const currentBalance = parseFloat(balance.balance);
                        
                        console.log('\n💰 Your Updated Gateway Balance:');
                        console.log(`   Domain ${balance.domain} (Ethereum Sepolia): ${currentBalance} USDC`);
                        
                        if (currentBalance >= 5.0) {
                            console.log('\n✅ DEPOSIT CONFIRMED!');
                            console.log(`   Previous: 1.0 USDC`);
                            console.log(`   Current: ${currentBalance} USDC`);
                            console.log(`   Deposit: +${(currentBalance - 1.0).toFixed(1)} USDC`);
                            console.log('\n🎉 Ready for Gateway transfers!');
                            
                            // Calculate what transfers are now possible
                            const maxTransfer = currentBalance - 2.01; // Subtract Ethereum fees
                            console.log('\n📊 Transfer Analysis:');
                            console.log(`   Available: ${currentBalance} USDC`);
                            console.log(`   Ethereum fee: ~2.01 USDC`);
                            console.log(`   Max transfer: ~${maxTransfer.toFixed(2)} USDC`);
                            
                            if (maxTransfer >= 1.0) {
                                console.log('   ✅ Can transfer 1 USDC ✅');
                                console.log('   ✅ Can transfer 2 USDC ✅');
                                if (maxTransfer >= 3.0) {
                                    console.log('   ✅ Can transfer 3+ USDC ✅');
                                }
                            }
                            
                            resolve({ success: true, balance: currentBalance, ready: true });
                        } else if (currentBalance > 1.0) {
                            console.log('\n🔄 PARTIAL DEPOSIT DETECTED');
                            console.log(`   Current: ${currentBalance} USDC`);
                            console.log(`   Expected: ~6.0 USDC (1.0 + 5.0 deposit)`);
                            console.log('   ⏳ Transaction may still be confirming...');
                            resolve({ success: false, balance: currentBalance, pending: true });
                        } else {
                            console.log('\n❌ NO DEPOSIT CHANGE DETECTED');
                            console.log(`   Still: ${currentBalance} USDC`);
                            console.log('   🔍 Check transaction status in MetaMask');
                            resolve({ success: false, balance: currentBalance, pending: false });
                        }
                    } else {
                        console.log('\n⚠️  API response issue');
                        resolve({ success: false, error: 'API error' });
                    }
                } catch (e) {
                    console.log('\n❌ Failed to parse response');
                    resolve({ success: false, error: 'Parse error' });
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

verifyGatewayDeposit().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 VERIFICATION RESULT:');
    console.log('='.repeat(50));
    
    if (result.success && result.ready) {
        console.log('✅ DEPOSIT SUCCESSFUL - READY TO TEST!');
        console.log('');
        console.log('🚀 NEXT STEP: Test Gateway Transfer');
        console.log('   1. Go to: http://localhost:8001/');
        console.log('   2. Connect MetaMask (Ethereum Sepolia)');
        console.log('   3. Try: "Transfer 1 USDC to Base via Gateway"');
        console.log('   4. Accept MetaMask signature when prompted');
        console.log('   5. Watch for success! 🎉');
        console.log('');
        console.log('💡 The workflow should now complete end-to-end!');
    } else if (result.pending) {
        console.log('⏳ DEPOSIT PENDING - Wait a moment');
        console.log('   • Transaction may still be confirming');
        console.log('   • Check again in 30-60 seconds');
        console.log('   • Or check transaction in MetaMask');
    } else {
        console.log('❌ DEPOSIT NOT CONFIRMED');
        console.log('   • Check MetaMask transaction status');
        console.log('   • Verify you sent to: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9');
        console.log('   • Make sure network was Ethereum Sepolia');
        console.log('   • Transaction may need more confirmations');
    }
}).catch(error => {
    console.error('❌ Verification failed:', error.message);
    console.log('💡 Manual check: Look at your MetaMask transaction status');
});
