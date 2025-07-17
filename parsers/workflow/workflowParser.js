// workflowParser_generic.js - Generic parser for all proof types and operations
class WorkflowParser {
    constructor() {
        // Define all supported proof types
        this.proofTypes = {
            'kyc': {
                wasm: 'kyc_compliance_real.wasm',
                description: 'KYC compliance proof'
            },
            'ai content': {
                wasm: 'ai_content_verification_real.wasm',
                description: 'AI content verification proof'
            },
            'location': {
                wasm: 'depin_location_real.wasm',
                description: 'Location verification proof'
            },
            'collatz': {
                wasm: 'collatz.wasm',
                description: 'Collatz sequence proof'
            },
            'prime': {
                wasm: 'prime_checker.wasm',
                description: 'Prime number verification proof'
            },
            'digital root': {
                wasm: 'digital_root.wasm',
                description: 'Digital root calculation proof'
            }
        };
    }
    
    parseCommand(message) {
        const steps = [];
        const sequenceIndicators = /\s+(?:and\s+)?then\s+|\s+after\s+(?:that|the)\s+|\s+followed\s+by\s+|\s+finally\s+|\s+;\s*/gi;
        
        // Split by sequence indicators
        const parts = message.split(sequenceIndicators).filter(part => 
            part && !['and', 'then', 'that', 'the', 'by'].includes(part.trim())
        );
        
        parts.forEach((part, index) => {
            const step = this.parseStep(part.trim(), steps.length);
            if (step) steps.push(step);
        });
        
        return {
            description: message,
            steps: steps,
            requiresProofs: steps.some(s => s.type.includes('proof'))
        };
    }
    
    parseStep(text, index) {
        const step = {
            index: index,
            raw: text,
            conditions: []
        };
        
        // Check for any proof type
        const proofMatch = this.detectProofType(text);
        if (proofMatch) {
            step.type = `${proofMatch.type}_proof`;
            step.proofType = proofMatch.type;
            step.description = `Generate ${proofMatch.description}`;
            step.parameters = this.extractProofParameters(text, proofMatch.type);
            return step;
        }
        
        // Check for verification
        if (text.match(/verify|check|validate/i)) {
            const verifyMatch = this.detectVerificationType(text);
            if (verifyMatch) {
                step.type = 'verification';
                step.verificationType = verifyMatch.type;
                step.description = `Verify ${verifyMatch.type} proof`;
                step.proofId = this.extractProofId(text);
                return step;
            }
        }
        
        // Check for transfer
        if (text.match(/send|transfer/i) || text.match(/\d*\.?\d+\s*(?:USDC|usdc)?.*to\s+\w+/i)) {
            return this.parseTransferStep(text, index);
        }
        
        // Check for wait
        if (text.match(/wait|pause|delay/i)) {
            step.type = 'wait';
            const durationMatch = text.match(/(\d+)\s*(seconds?|minutes?|ms)/i);
            if (durationMatch) {
                let duration = parseInt(durationMatch[1]);
                if (durationMatch[2].includes('minute')) duration *= 60000;
                else if (durationMatch[2].includes('second')) duration *= 1000;
                step.duration = duration;
            } else {
                step.duration = 5000; // default 5 seconds
            }
            step.description = `Wait for ${step.duration / 1000} seconds`;
            return step;
        }
        
        // Check for custom action
        if (text.match(/execute|run|perform/i)) {
            step.type = 'custom_action';
            step.action = text;
            step.description = `Execute custom action: ${text}`;
            return step;
        }
        
        return null;
    }
    
    detectProofType(text) {
        const textLower = text.toLowerCase();
        
        // Check for proof generation keywords
        if (!textLower.match(/proof|generate|create|make/i)) {
            return null;
        }
        
        // Check each proof type
        for (const [type, config] of Object.entries(this.proofTypes)) {
            if (textLower.includes(type)) {
                return { type, ...config };
            }
        }
        
        // Check alternative keywords
        if (textLower.includes('compliance')) return { type: 'kyc', ...this.proofTypes.kyc };
        if (textLower.includes('ai') || textLower.includes('artificial')) return { type: 'ai content', ...this.proofTypes['ai content'] };
        if (textLower.includes('gps') || textLower.includes('coordinate')) return { type: 'location', ...this.proofTypes.location };
        
        return null;
    }
    
    detectVerificationType(text) {
        const textLower = text.toLowerCase();
        
        for (const type of Object.keys(this.proofTypes)) {
            if (textLower.includes(type)) {
                return { type };
            }
        }
        
        // Check alternatives
        if (textLower.includes('compliance')) return { type: 'kyc' };
        if (textLower.includes('ai') || textLower.includes('artificial')) return { type: 'ai content' };
        if (textLower.includes('gps') || textLower.includes('coordinate')) return { type: 'location' };
        
        return null;
    }
    
    extractProofParameters(text, proofType) {
        const params = {};
        
        switch (proofType) {
            case 'ai content':
                // Extract hash and provider
                const hashMatch = text.match(/hash[:\s]+([a-fA-F0-9]+)/i);
                const providerMatch = text.match(/provider[:\s]+(\w+)/i) || 
                                     text.match(/from\s+(\w+)/i) ||
                                     text.match(/(?:openai|gpt|claude|anthropic|gemini)/i);
                if (hashMatch) params.hash = hashMatch[1];
                if (providerMatch) {
                    params.provider = providerMatch[1] || providerMatch[0];
                }
                break;
                
            case 'location':
                // Extract coordinates
                const coordMatch = text.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
                if (coordMatch) {
                    params.latitude = parseFloat(coordMatch[1]);
                    params.longitude = parseFloat(coordMatch[2]);
                }
                // Extract city
                const cityMatch = text.match(/(?:in|for|at)\s+([a-zA-Z\s]+?)(?:\s+then|\s*$)/i);
                if (cityMatch) params.city = cityMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
                break;
                
            case 'prime':
                // Extract number to check
                const numberMatch = text.match(/\b(\d+)\b/);
                if (numberMatch) params.number = parseInt(numberMatch[1]);
                break;
                
            case 'collatz':
                // Extract starting number
                const startMatch = text.match(/(?:start|from|with|number)\s*[:\s]*(\d+)/i) || text.match(/\b(\d+)\b/);
                if (startMatch) params.start = parseInt(startMatch[1]);
                break;
                
            case 'digital root':
                // Extract number
                const digitMatch = text.match(/(?:for|of|number)\s*[:\s]*(\d+)/i) || text.match(/\b(\d+)\b/);
                if (digitMatch) params.number = parseInt(digitMatch[1]);
                break;
        }
        
        return params;
    }
    
    extractProofId(text) {
        const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]+([a-zA-Z0-9_-]+)/i) ||
                       text.match(/([a-zA-Z0-9_-]+)\s+proof/i);
        return idMatch ? idMatch[1] : null;
    }
    
    parseTransferStep(text, index) {
        const step = {
            type: 'transfer',
            raw: text
        };
        
        // Amount extraction with decimal fix
        const amountMatch = text.match(/(\d*\.?\d+)\s*(?:USDC|usdc)?/);
        if (amountMatch) {
            let amount = amountMatch[1];
            if (amount.startsWith('.')) amount = '0' + amount;
            step.amount = amount;
        } else {
            step.amount = '0.1';
        }
        
        // Recipient
        const recipientMatch = text.match(/to\s+(\w+)/i);
        step.recipient = recipientMatch ? recipientMatch[1].toLowerCase() : 'alice';
        
        // Blockchain
        if (text.match(/solana|sol\b/i)) step.blockchain = 'SOL';
        else if (text.match(/ethereum|eth\b/i)) step.blockchain = 'ETH';
        else step.blockchain = 'ETH';
        
        // Check if conditional on proof
        const conditionalMatch = text.match(/if\s+(\w+)\s+(?:proof\s+)?(?:is\s+)?verified/i) ||
                                text.match(/if\s+(\w+)\s+passes/i);
        if (conditionalMatch) {
            step.requiresProof = true;
            step.requiredProofType = conditionalMatch[1];
        }
        
        step.description = `Transfer ${step.amount} USDC to ${step.recipient} on ${step.blockchain}`;
        return step;
    }
}

// CLI Test
if (import.meta.url === `file://${process.argv[1]}`) {
    const parser = new WorkflowParser();
    const testCases = [
        "Generate KYC proof then send 0.1 to alice if verified",
        "Create AI content proof from GPT4 with hash abc123 then verify the proof",
        "Generate location proof for 40.7128, -74.0060 then if in new york send 1 USDC to alice",
        "Check if 17 is prime then send 0.5 to bob, then generate collatz proof starting from 27",
        "Generate KYC proof then generate AI content proof then location proof for san francisco",
        "Verify location proof_id proof_123 then if verified send 2 USDC to charlie on SOL"
    ];
    
    const testMessage = process.argv.slice(2).join(' ') || testCases[0];
    console.log(`\nParsing: "${testMessage}"\n`);
    
    const result = parser.parseCommand(testMessage);
    console.log(JSON.stringify(result, null, 2));
    
    // Show summary
    console.log("\n=== Summary ===");
    console.log(`Total steps: ${result.steps.length}`);
    const proofSteps = result.steps.filter(s => s.type.includes('proof'));
    const verifySteps = result.steps.filter(s => s.type === 'verification');
    const transferSteps = result.steps.filter(s => s.type === 'transfer');
    console.log(`Proof generation: ${proofSteps.length}`);
    console.log(`Verifications: ${verifySteps.length}`);
    console.log(`Transfers: ${transferSteps.length}`);
}

export default WorkflowParser;
