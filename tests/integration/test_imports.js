#!/usr/bin/env node

console.log("Testing imports...\n");

try {
    console.log("1. Testing WorkflowManager import...");
    const { default: WorkflowManager } = await import('./workflowManager.js');
    console.log("✅ WorkflowManager imported successfully");
} catch (e) {
    console.error("❌ WorkflowManager import failed:", e.message);
}

try {
    console.log("\n2. Testing WorkflowExecutor import...");
    const { default: WorkflowExecutor } = await import('./workflowExecutor_generic.js');
    console.log("✅ WorkflowExecutor imported successfully");
} catch (e) {
    console.error("❌ WorkflowExecutor import failed:", e.message);
}

try {
    console.log("\n3. Testing CircleHandler import...");
    const { CircleUSDCHandler } = await import('./circleHandler.js');
    console.log("✅ CircleUSDCHandler imported successfully");
} catch (e) {
    console.error("❌ CircleUSDCHandler import failed:", e.message);
}

console.log("\n✅ Import test complete");
