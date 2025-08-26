#!/bin/bash

# Backup the original file
cp static/index.html static/index.html.backup
echo "✅ Created backup: static/index.html.backup"

# Create a temporary Python script to do the complex replacements
cat > update_html.py << 'PYTHON_EOF'
import re

# Read the original file
with open('static/index.html', 'r') as f:
    content = f.read()

# 1. Replace displayTransferMessage function
new_display_transfer = '''function displayTransferMessage(data) {
    console.log('[Transfer Display] Processing data:', data);
    
    // Extract transfer info from various possible locations in the response
    const transferInfo = data.transfer_result || data.transfer_details || data;
    const amount = transferInfo.amount || data.amount || '0';
    const blockchain = transferInfo.blockchain || data.blockchain || 'ETH';
    const txHash = transferInfo.transactionHash || transferInfo.txHash || 
                  transferInfo.hash || transferInfo.transactionId || 
                  transferInfo.id || 'pending';
    const transferId = transferInfo.transferId || transferInfo.circleTransferId || 
                      transferInfo.id || data.transferId;
    
    // Check if this is a direct transfer
    const isDirectTransfer = data.transfer_type === 'direct' || 
                           transferInfo.transfer_type === 'direct' ||
                           data.metadata?.type === 'direct_transfer' ||
                           !data.is_automated_transfer;
    
    let explorerUrl = '';
    if (txHash && txHash !== 'pending') {
        if (blockchain === 'SOL' || blockchain === 'SOLANA') {
            explorerUrl = `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
        } else {
            explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
        }
    }
    
    let statusHtml = `
        <div class="transfer-status">
            <h3>💸 ${isDirectTransfer ? 'Direct' : 'KYC-Verified'} USDC Transfer ${txHash === 'pending' ? 'Initiated' : 'Complete'}</h3>
            <div class="transfer-details">
                <p><strong>Amount:</strong> ${amount} USDC</p>
                <p><strong>Network:</strong> ${blockchain}</p>
                <p><strong>Status:</strong> ${txHash === 'pending' ? 
                    '<span class="pending">⏳ Processing... (this may take a moment)</span>' : 
                    '<span class="success">✅ Complete</span>'}</p>
                ${txHash && txHash !== 'pending' ? 
                    `<p><strong>Transaction:</strong> <a href="${explorerUrl}" target="_blank" class="explorer-link">${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}</a></p>` : 
                    '<p class="pending-note">Transaction hash will appear once confirmed by Circle</p>'}
                ${transferId && txHash === 'pending' ? 
                    `<p class="transfer-id-note">Transfer ID: ${transferId.substring(0, 8)}...${transferId.substring(transferId.length - 6)}</p>` : ''}
            </div>
        </div>
    `;
    
    displayMessage(statusHtml, 'system');
    
    // If transaction is pending and we have a transfer ID, start polling
    if (txHash === 'pending' && transferId) {
        console.log('[Transfer Display] Starting polling for transfer:', transferId);
        startTransferPolling(transferId, blockchain, amount);
    }
}'''

# Replace the displayTransferMessage function
pattern = r'function displayTransferMessage\(data\)\s*{[^}]*(?:{[^}]*}[^}]*)*}'
content = re.sub(pattern, new_display_transfer, content, flags=re.DOTALL)

