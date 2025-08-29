const Web3 = require('web3');

async function transferUSDC() {
    const web3 = new Web3('https://ethereum-sepolia-rpc.publicnode.com');
    
    const account = web3.eth.accounts.privateKeyToAccount('0xc3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab');
    web3.eth.accounts.wallet.add(account);
    
    const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
    
    const abi = [
        {
            "constant": false,
            "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        }
    ];
    
    const contract = new web3.eth.Contract(abi, USDC_ADDRESS);
    
    try {
        const balance = await contract.methods.balanceOf(account.address).call();
        console.log('Current USDC balance:', web3.utils.fromWei(balance, 'mwei'), 'USDC');
        
        if (balance === '0') {
            console.log('No USDC to transfer');
            return;
        }
        
        console.log('Transferring all USDC to Gateway...');
        const gas = await contract.methods.transfer(GATEWAY_WALLET, balance).estimateGas({from: account.address});
        
        const tx = await contract.methods.transfer(GATEWAY_WALLET, balance).send({
            from: account.address,
            gas: gas,
            gasPrice: await web3.eth.getGasPrice()
        });
        
        console.log('Transaction successful!');
        console.log('TX Hash:', tx.transactionHash);
        console.log('View on Etherscan: https://sepolia.etherscan.io/tx/' + tx.transactionHash);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

transferUSDC();
