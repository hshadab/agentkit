const fs = require('fs');

// Files to update
const files = [
    'static/ethereum-verifier.js',
    'static/ethereum-verifier-mock.js',
    'verify-existing-onchain.js',
    'verify-all-proof-types-onchain.js',
    'verify-onchain-simple.js',
    'test-onchain-verification.js'
];

const oldAddress = '0x7eCe59B5e5fBEbf8761642352d70ADdCA7B38d29';
const newAddress = '0x09378444046d1ccb32ca2d5b44fab6634738d067';

console.log('🔄 Updating contract addresses...');
console.log('Old:', oldAddress);
console.log('New:', newAddress);
console.log('='.repeat(60));

files.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes(oldAddress)) {
                content = content.replace(new RegExp(oldAddress, 'gi'), newAddress);
                fs.writeFileSync(file, content);
                console.log('✅ Updated:', file);
            } else {
                console.log('⏭️  Skipped:', file, '(address not found)');
            }
        } else {
            console.log('⚠️  Not found:', file);
        }
    } catch (err) {
        console.error('❌ Error updating', file, ':', err.message);
    }
});

console.log('\n✅ Done! All contract addresses updated.');
console.log('\n📋 New verifier contract:');
console.log(`   Address: ${newAddress}`);
console.log(`   Network: Sepolia`);
console.log(`   Etherscan: https://sepolia.etherscan.io/address/${newAddress}`);
console.log('\n🧪 Ready to test! Run: node verify-all-proof-types-onchain.js');