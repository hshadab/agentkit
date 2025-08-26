// Reward Monitor - Tracks device rewards and claim attempts

(function() {
    console.log('💰 Reward Monitor Active');
    
    // Monitor device info queries
    if (window.IoTeXDeviceVerifier) {
        const VerifierClass = window.IoTeXDeviceVerifier;
        const originalGetDeviceInfo = VerifierClass.prototype.getDeviceInfo;
        
        VerifierClass.prototype.getDeviceInfo = async function(deviceId) {
            console.log(`📊 Checking device info for ${deviceId}`);
            const info = await originalGetDeviceInfo.call(this, deviceId);
            
            if (info) {
                console.log('Device Info:', {
                    deviceId: deviceId,
                    registered: info.registered,
                    pendingRewards: info.pendingRewards + ' IOTX',
                    lastProximityProof: info.lastProximityProof,
                    owner: info.owner
                });
                
                if (parseFloat(info.pendingRewards) > 0) {
                    console.log(`✅ Device has ${info.pendingRewards} IOTX pending rewards!`);
                } else {
                    console.log('❌ No pending rewards for device');
                }
            }
            
            return info;
        };
        
        // Monitor reward claims
        const originalClaimRewards = VerifierClass.prototype.claimRewards;
        VerifierClass.prototype.claimRewards = async function(deviceId) {
            console.log(`💸 Attempting to claim rewards for device ${deviceId}`);
            
            const result = await originalClaimRewards.call(this, deviceId);
            
            if (result.success) {
                console.log('✅ Rewards claimed successfully!', {
                    amount: result.rewardAmount + ' ' + result.currency,
                    txHash: result.txHash,
                    explorerUrl: result.explorerUrl
                });
            } else {
                console.log('❌ Failed to claim rewards:', result.error);
            }
            
            return result;
        };
    }
    
    // Monitor workflow step execution for claim_rewards
    if (window.workflowManager) {
        const originalExecuteStep = window.workflowManager.executeWorkflowStep;
        if (originalExecuteStep) {
            window.workflowManager.executeWorkflowStep = async function(workflowId, step) {
                if (step.action === 'claim_rewards') {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('💰 CLAIM REWARDS STEP');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('Device ID:', step.device_id);
                    console.log('Step marked as critical:', step.critical);
                }
                
                return originalExecuteStep.call(this, workflowId, step);
            };
        }
    }
    
    // Add a helper function to manually check device rewards
    window.checkDeviceRewards = async function(deviceId) {
        console.log(`\n🔍 Checking rewards for device ${deviceId}...`);
        
        try {
            const verifier = new window.IoTeXDeviceVerifier();
            await verifier.connect();
            
            // Get device identifier
            let deviceIdBytes32;
            if (window.deviceIoIDMap && window.deviceIoIDMap.has(deviceId)) {
                const ioIDInfo = window.deviceIoIDMap.get(deviceId);
                deviceIdBytes32 = ioIDInfo.deviceId;
                console.log(`Using ioID: ${ioIDInfo.ioId}`);
            } else {
                deviceIdBytes32 = await verifier.deviceIdToBytes32(deviceId);
                console.log('Using device hash');
            }
            
            // Get device info
            const deviceInfo = await verifier.contract.getDeviceInfo(deviceIdBytes32);
            const pendingRewards = ethers.utils.formatEther(deviceInfo.pendingRewards);
            
            console.log('Device Status:', {
                registered: deviceInfo.registered,
                owner: deviceInfo.owner,
                registrationTime: new Date(deviceInfo.registrationTime.toNumber() * 1000).toISOString(),
                lastProximityProof: deviceInfo.lastProximityProof.toNumber() > 0 
                    ? new Date(deviceInfo.lastProximityProof.toNumber() * 1000).toISOString()
                    : 'Never',
                pendingRewards: pendingRewards + ' IOTX'
            });
            
            // Check contract balance
            const contractBalance = await verifier.provider.getBalance(verifier.contract.address);
            console.log('Contract balance:', ethers.utils.formatEther(contractBalance) + ' IOTX');
            
            if (parseFloat(pendingRewards) > 0) {
                console.log(`\n✅ Device has ${pendingRewards} IOTX available to claim!`);
                console.log('To claim rewards, use: window.claimDeviceRewards("' + deviceId + '")');
            } else {
                console.log('\n❌ No rewards available');
                console.log('Possible reasons:');
                console.log('1. Device not within proximity (must be within 100 units of 5000,5000)');
                console.log('2. Proximity proof not yet verified on-chain');
                console.log('3. Rewards already claimed');
            }
            
        } catch (error) {
            console.error('Error checking device rewards:', error);
        }
    };
    
    // Helper function to manually claim rewards
    window.claimDeviceRewards = async function(deviceId) {
        console.log(`\n💸 Claiming rewards for device ${deviceId}...`);
        
        try {
            const verifier = new window.IoTeXDeviceVerifier();
            const result = await verifier.claimRewards(deviceId);
            
            if (result.success) {
                console.log('✅ Success!', result);
            } else {
                console.log('❌ Failed:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Error claiming rewards:', error);
            return { success: false, error: error.message };
        }
    };
    
    console.log('Reward monitoring initialized');
    console.log('Use window.checkDeviceRewards("DEV123") to check rewards');
    console.log('Use window.claimDeviceRewards("DEV123") to claim rewards');
})();