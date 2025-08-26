const { Web3 } = require('web3');
require('dotenv').config();

async function checkTransaction() {
    const IOTEX_RPC = 'https://babel-api.testnet.iotex.io';
    const web3 = new Web3(IOTEX_RPC);
    
    const txHash = process.argv[2] || '0x2dcc1c4df6ff33d06a9949c5a6a75fcaa3a57c6437f3f4133f44e3116b1d40d3';
    
    console.log('Checking transaction:', txHash);
    
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        console.log('\nTransaction Receipt:');
        console.log('- Status:', receipt.status ? 'Success' : 'Failed');
        console.log('- Gas Used:', receipt.gasUsed);
        console.log('- Block Number:', receipt.blockNumber);
        
        if (receipt.logs && receipt.logs.length > 0) {
            console.log('\nLogs:');
            receipt.logs.forEach((log, index) => {
                console.log(`\nLog ${index}:`);
                console.log('- Address:', log.address);
                console.log('- Topics:', log.topics);
                console.log('- Data:', log.data);
            });
        }
        
        // Check device rewards
        const deviceVerifierABI = [
            {
                "inputs": [{"name": "", "type": "bytes32"}],
                "name": "deviceRewards",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            }
        ];
        
        const deviceVerifier = new web3.eth.Contract(deviceVerifierABI, '0xd3778e76ce0131762337464EEF1BAefFc608e8e0');
        const deviceId = '0x9fe7bd81467165ff9f5bdacf7599b164ab5d2ecffc28e307d2a873c51f906808';
        const rewards = await deviceVerifier.methods.deviceRewards(deviceId).call();
        console.log('\nDevice rewards after tx:', web3.utils.fromWei(rewards, 'ether'), 'IOTX');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTransaction().catch(console.error);