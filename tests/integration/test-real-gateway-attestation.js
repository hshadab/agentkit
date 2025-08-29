const { ethers } = require('ethers');

async function testRealGatewayAttestation() {
    console.log('🔍 Testing Real Circle Gateway Attestation...\n');
    
    // Gateway credentials
    const API_KEY = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
    const wallet = new ethers.Wallet('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab');
    
    // Check current balance
    console.log('Checking Gateway balance...');
    const balanceResponse = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: 'USDC',
            sources: [
                { domain: 0, depositor: wallet.address },
                { domain: 1, depositor: wallet.address },
                { domain: 6, depositor: wallet.address }
            ]
        })
    });
    
    const balanceData = await balanceResponse.json();
    const totalBalance = balanceData.balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    console.log(`✅ Total USDC Balance: ${totalBalance.toFixed(6)} USDC`);
    console.log(`   - Ethereum (Domain 0): ${balanceData.balances[0].balance} USDC`);
    console.log(`   - Avalanche (Domain 1): ${balanceData.balances[1].balance} USDC`);
    console.log(`   - Base (Domain 6): ${balanceData.balances[2].balance} USDC\n`);
    
    // Create transfer intent for Base
    console.log('Creating transfer intent to Base...');
    const burnIntent = {
        maxBlockHeight: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        maxFee: '2000001',
        spec: {
            sourceDomain: 0,
            destinationDomain: 6,
            destinationNetworkFee: '1',
            nonce: Date.now(),
            sourceAsset: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            destinationAsset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            to: wallet.address,
            value: '2000001'
        }
    };
    
    // EIP-712 domain and types
    const domain = {
        name: 'Gateway',
        version: '2',
        chainId: 11155111,
        verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'
    };
    
    const types = {
        BurnIntent: [
            { name: 'maxBlockHeight', type: 'uint256' },
            { name: 'maxFee', type: 'uint256' },
            { name: 'spec', type: 'BurnIntentSpec' }
        ],
        BurnIntentSpec: [
            { name: 'sourceDomain', type: 'uint32' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'destinationNetworkFee', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'sourceAsset', type: 'address' },
            { name: 'destinationAsset', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' }
        ]
    };
    
    // Sign the intent
    const signature = await wallet.signTypedData(domain, types, burnIntent);
    console.log('✅ Intent signed with EIP-712\n');
    
    // Submit to Gateway
    console.log('Submitting to Circle Gateway...');
    const transferResponse = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
            burnIntent: {
                maxBlockHeight: burnIntent.maxBlockHeight,
                maxFee: burnIntent.maxFee,
                spec: burnIntent.spec
            },
            signature: signature
        }])
    });
    
    const transferData = await transferResponse.json();
    
    if (transferData.transfers && transferData.transfers.length > 0) {
        const transfer = transferData.transfers[0];
        console.log('✅ REAL Gateway Transfer Accepted!');
        console.log(`   Status: ${transfer.status}`);
        console.log(`   Transfer ID: ${transfer.id}`);
        console.log(`   Amount: ${(parseInt(transfer.value) / 1000000).toFixed(6)} USDC`);
        console.log(`   From: Ethereum (Domain ${transfer.sourceDomain})`);
        console.log(`   To: Base (Domain ${transfer.destinationDomain})`);
        console.log(`   Depositor: ${transfer.depositor}`);
        
        if (transfer.attestation) {
            console.log(`\n📜 REAL Attestation (${transfer.attestation.length} chars):`);
            console.log(`   ${transfer.attestation.substring(0, 66)}...`);
            console.log(`\n✅ This is a REAL Circle Gateway attestation!`);
            console.log('   Settlement will occur in 15-30 minutes.');
        }
    } else if (transferData.error) {
        console.log('❌ Transfer failed:', transferData.error);
    } else {
        console.log('Transfer response:', JSON.stringify(transferData, null, 2));
    }
}

testRealGatewayAttestation().catch(console.error);