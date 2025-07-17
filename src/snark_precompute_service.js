const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class SNARKPrecomputeService {
    constructor() {
        this.cache = new Map();
        this.computeQueue = [];
        this.isProcessing = false;
        
        // Use simpler circuit parameters
        this.wasmPath = path.join(__dirname, "../build_simple/simple_proof_js/simple_proof.wasm");
        this.zkeyPath = path.join(__dirname, "../build_simple/simple_proof_final.zkey");
        
        // Fallback to existing circuit if simple one doesn't exist
        if (!fs.existsSync(this.wasmPath)) {
            console.log("Simple circuit not found, using existing circuit");
            this.wasmPath = path.join(__dirname, "../ProofOfProof_js/ProofOfProof.wasm");
            this.zkeyPath = path.join(__dirname, "../proof_of_proof_final.zkey");
        }
    }
    
    /**
     * Pre-compute SNARK proof in background
     */
    async precomputeProof(proofId, proofData) {
        const cacheKey = this.getCacheKey(proofId);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log(`SNARK already cached for ${proofId}`);
            return this.cache.get(cacheKey);
        }
        
        // Add to queue
        return new Promise((resolve, reject) => {
            this.computeQueue.push({
                proofId,
                proofData,
                resolve,
                reject,
                startTime: Date.now()
            });
            
            // Start processing if not already
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }
    
    /**
     * Process queue in background
     */
    async processQueue() {
        if (this.isProcessing || this.computeQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.computeQueue.length > 0) {
            const task = this.computeQueue.shift();
            
            try {
                console.log(`Pre-computing SNARK for ${task.proofId}...`);
                
                // Create simple input for faster computation
                const input = {
                    commitment: this.hashToSmallField(task.proofId),
                    proofType: "1"
                };
                
                // Generate proof with timeout
                const proofPromise = snarkjs.groth16.fullProve(
                    input,
                    this.wasmPath,
                    this.zkeyPath
                );
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SNARK timeout')), 30000)
                );
                
                const { proof, publicSignals } = await Promise.race([
                    proofPromise,
                    timeoutPromise
                ]);
                
                const result = {
                    proof: {
                        a: [proof.pi_a[0], proof.pi_a[1]],
                        b: [[proof.pi_b[0][1], proof.pi_b[0][0]], 
                            [proof.pi_b[1][1], proof.pi_b[1][0]]],
                        c: [proof.pi_c[0], proof.pi_c[1]]
                    },
                    publicSignals,
                    computeTime: Date.now() - task.startTime
                };
                
                // Cache result
                const cacheKey = this.getCacheKey(task.proofId);
                this.cache.set(cacheKey, result);
                
                console.log(`SNARK pre-computed in ${result.computeTime}ms for ${task.proofId}`);
                task.resolve(result);
                
            } catch (error) {
                console.error(`Failed to pre-compute SNARK for ${task.proofId}:`, error.message);
                task.reject(error);
            }
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Get cached proof if available
     */
    getCachedProof(proofId) {
        const cacheKey = this.getCacheKey(proofId);
        return this.cache.get(cacheKey);
    }
    
    /**
     * Generate cache key
     */
    getCacheKey(proofId) {
        return crypto.createHash('sha256').update(proofId).digest('hex');
    }
    
    /**
     * Hash to small field element (for simple circuit)
     */
    hashToSmallField(data) {
        const hash = crypto.createHash('sha256').update(data).digest();
        // Take first 8 bytes and convert to number string
        const num = hash.readBigUInt64BE(0);
        return num.toString();
    }
}

// Export singleton instance
module.exports = new SNARKPrecomputeService();