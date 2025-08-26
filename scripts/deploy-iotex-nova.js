const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function deployIoTeXNovaDecider() {
    // Configuration
    const IOTEX_RPC = 'https://babel-api.testnet.iotex.io';
    const PRIVATE_KEY = process.env.METAMASK_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    if (!PRIVATE_KEY) {
        console.error('Please set PRIVATE_KEY environment variable');
        process.exit(1);
    }
    
    // Initialize Web3
    const web3 = new Web3(IOTEX_RPC);
    // Ensure private key has 0x prefix
    const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Deploying from address:', account.address);
    
    // Check balance
    const balance = await web3.eth.getBalance(account.address);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'IOTX');
    
    // Compile contract
    const contractPath = path.join(__dirname, '..', 'contracts', 'IoTeXNovaDecider.sol');
    const source = fs.readFileSync(contractPath, 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'IoTeXNovaDecider.sol': {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error('Compilation failed');
        }
    }
    
    const contract = output.contracts['IoTeXNovaDecider.sol']['IoTeXNovaDecider'];
    const bytecode = contract.evm.bytecode.object;
    const abi = contract.abi;
    
    // Deploy contract
    console.log('Deploying IoTeX Nova Decider contract...');
    
    const deployContract = new web3.eth.Contract(abi);
    
    const deployTx = deployContract.deploy({
        data: '0x' + bytecode
    });
    
    const gas = await deployTx.estimateGas();
    console.log('Estimated gas:', gas);
    
    let gasPrice = await web3.eth.getGasPrice();
    console.log('Network gas price:', web3.utils.fromWei(gasPrice, 'gwei'), 'gwei');
    
    // IoTeX testnet uses higher gas prices
    // Use network gas price as-is
    
    const deployed = await deployTx.send({
        from: account.address,
        gas: Math.floor(Number(gas) * 1.2),
        gasPrice: gasPrice
    });
    
    console.log('\\n🎉 IoTeX Nova Decider deployed successfully!');
    console.log('Contract address:', deployed.options.address);
    
    // Save deployment info
    const deploymentInfo = {
        network: 'iotex-testnet',
        address: deployed.options.address,
        deployer: account.address,
        deploymentTime: new Date().toISOString(),
        abi: abi
    };
    
    fs.writeFileSync(
        path.join(__dirname, '..', 'deployments', 'iotex-nova-decider.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Fund the contract with some IOTX for rewards
    console.log('\\nFunding contract with 1 IOTX for rewards...');
    const fundTx = await web3.eth.sendTransaction({
        from: account.address,
        to: deployed.options.address,
        value: web3.utils.toWei('1', 'ether'),
        gas: 21000,
        gasPrice: gasPrice
    });
    console.log('Funding tx:', fundTx.transactionHash);
    
    // Update config.js
    const configPath = path.join(__dirname, '..', 'static', 'js', 'config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(
        /deviceVerifier: null/,
        `deviceVerifier: '${deployed.options.address}'`
    );
    fs.writeFileSync(configPath, configContent);
    
    console.log('\\n✅ Deployment complete!');
    console.log('Contract is ready to verify device proximity proofs');
    
    return deployed.options.address;
}

// Run deployment
deployIoTeXNovaDecider()
    .then(address => {
        console.log('\\nNext steps:');
        console.log('1. The contract is deployed at:', address);
        console.log('2. Test device registration and proximity verification');
        console.log('3. Import ProximityCircuit from device_registration repo');
        process.exit(0);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });