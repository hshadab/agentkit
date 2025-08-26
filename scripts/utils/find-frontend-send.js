#!/usr/bin/env node

// Script to find where messages are sent in the frontend

const fs = require('fs');
const path = require('path');

console.log("=== Searching for Frontend Message Sending Logic ===\n");

const htmlFile = path.join(__dirname, 'static/index.html');
const content = fs.readFileSync(htmlFile, 'utf8');

// Search patterns
const patterns = [
    /addEventListener\s*\(\s*['"]click['"]/g,
    /addEventListener\s*\(\s*['"]submit['"]/g,
    /addEventListener\s*\(\s*['"]keydown['"]/g,
    /addEventListener\s*\(\s*['"]keypress['"]/g,
    /\.send\s*\(/g,
    /ws\.send/g,
    /JSON\.stringify\s*\(\s*{[^}]*type[^}]*query/g,
    /onclick\s*=/g,
    /onsubmit\s*=/g
];

const patternNames = [
    'Click Event Listeners',
    'Submit Event Listeners',
    'Keydown Event Listeners',
    'Keypress Event Listeners',
    'Send Method Calls',
    'WebSocket Send',
    'Query Message Creation',
    'Inline onclick',
    'Inline onsubmit'
];

patterns.forEach((pattern, index) => {
    console.log(`\n=== ${patternNames[index]} ===`);
    const matches = content.match(pattern);
    if (matches) {
        matches.forEach(match => {
            // Find line number
            const lines = content.substring(0, content.indexOf(match)).split('\n');
            const lineNum = lines.length;
            
            // Get surrounding context
            const startLine = Math.max(0, lineNum - 3);
            const endLine = Math.min(content.split('\n').length, lineNum + 3);
            const contextLines = content.split('\n').slice(startLine, endLine);
            
            console.log(`\nLine ${lineNum}: ${match}`);
            console.log('Context:');
            contextLines.forEach((line, i) => {
                const currentLineNum = startLine + i + 1;
                const marker = currentLineNum === lineNum ? '>>> ' : '    ';
                console.log(`${marker}${currentLineNum}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
            });
        });
    } else {
        console.log('No matches found');
    }
});

// Look for specific IDs
console.log("\n\n=== Element IDs ===");
const idPatterns = [
    /id\s*=\s*["']user-input["']/g,
    /id\s*=\s*["']send-button["']/g,
    /getElementById\s*\(\s*["']user-input["']/g,
    /getElementById\s*\(\s*["']send-button["']/g
];

const idNames = [
    'user-input element',
    'send-button element',
    'getElementById user-input',
    'getElementById send-button'
];

idPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`\n${idNames[index]}: ${matches.length} occurrence(s)`);
    }
});