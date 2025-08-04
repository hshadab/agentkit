// Test script for medical workflow
// Run this in the browser console at http://localhost:8001

async function testMedicalWorkflow() {
    console.log('Starting medical workflow test...');
    
    // Send the workflow command through the chat interface
    const message = "Create medical record for patient 12345 and verify integrity";
    
    // Find the chat input and send button
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    if (chatInput && sendButton) {
        chatInput.value = message;
        sendButton.click();
        console.log('Medical workflow initiated through chat interface');
    } else {
        console.log('Chat interface not found. Sending directly via WebSocket...');
        
        // Alternative: Send directly via WebSocket if available
        if (window.wsManager && window.wsManager.ws && window.wsManager.ws.readyState === WebSocket.OPEN) {
            window.wsManager.send({
                message: message,
                type: 'chat'
            });
            console.log('Message sent via WebSocket');
        } else {
            console.error('WebSocket not connected. Please ensure the page is fully loaded.');
        }
    }
}

// Instructions
console.log(`
=== Medical Workflow Test Instructions ===

1. Open http://localhost:8001 in your browser
2. Make sure MetaMask is installed and connected
3. Open the browser console (F12)
4. Copy and paste this entire script
5. Run: testMedicalWorkflow()

The workflow will:
1. Create a medical record
2. Prompt MetaMask to commit to Avalanche
3. Generate a medical integrity proof
4. Prompt MetaMask to verify on Avalanche

Make sure you're connected to Avalanche Fuji Testnet in MetaMask.
`);