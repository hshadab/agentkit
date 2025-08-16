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
            chainId: '0xaa36a7',
            chainIdDecimal: 11155111,
            verifierAddress: '0x09378444046d1ccb32ca2d5b44fab6634738d067',
            explorerUrl: 'https://sepolia.etherscan.io'
        },
        base: {
            chainId: '0x14a34',
            chainIdDecimal: 84532,
            contracts: {
                zkVerifier: '0x74D68B2481d298F337e62efc50724CbBA68dCF8f',
                aiPredictionCommitment: '0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC'
            },
            explorerUrl: 'https://sepolia.basescan.org'
        },
        avalanche: {
            chainId: '0xa869',
            chainIdDecimal: 43113,
            contracts: {
                zkVerifier: '0x30e93E8B0804fD60b0d151F724c307c61Be37EE1',
                medicalIntegrity: '0x1698ebB10e789EebE7A66bDb096F0a65ce49Dc68'
            },
            explorerUrl: 'https://testnet.snowtrace.io',
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            name: 'Avalanche Fuji Testnet'
        },
        iotex: {
            chainId: '0x1252',
            chainIdDecimal: 4690,
            contracts: {
                deviceVerifier: '0x4d36690090D365709eeEA35B90D5d81e481Aef79',
                novaDecider: '0x4EF6152c952dA7A27bb57E8b989348a73aB850d2',
                ioIDRegistry: '0x0A7e595C7889dF3652A19aF52C18377bF17e027D',
                ioID: '0x45Ce3E6f526e597628c73B731a3e9Af7Fc32f5b7'
            },
            explorerUrl: 'https://testnet.iotexscan.io',
            rpcUrl: 'https://babel-api.testnet.iotex.io',
            name: 'IoTeX Testnet',
            nativeCurrency: {
                name: 'IOTX',
                symbol: 'IOTX',
                decimals: 18
            }
        },
        solana: {
            network: 'devnet',
            verifierProgramId: '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7',
            explorerUrl: 'https://explorer.solana.com',
            wallets: {
                preferred: 'Solflare',
                supported: ['Solflare', 'Phantom', 'Backpack']
            }
        }
    },
    circle: {
        developerWallet: {
            walletId: 'da83113b-f48f-58a3-9115-31572ebfc127',
            address: '0x37b6c846ca0483a0fc6c7702707372ebcd131188'
        }
    }
};