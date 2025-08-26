#!/bin/bash

echo "🔧 Solana Program ID Updater"
echo "============================"

# Check if program ID was provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the deployed Program ID"
    echo "Usage: ./update-solana-program-id.sh YOUR_PROGRAM_ID"
    echo ""
    echo "Example: ./update-solana-program-id.sh 7Np41oeYqPefeNQEHSH1UDhYrehxin3NStELsSKCT4K8"
    exit 1
fi

PROGRAM_ID=$1
echo "📋 Program ID: $PROGRAM_ID"

# Update solana-verifier.js
FILE="static/solana-verifier.js"
if [ -f "$FILE" ]; then
    echo "✏️  Updating $FILE..."
    sed -i.backup "s/YOUR_DEPLOYED_PROGRAM_ID/$PROGRAM_ID/g" "$FILE"
    
    # Check if update was successful
    if grep -q "$PROGRAM_ID" "$FILE"; then
        echo "✅ Successfully updated Program ID in $FILE"
        echo ""
        echo "🎉 Frontend is now configured to use your deployed program!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Restart your zkEngine server if running"
        echo "2. Test verification in the UI with all 3 proof types"
        echo "3. Check transactions on: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    else
        echo "❌ Failed to update Program ID"
        echo "Please manually update YOUR_DEPLOYED_PROGRAM_ID in $FILE"
    fi
else
    echo "❌ Error: $FILE not found"
    exit 1
fi

# Save program ID for reference
echo "$PROGRAM_ID" > deployed-solana-program-id.txt
echo ""
echo "💾 Program ID saved to: deployed-solana-program-id.txt"