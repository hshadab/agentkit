// Cleanup Manager - Handles stuck processes and temporary files on UI load
// Cache bust: 2025-08-22

export class CleanupManager {
    constructor() {
        this.initialized = false;
        this.cleanupTasks = [];
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🧹 Starting cleanup manager...');
        
        // Run cleanup tasks
        await this.runCleanupTasks();
        
        this.initialized = true;
        console.log('✅ Cleanup manager initialized');
    }

    async runCleanupTasks() {
        const tasks = [
            this.cleanupWebSocketConnections(),
            this.cleanupTemporaryFiles(),
            this.checkForStuckProcesses(),
            this.clearOldProofData()
        ];

        try {
            await Promise.allSettled(tasks);
            console.log('✅ All cleanup tasks completed');
        } catch (error) {
            console.warn('⚠️ Some cleanup tasks failed:', error);
        }
    }

    async cleanupWebSocketConnections() {
        try {
            // Check if there are any stuck WebSocket connections
            if (window.wsManager && window.wsManager.ws) {
                const wsState = window.wsManager.ws.readyState;
                if (wsState === WebSocket.CONNECTING || wsState === WebSocket.CLOSING) {
                    console.log('🔌 Found stuck WebSocket connection, cleaning up...');
                    window.wsManager.ws.close();
                    // Give it time to close
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Clear any pending WebSocket timeouts or intervals
            if (window.wsManager && window.wsManager.reconnectTimeout) {
                clearTimeout(window.wsManager.reconnectTimeout);
                window.wsManager.reconnectTimeout = null;
            }

            console.log('✅ WebSocket connections cleaned up');
        } catch (error) {
            console.warn('⚠️ WebSocket cleanup failed:', error);
        }
    }

    async cleanupTemporaryFiles() {
        try {
            // Clean up temporary workflow files older than 1 hour
            const response = await fetch('/api/cleanup/temp-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxAge: 3600 }) // 1 hour
            }).catch(() => null);

            if (response && response.ok) {
                const result = await response.json();
                console.log(`✅ Cleaned ${result.filesRemoved || 0} temporary files`);
            } else {
                // Fallback: clear localStorage temporary data
                this.clearLocalStorageTemp();
            }
        } catch (error) {
            console.warn('⚠️ Temporary file cleanup failed:', error);
            this.clearLocalStorageTemp();
        }
    }

    clearLocalStorageTemp() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('temp_') || key.includes('_temp') || key.includes('workflow_'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if (keysToRemove.length > 0) {
                console.log(`✅ Cleared ${keysToRemove.length} temporary localStorage items`);
            }
        } catch (error) {
            console.warn('⚠️ localStorage cleanup failed:', error);
        }
    }

    async checkForStuckProcesses() {
        try {
            // Check for processes that might be stuck
            const response = await fetch('/api/health/processes', {
                method: 'GET'
            }).catch(() => null);

            if (response && response.ok) {
                const status = await response.json();
                if (status.stuckProcesses && status.stuckProcesses.length > 0) {
                    console.warn(`⚠️ Found ${status.stuckProcesses.length} potentially stuck processes`);
                    // Could trigger cleanup if needed
                }
            }
        } catch (error) {
            console.warn('⚠️ Process check failed:', error);
        }
    }

    async clearOldProofData() {
        try {
            // Clear old proof data from memory
            if (window.proofManager && window.proofManager.proofs) {
                const proofCount = window.proofManager.proofs.size;
                const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

                // Remove proofs older than 24 hours
                for (const [proofId, proofData] of window.proofManager.proofs.entries()) {
                    if (proofData.timestamp && proofData.timestamp < cutoffTime) {
                        window.proofManager.proofs.delete(proofId);
                    }
                }

                const remainingCount = window.proofManager.proofs.size;
                const removedCount = proofCount - remainingCount;

                if (removedCount > 0) {
                    console.log(`✅ Cleared ${removedCount} old proof records`);
                }
            }

            // Clear old workflow data
            if (window.workflowManager && window.workflowManager.workflows) {
                const cutoffTime = Date.now() - (6 * 60 * 60 * 1000); // 6 hours ago
                let removedCount = 0;

                for (const [workflowId, workflowData] of window.workflowManager.workflows.entries()) {
                    if (workflowData.timestamp && workflowData.timestamp < cutoffTime) {
                        window.workflowManager.workflows.delete(workflowId);
                        removedCount++;
                    }
                }

                if (removedCount > 0) {
                    console.log(`✅ Cleared ${removedCount} old workflow records`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Old proof data cleanup failed:', error);
        }
    }

    // Method to be called periodically
    async performPeriodicCleanup() {
        console.log('🧹 Running periodic cleanup...');
        await this.runCleanupTasks();
    }

    // Schedule periodic cleanup every 30 minutes
    startPeriodicCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.performPeriodicCleanup();
        }, 30 * 60 * 1000); // 30 minutes

        console.log('⏰ Periodic cleanup scheduled every 30 minutes');
    }

    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Periodic cleanup stopped');
        }
    }
}

// Make available globally
window.CleanupManager = CleanupManager;