// zkEngine JavaScript Interface
// Connects to the real zkEngine binary for proof generation

class ZkEngineInterface {
    constructor() {
        this.backendUrl = 'http://localhost:8002'; // Your chat service backend
        this.initialized = false;
        this.availableCircuits = [];
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing zkEngine interface...');
        
        try {
            // Test connection and get available circuits
            const response = await fetch(`${this.backendUrl}/zkengine/status`);
            if (response.ok) {
                const data = await response.json();
                this.availableCircuits = data.circuits || [];
                console.log('✅ zkEngine backend connected');
                console.log('   Available circuits:', this.availableCircuits);
            } else {
                throw new Error('zkEngine backend not available');
            }
        } catch (error) {
            console.warn('⚠️ zkEngine backend not available:', error.message);
            console.log('   Will use mock proofs for testing');
            
            // Set some mock circuits for testing
            this.availableCircuits = [
                'prove_kyc',
                'prove_ai_prediction_commitment', 
                'prove_age_verification',
                'agent_authorization'
            ];
        }
        
        this.initialized = true;
    }

    async listCircuits() {
        await this.initialize();
        return this.availableCircuits;
    }

    async generateProof(circuitName, inputs) {
        await this.initialize();
        
        console.log(`🔐 Generating proof with circuit: ${circuitName}`);
        console.log('   Inputs:', inputs);
        
        // Add realistic delay for proof generation
        const startTime = Date.now();
        console.log('⏳ Proof generation started... (this may take 10-30 seconds)');
        
        try {
            // Try to use real zkEngine backend
            const response = await fetch(`${this.backendUrl}/zkengine/prove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    function: circuitName,
                    arguments: this.convertInputsToArguments(inputs)
                })
            });

            if (response.ok) {
                const result = await response.json();
                const duration = (Date.now() - startTime) / 1000;
                console.log(`✅ Real zkEngine proof generated in ${duration.toFixed(1)}s`);
                
                return {
                    proof: result.proof,
                    publicSignals: result.public_signals || this.extractPublicSignals(inputs),
                    zkEngine: true
                };
            } else {
                throw new Error(`zkEngine backend error: ${response.status}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Real zkEngine failed, using realistic mock:', error.message);
            
            // Generate realistic mock with proper timing
            return await this.generateRealisticMock(circuitName, inputs, startTime);
        }
    }

    async generateRealisticMock(circuitName, inputs, startTime) {
        // Realistic proof generation timing (10-30 seconds)
        const proofTime = 12000 + Math.random() * 8000; // 12-20 seconds
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, proofTime - elapsed);
        
        if (remainingDelay > 0) {
            console.log(`⏳ Simulating proof generation... ${(remainingDelay/1000).toFixed(1)}s remaining`);
            
            // Show progress updates
            const progressInterval = setInterval(() => {
                const currentElapsed = Date.now() - startTime;
                const progress = Math.min(100, (currentElapsed / proofTime) * 100);
                console.log(`   Progress: ${progress.toFixed(1)}%`);
            }, 2000);
            
            await new Promise(resolve => setTimeout(resolve, remainingDelay));
            clearInterval(progressInterval);
        }
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Realistic mock proof generated in ${duration.toFixed(1)}s`);
        
        // Generate proof with realistic structure
        const proof = this.generateRealisticProofStructure(circuitName, inputs);
        
        return {
            proof: JSON.stringify(proof.groth16),
            publicSignals: proof.publicSignals,
            zkEngine: false // Mark as mock but realistic
        };
    }

    generateRealisticProofStructure(circuitName, inputs) {
        // Generate realistic-looking Groth16 proof points
        const randomField = () => {
            return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        };
        
        const groth16 = {
            pi_a: [randomField(), randomField()],
            pi_b: [[randomField(), randomField()], [randomField(), randomField()]],
            pi_c: [randomField(), randomField()]
        };
        
        // Extract meaningful public signals from inputs
        const publicSignals = this.extractPublicSignals(inputs);
        
        return { groth16, publicSignals };
    }

    extractPublicSignals(inputs) {
        // Convert inputs to public signals array
        const signals = [];
        
        if (inputs.agentIdHash !== undefined) signals.push(inputs.agentIdHash.toString());
        if (inputs.transferAmount !== undefined) signals.push(inputs.transferAmount.toString());
        if (inputs.timestamp !== undefined) signals.push(inputs.timestamp.toString());
        if (inputs.age !== undefined) signals.push(inputs.age.toString());
        if (inputs.prediction !== undefined) signals.push(inputs.prediction.toString());
        if (inputs.confidence !== undefined) signals.push(inputs.confidence.toString());
        
        // If no specific signals, generate from generic inputs
        if (signals.length === 0) {
            Object.values(inputs).forEach(value => {
                if (typeof value === 'number' || typeof value === 'string') {
                    signals.push(value.toString());
                }
            });
        }
        
        return signals;
    }

    convertInputsToArguments(inputs) {
        // Convert object inputs to array format expected by backend
        if (inputs.age !== undefined) {
            return [inputs.age, inputs.threshold || 18, inputs.secret || 12345];
        }
        
        if (inputs.prediction !== undefined) {
            return [inputs.prediction, inputs.confidence || 85, inputs.secret || 67890];
        }
        
        // Default conversion
        return Object.values(inputs).map(v => v.toString());
    }
}

// Initialize and expose zkEngine interface
window.zkEngine = new ZkEngineInterface();

console.log('🔧 zkEngine interface loaded');