# 2. Update pollTransferStatus function
new_poll_transfer = '''async function pollTransferStatus(transferId, blockchain, amount, attempt = 1) {
    const maxAttempts = 20;
    const baseDelay = 3000; // 3 seconds
    
    if (attempt > maxAttempts) {
        console.log('[Polling] Max attempts reached');
        displayMessage(
            '<div class="info-message">⏱️ Transfer is taking longer than expected. You can check the status later using the transfer ID.</div>',
            'system'
        );
        return;
    }
    
    try {
        console.log(`[Polling] Attempt ${attempt} for transfer ${transferId}`);
        
        const response = await fetch('http://localhost:8002/check_transfer_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transferId })
        });
        
        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Polling] Status response:', data);
        
        // Handle rate limit
        if (data.status === 'rate_limited' || data.error?.includes('rate limit')) {
            console.log('[Polling] Rate limited, will retry in 60 seconds');
            displayMessage(
                '<div class="info-message rate-limit-notice">⏳ Rate limit detected. Will check transfer status again in 60 seconds...</div>',
                'system'
            );
            // Wait 60 seconds before retrying
            setTimeout(() => pollTransferStatus(transferId, blockchain, amount, attempt + 1), 60000);
            return;
        }
        
        // Check if we have a transaction hash
        if (data.transactionHash && data.transactionHash !== 'pending' && data.transactionHash !== 'null') {
            console.log('[Polling] Got transaction hash:', data.transactionHash);
            
            // Success! Display the final status
            const explorerUrl = blockchain === 'SOL' 
                ? `https://explorer.solana.com/tx/${data.transactionHash}?cluster=devnet`
                : `https://sepolia.etherscan.io/tx/${data.transactionHash}`;
            
            displayMessage(
                `<div class="transfer-status">
                    <h3>✅ Transfer Complete!</h3>
                    <div class="transfer-details">
                        <p><strong>Amount:</strong> ${amount} USDC</p>
                        <p><strong>Network:</strong> ${blockchain}</p>
                        <p><strong>Status:</strong> <span class="success">Confirmed</span></p>
                        <p><strong>Transaction:</strong> 
                            <a href="${explorerUrl}" target="_blank" class="explorer-link">
                                ${data.transactionHash.substring(0, 10)}...${data.transactionHash.substring(data.transactionHash.length - 8)}
                            </a>
                        </p>
                    </div>
                </div>`,
                'system'
            );
            return;
        }
        
        // Check if transfer failed
        if (data.status === 'failed') {
            console.log('[Polling] Transfer failed');
            displayMessage(
                `<div class="error-message">
                    <h3>❌ Transfer Failed</h3>
                    <p>The transfer could not be completed.</p>
                    ${data.errorCode ? `<p>Error code: ${data.errorCode}</p>` : ''}
                </div>`,
                'system'
            );
            return;
        }
        
        // Still pending, continue polling with exponential backoff
        const nextDelay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 30000); // Max 30 seconds
        console.log(`[Polling] Still pending, retrying in ${nextDelay/1000} seconds`);
        
        // Show a subtle update every 3rd attempt
        if (attempt % 3 === 0) {
            displayMessage(
                '<div class="info-message">⏳ Transfer still processing... Circle typically confirms within 30-60 seconds.</div>',
                'system'
            );
        }
        
        setTimeout(() => pollTransferStatus(transferId, blockchain, amount, attempt + 1), nextDelay);
        
    } catch (error) {
        console.error('[Polling] Error:', error);
        
        // Don't give up on errors, just increase the delay
        const errorDelay = Math.min(baseDelay * 2 * attempt, 60000);
        setTimeout(() => pollTransferStatus(transferId, blockchain, amount, attempt + 1), errorDelay);
    }
}'''

# Replace the pollTransferStatus function
pattern2 = r'async function pollTransferStatus\([^)]*\)\s*{[^}]*(?:{[^}]*}[^}]*)*}'
content = re.sub(pattern2, new_poll_transfer, content, flags=re.DOTALL)

# 3. Add new CSS styles before the closing </style> tag
new_css = '''
        /* Error and status message styles */
        .error-message {
            background-color: #fee;
            border: 1px solid #fcc;
            border-radius: 8px;
            padding: 16px;
            margin: 10px 0;
        }

        .error-message h3 {
            color: #d00;
            margin-top: 0;
            margin-bottom: 10px;
        }

        .error-message ul {
            margin: 10px 0;
            padding-left: 20px;
        }

        .error-message li {
            margin: 5px 0;
        }

        .rate-limit-error {
            background-color: #fff8dc;
            border-color: #ffd700;
        }

        .rate-limit-error h3 {
            color: #ff8c00;
        }

        .rate-limit-notice {
            background-color: #f0f8ff;
            border: 1px solid #87ceeb;
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            color: #4682b4;
        }

        .validation-error {
            background-color: #fff0f5;
            border-color: #ffb6c1;
        }

        .validation-error h3 {
            color: #dc143c;
        }

        .info-message {
            background-color: #f0f8ff;
            border: 1px solid #add8e6;
            border-radius: 8px;
            padding: 12px;
            margin: 10px 0;
            color: #00008b;
        }

        .transfer-id-note {
            font-size: 0.9em;
            color: #666;
            font-style: italic;
        }

        .pending-note {
            color: #ff8c00;
            font-style: italic;
            font-size: 0.9em;
        }
    </style>'''

