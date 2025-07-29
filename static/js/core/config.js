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
                zkVerifier: '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1' // Real Groth16 Proof-of-Proof verifier
            },
            explorerUrl: 'https://testnet.snowtrace.io',
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            name: 'Avalanche Fuji Testnet'
        },
        iotex: {
            chainId: '0x1252', // IoTeX testnet (4690)
            chainIdDecimal: 4690,
            contracts: {
                deviceVerifier: '0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d', // V2 using real Nova Decider, // IoTeX Nova Decider deployed
                ioIDRegistry: '0x04e4655Cf258EC802D17c23ec6112Ef7d97Fa2aF', // Official ioID Registry
                ioID: '0x1FCB980eD0287777ab05ADc93012332e11300e54' // Official ioID contract
            },
            explorerUrl: 'https://testnet.iotexscan.io',
            rpcUrl: 'https://babel-api.testnet.iotex.io',
            name: 'IoTeX Testnet',
            nativeCurrency: {
                name: 'IOTX',
                symbol: 'IOTX',
                decimals: 18
            }
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