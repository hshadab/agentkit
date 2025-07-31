// Medical Record Handler - handles creation and commitment in one step
class MedicalRecordHandler {
    constructor() {
        this.records = new Map();
        this.commitments = new Map();
    }
    
    async createAndCommitRecord(patientId, recordHash) {
        console.log('[MEDICAL] Creating and committing medical record...');
        console.log('[MEDICAL] Patient ID:', patientId);
        console.log('[MEDICAL] Record Hash:', recordHash);
        
        // Generate unique record ID
        const recordId = `medical_${patientId}_${Date.now()}`;
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Create record data
        const recordData = {
            record_id: recordId,
            patient_id: patientId,
            record_hash: recordHash,
            creation_timestamp: timestamp,
            status: 'pending_commitment'
        };
        
        // Store record locally
        this.records.set(recordId, recordData);
        
        try {
            // Prefer avalancheMedicalIntegrity module which handles network switching
            if (window.avalancheMedicalIntegrity) {
                console.log('[MEDICAL] Using avalancheMedicalIntegrity module');
                const result = await window.avalancheMedicalIntegrity.createMedicalRecord(
                    patientId,
                    recordHash,
                    null
                );
                
                console.log('[MEDICAL] Commitment successful:', result);
                
                // Update record data with blockchain info
                recordData.transactionHash = result.txHash;
                recordData.blockNumber = result.blockNumber;
                recordData.avalancheRecordId = result.recordId;
                recordData.status = 'committed';
                recordData.commitment_timestamp = timestamp;
                
                // Store commitment data
                this.commitments.set(recordId, {
                    recordId: result.recordId,
                    transactionHash: result.txHash,
                    blockNumber: result.blockNumber,
                    explorerUrl: `https://testnet.snowtrace.io/tx/${result.txHash}`
                });
                
                return recordData;
            } else if (window.AvalancheMedicalVerifier) {
                const verifier = new window.AvalancheMedicalVerifier();
                await verifier.initialize();
                
                console.log('[MEDICAL] Committing to Avalanche blockchain...');
                
                // Create medical record on blockchain
                const result = await verifier.createMedicalRecord(
                    patientId,
                    recordHash,
                    null // Will use current address
                );
                
                console.log('[MEDICAL] Commitment successful:', result);
                
                // Update record data with blockchain info
                recordData.transactionHash = result.transactionHash;
                recordData.blockNumber = result.blockNumber;
                recordData.avalancheRecordId = result.recordId;
                recordData.status = 'committed';
                recordData.commitment_timestamp = timestamp;
                
                // Store commitment data
                this.commitments.set(recordId, {
                    recordId: result.recordId,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    explorerUrl: `https://testnet.snowtrace.io/tx/${result.transactionHash}`
                });
                
                return recordData;
            } else {
                console.warn('[MEDICAL] Avalanche verifier not available, simulating commitment');
                
                // Simulate commitment for testing
                recordData.transactionHash = '0x' + Math.random().toString(16).substr(2, 64);
                recordData.blockNumber = Math.floor(Math.random() * 1000000);
                recordData.status = 'committed_simulated';
                recordData.commitment_timestamp = timestamp;
                
                return recordData;
            }
        } catch (error) {
            console.error('[MEDICAL] Commitment failed:', error);
            recordData.status = 'commitment_failed';
            recordData.error = error.message;
            throw error;
        }
    }
    
    getRecord(recordId) {
        return this.records.get(recordId);
    }
    
    getCommitment(recordId) {
        return this.commitments.get(recordId);
    }
    
    // Get record data for proof generation
    getRecordDataForProof(recordId) {
        const record = this.records.get(recordId);
        if (!record) return null;
        
        return {
            patient_id: record.patient_id,
            record_hash: record.record_hash,
            creation_timestamp: record.creation_timestamp,
            commitment_timestamp: record.commitment_timestamp || record.creation_timestamp,
            avalanche_record_id: record.avalancheRecordId,
            transaction_hash: record.transactionHash
        };
    }
}

// Export for use
window.medicalRecordHandler = new MedicalRecordHandler();