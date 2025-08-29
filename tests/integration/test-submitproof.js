const { ethers } = require('ethers');

async function testSubmitProof() {
    const provider = new ethers.providers.StaticJsonRpcProvider(
        'https://ethereum-sepolia-rpc.publicnode.com',
        11155111
    );
    
    const wallet = new ethers.Wallet(
        '0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab',
        provider
    );
    
    const contractAddress = '0xd345caE43dc374AAA9a056eADA8047333af5567D';
    const abi = [
        'function submitProof(bytes32 proofHash, uint256[4] calldata publicSignals) external returns (bool)',
        'event ZKMLProofVerified(bytes32 indexed proofId, address indexed submitter, bool authorized, uint256 decision, uint256 gasUsed)'
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    // Test proof data
    const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-proof-' + Date.now()));
    const publicSignals = [12345, 1, 95, 1]; // [prompt_hash, decision, confidence, amount_valid]
    
    console.log('Testing submitProof function on contract:', contractAddress);
    console.log('Proof hash:', proofHash);
    console.log('Public signals:', publicSignals);
    
    try {
        // Try to estimate gas first
        const gasEstimate = await contract.estimateGas.submitProof(proofHash, publicSignals);
        console.log('Gas estimate:', gasEstimate.toString());
        
        // Call the function
        const tx = await contract.submitProof(proofHash, publicSignals, {
            gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
        });
        
        console.log('\nTransaction sent:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('\n✅ SUCCESS!');
        console.log('Block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        
        // Check for events
        const event = receipt.events?.find(e => e.event === 'ZKMLProofVerified');
        if (event) {
            console.log('\nEvent emitted:');
            console.log('  Proof ID:', event.args.proofId);
            console.log('  Authorized:', event.args.authorized);
            console.log('  Decision:', event.args.decision.toString());
        }
        
        console.log('\nEtherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.reason || error.message);
        if (error.error) {
            console.error('Details:', error.error);
        }
    }
}

testSubmitProof().then(() => process.exit(0));