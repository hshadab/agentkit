#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROOFS_DIR = path.join(__dirname, '..', 'proofs');
const MAX_AGE_DAYS = 7; // Keep proofs for 7 days
const DRY_RUN = process.argv.includes('--dry-run');

async function cleanupOldProofs() {
    console.log(`Starting proof cleanup (${DRY_RUN ? 'DRY RUN' : 'LIVE'})...`);
    
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    let totalSize = 0;
    let deletedCount = 0;
    let keptCount = 0;
    
    try {
        const dirs = await fs.promises.readdir(PROOFS_DIR);
        
        for (const dir of dirs) {
            const dirPath = path.join(PROOFS_DIR, dir);
            const stats = await fs.promises.stat(dirPath);
            
            if (stats.isDirectory()) {
                const age = now - stats.mtimeMs;
                
                if (age > maxAge) {
                    // Calculate size before deletion
                    const size = await getDirSize(dirPath);
                    totalSize += size;
                    
                    if (!DRY_RUN) {
                        await fs.promises.rm(dirPath, { recursive: true, force: true });
                    }
                    
                    console.log(`${DRY_RUN ? 'Would delete' : 'Deleted'}: ${dir} (${formatBytes(size)}, ${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
                    deletedCount++;
                } else {
                    keptCount++;
                }
            }
        }
        
        console.log(`\nSummary:`);
        console.log(`- ${deletedCount} proof directories ${DRY_RUN ? 'would be' : 'were'} deleted`);
        console.log(`- ${keptCount} proof directories kept (less than ${MAX_AGE_DAYS} days old)`);
        console.log(`- Total space ${DRY_RUN ? 'would be' : ''} freed: ${formatBytes(totalSize)}`);
        
        if (DRY_RUN) {
            console.log(`\nRun without --dry-run to actually delete the files.`);
        }
        
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

async function getDirSize(dirPath) {
    let size = 0;
    const files = await fs.promises.readdir(dirPath);
    
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.promises.stat(filePath);
        size += stats.size;
    }
    
    return size;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run cleanup
cleanupOldProofs();