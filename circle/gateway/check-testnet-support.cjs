// Check if Gateway API supports testnet networks
const fetch = require('node-fetch');
require('dotenv').config();

async function checkTestnetGateway() {
    console.log('🔍 CHECKING GATEWAY TESTNET SUPPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API Key prefix:', process.env.CIRCLE_API_KEY?.substring(0, 20) + '...');
    
    try {
        const response = await fetch('https://gateway-api.circle.com/v1/info', {
            headers: {
                'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('❌ API Error:', response.status);
            const errorText = await response.text();
            console.log('Error details:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('\\n📡 Available Gateway Networks:');
        
        if (data.domains) {
            data.domains.forEach(d => {
                console.log(`   Domain ${d.domain}: ${d.chain} ${d.network}`);
            });
            
            // Check for testnet networks
            const testnets = data.domains.filter(d => 
                d.network?.includes('Sepolia') || 
                d.network?.includes('Testnet') || 
                d.network?.includes('Fuji') ||
                d.network?.toLowerCase().includes('test')
            );
            
            console.log('\\n🔍 Analysis:');
            if (testnets.length > 0) {
                console.log('✅ Testnet support found!');
                testnets.forEach(t => {
                    console.log(`   • ${t.chain} ${t.network} (domain ${t.domain})`);
                });
            } else {
                console.log('❌ No testnet networks found');
                console.log('💡 Gateway API only shows mainnet networks');
                console.log('🎯 This explains why Sepolia deposit shows 0 balance');
            }
            
            console.log(`\\n📊 Total networks: ${data.domains.length}`);
            console.log('All networks appear to be mainnet only');
            
        } else {
            console.log('❌ No domains found in response');
        }
        
    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkTestnetGateway().catch(console.error);