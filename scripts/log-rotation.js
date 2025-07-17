#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Configuration
const config = {
    maxFileSize: 500 * 1024, // 500KB
    maxBackups: 3, // Keep 3 compressed backups
    logFiles: [
        'scripts/utils/workflow_history.json',
        'scripts/utils/proofs_db.json',
        'scripts/utils/workflow_history_array.json',
        'circle/workflow_history.json'
    ]
};

// Rotate a single log file
async function rotateLogFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    // Check file size
    const stats = fs.statSync(fullPath);
    if (stats.size < config.maxFileSize) {
        console.log(`File ${filePath} is under size limit (${(stats.size / 1024).toFixed(1)}KB)`);
        return;
    }
    
    console.log(`Rotating ${filePath} (${(stats.size / 1024).toFixed(1)}KB)...`);
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(path.dirname(fullPath), '.rotation_backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const backupName = `${path.basename(filePath)}.${timestamp}.gz`;
    const backupPath = path.join(backupDir, backupName);
    
    // Compress and save the current file
    const fileContent = fs.readFileSync(fullPath);
    const compressed = zlib.gzipSync(fileContent);
    fs.writeFileSync(backupPath, compressed);
    console.log(`Created backup: ${backupPath}`);
    
    // Parse and keep recent data if it's JSON
    try {
        const data = JSON.parse(fileContent);
        let newData;
        
        if (Array.isArray(data)) {
            // Keep last 100 entries for arrays
            newData = data.slice(-100);
            console.log(`Kept last 100 entries (was ${data.length})`);
        } else if (typeof data === 'object') {
            // For objects, try to identify and keep recent entries
            const entries = Object.entries(data);
            if (entries.length > 100) {
                // Keep last 100 entries
                newData = Object.fromEntries(entries.slice(-100));
                console.log(`Kept last 100 entries (was ${entries.length})`);
            } else {
                // If it's a small object, keep it all
                newData = data;
            }
        } else {
            // Not a complex structure, start fresh
            newData = [];
        }
        
        // Write the truncated data back
        fs.writeFileSync(fullPath, JSON.stringify(newData, null, 2));
        console.log(`Truncated ${filePath} to ${(fs.statSync(fullPath).size / 1024).toFixed(1)}KB`);
        
    } catch (error) {
        // If not JSON or error parsing, create empty file
        console.log(`Could not parse ${filePath} as JSON, creating empty file`);
        fs.writeFileSync(fullPath, '[]');
    }
    
    // Clean up old backups
    cleanupOldBackups(backupDir, path.basename(filePath));
}

// Remove old backups beyond the limit
function cleanupOldBackups(backupDir, baseFilename) {
    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(baseFilename) && f.endsWith('.gz'))
        .map(f => ({
            name: f,
            path: path.join(backupDir, f),
            mtime: fs.statSync(path.join(backupDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
    
    // Remove backups beyond the limit
    if (files.length > config.maxBackups) {
        const toRemove = files.slice(config.maxBackups);
        toRemove.forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`Removed old backup: ${file.name}`);
        });
    }
}

// Main rotation function
async function performRotation() {
    console.log('Starting log rotation...');
    console.log(`Max file size: ${config.maxFileSize / 1024}KB`);
    console.log(`Max backups: ${config.maxBackups}`);
    console.log('');
    
    for (const logFile of config.logFiles) {
        try {
            await rotateLogFile(logFile);
        } catch (error) {
            console.error(`Error rotating ${logFile}:`, error.message);
        }
        console.log('');
    }
    
    console.log('Log rotation complete!');
}

// Check if running directly
if (require.main === module) {
    performRotation().catch(console.error);
}

module.exports = { performRotation, rotateLogFile };