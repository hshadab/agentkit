// Configuration settings for the AgentKit UI
export const config = {
    websocket: {
        url: 'ws://localhost:8001/ws',
        reconnectDelay: 3000,
        maxReconnectAttempts: 10
    },
    api: {
        baseUrl: '/api/v1',
        timeout: 30000
    },
    ui: {
        messageHistoryLimit: 100,
        debugMode: true,
        toastDuration: 3000
    },
    polling: {
        workflowInterval: 2000,
        transferInterval: 3000,
        maxPollingDuration: 300000 // 5 minutes
    },
    blockchain: {
        ethereum: {
            chainId: '0xaa36a7', // Sepolia
            chainIdDecimal: 11155111,
            verifierAddress: '0x1e8150050a7a4715aad42b905c08df76883f396f',
            explorerUrl: 'https://sepolia.etherscan.io'
        },
        solana: {
            network: 'devnet',
            verifierProgramId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7',
            explorerUrl: 'https://explorer.solana.com',
            wallets: {
                preferred: 'Solflare',
                supported: ['Solflare', 'Phantom', 'Backpack']
            }
        },
        base: {
            chainId: '0x14a34', // Base Sepolia
            chainIdDecimal: 84532,
            contracts: {
                zkVerifier: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
                aiPredictionCommitment: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC'
            },
            explorerUrl: 'https://sepolia.basescan.org'
        },
        avalanche: {
            chainId: '0xa869', // Fuji testnet
            chainIdDecimal: 43113,
            contracts: {
                zkVerifier: '0x1e8150050a7a4715aad42b905c08df76883f396f' // TODO: Deploy to Fuji
            },
            explorerUrl: 'https://testnet.snowtrace.io',
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            name: 'Avalanche Fuji Testnet'
        }
    },
    circle: {
        developerWallet: {
            walletId: 'da83113b-f48f-58a3-9115-31572ebfc127',
            address: '0x37b6c846ca0483a0fc6c7702707372ebcd131188'
        }
    },
    coinbase: {
        apiKey: '30f1d73c-8bb7-42b6-8f5d-bb5b79b1dd4a'
    }
};