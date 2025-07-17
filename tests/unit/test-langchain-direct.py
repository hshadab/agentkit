#!/usr/bin/env python3
"""
Test the langchain service directly to check for duplicate workflow creation
"""

import requests
import json
import time
from datetime import datetime

def test_chat_endpoint():
    """Test if chat endpoint creates duplicate workflows"""
    
    url = "http://localhost:8002/chat"
    message = "Send 0.1 USDC to Alice on Ethereum if KYC compliant"
    
    print(f"[TEST] Testing chat endpoint at {datetime.now().isoformat()}")
    print(f"[TEST] Message: {message}")
    
    # Send request
    response = requests.post(url, json={"message": message})
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n[TEST] Response received:")
        print(json.dumps(data, indent=2))
        
        # Check if it's identified as a workflow
        intent = data.get('intent')
        if intent == 'workflow':
            print(f"\n[TEST] Identified as workflow command")
            if 'command' in data:
                print(f"[TEST] Command: {data['command']}")
        else:
            print(f"\n[TEST] Intent: {intent}")
    else:
        print(f"[TEST] Error: {response.status_code}")
        print(response.text)

def test_execute_workflow_endpoint():
    """Test if execute_workflow endpoint is called multiple times"""
    
    url = "http://localhost:8002/execute_workflow"
    command = "Send 0.1 USDC to Alice on Ethereum if KYC compliant"
    
    print(f"\n[TEST] Testing execute_workflow endpoint at {datetime.now().isoformat()}")
    print(f"[TEST] Command: {command}")
    
    # Send request
    response = requests.post(url, json={"command": command})
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n[TEST] Response received:")
        print(json.dumps(data, indent=2))
    else:
        print(f"[TEST] Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    print("=== Direct LangChain Service Test ===\n")
    
    # Test chat endpoint
    test_chat_endpoint()
    
    # Wait a bit
    time.sleep(2)
    
    # Test execute_workflow endpoint
    # test_execute_workflow_endpoint()
    
    print("\n[TEST] Check the service logs for [CHAT_REQUEST] and [WORKFLOW_REQUEST] entries")