#!/usr/bin/env python3

import asyncio
import aiohttp
import json

async def test_openai_workflow():
    """Test the OpenAI workflow parsing integration"""
    
    # Test complex conditional transfer that regex struggles with
    test_command = "If Alice is KYC verified send her 0.05 USDC on Solana and if Bob is KYC verified send him 0.03 USDC on Ethereum"
    
    print(f"Testing OpenAI workflow parsing with command:")
    print(f"  {test_command}")
    print()
    
    async with aiohttp.ClientSession() as session:
        # Send to the execute_workflow endpoint
        async with session.post(
            'http://localhost:8002/execute_workflow',
            json={"command": test_command},
            headers={'Content-Type': 'application/json'}
        ) as response:
            result = await response.json()
            print(f"Response status: {response.status}")
            print(f"Result: {json.dumps(result, indent=2)}")
            
            if result.get('success'):
                print("\n✅ Workflow executed successfully!")
                print(f"Workflow ID: {result.get('workflowId')}")
                print(f"Transfer IDs: {result.get('transferIds', [])}")
                print(f"Proof Summary: {result.get('proofSummary', {})}")
            else:
                print(f"\n❌ Workflow failed: {result.get('error')}")

async def test_complex_variations():
    """Test various complex workflow patterns"""
    
    test_cases = [
        "Send 0.1 USDC to Charlie on ETH but only if he's KYC compliant and located in NYC",
        "When Dave becomes KYC verified transfer 0.2 USDC to him on Solana",
        "If Emma has AI content verification send her 0.15 USDC otherwise send 0.05 USDC",
        "Transfer 1 USDC to Frank if he is both KYC verified and location is San Francisco"
    ]
    
    async with aiohttp.ClientSession() as session:
        for command in test_cases:
            print(f"\n{'='*60}")
            print(f"Testing: {command}")
            print(f"{'='*60}")
            
            # First test if it's detected as complex
            from chat_service import is_complex_workflow
            is_complex = is_complex_workflow(command)
            print(f"Is complex workflow: {is_complex}")
            
            if is_complex:
                # Test OpenAI parsing
                from chat_service import parse_workflow_with_openai
                parsed = await parse_workflow_with_openai(command)
                print(f"\nParsed workflow:")
                print(json.dumps(parsed, indent=2))

if __name__ == "__main__":
    print("🧪 Testing OpenAI Workflow Integration\n")
    
    # Run the main test
    asyncio.run(test_openai_workflow())
    
    # Optionally test variations
    # print("\n\n🧪 Testing Complex Workflow Variations")
    # asyncio.run(test_complex_variations())