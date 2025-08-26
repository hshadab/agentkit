import CircleUSDCHandler from './circleHandler.js';

const transferId = process.argv[2];
if (!transferId) {
    console.error('Usage: node get-transfer-details.js <transferId>');
    process.exit(1);
}

async function getDetails() {
    try {
        const handler = new CircleUSDCHandler();
        await handler.initialize();
        
        const response = await fetch(
            `https://api-sandbox.circle.com/v1/transfers/${transferId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        console.log('\nFull transfer details:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.data?.errorCode) {
            console.log('\n❌ Error Code:', data.data.errorCode);
            console.log('Error Message:', data.data.errorMessage || 'No message provided');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

getDetails();
