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
            verifierAddress: '0xa14e2C1Aa24CEE480e0DED4c241A5EC15f7a3b09'
        },
        solana: {
            network: 'devnet',
            verifierProgramId: 'CqKFQGg1r5nA3pUetFvvmF5g5cDJNgBBDdhX5qwHkF9d'
        }
    }
};