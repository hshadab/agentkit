const { ethers } = require('ethers');

async function checkDeployment() {
    const provider = new ethers.providers.StaticJsonRpcProvider(
        'https://ethereum-sepolia-rpc.publicnode.com',
        11155111
    );
    
    const txHash = '0x58bd372fb512bd65c3f372f19da687d70b372bd62f8f9fac79717263e2e0d608';
    console.log('Checking transaction:', txHash);
    
    try {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
            console.log('\n✅ Transaction confirmed!');
            console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
            console.log('Block:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed.toString());
            
            if (receipt.contractAddress) {
                console.log('\n🎉 Contract deployed at:', receipt.contractAddress);
                console.log('Etherscan:', `https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
                return receipt.contractAddress;
            }
        } else {
            console.log('Transaction still pending...');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkDeployment().then(() => process.exit(0));