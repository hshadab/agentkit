import GatewayHandler from './gatewayHandler.js';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ZKP Gateway Integration - combines ZKP verification with cross-chain transfers
export default class ZKPGatewayIntegration {
  constructor() {
    this.gatewayHandler = new GatewayHandler();
    this.zkEngineUrl = 'ws://localhost:8001/ws';
    this.ws = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize gateway handler
      await this.gatewayHandler.initialize();
      
      // Connect to ZKP engine
      await this.connectToZKEngine();
      
      this.initialized = true;
      console.log('✅ ZKP Gateway Integration initialized');

    } catch (error) {
      console.error('❌ Failed to initialize ZKP Gateway Integration:', error.message);
      throw error;
    }
  }

  async connectToZKEngine() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.zkEngineUrl);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to zkEngine for Gateway verification');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.warn('⚠️ zkEngine not available. Gateway will work without ZKP verification.');
        resolve(); // Don't fail if ZKP engine is not available
      });

      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ zkEngine timeout. Gateway will work without ZKP verification.');
          resolve();
        }
      }, 3000);
    });
  }

  async generateProof(proofType, proofData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ ZKP engine not available, skipping proof generation');
      return { verified: false, reason: 'zkEngine not available' };
    }

    return new Promise((resolve, reject) => {
      const proofRequest = {
        type: 'generate_proof',
        proof_type: proofType,
        data: proofData,
        timestamp: Date.now()
      };

      const timeout = setTimeout(() => {
        reject(new Error('Proof generation timeout'));
      }, 30000);

      this.ws.once('message', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.status === 'proof_generated') {
            resolve({
              verified: true,
              proof: response.proof,
              publicSignals: response.public_signals,
              proofId: response.proof_id
            });
          } else {
            resolve({ verified: false, reason: response.message });
          }
        } catch (error) {
          reject(error);
        }
      });

      this.ws.send(JSON.stringify(proofRequest));
    });
  }

  async verifyAndDeposit(options) {
    const { proofType, proofData, network, amount } = options;
    
    if (!this.initialized) await this.initialize();

    console.log(`🔐 Starting ZKP verified deposit: ${amount} USDC on ${network}`);

    // Step 1: Generate ZKP if required
    let proofResult = { verified: true }; // Default to verified if no ZKP engine
    
    if (proofType && proofData) {
      console.log(`🧮 Generating ${proofType} proof...`);
      proofResult = await this.generateProof(proofType, proofData);
      
      if (!proofResult.verified) {
        throw new Error(`ZKP verification failed: ${proofResult.reason}`);
      }
      console.log('✅ ZKP verification successful');
    }

    // Step 2: Execute Gateway deposit
    console.log(`🏦 Executing Gateway deposit...`);
    const depositResult = await this.gatewayHandler.deposit(network, amount);

    // Step 3: Store proof metadata
    if (proofResult.proofId) {
      await this.storeProofMetadata({
        proofId: proofResult.proofId,
        proofType,
        network,
        amount,
        transactionHash: depositResult.transactionHash,
        timestamp: Date.now()
      });
    }

    return {
      zkpVerified: proofResult.verified,
      proofId: proofResult.proofId,
      deposit: depositResult
    };
  }

  async verifyAndTransfer(options) {
    const { proofType, proofData, fromNetwork, toNetwork, amount, recipient } = options;
    
    if (!this.initialized) await this.initialize();

    console.log(`🔐 Starting ZKP verified cross-chain transfer`);
    console.log(`   ${amount} USDC from ${fromNetwork} to ${toNetwork}`);

    // Step 1: Generate ZKP if required
    let proofResult = { verified: true };
    
    if (proofType && proofData) {
      console.log(`🧮 Generating ${proofType} proof...`);
      proofResult = await this.generateProof(proofType, proofData);
      
      if (!proofResult.verified) {
        throw new Error(`ZKP verification failed: ${proofResult.reason}`);
      }
      console.log('✅ ZKP verification successful');
    }

    // Step 2: Execute cross-chain transfer
    console.log(`🌉 Executing cross-chain transfer...`);
    const transferResult = await this.gatewayHandler.transfer(
      fromNetwork, 
      toNetwork, 
      amount, 
      recipient
    );

    // Step 3: Store proof metadata
    if (proofResult.proofId) {
      await this.storeProofMetadata({
        proofId: proofResult.proofId,
        proofType,
        fromNetwork,
        toNetwork,
        amount,
        recipient,
        transactionHash: transferResult.transactionHash,
        timestamp: Date.now()
      });
    }

    return {
      zkpVerified: proofResult.verified,
      proofId: proofResult.proofId,
      transfer: transferResult
    };
  }

  async storeProofMetadata(metadata) {
    try {
      const proofsDir = path.join(__dirname, '../proofs');
      if (!fs.existsSync(proofsDir)) {
        fs.mkdirSync(proofsDir, { recursive: true });
      }

      const metadataPath = path.join(proofsDir, `gateway_${metadata.proofId}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`📝 Stored proof metadata: ${metadataPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to store proof metadata: ${error.message}`);
    }
  }

  async getGatewayStatus() {
    if (!this.initialized) await this.initialize();

    const walletInfo = await this.gatewayHandler.getWalletInfo();
    const supportedNetworks = await this.gatewayHandler.getSupportedNetworks();
    
    return {
      initialized: this.initialized,
      zkpEngineConnected: this.ws && this.ws.readyState === WebSocket.OPEN,
      supportedNetworks,
      walletInfo
    };
  }

  // Convenience methods for common workflows
  async kycVerifiedTransfer(fromNetwork, toNetwork, amount, recipient, kycData) {
    return this.verifyAndTransfer({
      proofType: 'kyc',
      proofData: kycData,
      fromNetwork,
      toNetwork,
      amount,
      recipient
    });
  }

  async deviceProximityTransfer(fromNetwork, toNetwork, amount, recipient, deviceData) {
    return this.verifyAndTransfer({
      proofType: 'device_proximity',
      proofData: deviceData,
      fromNetwork,
      toNetwork,
      amount,
      recipient
    });
  }

  async balanceVerifiedTransfer(fromNetwork, toNetwork, amount, recipient, balanceData) {
    return this.verifyAndTransfer({
      proofType: 'balance',
      proofData: balanceData,
      fromNetwork,
      toNetwork,
      amount,
      recipient
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 Disconnected from zkEngine');
    }
  }
}