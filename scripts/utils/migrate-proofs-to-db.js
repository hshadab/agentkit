#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function migrateProofsToDatabase() {
    console.log("🔄 Migrating existing proofs to database...\n");
    
    const proofsDir = './proofs';
    const dbPath = './proofs_db.json';
    
    // Load existing database or create new one
    let database = {};
    if (fs.existsSync(dbPath)) {
        database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        console.log(`📊 Loaded existing database with ${Object.keys(database).length} entries`);
    }
    
    // Scan proofs directory
    const entries = fs.readdirSync(proofsDir);
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const entry of entries) {
        if (entry.startsWith('proof_')) {
            const proofPath = path.join(proofsDir, entry);
            
            // Check if it's a directory with proof.bin
            if (fs.statSync(proofPath).isDirectory() && 
                fs.existsSync(path.join(proofPath, 'proof.bin'))) {
                
                // Skip if already in database
                if (database[entry]) {
                    skippedCount++;
                    continue;
                }
                
                console.log(`📁 Processing ${entry}...`);
                
                // Try to read metadata
                let metadata = null;
                const metadataPath = path.join(proofPath, 'metadata.json');
                if (fs.existsSync(metadataPath)) {
                    try {
                        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    } catch (e) {
                        console.warn(`  ⚠️  Failed to read metadata: ${e.message}`);
                    }
                }
                
                // Get file stats
                const proofStats = fs.statSync(path.join(proofPath, 'proof.bin'));
                const dirStats = fs.statSync(proofPath);
                
                // Infer function from filename if no metadata
                let functionName = 'unknown';
                if (metadata && metadata.function) {
                    functionName = metadata.function;
                } else if (entry.includes('kyc')) {
                    functionName = 'prove_kyc';
                } else if (entry.includes('ai_content')) {
                    functionName = 'prove_ai_content';
                } else if (entry.includes('location')) {
                    functionName = 'prove_location';
                }
                
                // Create database entry
                database[entry] = {
                    id: entry,
                    timestamp: dirStats.birthtime.toISOString(),
                    metadata: metadata || {
                        function: functionName,
                        arguments: [],
                        step_size: 50,
                        explanation: "Migrated from filesystem"
                    },
                    metrics: {
                        generation_time_secs: 0,
                        file_size_mb: proofStats.size / (1024 * 1024),
                        proof_size: proofStats.size,
                        time_ms: metadata?.time_ms || 0
                    },
                    status: "complete",
                    file_path: `./proofs/${entry}/proof.bin`
                };
                
                addedCount++;
                console.log(`  ✅ Added to database`);
            }
        }
    }
    
    // Write updated database
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
    
    console.log(`\n✅ Migration complete!`);
    console.log(`  - Added: ${addedCount} proofs`);
    console.log(`  - Skipped: ${skippedCount} proofs (already in database)`);
    console.log(`  - Total in database: ${Object.keys(database).length} proofs`);
}

migrateProofsToDatabase();