#!/bin/bash

echo "🔧 Fixing explorer links for both ETH and SOL transfers..."

# Create Python script to fix the issue
cat > fix_explorer_links.py << 'PYTHON_EOF'
import re

with open('static/index.html', 'r') as f:
    content = f.read()

# First, let's find and update the polling success message to properly show explorer links
polling_complete_pattern = r'(displayMessage\s*\(\s*`<div class="transfer-status">[\s\S]*?)(</div>`,\s*[\'"]system[\'"]\s*\);)'

new_polling_complete = r'''\1
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
            );'''

# Find the pollTransferStatus function and fix the success case
poll_func_start = content.find('async function pollTransferStatus')
if poll_func_start != -1:
    poll_func_end = content.find('\n}', poll_func_start) + 2
    poll_func = content[poll_func_start:poll_func_end]
    
    # Look for the success case where we have a transaction hash
    success_pattern = r'if \(data\.transactionHash && data\.transactionHash !== [\'"]pending[\'"]\s*.*?\) \{[\s\S]*?displayMessage\([\s\S]*?\);\s*return;\s*\}'
    
    new_success_block = '''if (data.transactionHash && data.transactionHash !== 'pending' && data.transactionHash !== 'null') {
            console.log('[Polling] Got transaction hash:', data.transactionHash);
            
            // Success! Display the final status with clickable link
            const explorerUrl = (blockchain === 'SOL' || blockchain === 'SOLANA')
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
                            <a href="${explorerUrl}" target="_blank" class="explorer-link" style="color: #4a90e2; text-decoration: underline;">
                                ${data.transactionHash.substring(0, 10)}...${data.transactionHash.substring(data.transactionHash.length - 8)}
                            </a>
                        </p>
                    </div>
                </div>`,
                'system'
            );
            return;
        }'''
    
    # Replace the success block
    new_poll_func = re.sub(success_pattern, new_success_block, poll_func, flags=re.DOTALL)
    content = content[:poll_func_start] + new_poll_func + content[poll_func_end:]

# Also ensure the initial displayTransferMessage handles completed transfers properly
display_func_start = content.find('function displayTransferMessage(data)')
if display_func_start != -1:
    # Add a handler for when we already have a transaction hash
    insert_point = content.find('let statusHtml =', display_func_start)
    if insert_point != -1:
        # Insert logic to handle completed transfers
        completion_check = '''
    // If we already have a non-pending transaction hash, show the link immediately
    if (txHash && txHash !== 'pending' && txHash !== 'null' && explorerUrl) {
        let completedHtml = `
            <div class="transfer-status">
                <h3>✅ ${isDirectTransfer ? 'Direct' : 'KYC-Verified'} USDC Transfer Complete</h3>
                <div class="transfer-details">
                    <p><strong>Amount:</strong> ${amount} USDC</p>
                    <p><strong>Network:</strong> ${blockchain}</p>
                    <p><strong>Status:</strong> <span class="success">Confirmed</span></p>
                    <p><strong>Transaction:</strong> 
                        <a href="${explorerUrl}" target="_blank" class="explorer-link" style="color: #4a90e2; text-decoration: underline;">
                            ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}
                        </a>
                    </p>
                </div>
            </div>
        `;
        displayMessage(completedHtml, 'system');
        return;
    }
    
    '''
        content = content[:insert_point] + completion_check + content[insert_point:]

# Add CSS to ensure links are visible
css_insert = '''
        .explorer-link {
            color: #4a90e2 !important;
            text-decoration: underline !important;
            cursor: pointer !important;
        }
        
        .explorer-link:hover {
            color: #357abd !important;
            text-decoration: underline !important;
        }
        
        .transfer-status a {
            color: #4a90e2 !important;
            text-decoration: underline !important;
        }
    </style>'''

content = content.replace('    </style>', css_insert)

with open('static/index.html', 'w') as f:
    f.write(content)

print("✅ Fixed explorer links for both ETH and SOL transfers!")
print("✅ Added CSS to ensure links are always visible")
print("✅ Fixed polling completion to show clickable links")
PYTHON_EOF

# Run the fix
python3 fix_explorer_links.py
rm fix_explorer_links.py

echo ""
echo "✅ Explorer link fix complete!"
echo ""
echo "🔗 Your recent transactions:"
echo "   ETH: https://sepolia.etherscan.io/tx/0x64396f66e7c34dccb314631fc71a227680f1e13df6"
echo "   SOL: https://explorer.solana.com/tx/KvSM81ugBFr3EG3q1ZEmVgkQvnWttuGcwakL2r9K2CWc?cluster=devnet"
echo ""
echo "🚀 Refresh your browser - future transfers should show clickable explorer links!"
