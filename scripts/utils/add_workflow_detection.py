#!/usr/bin/env python3
import os
import re

langchain_path = os.path.expanduser("~/agentkit/langchain_service.py")

# Read the file
with open(langchain_path, 'r') as f:
    content = f.read()

# Add the workflow detection function if it doesn't exist
if 'def is_workflow_command' not in content:
    # Find where to insert (after imports, before first @app)
    insert_pos = content.find('@app')
    if insert_pos > 0:
        workflow_func = '''
def is_workflow_command(message: str) -> bool:
    """Detect if a command should be processed as a workflow."""
    message_lower = message.lower()
    
    # Multi-step indicators
    if ' then ' in message_lower:
        return True
    
    # Conditional transfers
    if ('send' in message_lower or 'transfer' in message_lower):
        if any(word in message_lower for word in ['if', 'when', 'after', 'compliant', 'verified']):
            return True
    
    return False

'''
        content = content[:insert_pos] + workflow_func + content[insert_pos:]
        
        # Now find the chat endpoint and add the check
        chat_pattern = r'(@app\.post\("/chat"\)[^{]*\{[^{]*try:[^{]*message = request\.message\.strip\(\))'
        
        def add_workflow_check(match):
            return match.group(0) + '''
        
        # Check if this is a workflow command FIRST
        if is_workflow_command(message):
            return {
                "intent": "workflow",
                "command": message,
                "response": "I'll execute this multi-step workflow for you.",
                "metadata": {"type": "workflow_execution"}
            }'''
        
        content = re.sub(chat_pattern, add_workflow_check, content, flags=re.DOTALL)
        
        # Write back
        with open(langchain_path, 'w') as f:
            f.write(content)
        
        print("✅ Added workflow detection")
    else:
        print("❌ Could not find insertion point")
else:
    print("✅ Workflow detection already exists")
