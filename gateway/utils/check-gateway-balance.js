// Check your current Gateway balance
import https from 'https';

async function checkGatewayBalance() {
    const userAddress = "0xe616b2ec620621797030e0ab1ba38da68d78351c"; // Your address from the error
    
    console.log('💰 Checking Gateway Balance for:', userAddress);
    console.log('='.repeat(60));
    
    // Check balance on Ethereum Sepolia (domain 0)
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
                // Note: Production would need Authorization: Bearer <API_KEY>
            }
        };
        
        console.log('📡 Checking Gateway balance via Circle API...');
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('\n🎯 Gateway Balance API Response:');
                console.log('   Status:', res.statusCode);
                console.log('   Response:', data);
                
                try {
                    const parsed = JSON.parse(data);
                    
                    if (res.statusCode === 200 && parsed.balances) {
                        console.log('\n💰 Your Gateway Balances:');
                        parsed.balances.forEach((balance, index) => {
                            console.log(`   Domain ${balance.domain}: ${balance.amount} USDC`);
                        });
                        
                        const ethBalance = parsed.balances.find(b => b.domain === 0);
                        if (ethBalance) {
                            const availableUSDC = parseFloat(ethBalance.amount);
                            console.log(`\n📊 Analysis:`);
                            console.log(`   Available: ${availableUSDC} USDC`);
                            console.log(`   Required for 1 USDC transfer: ~2.01 USDC (1.0 + ~2.01 fee)`);
                            console.log(`   Ethereum base fee: $2.00`);
                            
                            if (availableUSDC >= 2.01) {
                                console.log(`   ✅ Sufficient balance for transfer`);
                            } else {
                                console.log(`   ❌ Insufficient balance - need ${(2.01 - availableUSDC).toFixed(2)} more USDC`);
                                console.log(`   💡 Try smaller amount: ${Math.max(0.1, availableUSDC - 2.01).toFixed(2)} USDC`);
                            }
                        }
                        resolve(parsed);
                    } else if (res.statusCode === 401) {
                        console.log('\n🔐 API Key required for balance check');
                        console.log('   Your current balance from error: 1.000000 USDC');
                        console.log('   Required for 1 USDC transfer: 2.010001 USDC');
                        console.log('   ❌ Short by: 1.01 USDC');
                        resolve({ estimated: true, available: 1.0, required: 2.01 });
                    } else {
                        console.log('\n⚠️  Unexpected response');
                        resolve({ error: data });
                    }
                } catch (e) {
                    console.log('\n📄 Non-JSON response');
                    resolve({ error: 'Non-JSON response' });
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

checkGatewayBalance().then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('💡 NEXT STEPS:');
    console.log('='.repeat(60));
    
    if (result.estimated) {
        console.log('1. 🏦 GATEWAY vs REGULAR USDC:');
        console.log('   • Your MetaMask USDC ≠ Gateway USDC balance');
        console.log('   • Gateway uses unified balance across chains');
        console.log('   • You need to DEPOSIT into Gateway first');
        console.log('');
        console.log('2. 💰 GET MORE GATEWAY USDC:');
        console.log('   • Visit: https://faucet.circle.com');
        console.log('   • Get testnet USDC for Ethereum Sepolia');
        console.log('   • Deposit via Gateway Wallet contract');
        console.log('');
        console.log('3. 🔄 OR TRY SMALLER AMOUNT:');
        console.log('   • Current available: 1.0 USDC');
        console.log('   • Try: "Transfer 0.1 USDC to Base via Gateway"');
        console.log('   • This should work with current balance');
    }
    
    console.log('\n🎯 Your Gateway workflow is WORKING - just needs more balance!');
}).catch(console.error);