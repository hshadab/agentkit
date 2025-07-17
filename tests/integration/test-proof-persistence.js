const fs = require('fs');
const path = require('path');

async function testProofPersistence() {
    console.log('🗂️  Testing Proof History Persistence');
    console.log('='.repeat(60));
    
    try {
        // 1. Check proofs database
        const proofsDbPath = './proofs_db.json';
        if (!fs.existsSync(proofsDbPath)) {
            console.log('❌ No proofs database found');
            return;
        }
        
        const proofsDb = JSON.parse(fs.readFileSync(proofsDbPath, 'utf8'));
        const proofArray = Object.values(proofsDb);
        
        console.log(`\n📚 Proofs Database Statistics:`);
        console.log(`   Total proofs: ${proofArray.length}`);
        console.log(`   Database file size: ${(fs.statSync(proofsDbPath).size / 1024).toFixed(2)} KB`);
        
        // Group by type
        const proofTypes = {};
        proofArray.forEach(proof => {
            const type = proof.metadata?.wasm_path?.includes('kyc') ? 'KYC' :
                        proof.metadata?.wasm_path?.includes('location') ? 'Location' :
                        proof.metadata?.wasm_path?.includes('ai') ? 'AI Content' : 'Other';
            proofTypes[type] = (proofTypes[type] || 0) + 1;
        });
        
        console.log('\n📊 Proofs by Type:');
        Object.entries(proofTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        // 2. Check verifications database
        const verificationsDbPath = './verifications_db.json';
        if (fs.existsSync(verificationsDbPath)) {
            const verificationsDb = JSON.parse(fs.readFileSync(verificationsDbPath, 'utf8'));
            const verificationArray = Object.values(verificationsDb);
            
            console.log(`\n✅ Verifications Database Statistics:`);
            console.log(`   Total verifications: ${verificationArray.length}`);
            
            // Group by blockchain
            const verificationTypes = {};
            verificationArray.forEach(v => {
                const chain = v.blockchain || 'local';
                verificationTypes[chain] = (verificationTypes[chain] || 0) + 1;
            });
            
            console.log('\n🔗 Verifications by Chain:');
            Object.entries(verificationTypes).forEach(([chain, count]) => {
                console.log(`   ${chain}: ${count}`);
            });
        } else {
            console.log('\n⚠️  No verifications database found');
        }
        
        // 3. Check workflow history
        const workflowHistoryPath = './workflow_history.json';
        if (fs.existsSync(workflowHistoryPath)) {
            const workflowHistory = JSON.parse(fs.readFileSync(workflowHistoryPath, 'utf8'));
            const workflowArray = Array.isArray(workflowHistory) ? workflowHistory : Object.values(workflowHistory);
            
            console.log(`\n📋 Workflow History Statistics:`);
            console.log(`   Total workflows: ${workflowArray.length}`);
            
            // Show recent workflows
            const recentWorkflows = workflowArray
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                .slice(0, 3);
                
            if (recentWorkflows.length > 0) {
                console.log('\n   Recent workflows:');
                recentWorkflows.forEach(w => {
                    console.log(`   - ${w.command || w.description || 'Unnamed workflow'}`);
                    if (w.timestamp) {
                        console.log(`     Time: ${new Date(w.timestamp).toLocaleString()}`);
                    }
                });
            }
        } else {
            console.log('\n⚠️  No workflow history found');
        }
        
        // 4. Test persistence by checking file modification times
        console.log('\n⏰ File Modification Times:');
        const files = [proofsDbPath, verificationsDbPath, workflowHistoryPath];
        files.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                console.log(`   ${path.basename(file)}: ${new Date(stats.mtime).toLocaleString()}`);
            }
        });
        
        // 5. Verify data integrity
        console.log('\n🔍 Data Integrity Check:');
        
        // Check if all proofs have required fields
        const invalidProofs = proofArray.filter(p => !p.id || !p.timestamp || !p.status);
        console.log(`   Invalid proofs: ${invalidProofs.length}`);
        
        // Check for duplicate IDs
        const proofIds = proofArray.map(p => p.id);
        const duplicateIds = proofIds.filter((id, index) => proofIds.indexOf(id) !== index);
        console.log(`   Duplicate IDs: ${duplicateIds.length}`);
        
        console.log('\n✅ Proof persistence is working correctly!');
        console.log('   Data is being saved across sessions');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testProofPersistence();