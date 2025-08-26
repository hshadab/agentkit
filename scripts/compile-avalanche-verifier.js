#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const solc = require('solc');

function compileSolidityContract() {
    console.log('Compiling AvalancheGroth16Verifier.sol...');
    
    // Read the contract source
    const contractPath = path.join(__dirname, '../contracts/AvalancheGroth16Verifier.sol');
    const source = fs.readFileSync(contractPath, 'utf8');
    
    // Prepare input for solc
    const input = {
        language: 'Solidity',
        sources: {
            'AvalancheGroth16Verifier.sol': {
                content: source
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object']
                }
            }
        }
    };
    
    // Compile
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error('Compilation failed');
        }
    }
    
    // Extract contract data
    const contract = output.contracts['AvalancheGroth16Verifier.sol']['AvalancheGroth16Verifier'];
    const bytecode = '0x' + contract.evm.bytecode.object;
    const abi = contract.abi;
    
    console.log('\n✅ Compilation successful!');
    console.log('Bytecode length:', bytecode.length);
    console.log('ABI functions:', abi.filter(item => item.type === 'function').map(f => f.name));
    
    // Save output
    const outputPath = path.join(__dirname, '../build/AvalancheGroth16Verifier.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ bytecode, abi }, null, 2));
    console.log('\n📄 Compiled contract saved to:', outputPath);
    
    return { bytecode, abi };
}

// Run compilation
try {
    compileSolidityContract();
} catch (error) {
    console.error('❌ Compilation error:', error.message);
    process.exit(1);
}