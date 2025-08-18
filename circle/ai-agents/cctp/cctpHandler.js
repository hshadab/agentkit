import ethers from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ChainVerification, SUPPORTED_CHAINS } from '../zkp/chainVerification.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

// Circle CCTP V2 configuration for AI agents
export const CCTP_CONFIG = {
  // Circle API for attestation service
  apiKey: process.env.CIRCLE_API_KEY,
  apiBaseUrl: 'https://api-sandbox.circle.com',
  
  // Network configurations with real CCTP contract addresses
  networks: {
    'ethereum-sepolia': {
      chainId: 11155111,
      name: 'Ethereum Sepolia',
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
      domain: 0, // Ethereum domain
      
      // Real Circle CCTP contracts on Sepolia
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD', 
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      tokenMinter: '0xE997d7d2F6E065a9A93Fa2175E878Fb9081F1f0A'
    },
    
    'base-sepolia': {
      chainId: 84532,
      name: 'Base Sepolia',
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      domain: 6, // Base domain
      
      // Real Circle CCTP contracts on Base Sepolia
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      tokenMinter: '0xE997d7d2F6E065a9A93Fa2175E878Fb9081F1f0A'
    },

    'avalanche-fuji': {
      chainId: 43113,
      name: 'Avalanche Fuji',
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
      domain: 1, // Avalanche domain
      
      // Real Circle CCTP contracts on Avalanche Fuji
      tokenMessenger: '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
      messageTransmitter: '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
      usdc: '0x5425890298aed601595a70ab815c96711a31bc65',
      tokenMinter: '0x4ed8867f9947a5fe140c9dc1c6f207f3489f501e'
    }
  }
};

// Minimal ABIs for CCTP contracts
const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64)',
  'function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) returns (uint64)'
];

const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes memory message, bytes memory attestation) returns (bool)',
  'function usedNonces(bytes32) view returns (uint256)',
  'event MessageSent(bytes message)'
];

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)'
];

export default class CCTPHandler {
  constructor() {
    this.providers = {};
    this.signers = {};
    this.contracts = {};
    this.chainVerification = new ChainVerification();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const privateKey = process.env.GATEWAY_PRIVATE_KEY || process.env.PRIVATE_KEY;
      console.log('Debug: Available env vars:', Object.keys(process.env).filter(k => k.includes('KEY')).join(', '));
      console.log('Debug: GATEWAY_PRIVATE_KEY exists:', !!process.env.GATEWAY_PRIVATE_KEY);
      console.log('Debug: PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
      
      if (!privateKey) {
        throw new Error('PRIVATE_KEY or GATEWAY_PRIVATE_KEY not found in environment variables');
      }

      // Initialize providers and contracts for each network
      for (const [networkKey, config] of Object.entries(CCTP_CONFIG.networks)) {
        try {
          this.providers[networkKey] = new ethers.providers.JsonRpcProvider(config.rpcUrl);
          this.signers[networkKey] = new ethers.Wallet(privateKey, this.providers[networkKey]);
          
          this.contracts[networkKey] = {
            tokenMessenger: new ethers.Contract(
              config.tokenMessenger,
              TOKEN_MESSENGER_ABI,
              this.signers[networkKey]
            ),
            messageTransmitter: new ethers.Contract(
              config.messageTransmitter,
              MESSAGE_TRANSMITTER_ABI,
              this.signers[networkKey]
            ),
            usdc: new ethers.Contract(
              config.usdc,
              USDC_ABI,
              this.signers[networkKey]
            )
          };

          // Test connection
          await this.providers[networkKey].getNetwork();
          console.log(`✅ CCTP initialized for ${config.name}`);
          
        } catch (error) {
          console.warn(`⚠️ Failed to initialize ${config.name}: ${error.message}`);
        }
      }

      // Initialize chain verification for on-chain proof verification
      await this.chainVerification.initialize();
      
      this.initialized = true;
      console.log('✅ CCTP Handler initialized for AI agents');

    } catch (error) {
      console.error('❌ Failed to initialize CCTP Handler:', error.message);
      throw error;
    }
  }

  // Get USDC balance for an AI agent
  async getAgentBalance(agentId, network) {
    if (!this.initialized) await this.initialize();

    const config = CCTP_CONFIG.networks[network];
    const contract = this.contracts[network]?.usdc;
    
    if (!config || !contract) {
      throw new Error(`Network ${network} not supported`);
    }

    const agentAddress = await this.signers[network].getAddress();
    const balance = await contract.balanceOf(agentAddress);
    
    return {
      agentId,
      network,
      address: agentAddress,
      balance: ethers.utils.formatUnits(balance, 6), // USDC has 6 decimals
      balanceWei: balance.toString()
    };
  }

