import fetch from 'node-fetch';

async function testSimpleWorkflow() {
    console.log('Testing simple workflow...');
    
    try {
        const response = await fetch('http://localhost:8002/execute_workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                command: "Generate a simple test proof"
            }),
            timeout: 5000
        });
        
        if (!response.ok) {
            console.log('Response not OK:', response.status, response.statusText);
            return;
        }
        
        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSimpleWorkflow();