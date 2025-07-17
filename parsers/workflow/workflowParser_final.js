// workflowParser_enhanced.js - Enhanced parser with better conditional handling
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
        
        // Check if this is a single conditional transfer with multiple conditions
        if (this.isConditionalTransfer(message)) {
            return this.parseConditionalTransfer(message);
        }
        
        // Otherwise, use the original sequential parsing
        const sequenceIndicators = /\s+(?:and\s+)?then\s+|\s+after\s+(?:that|the)\s+|\s+followed\s+by\s+|\s+finally\s+|\s+;\s*/gi;
        
        // Split by sequence indicators
        const parts = message.split(sequenceIndicators).filter(part => 
            part && !['and', 'then', 'that', 'the', 'by'].includes(part.trim())
        );
        
        parts.forEach((part, index) => {
            // Special handling for "prove X, verify it" pattern
            if (part.includes(',') && part.toLowerCase().includes('verify')) {
                const subParts = part.split(',').map(p => p.trim());
                subParts.forEach(subPart => {
                    const step = this.parseStep(subPart, steps.length);
                    if (step) steps.push(step);
                });
            } else {
                const step = this.parseStep(part.trim(), steps.length);
                if (step) steps.push(step);
            }
        });
        
        // Post-process to resolve "previous" verification types and insert auto-verifications
        const processedSteps = [];
        steps.forEach((step, index) => {
            if (step.type === 'verification' && step.verificationType === 'previous') {
                // Find the most recent proof generation step
                for (let i = index - 1; i >= 0; i--) {
                    if (steps[i].type.includes('_proof')) {
                        step.verificationType = steps[i].proofType;
                        step.description = `Verify ${steps[i].proofType} proof`;
                        break;
                    }
                }
            }
            
            // Add the current step
            processedSteps.push(step);
            
            // Check if we need to auto-insert verification after a proof step
            if (step.type.includes('_proof')) {
                // Look ahead to see if there's a conditional step that requires this proof
                for (let j = index + 1; j < steps.length; j++) {
                    const nextStep = steps[j];
                    if (nextStep.condition && 
                        nextStep.condition.toLowerCase().includes(step.proofType.toLowerCase()) && 
                        (nextStep.condition.toLowerCase().includes('verified') || nextStep.condition.toLowerCase().includes('compliant'))) {
                        
                        // Check if the next immediate step is already a verification for this proof
                        const nextIsVerification = (index + 1 < steps.length) && 
                            steps[index + 1].type === 'verification' && 
                            steps[index + 1].verificationType === step.proofType;
                        
                        if (!nextIsVerification) {
                            // Insert auto-verification step
                            const verifyStep = {
                                index: processedSteps.length,
                                type: 'verification',
                                verificationType: step.proofType,
                                description: `Verify ${step.proofType} proof`,
                                proofId: null, // Will be filled during execution
                                auto: true // Mark as auto-inserted
                            };
                            processedSteps.push(verifyStep);
                        }
                        break; // Only need to check once per proof
                    }
                }
            }
        });
        
        // Update indices
        processedSteps.forEach((step, index) => {
            step.index = index;
        });
        
        return {
            description: message,
            steps: processedSteps,
            requiresProofs: processedSteps.some(s => s.type.includes('proof'))
        };
    }
    
    isConditionalTransfer(message) {
        // Check if this is a transfer with conditions
        const hasTransfer = /send|transfer/i.test(message);
        const hasCondition = /\bif\b/i.test(message);
        const noThen = !/\bthen\b/i.test(message);
        
        return hasTransfer && hasCondition && noThen;
    }
    
    parseConditionalTransfer(message) {
        const steps = [];
        
        // Check if this is a multi-transfer command with "and"
        const andParts = message.split(/\s+and\s+/i);
        if (andParts.length > 1 && andParts.every(part => /send|transfer/i.test(part) && /if/i.test(part))) {
            // Handle multiple conditional transfers
            const parts = andParts;
            
            parts.forEach((part, index) => {
                // Parse each conditional transfer - handle both orderings
                let person, condition, amount, blockchain;
                
                // Pattern 1: "Send X to Y if Z" 
                const pattern1 = part.match(/(send|transfer)\s+(\d*\.?\d+)\s*(?:USDC|usdc)?\s+to\s+(\w+)\s+(?:on\s+)?(ethereum|eth|solana|sol)?\s*if\s+(.+)/i);
                if (pattern1) {
                    amount = pattern1[2].startsWith('.') ? '0' + pattern1[2] : pattern1[2];
                    person = pattern1[3].toLowerCase();
                    blockchain = pattern1[4] ? (pattern1[4].toLowerCase().includes('sol') ? 'SOL' : 'ETH') : 'ETH';
                    condition = pattern1[5].trim();
                }
                
                // Pattern 2: "If X if Y send Z"
                const pattern2 = part.match(/if\s+(\w+)\s+(?:is\s+)?(.+?)\s+(send|transfer)\s+(?:her|him|them)?\s*(\d*\.?\d+)\s*(?:USDC|usdc)?\s+(?:to\s+)?(?:on\s+)?(ethereum|eth|solana|sol)/i);
                if (pattern2) {
                    person = pattern2[1].toLowerCase();
                    condition = pattern2[2].trim();
                    amount = pattern2[4].startsWith('.') ? '0' + pattern2[4] : pattern2[4];
                    blockchain = pattern2[5] ? (pattern2[5].toLowerCase().includes('sol') ? 'SOL' : 'ETH') : 'ETH';
                }
                
                if (person && amount) {
                    
                    // Determine proof type from condition
                    let proofType = 'kyc'; // default
                    if (condition.toLowerCase().includes('kyc')) {
                        proofType = 'kyc';
                    } else if (condition.toLowerCase().includes('location')) {
                        proofType = 'location';
                    } else if (condition.toLowerCase().includes('ai')) {
                        proofType = 'ai_content';
                    }
                    
                    // Add proof generation step for this person
                    const proofStep = {
                        index: steps.length,
                        type: `${proofType}_proof`,
                        proofType: proofType,
                        description: `Generate ${proofType.toUpperCase()} proof for ${person}`,
                        parameters: {},
                        person: person
                    };
                    steps.push(proofStep);
                    
                    // Add verification step
                    const verifyStep = {
                        index: steps.length,
                        type: 'verification',
                        verificationType: proofType,
                        description: `Verify ${proofType} proof for ${person}`,
                        proofId: null,
                        person: person
                    };
                    steps.push(verifyStep);
                    
                    // Add transfer step
                    const transferStep = {
                        index: steps.length,
                        type: 'transfer',
                        amount: amount,
                        recipient: person,
                        blockchain: blockchain,
                        requiresProof: true,
                        requiredProofTypes: [proofType],
                        description: `Transfer ${amount} USDC to ${person} on ${blockchain}`,
                        conditions: [{
                            type: proofType,
                            description: condition
                        }]
                    };
                    steps.push(transferStep);
                }
            });
            
            return {
                description: message,
                steps: steps,
                requiresProofs: true
            };
        }
        
        // Handle single conditional transfer
        const transferMatch = message.match(/(send|transfer)\s+(\d*\.?\d+)\s*(?:USDC|usdc)?\s+to\s+(\w+)(?:\s+on\s+(ethereum|eth|solana|sol))?/i);
        
        if (!transferMatch) {
            // Don't fallback to parseCommand to avoid infinite loop
            throw new Error('Unable to parse conditional transfer: ' + message);
        }
        
        const amount = transferMatch[2].startsWith('.') ? '0' + transferMatch[2] : transferMatch[2];
        const recipient = transferMatch[3].toLowerCase();
        const blockchain = transferMatch[4] ? 
            (transferMatch[4].toLowerCase().includes('sol') ? 'SOL' : 'ETH') : 
            'ETH';
        
        // Extract all conditions after "if"
        const conditionPart = message.substring(message.toLowerCase().indexOf(' if ') + 4);
        
        // Parse conditions - handle "and" separator
        const conditions = this.parseConditions(conditionPart);
        
        // Create proof and verification steps for each condition
        conditions.forEach((condition, index) => {
            // Add proof generation step
            const proofStep = {
                index: steps.length,
                type: `${condition.type}_proof`,
                proofType: condition.type,
                description: `Generate ${condition.description}`,
                parameters: condition.parameters || {}
            };
            steps.push(proofStep);
            
            // Add verification step
            const verifyStep = {
                index: steps.length,
                type: 'verification',
                verificationType: condition.type,
                description: `Verify ${condition.type} proof`,
                proofId: null // Will be filled during execution
            };
            steps.push(verifyStep);
        });
        
        // Add the transfer step with all required proof types
        const transferStep = {
            index: steps.length,
            type: 'transfer',
            amount: amount,
            recipient: recipient,
            blockchain: blockchain,
            requiresProof: true,
            requiredProofTypes: conditions.map(c => c.type), // Array of all required proof types
            description: `Transfer ${amount} USDC to ${recipient} on ${blockchain}`,
            conditions: conditions.map(c => ({
                type: c.type,
                description: c.conditionText
            }))
        };
        steps.push(transferStep);
        
        return {
            description: message,
            steps: steps,
            requiresProofs: true
        };
    }
    
    parseConditions(conditionText) {
        const conditions = [];
        
        // Split by "and" but be careful not to split within condition descriptions
        const parts = conditionText.split(/\s+and\s+(?=if\s+)/i);
        
        parts.forEach(part => {
            // Remove leading "if" if present
            part = part.replace(/^\s*if\s+/i, '');
            
            // Check for KYC condition
            if (/kyc|compliance|compliant/i.test(part)) {
                conditions.push({
                    type: 'kyc',
                    description: 'KYC compliance proof',
                    conditionText: part.trim()
                });
            }
            
            // Check for location condition
            else if (/location|located|in\s+\w+|nyc|new\s*york|san\s*francisco/i.test(part)) {
                const locationData = this.extractLocationData(part);
                conditions.push({
                    type: 'location',
                    description: 'Location verification proof',
                    conditionText: part.trim(),
                    parameters: locationData
                });
            }
            
            // Check for AI content condition
            else if (/ai|artificial|content/i.test(part)) {
                conditions.push({
                    type: 'ai content',
                    description: 'AI content verification proof',
                    conditionText: part.trim()
                });
            }
            
            // Check for other proof types
            else {
                // Try to match other proof types
                for (const [type, config] of Object.entries(this.proofTypes)) {
                    if (part.toLowerCase().includes(type)) {
                        conditions.push({
                            type: type,
                            description: config.description,
                            conditionText: part.trim()
                        });
                        break;
                    }
                }
            }
        });
        
        return conditions;
    }
    
    extractLocationData(text) {
        const params = {};
        
        // Check for coordinates
        const coordMatch = text.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
        if (coordMatch) {
            params.latitude = parseFloat(coordMatch[1]);
            params.longitude = parseFloat(coordMatch[2]);
        }
        
        // Check for city names
        if (/nyc|new\s*york/i.test(text)) {
            params.city = 'nyc';
            if (!params.latitude) {
                params.latitude = 40.7128;
                params.longitude = -74.0060;
            }
        } else if (/san\s*francisco|sf/i.test(text)) {
            params.city = 'san_francisco';
            if (!params.latitude) {
                params.latitude = 37.7749;
                params.longitude = -122.4194;
            }
        } else if (/london/i.test(text)) {
            params.city = 'london';
            if (!params.latitude) {
                params.latitude = 51.5074;
                params.longitude = -0.1278;
            }
        }
        
        return params;
    }
    
    parseStep(text, index) {
        const step = {
            index: index,
            raw: text,
            conditions: []
        };
        
        // Extract condition from the beginning if present
        let actionText = text;
        const conditionMatch = text.match(/^if\s+(.+?)\s+(generate|prove|create|send|transfer|verify)/i);
        if (conditionMatch) {
            // Extract the condition
            const condition = conditionMatch[1];
            // Remove the condition part to get just the action
            actionText = text.substring(conditionMatch[0].length - conditionMatch[2].length);
            step.condition = condition; // Set singular condition for executor compatibility
            step.conditions.push(condition);
        }
        
        // Check for any proof type using the action text without condition
        const proofMatch = this.detectProofType(actionText);
        if (proofMatch) {
            // Normalize type name by replacing spaces with underscores
            const normalizedType = proofMatch.type.replace(/\s+/g, '_');
            step.type = `${normalizedType}_proof`;
            step.proofType = proofMatch.type;
            step.description = `Generate ${proofMatch.description}`;
            step.parameters = this.extractProofParameters(actionText, proofMatch.type);
            return step;
        }
        
        // Check for verification
        if (actionText.match(/verify|check|validate/i)) {
            // Handle "verify it" - need to infer type from previous step
            if (actionText.toLowerCase().trim() === 'verify it' || actionText.toLowerCase().includes('verify it')) {
                step.type = 'verification';
                step.verificationType = 'previous'; // Will be resolved during execution
                step.description = 'Verify previous proof';
                step.proofId = null;
                return step;
            }
            
            const verifyMatch = this.detectVerificationType(actionText);
            if (verifyMatch) {
                step.type = 'verification';
                step.verificationType = verifyMatch.type;
                step.description = `Verify ${verifyMatch.type} proof`;
                step.proofId = this.extractProofId(actionText);
                return step;
            }
        }
        
        // Check for transfer
        if (actionText.match(/send|transfer/i) || actionText.match(/\d*\.?\d+\s*(?:USDC|usdc)?.*to\s+\w+/i)) {
            const transferStep = this.parseTransferStep(actionText, index);
            if (transferStep && step.condition) {
                transferStep.condition = step.condition;
                transferStep.conditions = step.conditions;
            }
            return transferStep;
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
        
        return null;
    }
    
    detectProofType(text) {
        const textLower = text.toLowerCase();
        
        // Don't detect as proof generation if it's a verification command
        if (textLower.match(/verify|check|validate/i)) {
            return null;
        }
        
        // Check for proof generation keywords
        if (!textLower.match(/proof|generate|create|make|prove/i)) {
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
                // Extract coordinates - handle various formats including degrees symbol
                const coordMatch = text.match(/(-?\d+\.?\d*)[°]?[,\s]+(-?\d+\.?\d*)[°]?/) ||
                                  text.match(/\((-?\d+\.?\d*)[°]?[,\s]+(-?\d+\.?\d*)[°]?\)/);
                if (coordMatch) {
                    params.latitude = parseFloat(coordMatch[1]);
                    params.longitude = parseFloat(coordMatch[2]);
                }
                
                // Extract city - handle patterns like "location: NYC" or "in NYC"
                const cityMatch = text.match(/(?:location[:\s]+)?(\w+)\s*\(/i) ||
                                 text.match(/(?:in|for|at)\s+([a-zA-Z\s]+?)(?:\s+then|\s*$)/i);
                if (cityMatch) {
                    const city = cityMatch[1].trim().toLowerCase();
                    params.city = city.replace(/\s+/g, '_');
                    
                    // Set default coordinates for known cities if not provided
                    if (!params.latitude && city === 'nyc') {
                        params.latitude = 40.7128;
                        params.longitude = -74.0060;
                    }
                }
                break;
        }
        
        return params;
    }
    
    extractProofId(text) {
        // Match patterns like "proof_kyc_1234567890" or "verify proof_xyz_123"
        const idMatch = text.match(/proof[_\s]?(?:id)?[:\s]+([a-zA-Z0-9_-]+)/i) ||
                       text.match(/\b(proof_[a-zA-Z0-9_-]+)\b/i) ||
                       text.match(/verify\s+([a-zA-Z0-9_-]+)\s*$/i);
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
        "Send 0.1 USDC to Alice on Ethereum if KYC compliant and if location is in NYC",
        "Transfer 1 USDC to bob if kyc verified and if location is San Francisco",
        "Send 0.5 to charlie on SOL if AI content verified and if KYC compliant",
        "Generate KYC proof then send 0.1 to alice if verified",
        "Send 2 USDC to dave if location is London"
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
    
    if (transferSteps.length > 0 && transferSteps[0].conditions) {
        console.log(`\nTransfer conditions:`);
        transferSteps[0].conditions.forEach(c => {
            console.log(`  - ${c.type}: ${c.description}`);
        });
    }
}

export default WorkflowParser;