  // Cross-chain transfer with ZKP proof verification
  async crossChainTransfer(agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof) {
    if (!this.initialized) await this.initialize();

    console.log(`🌉 AI Agent ${agentId}: Cross-chain transfer ${amount} USDC from ${fromNetwork} to ${toNetwork}`);
    
    // Validate ZKP proof
    if (!zkpProof || !zkpProof.verified) {
      throw new Error('Valid ZKP proof required for cross-chain transfer');
    }

    // CRITICAL: On-chain verification as authorization trigger
    console.log(`🔐 Step 1: On-chain ZKP verification required for authorization...`);
    const verificationResult = await this.verifyProofOnChain(zkpProof, fromNetwork, agentId);
    
    if (!verificationResult.verified) {
      throw new Error(`❌ On-chain proof verification failed: ${verificationResult.error}`);
    }
    
    console.log(`✅ On-chain verification successful on ${fromNetwork}`);
    console.log(`   Transaction: ${verificationResult.transactionHash}`);
    console.log(`   Block: ${verificationResult.blockNumber}`);
    console.log(`   CCTP transfer authorized by on-chain proof verification\n`);

    const fromConfig = CCTP_CONFIG.networks[fromNetwork];
    const toConfig = CCTP_CONFIG.networks[toNetwork];
    
    if (!fromConfig || !toConfig) {
      throw new Error(`Unsupported network pair: ${fromNetwork} -> ${toNetwork}`);
    }

    const fromContracts = this.contracts[fromNetwork];
    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Check balance
    const balance = await this.getAgentBalance(agentId, fromNetwork);
    if (BigInt(balance.balanceWei) < amountWei) {
      throw new Error(`Insufficient balance. Have: ${balance.balance} USDC, Need: ${amount} USDC`);
    }

    // Convert recipient to bytes32
    const recipientBytes32 = ethers.utils.hexZeroPad(recipientAddress, 32);
    
    // Check and approve if needed
    const allowance = await fromContracts.usdc.allowance(
      await this.signers[fromNetwork].getAddress(),
      fromConfig.tokenMessenger
    );
    
    if (allowance.lt(amountWei)) {
      console.log(`📝 Approving CCTP to spend ${amount} USDC`);
      const approveTx = await fromContracts.usdc.approve(fromConfig.tokenMessenger, amountWei);
      await approveTx.wait();
      console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    }

    // Execute burn on source chain
    console.log(`🔥 Burning ${amount} USDC on ${fromNetwork}...`);
    const burnTx = await fromContracts.tokenMessenger.depositForBurn(
      amountWei,
      toConfig.domain,
      recipientBytes32,
      fromConfig.usdc
    );
    
    const burnReceipt = await burnTx.wait();
    console.log(`✅ Burn successful: ${burnTx.hash}`);

    // Extract burn message from logs
    const messageEvent = burnReceipt.logs.find(log => {
      try {
        const decoded = fromContracts.messageTransmitter.interface.parseLog(log);
        return decoded.name === 'MessageSent';
      } catch {
        return false;
      }
    });

    if (!messageEvent) {
      throw new Error('Failed to find MessageSent event in burn transaction');
    }

    const messageSent = fromContracts.messageTransmitter.interface.parseLog(messageEvent);
    const messageBytes = messageSent.args.message;

    console.log(`📨 Message sent, waiting for attestation...`);

    // Get attestation from Circle API
    const attestation = await this.getAttestation(messageBytes);
    
    if (!attestation) {
      throw new Error('Failed to get attestation from Circle');
    }

    console.log(`✅ Attestation received, minting on ${toNetwork}...`);

    // Execute mint on destination chain
    const toContracts = this.contracts[toNetwork];
    const mintTx = await toContracts.messageTransmitter.receiveMessage(
      messageBytes,
      attestation
    );
    
    const mintReceipt = await mintTx.wait();
    console.log(`✅ Mint successful: ${mintTx.hash}`);

    return {
      agentId,
      fromNetwork,
      toNetwork,
      amount,
      recipient: recipientAddress,
      zkpProof: zkpProof.proofId,
      burnTx: burnTx.hash,
      mintTx: mintTx.hash,
      burnBlock: burnReceipt.blockNumber,
      mintBlock: mintReceipt.blockNumber,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  }

  // Get attestation from Circle's attestation service
  async getAttestation(messageBytes, maxRetries = 20) {
    const messageHash = ethers.utils.keccak256(messageBytes);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(
          `https://iris-api-sandbox.circle.com/attestations/${messageHash}`
        );
        
        if (response.data.status === 'complete') {
          return response.data.attestation;
        }
        
        console.log(`⏳ Attestation not ready, retrying... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`⏳ Message not yet processed by Circle, retrying... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Timeout waiting for attestation');
  }

  // Fast Transfer using CCTP V2 capabilities
  async fastTransfer(agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof, urgencyLevel = 'normal') {
    console.log(`⚡ AI Agent ${agentId}: Fast transfer initiated (${urgencyLevel} priority)`);
    
    // For fast transfers, we can use additional features like:
    // 1. Priority attestation requests
    // 2. Optimistic settlement
    // 3. Liquidity pools for instant settlement
    
    const transfer = await this.crossChainTransfer(
      agentId, fromNetwork, toNetwork, amount, recipientAddress, zkpProof
    );
    
    // Mark as fast transfer
    transfer.transferType = 'fast';
    transfer.urgencyLevel = urgencyLevel;
    transfer.estimatedFinalization = urgencyLevel === 'urgent' ? '30 seconds' : '2 minutes';
    
    return transfer;
  }

  // Get transfer status and history for an agent
  async getAgentTransferHistory(agentId, network = null) {
    // This would query the blockchain for MessageSent events
    // and cross-reference with agent transactions
    
    const networks = network ? [network] : Object.keys(CCTP_CONFIG.networks);
    const history = [];
    
    for (const net of networks) {
      try {
        const config = CCTP_CONFIG.networks[net];
        const contract = this.contracts[net]?.messageTransmitter;
        
        if (!contract) continue;
        
        // Query recent MessageSent events for this agent
        const filter = contract.filters.MessageSent();
        const events = await contract.queryFilter(filter, -1000); // Last 1000 blocks
        
        for (const event of events) {
          // Parse and filter events for this agent
          const parsedEvent = contract.interface.parseLog(event);
          
          history.push({
            agentId,
            network: net,
            messageHash: ethers.utils.keccak256(parsedEvent.args.message),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: new Date().toISOString() // Would get actual block timestamp
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to query ${net} history: ${error.message}`);
      }
    }
    
    return history;
  }

  // Check supported networks and their status
  // CRITICAL: On-chain ZKP verification as CCTP authorization trigger
  async verifyProofOnChain(zkpProof, targetNetwork, agentId) {
    console.log(`🔐 Verifying proof on-chain before CCTP authorization...`);
    console.log(`   Network: ${targetNetwork}`);
    console.log(`   Proof ID: ${zkpProof.proofId}`);
    console.log(`   Agent: ${agentId}`);

    // Validate proof before attempting on-chain verification
    if (!zkpProof || !zkpProof.verified) {
      throw new Error('Cannot verify invalid or unverified proof on-chain');
    }

    // Check for PENDING values
    if (zkpProof.proof === 'PENDING' || JSON.stringify(zkpProof).includes('PENDING')) {
      throw new Error('Proof is not ready - contains PENDING values. Please wait for proof generation to complete.');
    }

    // Map CCTP network names to chain verification names
    const networkMap = {
      'ethereum-sepolia': 'ethereum',
      'base-sepolia': 'base', 
      'avalanche-fuji': 'avalanche'
    };
    
    const chainKey = networkMap[targetNetwork];
    if (!chainKey) {
      throw new Error(`Network ${targetNetwork} not supported for on-chain verification`);
    }

    try {
      // Verify the proof on-chain using the deployed verifier contracts
      const verificationResult = await this.chainVerification.verifyProofOnChain(
        zkpProof, 
        chainKey, 
        agentId
      );

      console.log(`🔍 On-chain verification result:`);
      console.log(`   Verified: ${verificationResult.verified}`);
      console.log(`   Chain: ${verificationResult.chain}`);
      console.log(`   Transaction: ${verificationResult.transactionHash}`);

      if (!verificationResult.verified) {
        throw new Error('Proof verification failed on-chain');
      }

      // Return verification details for audit trail
      return {
        verified: true,
        network: targetNetwork,
        chainId: verificationResult.chainId,
        verifierContract: SUPPORTED_CHAINS[chainKey].verifierContract,
        transactionHash: verificationResult.transactionHash,
        blockNumber: verificationResult.blockNumber,
        proofId: zkpProof.proofId,
        agentId,
        timestamp: verificationResult.timestamp,
        authorizesTransfer: true
      };

    } catch (error) {
      console.error(`❌ On-chain verification failed: ${error.message}`);
      return {
        verified: false,
        error: error.message,
        network: targetNetwork,
        proofId: zkpProof.proofId,
        agentId
      };
    }
  }

  async getSupportedNetworks() {
    const networks = [];
    
    for (const [key, config] of Object.entries(CCTP_CONFIG.networks)) {
      try {
        const provider = this.providers[key];
        const network = await provider?.getNetwork();
        
        // Include verifier contract info
        const networkMap = {
          'ethereum-sepolia': 'ethereum',
          'base-sepolia': 'base', 
          'avalanche-fuji': 'avalanche'
        };
        
        const chainKey = networkMap[key];
        const verifierContract = chainKey ? SUPPORTED_CHAINS[chainKey]?.verifierContract : null;
        
        networks.push({
          key,
          name: config.name,
          chainId: config.chainId,
          domain: config.domain,
          status: network ? 'connected' : 'offline',
          usdc: config.usdc,
          cctp: {
            tokenMessenger: config.tokenMessenger,
            messageTransmitter: config.messageTransmitter
          },
          zkpVerifier: verifierContract
        });
      } catch (error) {
        networks.push({
          key,
          name: config.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return networks;
  }
}