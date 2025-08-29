const puppeteer = require('puppeteer');

async function testGroth16UIWorkflow() {
    console.log('🧪 Testing complete Groth16 UI workflow...\n');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('zkML') || text.includes('Groth16') || text.includes('Gateway')) {
            console.log(`UI: ${text}`);
        }
    });
    
    try {
        // Navigate to the UI
        await page.goto('http://localhost:8000/index-clean.html');
        console.log('✅ Loaded UI page');
        
        // Wait for the page to load
        await page.waitForSelector('#user-input', { timeout: 5000 });
        
        // Type the trigger command
        await page.type('#user-input', 'gateway zkml transfer 2 USDC');
        console.log('✅ Entered trigger command');
        
        // Click send or press Enter
        await page.keyboard.press('Enter');
        console.log('✅ Triggered workflow');
        
        // Wait for Step 1 to complete (zkML proof)
        await page.waitForFunction(
            () => {
                const messages = document.querySelectorAll('.message');
                return Array.from(messages).some(m => 
                    m.textContent.includes('Step 1: COMPLETED') || 
                    m.textContent.includes('zkML proof generated')
                );
            },
            { timeout: 30000 }
        );
        console.log('✅ Step 1 (zkML proof) completed');
        
        // Wait for Step 2 to complete (Groth16 verification)
        await page.waitForFunction(
            () => {
                const messages = document.querySelectorAll('.message');
                return Array.from(messages).some(m => 
                    m.textContent.includes('Step 2: COMPLETED') || 
                    m.textContent.includes('Groth16 proof verified on-chain')
                );
            },
            { timeout: 30000 }
        );
        console.log('✅ Step 2 (Groth16 verification) completed');
        
        // Wait for Step 3 to start (Gateway transfers)
        await page.waitForFunction(
            () => {
                const messages = document.querySelectorAll('.message');
                return Array.from(messages).some(m => 
                    m.textContent.includes('Step 3:') || 
                    m.textContent.includes('Gateway transfers')
                );
            },
            { timeout: 30000 }
        );
        console.log('✅ Step 3 (Gateway transfers) started');
        
        // Take a screenshot
        await page.screenshot({ path: 'groth16-workflow-success.png' });
        console.log('📸 Screenshot saved as groth16-workflow-success.png');
        
        console.log('\n🎉 All steps completed successfully!');
        console.log('   - zkML proof generated (JOLT-Atlas)');
        console.log('   - Groth16 proof verified on-chain (Ethereum Sepolia)');
        console.log('   - Gateway transfers initiated (Circle API)');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'groth16-workflow-error.png' });
    }
    
    // Keep browser open for inspection
    console.log('\n📋 Browser kept open for inspection. Close manually when done.');
}

testGroth16UIWorkflow().catch(console.error);