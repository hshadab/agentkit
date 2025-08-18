import dotenv from 'dotenv';
dotenv.config();

// Circle Programmable Wallets configuration for AI agents
export const WALLET_CONFIG = {
  // Circle API configuration
  apiKey: process.env.CIRCLE_API_KEY,
  baseUrl: 'https://api-sandbox.circle.com',
  
  // Supported networks for AI agent operations
  supportedNetworks: {
    'ETH-SEPOLIA': {
      name: 'Ethereum Sepolia',
      chainId: 11155111,
      currency: 'ETH',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    },
    'BASE-SEPOLIA': {
      name: 'Base Sepolia', 
      chainId: 84532,
      currency: 'ETH',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    },
    'SOL-DEVNET': {
      name: 'Solana Devnet',
      chainId: 'devnet',
      currency: 'SOL',
      usdc: 'USDC SPL Token'
    }
  },

  // AI agent wallet naming convention
  agentWalletPrefix: 'ai-agent',
  
  // Default spending limits for AI agents
  defaultSpendingLimits: {
    dailyLimit: '100.00', // USDC
    transactionLimit: '25.00', // USDC per transaction
    weeklyLimit: '500.00' // USDC
  },

  // Agent types and their default allocations
  agentTypes: {
    researcher: {
      description: 'AI research and analysis agent',
      defaultBudget: '50.00',
      allowedServices: ['data-api', 'compute-resources', 'research-tools']
    },
    validator: {
      description: 'Work validation and quality control agent',
      defaultBudget: '25.00', 
      allowedServices: ['validation-tools', 'quality-checks']
    },
    executor: {
      description: 'Task execution and delivery agent',
      defaultBudget: '75.00',
      allowedServices: ['api-calls', 'external-services', 'deliverables']
    },
    coordinator: {
      description: 'Multi-agent coordination and management',
      defaultBudget: '100.00',
      allowedServices: ['agent-payments', 'coordination-tools', 'reporting']
    }
  }
};

// Helper functions
export function getNetworkConfig(network) {
  return WALLET_CONFIG.supportedNetworks[network.toUpperCase()];
}

export function getAgentTypeConfig(agentType) {
  return WALLET_CONFIG.agentTypes[agentType.toLowerCase()];
}

export function generateAgentWalletName(agentType, agentId) {
  return `${WALLET_CONFIG.agentWalletPrefix}-${agentType}-${agentId}`;
}

export function validateSpendingRequest(agentType, amount, category) {
  const agentConfig = getAgentTypeConfig(agentType);
  if (!agentConfig) return { valid: false, reason: 'Unknown agent type' };
  
  const numericAmount = parseFloat(amount);
  const transactionLimit = parseFloat(WALLET_CONFIG.defaultSpendingLimits.transactionLimit);
  
  if (numericAmount > transactionLimit) {
    return { valid: false, reason: `Amount exceeds transaction limit of ${transactionLimit} USDC` };
  }
  
  if (!agentConfig.allowedServices.includes(category)) {
    return { valid: false, reason: `Agent type ${agentType} not authorized for ${category}` };
  }
  
  return { valid: true };
}