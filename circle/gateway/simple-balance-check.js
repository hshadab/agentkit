// Simple balance check using fetch API - no token spending

const WALLET_ADDRESS = '0xE616B2eC620621797030E0AB1BA38DA68D78351C';

console.log('💰 WALLET BALANCE CHECK (READ-ONLY)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Wallet: ${WALLET_ADDRESS}`);

async function checkEtherBalance() {
    console.log('\n⛽ ETH Balance Check:');
    
    try {
        // Use Etherscan API for ETH balance (free, no RPC needed)
        const response = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${WALLET_ADDRESS}&tag=latest&apikey=YourApiKeyToken`);
        const data = await response.json();
        
        if (data.status === '1') {
            const balanceWei = BigInt(data.result);
            const balanceEth = Number(balanceWei) / 1e18;
            
            console.log(`   💎 ETH Balance: ${balanceEth.toFixed(6)} ETH`);
            console.log(`   💲 USD Value: ~$${(balanceEth * 3000).toFixed(2)} (at $3000/ETH)`);
            
            if (balanceEth >= 0.005) {
                console.log('   ✅ ETH Balance: SUFFICIENT for gas fees');
                return true;
            } else {
                console.log('   ⚠️ ETH Balance: LOW - need more for gas fees');
                return false;
            }
        } else {
            throw new Error('Etherscan API error');
        }
    } catch (error) {
        console.log('   ❌ Could not check ETH balance via API');
        console.log('   🔗 Check manually: https://etherscan.io/address/' + WALLET_ADDRESS);
        return null;
    }
}

async function checkUSDCBalance() {
    console.log('\n🪙 USDC Balance Check:');
    
    try {
        // USDC contract address on Ethereum
        const USDC_CONTRACT = '0xA0b86a33E6B8A20C4B3a40E4Ca5C9EB5DAD1d14';
        
        const response = await fetch(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${USDC_CONTRACT}&address=${WALLET_ADDRESS}&tag=latest&apikey=YourApiKeyToken`);
        const data = await response.json();
        
        if (data.status === '1') {
            const balanceRaw = BigInt(data.result);
            const balanceUsdc = Number(balanceRaw) / 1e6; // USDC has 6 decimals
            
            console.log(`   💵 USDC Balance: ${balanceUsdc.toFixed(6)} USDC`);
            console.log(`   💲 USD Value: ~$${balanceUsdc.toFixed(2)}`);
            
            const maxDemos = Math.floor(balanceUsdc / 0.07);
            
            if (balanceUsdc >= 0.07) {
                console.log(`   ✅ USDC Balance: SUFFICIENT for ${maxDemos} complete demos`);
                return { sufficient: true, balance: balanceUsdc, maxDemos };
            } else {
                console.log('   ⚠️ USDC Balance: INSUFFICIENT for demo (need 0.07 USDC minimum)');
                return { sufficient: false, balance: balanceUsdc, maxDemos: 0 };
            }
        } else {
            throw new Error('Etherscan API error');
        }
    } catch (error) {
        console.log('   ❌ Could not check USDC balance via API');
        console.log('   🔗 Check manually: https://etherscan.io/token/0xA0b86a33E6B8A20C4B3a40E4Ca5C9EB5DAD1d14?a=' + WALLET_ADDRESS);
        return null;
    }
}

async function checkFundingStatus() {
    console.log('\n🔍 Starting balance checks...');
    
    const ethResult = await checkEtherBalance();
    const usdcResult = await checkUSDCBalance();
    
    console.log('\n📊 FUNDING STATUS SUMMARY:');
    
    if (ethResult === true && usdcResult && usdcResult.sufficient) {
        console.log('   🎉 WALLET FULLY FUNDED AND READY!');
        console.log('   ✅ ETH for gas fees: Ready');
        console.log('   ✅ USDC for demos: Ready');
        console.log(`   🚀 Can run ${usdcResult.maxDemos} complete Gateway demos`);
        console.log('   💰 Cost per demo: $0.07 USDC + ~$9 gas');
        
        console.log('\n🎯 READY FOR DEMO! Next steps:');
        console.log('   1. node fund-gateway-wallet.js (deposit USDC to Gateway)');
        console.log('   2. node demo-agent-authorization.js (test run)');  
        console.log('   3. node demo-agent-authorization.js --live (real demo)');
        
    } else if (ethResult === false || (usdcResult && !usdcResult.sufficient)) {
        console.log('   ⚠️ WALLET NEEDS MORE FUNDING');
        
        if (ethResult === false) {
            console.log('   ❌ Need more ETH for gas fees (minimum 0.005 ETH)');
        }
        if (usdcResult && !usdcResult.sufficient) {
            console.log(`   ❌ Need more USDC for demos (have ${usdcResult.balance}, need 0.07 minimum)`);
        }
        
        console.log('\n💡 Funding instructions:');
        console.log('   🛒 Buy ETH + USDC on Coinbase/Binance');
        console.log(`   📤 Send to: ${WALLET_ADDRESS}`);
        console.log('   🌐 Network: Ethereum mainnet');
        
    } else {
        console.log('   ❓ Could not determine funding status');
        console.log('   🔗 Check manually at:');
        console.log(`      ETH: https://etherscan.io/address/${WALLET_ADDRESS}`);
        console.log(`      USDC: https://etherscan.io/token/0xA0b86a33E6B8A20C4B3a40E4Ca5C9EB5DAD1d14?a=${WALLET_ADDRESS}`);
    }
    
    console.log('\n📋 DEMO DETAILS:');
    console.log('   • 0.01 USDC per chain × 7 chains = 0.07 USDC per demo');
    console.log('   • Gas fees: ~0.003 ETH per demo (~$9)');
    console.log('   • Speed: <500ms Gateway vs 30s CCTP');
    console.log('   • ZKP proofs: Real zkEngine + Ethereum verification');
    console.log('   • Networks: All 7 Gateway mainnet chains');
}

checkFundingStatus().catch(console.error);