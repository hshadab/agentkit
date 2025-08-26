const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deploySimpleNova() {
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
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'IOTX\n');
    
    if (BigInt(balance) < BigInt(web3.utils.toWei('3', 'ether'))) {
        console.error('Insufficient balance. Need at least 3 IOTX for deployment and funding.');
        process.exit(1);
    }
    
    // Load compiled contracts
    const simpleNovaArtifact = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../artifacts/contracts/ProximityNovaDeciderSimple.sol/ProximityNovaDeciderSimple.json'), 'utf8')
    );
    const deviceVerifierV3Artifact = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../artifacts/contracts/IoTeXDeviceVerifierV3.sol/IoTeXDeviceVerifierV3.json'), 'utf8')
    );
    
    try {
        // Step 1: Deploy ProximityNovaDeciderSimple
        console.log('Step 1: Deploying ProximityNovaDeciderSimple...');
        const simpleNovaContract = new web3.eth.Contract(simpleNovaArtifact.abi);
        
        const simpleNovaDeploy = simpleNovaContract.deploy({
            data: simpleNovaArtifact.bytecode
        });
        
        const gasEstimate1 = await simpleNovaDeploy.estimateGas({ from: account.address });
        console.log('Estimated gas for ProximityNovaDeciderSimple:', gasEstimate1);
        
        const simpleNova = await simpleNovaDeploy.send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate1) * 1.2),
            gasPrice: await web3.eth.getGasPrice()
        });
        
        console.log('✅ ProximityNovaDeciderSimple deployed at:', simpleNova.options.address);
        
        // Test the proximity function
        console.log('\nTesting proximity function:');
        const isWithin1 = await simpleNova.methods.checkProximity(5050, 5050).call();
        console.log('- (5050, 5050) within proximity:', isWithin1);
        const isWithin2 = await simpleNova.methods.checkProximity(6000, 6000).call();
        console.log('- (6000, 6000) within proximity:', isWithin2);
        
        // Step 2: Deploy IoTeXDeviceVerifierV3 with simple Nova Decider
        console.log('\nStep 2: Deploying IoTeXDeviceVerifierV3 with simple Nova Decider...');
        const deviceVerifierContract = new web3.eth.Contract(deviceVerifierV3Artifact.abi);
        
        const deviceVerifierDeploy = deviceVerifierContract.deploy({
            data: deviceVerifierV3Artifact.bytecode,
            arguments: [simpleNova.options.address]
        });
        
        const gasEstimate2 = await deviceVerifierDeploy.estimateGas({ from: account.address });
        console.log('Estimated gas for DeviceVerifierV3:', gasEstimate2);
        
        const deviceVerifier = await deviceVerifierDeploy.send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate2) * 1.2),
            gasPrice: await web3.eth.getGasPrice()
        });
        
        console.log('✅ DeviceVerifierV3 deployed at:', deviceVerifier.options.address);
        
        // Step 3: Fund the device verifier
        console.log('\nStep 3: Funding DeviceVerifierV3 with 2 IOTX...');
        const fundTx = await web3.eth.sendTransaction({
            from: account.address,
            to: deviceVerifier.options.address,
            value: web3.utils.toWei('2', 'ether'),
            gas: 50000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('✅ Funded with tx:', fundTx.transactionHash);
        
        // Verify setup
        const contractBalance = await web3.eth.getBalance(deviceVerifier.options.address);
        console.log('DeviceVerifierV3 balance:', web3.utils.fromWei(contractBalance, 'ether'), 'IOTX');
        
        // Save deployment info
        const deploymentInfo = {
            network: 'iotex-testnet',
            deploymentTime: new Date().toISOString(),
            contracts: {
                proximityNovaDeciderSimple: {
                    address: simpleNova.options.address,
                    type: 'ProximityNovaDeciderSimple',
                    version: 'Simplified (focuses on proximity validation)'
                },
                deviceVerifierV3: {
                    address: deviceVerifier.options.address,
                    type: 'IoTeXDeviceVerifierV3',
                    novaDecider: simpleNova.options.address,
                    initialFunding: '2.0 IOTX'
                }
            },
            deployer: account.address
        };
        
        const deploymentPath = path.join(__dirname, '../deployments/proximity-nova-deployment-simple.json');
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('\n' + '='.repeat(60));
        console.log('DEPLOYMENT COMPLETE!');
        console.log('='.repeat(60));
        console.log('\nUpdate your config with:');
        console.log(`deviceVerifier: '${deviceVerifier.options.address}',`);
        console.log(`novaDecider: '${simpleNova.options.address}',`);
        console.log('\n' + '='.repeat(60));
        
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deploySimpleNova().catch(console.error);