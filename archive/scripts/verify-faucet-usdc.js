// Check if you got USDC from Circle faucet
import https from 'https';

async function verifyFaucetUSDC() {
    const userAddress = "0xe616b2ec620621797030e0ab1ba38da68d78351c";
    
    console.log('🔍 Verifying Circle Faucet USDC');
    console.log('='.repeat(40));
    console.log(`Your Address: ${userAddress}`);
    
    // Check via Etherscan API for Sepolia
    const apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238&address=${userAddress}&tag=latest&apikey=YourApiKeyToken`;
    
    return new Promise((resolve, reject) => {
        https.get(apiUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    
                    if (parsed.status === '1' && parsed.result) {
                        const balanceWei = BigInt(parsed.result);
                        const balanceUSDC = Number(balanceWei) / 1000000; // USDC has 6 decimals
                        
                        console.log('\n💰 Faucet Check Results:');
                        if (balanceUSDC > 0) {
                            console.log(`✅ SUCCESS: ${balanceUSDC} USDC found!`);
                            console.log(`   From: Circle Faucet`);
                            console.log(`   Ready for: Gateway deposit`);
                        } else {
                            console.log(`❌ No USDC found`);
                        }
                        
                        resolve({ balance: balanceUSDC, hasUSDC: balanceUSDC > 0 });
                    } else {
                        console.log('\n⚠️  API check failed, manual verification needed');
                        resolve({ balance: 0, hasUSDC: false, needsManualCheck: true });
                    }
                } catch (e) {
                    resolve({ balance: 0, hasUSDC: false, needsManualCheck: true });
                }
            });
        }).on('error', (e) => {
            resolve({ balance: 0, hasUSDC: false, needsManualCheck: true });
        });
    });
}

// Simple manual check instructions
console.log('📋 MANUAL VERIFICATION STEPS:');
console.log('='.repeat(40));
console.log('1. Open MetaMask');
console.log('2. Switch to: Ethereum Sepolia');
console.log('3. Click "Import tokens"');
console.log('4. Token Address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
console.log('5. Symbol: USDC');
console.log('6. Decimals: 6');
console.log('7. Check if you see USDC balance > 0');

console.log('\n🔄 If No USDC:');
console.log('• Visit: https://faucet.circle.com');
console.log('• Connect your wallet');
console.log('• Select: Ethereum Sepolia');
console.log('• Request USDC (may take 1-2 minutes)');

console.log('\n✅ If You Have USDC:');
console.log('• Proceed to Step 2: Deposit to Gateway');
console.log('• Send 3+ USDC to: 0x0077777d7EBA4688BDeF3E311b846F25870A19B9');

verifyFaucetUSDC().then(result => {
    console.log('\n' + '='.repeat(40));
    if (result.hasUSDC) {
        console.log('🎉 You have USDC! Ready for Gateway deposit!');
    } else if (result.needsManualCheck) {
        console.log('🔍 Please check MetaMask manually using steps above');
    } else {
        console.log('❌ No USDC found - try faucet again');
    }
}).catch(console.error);