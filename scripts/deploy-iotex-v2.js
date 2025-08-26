const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function deployIoTeXDeviceVerifierV2() {
    // Configuration
    const IOTEX_RPC = 'https://babel-api.testnet.iotex.io';
    const PRIVATE_KEY = process.env.METAMASK_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    if (!PRIVATE_KEY) {
        console.error('Please set PRIVATE_KEY environment variable');
        process.exit(1);
    }
    
    // Initialize Web3
    const web3 = new Web3(IOTEX_RPC);
    const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Deploying from address:', account.address);
    
    // Check balance
    const balance = await web3.eth.getBalance(account.address);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'IOTX');
    
    // Compile contract
    const contractPath = path.join(__dirname, '..', 'contracts', 'IoTeXDeviceVerifierV2.sol');
    const source = fs.readFileSync(contractPath, 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'IoTeXDeviceVerifierV2.sol': {
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
    
    console.log('Compiling contract...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error('Compilation failed');
        }
    }
    
    const contract = output.contracts['IoTeXDeviceVerifierV2.sol']['IoTeXDeviceVerifierV2'];
    const bytecode = contract.evm.bytecode.object;
    const abi = contract.abi;
    
    // Deploy contract
    console.log('Deploying IoTeX Device Verifier V2 (with real Nova Decider)...');
    
    const deployContract = new web3.eth.Contract(abi);
    
    const deployTx = deployContract.deploy({
        data: '0x' + bytecode
    });
    
    const gas = await deployTx.estimateGas();
    console.log('Estimated gas:', gas);
    
    const gasPrice = await web3.eth.getGasPrice();
    console.log('Gas price:', web3.utils.fromWei(gasPrice, 'gwei'), 'gwei');
    
    const deployed = await deployTx.send({
        from: account.address,
        gas: Math.floor(Number(gas) * 1.2),
        gasPrice: gasPrice
    });
    
    console.log('\n🎉 IoTeX Device Verifier V2 deployed successfully!');
    console.log('Contract address:', deployed.options.address);
    console.log('Uses real Nova Decider at:', '0xAD5f0101B94F581979AA22F123b7efd9501BfeB3');
    
    // Save deployment info
    const deploymentInfo = {
        network: 'iotex-testnet',
        address: deployed.options.address,
        novaDecider: '0xAD5f0101B94F581979AA22F123b7efd9501BfeB3',
        deployer: account.address,
        deploymentTime: new Date().toISOString(),
        abi: abi
    };
    
    fs.writeFileSync(
        path.join(__dirname, '..', 'deployments', 'iotex-device-verifier-v2.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Fund the contract with some IOTX for rewards
    console.log('\nFunding contract with 0.5 IOTX for rewards...');
    const fundTx = await web3.eth.sendTransaction({
        from: account.address,
        to: deployed.options.address,
        value: web3.utils.toWei('0.5', 'ether'),
        gas: 21000,
        gasPrice: gasPrice
    });
    console.log('Funding tx:', fundTx.transactionHash);
    
    // Update config.js
    const configPath = path.join(__dirname, '..', 'static', 'js', 'config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Replace the old contract address with the new one
    configContent = configContent.replace(
        /deviceVerifier: '0x[a-fA-F0-9]{40}'/,
        `deviceVerifier: '${deployed.options.address}'`
    );
    
    // Add a comment about the Nova Decider
    configContent = configContent.replace(
        /deviceVerifier: '([^']+)'/,
        `deviceVerifier: '$1' // V2 using real Nova Decider`
    );
    
    fs.writeFileSync(configPath, configContent);
    
    console.log('\n✅ Deployment complete!');
    console.log('Contract is ready to verify real Nova proofs');
    console.log('Explorer:', `https://testnet.iotexscan.io/address/${deployed.options.address}`);
    
    return deployed.options.address;
}

// Run deployment
deployIoTeXDeviceVerifierV2()
    .then(address => {
        console.log('\nNext steps:');
        console.log('1. Update frontend to handle Nova proof format');
        console.log('2. Generate real Nova proofs using device_registration');
        console.log('3. Test with real cryptographic verification');
        process.exit(0);
    })
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });