// workflowParser.js - Parse natural language into workflow steps (v3 with per-transfer KYC)
class WorkflowParser {
    parseCommand(message) {
        const steps = [];
        
        // Check for global KYC requirement (applies to all transfers)
        const globalKYC = message.match(/^.*?(?:if|when)\s+kyc\s+(?:compliant|verified)(?:\s+then|,)/i) && 
                         !message.match(/\b(\w+)\s+(?:is\s+)?kyc\s+(?:compliant|verified)/i);
        
        if (globalKYC) {
            // Add single KYC proof at start for all transfers
            steps.push({
                index: 0,
                type: 'kyc_proof',
                description: 'Generate KYC compliance proof',
                raw: 'KYC compliance check',
                recipient: 'general'
            });
        }
        
        // Enhanced sequence indicators
        const sequenceIndicators = /\s+(?:and\s+)?then\s+|\s+after\s+(?:that|the)\s+|\s+followed\s+by\s+|\s+finally\s+|\s+;\s*/gi;
        
        // Split by sequence indicators
        const parts = message.split(sequenceIndicators).filter(part => 
            part && !['and', 'then', 'that', 'the', 'by'].includes(part.trim())
        );
        
        let lastTransferDetails = null;
        
        parts.forEach((part, partIndex) => {
            const trimmedPart = part.trim();
            
            // Check if this part requires KYC for a specific recipient
            const kycMatch = trimmedPart.match(/send.*?to\s+(\w+).*?if\s+(?:\1\s+(?:is\s+)?)?kyc\s+(?:compliant|verified)/i) ||
                            trimmedPart.match(/if\s+(\w+)\s+(?:is\s+)?kyc\s+(?:compliant|verified).*?send.*?to\s+\1/i);
            
            if (kycMatch) {
                const recipient = kycMatch[1].toLowerCase();
                
                // Add KYC proof for this specific recipient
                steps.push({
                    index: steps.length,
                    type: 'kyc_proof',
                    description: `Generate KYC compliance proof for ${recipient}`,
                    raw: `KYC compliance check for ${recipient}`,
                    recipient: recipient
                });
            }
            
            // Handle "do the same" references
            if (trimmedPart.match(/do\s+the\s+same|same\s+transaction/i)) {
                if (lastTransferDetails) {
                    const newBlockchain = this.extractBlockchain(trimmedPart) || 
                                        (lastTransferDetails.blockchain === 'ETH' ? 'SOL' : 'ETH');
                    steps.push({
                        index: steps.length,
                        type: 'transfer',
                        amount: lastTransferDetails.amount,
                        recipient: lastTransferDetails.recipient,
                        blockchain: newBlockchain,
                        description: `Transfer ${lastTransferDetails.amount} USDC to ${lastTransferDetails.recipient} on ${newBlockchain}`,
                        raw: trimmedPart,
                        requiresKYC: lastTransferDetails.requiresKYC
                    });
                }
            } else {
                const step = this.parseStep(trimmedPart, steps.length);
                if (step) {
                    // Check if this transfer requires KYC
                    if (step.type === 'transfer' && kycMatch) {
                        step.requiresKYC = true;
                        step.kycRecipient = kycMatch[1].toLowerCase();
                    }
                    
                    if (step.type === 'transfer') {
                        lastTransferDetails = {
                            amount: step.amount,
                            recipient: step.recipient,
                            blockchain: step.blockchain,
                            requiresKYC: step.requiresKYC || false
                        };
                    }
                    steps.push(step);
                }
            }
        });
        
        return {
            description: message,
            steps: steps,
            requiresKYC: globalKYC || steps.some(s => s.type === 'kyc_proof')
        };
    }
    
    parseStep(text, index) {
        const step = {
            index: index,
            raw: text,
            conditions: []
        };
        
        // Remove KYC conditions for cleaner parsing
        const cleanText = text.replace(/if\s+(?:\w+\s+(?:is\s+)?)?kyc\s+(?:compliant|verified)/gi, '').trim();
        
        // Check for KYC proof
        if (cleanText.match(/generate\s+kyc|kyc\s+proof|compliance\s+proof/i)) {
            step.type = 'kyc_proof';
            step.description = 'Generate KYC compliance proof';
        }
        // Check for transfer
        else if (cleanText.match(/send|transfer/i) || cleanText.match(/\d*\.?\d+\s*(?:USDC|usdc)?.*to\s+\w+/i)) {
            step.type = 'transfer';
            
            // Enhanced amount extraction - handle decimals starting with .
            const amountMatch = cleanText.match(/(\d*\.?\d+)\s*(?:USDC|usdc)?/);
            if (amountMatch) {
                let amount = amountMatch[1];
                // Fix decimal numbers starting with . (e.g., .01 -> 0.01)
                if (amount.startsWith('.')) {
                    amount = '0' + amount;
                }
                step.amount = amount;
            } else {
                step.amount = '0.1'; // default
            }
            
            // Extract recipient
            const recipientMatch = cleanText.match(/to\s+(\w+)/i);
            step.recipient = recipientMatch ? recipientMatch[1].toLowerCase() : 'alice';
            
            // Extract blockchain
            step.blockchain = this.extractBlockchain(cleanText) || (index === 0 ? 'ETH' : 'SOL');
            
            step.description = `Transfer ${step.amount} USDC to ${step.recipient} on ${step.blockchain}`;
        }
        // Check for wait conditions
        else if (cleanText.match(/wait|confirm|complete/i)) {
            step.type = 'wait';
            step.duration = 5000; // Default 5 seconds
            step.description = 'Wait for confirmation';
        }
        // Skip if we can't parse it
        else {
            return null;
        }
        
        return step;
    }
    
    extractBlockchain(text) {
        if (text.match(/solana|sol\b/i)) {
            return 'SOL';
        } else if (text.match(/ethereum|eth\b/i)) {
            return 'ETH';
        }
        return null;
    }
}

// CLI Test
if (import.meta.url === `file://${process.argv[1]}`) {
    const parser = new WorkflowParser();
    const testCases = [
        "Send .01 to alice on eth if alice is kyc verified then send .01 to bob on sol if bob is kyc verified",
        "If alice is KYC compliant send .01 to alice then if bob is KYC compliant send .01 to bob on SOL",
        "Send .01 to alice if kyc verified then send .01 to bob if kyc verified",
        "Send .01 to alice on eth if kyc verified then send .01 to bob on sol"
    ];
    
    const testMessage = process.argv.slice(2).join(' ') || testCases[0];
    console.log(`\nParsing: "${testMessage}"\n`);
    
    const result = parser.parseCommand(testMessage);
    console.log(JSON.stringify(result, null, 2));
    
    // Show summary
    console.log("\n=== Summary ===");
    console.log(`Total steps: ${result.steps.length}`);
    console.log(`KYC proofs: ${result.steps.filter(s => s.type === 'kyc_proof').length}`);
    console.log(`Transfers: ${result.steps.filter(s => s.type === 'transfer').length}`);
}

export default WorkflowParser;
