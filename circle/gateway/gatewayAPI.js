import fetch from 'node-fetch';
import { GATEWAY_CONFIG } from './config.js';

// Circle Gateway API client for burn intent and attestation
export default class GatewayAPI {
  constructor() {
    this.baseUrl = GATEWAY_CONFIG.api.baseUrl;
    this.headers = GATEWAY_CONFIG.api.headers;
  }

  async getGatewayInfo() {
    try {
      console.log('🔍 Getting Gateway info...');
      
      const response = await fetch(`${this.baseUrl}${GATEWAY_CONFIG.api.endpoints.info}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Gateway info request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Gateway info retrieved');
      
      return {
        success: true,
        data,
        supportedDomains: data.supportedDomains || [],
        supportedTokens: data.supportedTokens || []
      };
    } catch (error) {
      console.error('❌ Failed to get Gateway info:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getTokenBalances(addresses, domains = [0]) {
    try {
      console.log('💰 Getting token balances...');
      
      // Format: { token: "USDC", sources: [{ domain: 0, depositor: "address" }] }
      const requestBody = {
        token: "USDC",
        sources: addresses.map((address, index) => ({
          domain: domains[index] || domains[0] || 0,
          depositor: address
        }))
      };
      
      const response = await fetch(`${this.baseUrl}${GATEWAY_CONFIG.api.endpoints.balances}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Balance request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Token balances retrieved');
      
      return {
        success: true,
        balances: data.balances || [],
        totalBalance: data.balances?.reduce((sum, bal) => sum + parseInt(bal.balance || '0'), 0).toString() || '0'
      };
    } catch (error) {
      console.error('❌ Failed to get token balances:', error.message);
      return { success: false, error: error.message };
    }
  }

  async createTransferAttestation(burnIntent) {
    try {
      console.log('🔥 Creating transfer attestation for burn intent...');
      
      const response = await fetch(`${this.baseUrl}${GATEWAY_CONFIG.api.endpoints.transfer}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(burnIntent)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transfer attestation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Transfer attestation created');
      
      return {
        success: true,
        attestation: data.attestation,
        attestationHash: data.attestationHash,
        mintRecipient: data.mintRecipient,
        amount: data.amount,
        destinationDomain: data.destinationDomain
      };
    } catch (error) {
      console.error('❌ Failed to create transfer attestation:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Create burn intent in EIP-712 format
  async createBurnIntent(params) {
    const { 
      amount,
      burnToken, 
      mintRecipient,
      destinationDomain,
      nonce = Date.now()
    } = params;

    // EIP-712 structured data for burn intent
    const burnIntent = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' }
        ],
        BurnIntent: [
          { name: 'amount', type: 'uint256' },
          { name: 'burnToken', type: 'address' },
          { name: 'mintRecipient', type: 'address' },
          { name: 'destinationDomain', type: 'uint32' },
          { name: 'nonce', type: 'uint256' }
        ]
      },
      domain: {
        name: 'Gateway',
        version: '1',
        chainId: params.chainId
      },
      primaryType: 'BurnIntent',
      message: {
        amount: amount.toString(),
        burnToken,
        mintRecipient,
        destinationDomain,
        nonce
      }
    };

    return burnIntent;
  }

  // Complete Gateway transfer workflow
  async executeGatewayTransfer(params) {
    const {
      sourceWallet,
      amount,
      burnToken,
      mintRecipient,
      destinationDomain,
      chainId,
      zkpProofId
    } = params;

    console.log('🌉 Starting Gateway transfer workflow...');
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   From: Domain ${sourceWallet}`);
    console.log(`   To: Domain ${destinationDomain}`);
    console.log(`   ZKP Proof: ${zkpProofId}`);

    try {
      // Step 1: Create burn intent
      const burnIntent = await this.createBurnIntent({
        amount,
        burnToken,
        mintRecipient,
        destinationDomain,
        chainId
      });

      console.log('📝 Burn intent created');

      // Step 2: Submit burn intent and get attestation
      const attestationResult = await this.createTransferAttestation({
        burnIntent,
        zkpProofId, // Link to ZKP verification
        sourceWallet
      });

      if (!attestationResult.success) {
        throw new Error(`Attestation failed: ${attestationResult.error}`);
      }

      console.log('✅ Gateway transfer workflow completed');
      
      return {
        success: true,
        burnIntent,
        attestation: attestationResult.attestation,
        attestationHash: attestationResult.attestationHash,
        destinationDomain,
        amount,
        zkpProofId
      };

    } catch (error) {
      console.error('❌ Gateway transfer workflow failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      console.log('🔧 Testing Gateway API connection...');
      const infoResult = await this.getGatewayInfo();
      
      if (infoResult.success) {
        console.log('✅ Gateway API connection successful');
        return { success: true, connected: true };
      } else {
        console.log('❌ Gateway API connection failed');
        return { success: false, connected: false, error: infoResult.error };
      }
    } catch (error) {
      console.error('❌ Gateway API test failed:', error.message);
      return { success: false, connected: false, error: error.message };
    }
  }
}