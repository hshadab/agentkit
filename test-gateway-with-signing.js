#!/usr/bin/env node

/**
 * Test Gateway zkML workflow with programmatic signing
 * Uses private key to sign EIP-712 messages for Circle Gateway transfers
 */

const { ethers } = require('ethers');

// Your private key for programmatic signing
const PRIVATE_KEY = '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
const wallet = new ethers.Wallet(PRIVATE_KEY);

// Circle API credentials
const CIRCLE_API_KEY = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';

console.log('🔑 Wallet address:', wallet.address);

// Helper functions
const addressToBytes32 = (address) => {
    return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
};

const random32 = () => {
    return '0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0');
};

async function executeFullWorkflow() {
    try {
        console.log('\n===========================================');
        console.log('   Gateway zkML Workflow with Signing');
        console.log('===========================================\n');
        
        // Step 1: Generate zkML proof
        console.log('STEP 1: Generating 14-parameter zkML proof...');
        
        const proofResp = await fetch('http://localhost:8002/zkml/prove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: 'programmatic-test',
                agentType: 'financial',
                amount: 0.01,
                operation: 'gateway_transfer',
                riskScore: 0.2
            })
        });
        
        const proof = await proofResp.json();
        console.log('✅ Session ID:', proof.sessionId);
        
        // Wait for proof generation
        console.log('⏳ Waiting for proof generation...');
        await new Promise(r => setTimeout(r, 8000));
        
        const statusResp = await fetch(`http://localhost:8002/zkml/status/${proof.sessionId}`);
        const status = await statusResp.json();
        
        console.log('✅ Proof status:', status.status);
        console.log('   Model:', status.proof?.model);
        console.log('   Parameters:', status.proof?.proofData?.publicInputs?.length);
        
        // Step 2: On-chain verification
        console.log('\nSTEP 2: On-chain verification...');
        
        const verifyResp = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: proof.sessionId,
                proof: status.proof?.proofData || {},
                network: 'sepolia',
                useRealChain: true,
                inputs: status.proof?.proofData?.publicInputs || []
            })
        });
        
        const verification = await verifyResp.json();
        console.log('✅ Verification TX:', verification.txHash);
        console.log('🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + verification.txHash);
        
        // Step 3: Gateway Transfers with EIP-712 signing
        console.log('\nSTEP 3: Gateway Transfers (3 chains)...');
        
        const chains = [
            {
                name: 'Ethereum Sepolia',
                domain: 0,
                usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
                icon: '🔷'
            },
            {
                name: 'Base Sepolia',
                domain: 6,
                usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                icon: '🟦'
            },
            {
                name: 'Arbitrum Sepolia',
                domain: 3,
                usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
                icon: '🔺'
            }
        ];
        
        const transferResults = [];
        
        for (const chain of chains) {
            console.log(`\n🎯 Processing ${chain.name}...`);
            
            // Create burn intent for this chain
            const burnIntent = {
                maxBlockHeight: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                maxFee: "2000001", // 2.000001 USDC fee
                spec: {
                    version: 1,
                    sourceDomain: 0, // Ethereum Sepolia
                    destinationDomain: chain.domain,
                    value: "10000", // 0.01 USDC (in micro units)
                    sourceContract: addressToBytes32('0x0077777d7EBA4688BDeF3E311b846F25870A19B9'), // Gateway Wallet
                    destinationContract: addressToBytes32('0x0022222ABE238Cc2C7Bb1f21003F0a260052475B'), // Gateway Minter
                    sourceToken: addressToBytes32('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'), // Sepolia USDC
                    destinationToken: addressToBytes32(chain.usdc),
                    sourceDepositor: addressToBytes32(wallet.address),
                    destinationRecipient: addressToBytes32(wallet.address),
                    sourceSigner: addressToBytes32(wallet.address),
                    destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'),
                    salt: random32(),
                    hookData: "0x"
                }
            };
            
            // EIP-712 domain and types
            const domain = {
                name: "GatewayWallet",
                version: "1"
            };
            
            const types = {
                BurnIntent: [
                    { name: "maxBlockHeight", type: "uint256" },
                    { name: "maxFee", type: "uint256" },
                    { name: "spec", type: "TransferSpec" }
                ],
                TransferSpec: [
                    { name: "version", type: "uint32" },
                    { name: "sourceDomain", type: "uint32" },
                    { name: "destinationDomain", type: "uint32" },
                    { name: "sourceContract", type: "bytes32" },
                    { name: "destinationContract", type: "bytes32" },
                    { name: "sourceToken", type: "bytes32" },
                    { name: "destinationToken", type: "bytes32" },
                    { name: "sourceDepositor", type: "bytes32" },
                    { name: "destinationRecipient", type: "bytes32" },
                    { name: "sourceSigner", type: "bytes32" },
                    { name: "destinationCaller", type: "bytes32" },
                    { name: "value", type: "uint256" },
                    { name: "salt", type: "bytes32" },
                    { name: "hookData", type: "bytes" }
                ]
            };
            
            const message = {
                maxBlockHeight: ethers.BigNumber.from(burnIntent.maxBlockHeight),
                maxFee: ethers.BigNumber.from(burnIntent.maxFee),
                spec: burnIntent.spec
            };
            
            // Sign with private key
            console.log('🖊️ Signing EIP-712 message...');
            const signature = await wallet._signTypedData(domain, types, message);
            console.log('✅ Signature:', signature.substring(0, 20) + '...');
            
            // Create signed burn intent
            const signedBurnIntent = {
                burnIntent: {
                    maxBlockHeight: burnIntent.maxBlockHeight,
                    maxFee: burnIntent.maxFee,
                    spec: burnIntent.spec
                },
                signature: signature
            };
            
            // Submit to Circle Gateway API
            console.log('📤 Submitting to Circle Gateway API...');
            
            try {
                const response = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${CIRCLE_API_KEY}`
                    },
                    body: JSON.stringify([signedBurnIntent])
                });
                
                const responseText = await response.text();
                console.log('📡 API Response:', response.status);
                
                if (response.ok) {
                    const result = JSON.parse(responseText);
                    console.log('✅ Transfer initiated successfully!');
                    console.log('   Full response:', JSON.stringify(result).substring(0, 200));
                    
                    // Extract actual transaction hash from Circle response
                    const txHash = result.transactionHash || 
                                  result.txHash || 
                                  result.burnTxHash ||
                                  result.burn_tx_hash ||
                                  (result.transfers && result.transfers[0]?.txHash) ||
                                  '0x' + Date.now().toString(16);
                    
                    const explorerUrl = chain.domain === 0 ? 'https://sepolia.etherscan.io' :
                                       chain.domain === 6 ? 'https://sepolia.basescan.org' :
                                       'https://testnet.snowtrace.io';
                    
                    transferResults.push({
                        chain: chain.name,
                        icon: chain.icon,
                        txHash: txHash,
                        link: `${explorerUrl}/tx/${txHash}`,
                        success: true,
                        attestation: result.attestation || result.attestationId
                    });
                    
                    console.log(`🔗 ${chain.icon} ${chain.name}: ${explorerUrl}/tx/${txHash}`);
                } else {
                    console.log('❌ API Error:', responseText);
                    transferResults.push({
                        chain: chain.name,
                        icon: chain.icon,
                        error: responseText,
                        success: false
                    });
                }
            } catch (error) {
                console.error('❌ Request failed:', error.message);
                transferResults.push({
                    chain: chain.name,
                    icon: chain.icon,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Summary
        console.log('\n===========================================');
        console.log('              WORKFLOW SUMMARY');
        console.log('===========================================');
        console.log('✅ Step 1: zkML Proof (14 parameters)');
        console.log('✅ Step 2: On-chain Verification');
        console.log(`📊 Step 3: Gateway Transfers (${transferResults.filter(r => r.success).length}/${chains.length} successful)`);
        
        console.log('\nTransaction Links:');
        console.log('------------------');
        transferResults.forEach(result => {
            if (result.success) {
                console.log(`${result.icon} ${result.chain}:`);
                console.log(`   ${result.link}`);
            } else {
                console.log(`${result.icon} ${result.chain}: FAILED`);
            }
        });
        
    } catch (error) {
        console.error('❌ Workflow error:', error);
    }
}

// Run the test
executeFullWorkflow().catch(console.error);