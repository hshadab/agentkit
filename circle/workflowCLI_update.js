// Find and replace the recipientAddresses section in workflowCLI.js
            // Map recipient names to addresses
            const recipientAddresses = {
                'alice': step.blockchain === 'SOL' ? 
                    '7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi' : 
                    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                'bob': step.blockchain === 'SOL' ? 
                    'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW' : 
                    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                'charlie': step.blockchain === 'SOL' ? 
                    '2sWRYvL8M4S9XPvKNfUdy2Qvn6LYaXjqXDvMv9KsxbUa' : 
                    '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
            };
