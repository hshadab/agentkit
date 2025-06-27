#!/usr/bin/env node
import { processNaturalLanguageCommand } from './zkpCircleIntegration.js';

async function main() {
    try {
        const command = process.argv.slice(2).join(' ');
        console.error(`🎯 Command: ${command}`);
        
        const result = await processNaturalLanguageCommand(command);
        
        if (result.success) {
            // Return a properly formatted response
            const response = {
                success: true,
                transactionId: result.transactionId,
                transferId: result.transferId,
                message: result.message,
                amount: result.amount,
                recipient: result.recipient,
                from: result.from,
                blockchain: result.blockchain || 'ETH'
            };
            
            // Add simulated flag if present
            if (result.simulated) {
                response.simulated = true;
                console.error('\n⚠️  Note: This was a simulated transfer for demo purposes');
                console.error('   To enable real transfers, ensure Circle wallets are configured');
            }
            
            // Output JSON for the Python service to parse
            console.log(JSON.stringify(response));
        } else {
            console.error(`❌ Error: ${result.error}`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Fatal error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the main function
main();
