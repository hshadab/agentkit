// Replace the getArgumentsForProof function in workflowExecutor_generic.js
// Find this function and replace it with:

    getArgumentsForProof(step) {
        if (step.type === 'kyc_proof') {
            // KYC expects: wallet_hash (i32), kyc_approved (i32)
            const walletHash = 12345; // In production, hash the actual wallet
            const kycApproved = 1;    // 1 = approved, 0 = rejected
            return [String(walletHash), String(kycApproved)];
        }
        else if (step.type === 'location_proof') {
            // Location expects a packed i32 value with lat, lon, device_id
            if (step.parameters && step.parameters.latitude && step.parameters.longitude) {
                // Custom coordinates - normalize to 0-255 range
                const lat = Math.round(((step.parameters.latitude + 90) / 180) * 255);
                const lon = Math.round(((step.parameters.longitude + 180) / 360) * 255);
                const deviceId = 1234;
                const packed = (lat << 24) | (lon << 16) | deviceId;
                return [String(packed)];
            } else {
                // Default NYC coordinates
                const lat = 103;  // NYC normalized latitude
                const lon = 186;  // NYC normalized longitude
                const deviceId = 1234;
                const packed = (lat << 24) | (lon << 16) | deviceId;
                return [String(packed)];
            }
        }
        else if (step.type === 'ai_content_proof') {
            // AI content expects: content_hash (i32), provider_signature (i32)
            let contentHash = 54321; // Default
            const providerSignature = 1000; // 1000 = OpenAI, 2000 = Anthropic
            
            if (step.parameters?.hash) {
                // Convert string hash to numeric if needed
                const hash = step.parameters.hash;
                if (!/^\d+$/.test(hash)) {
                    contentHash = Array.from(hash).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100000;
                } else {
                    contentHash = parseInt(hash);
                }
            }
            
            return [String(contentHash), String(providerSignature)];
        }
        
        return ['1']; // Default
    }
