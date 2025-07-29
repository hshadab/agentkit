#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find the most recent parsed workflow file
const circleDir = './circle';
let mostRecentFile = null;
let mostRecentTime = 0;

try {
    const files = readdirSync(circleDir);
    files.forEach(file => {
        if (file.startsWith('parsed_workflow_') && file.endsWith('.json')) {
            const filePath = join(circleDir, file);
            const stats = statSync(filePath);
            if (stats.mtimeMs > mostRecentTime) {
                mostRecentTime = stats.mtimeMs;
                mostRecentFile = filePath;
            }
        }
    });
} catch (e) {
    console.error('Error reading circle directory:', e.message);
}

if (!mostRecentFile) {
    console.log('No parsed workflow files found');
    process.exit(1);
}

console.log(`\n📄 Most recent parsed workflow: ${mostRecentFile}`);
console.log(`   Modified: ${new Date(mostRecentTime).toLocaleString()}\n`);

try {
    const content = readFileSync(mostRecentFile, 'utf-8');
    const workflow = JSON.parse(content);
    
    console.log(`Description: ${workflow.description}`);
    console.log(`Steps: ${workflow.steps.length}\n`);
    
    // Check each step, especially claim_rewards
    workflow.steps.forEach((step, i) => {
        console.log(`Step ${i + 1}: ${step.type}`);
        console.log(`  Description: ${step.description}`);
        console.log(`  Critical: ${step.critical !== undefined ? step.critical : 'NOT SET (defaults to true)'}`);
        
        if (step.type === 'claim_rewards') {
            console.log(`  ⚠️  CLAIM_REWARDS STEP FOUND`);
            console.log(`  Full step data:`, JSON.stringify(step, null, 2));
        }
        console.log('');
    });
    
} catch (e) {
    console.error('Error reading workflow file:', e.message);
}