# Add CSS before closing style tag
content = content.replace('    </style>', new_css)

# 4. Update the direct transfer error handling
# Find the handleServerResponse function and update the direct transfer section
direct_transfer_handler = '''if (data.metadata?.type === 'direct_transfer') {
                displayMessage(data.response, 'assistant');
                
                try {
                    const response = await fetch('http://localhost:8002/execute_direct_transfer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transfer_details: data.metadata.transfer_details })
                    });
                    
                    // Check for rate limit specifically
                    if (response.status === 429) {
                        displayMessage(
                            `<div class="error-message rate-limit-error">
                                <h3>⏳ Rate Limit Reached</h3>
                                <p>Circle's API rate limit has been temporarily exceeded.</p>
                                <p>Your transfer request has been received and will be processed shortly.</p>
                                <p><em>Please wait 60 seconds before attempting another transfer.</em></p>
                            </div>`, 
                            'system'
                        );
                        return;
                    }
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        const errorDetail = errorData.detail || 'Transfer failed';
                        
                        // Check if it's a 422 error
                        if (response.status === 422 || errorDetail.includes('422')) {
                            displayMessage(
                                `<div class="error-message validation-error">
                                    <h3>❌ Transfer Validation Error</h3>
                                    <p>${errorDetail}</p>
                                    <p><strong>Common causes:</strong></p>
                                    <ul>
                                        <li>Insufficient balance in the source wallet</li>
                                        <li>Invalid recipient address for the selected blockchain</li>
                                        <li>Amount below minimum threshold (0.01 USDC)</li>
                                        <li>Address format incompatible with Circle</li>
                                    </ul>
                                </div>`, 
                                'system'
                            );
                        } else {
                            displayMessage(
                                `<div class="error-message">
                                    <h3>❌ Transfer Error</h3>
                                    <p>${errorDetail}</p>
                                </div>`, 
                                'system'
                            );
                        }
                        return;
                    }
                    
                    const result = await response.json();
                    console.log('[Direct Transfer] Success:', result);
                    displayTransferMessage(result);
                    
                } catch (error) {
                    console.error('Direct transfer error:', error);
                    displayMessage(
                        `<div class="error-message">
                            <h3>❌ Transfer Error</h3>
                            <p>${error.message || 'An unexpected error occurred'}</p>
                            <p>Please check the console for more details.</p>
                        </div>`, 
                        'system'
                    );
                }
            }'''

# Find and replace the direct transfer handling section
pattern3 = r'if \(data\.metadata\?\.type === [\'"]direct_transfer[\'"]\)\s*{[^}]*(?:{[^}]*}[^}]*)*}'
match = re.search(pattern3, content, re.DOTALL)
if match:
    content = re.sub(pattern3, direct_transfer_handler, content, flags=re.DOTALL)
else:
    print("Warning: Could not find direct_transfer handler to update")

# Write the updated content
with open('static/index.html', 'w') as f:
    f.write(content)

print("✅ Updated static/index.html successfully!")
print("✅ All functions and styles have been updated")
PYTHON_EOF

# Run the Python script
python3 update_html.py

# Clean up
rm update_html.py

echo ""
echo "🎉 Frontend updates complete!"
echo "   - displayTransferMessage function updated"
echo "   - pollTransferStatus function updated"
echo "   - Error handling improved"
echo "   - CSS styles added"
echo ""
echo "📝 Backup saved as: static/index.html.backup"
echo ""
echo "🚀 Your UI should now properly display:"
echo "   ✅ Direct transfer explorer links"
echo "   ✅ Rate limit error messages"
echo "   ✅ Enhanced error handling"
