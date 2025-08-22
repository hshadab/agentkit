// Check Gateway API info for supported networks and processing details
const fetch = require('node-fetch');
require('dotenv').config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const GATEWAY_API_URL = 'https://gateway-api.circle.com/v1';

console.log('📡 GATEWAY API INFO CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function checkGatewayInfo() {
    try {
        const response = await fetch(`${GATEWAY_API_URL}/info`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Gateway API Response:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.supportedNetworks) {
            console.log('\\n🌐 Supported Networks:');
            data.supportedNetworks.forEach(network => {
                console.log(`   ${network.domain}: ${network.name}`);
            });
        }
        
        if (data.processingInfo) {
            console.log('\\n⏱️ Processing Info:');
            console.log(JSON.stringify(data.processingInfo, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Gateway info check failed:', error.message);
    }
}

checkGatewayInfo().catch(console.error);