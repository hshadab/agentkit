def needs_workflow_orchestration(command):
    """Determine if command needs full workflow system"""
    command_lower = command.lower()
    
    # Count different proof types mentioned
    proof_types = set()
    if 'kyc' in command_lower: proof_types.add('kyc')
    if 'location' in command_lower: proof_types.add('location')
    if 'ai content' in command_lower: proof_types.add('ai_content')
    
    # Count transfer/send actions
    transfer_count = len(re.findall(r'send\s+[\d.]+|transfer\s+[\d.]+', command_lower))
    
    # Count recipients
    recipients = set()
    recipient_matches = re.findall(r'to\s+(\w+)', command_lower)
    recipients.update(recipient_matches)
    
    # Count conditional statements
    if_count = command_lower.count(' if ')
    and_count = command_lower.count(' and ')
    
    # Complex workflow indicators
    complex_indicators = [
        len(proof_types) > 1,                    # Multiple proof types
        transfer_count > 1,                      # Multiple transfers (NEW!)
        len(recipients) > 1,                     # Multiple recipients (NEW!)
        if_count > 1,                           # Multiple conditions
        and_count > 0 and transfer_count > 1,   # Multiple transfers with AND logic (NEW!)
        command_lower.count('then') > 1 and command_lower.count('if') > 0,  # Complex chains
        'parallel' in command_lower,             # Explicit parallel
        'batch' in command_lower,               # Batch operations
        'workflow' in command_lower,            # Explicit workflow
    ]
    
    print(f"[DEBUG] Workflow analysis:")
    print(f"  - Proof types: {proof_types}")
    print(f"  - Transfer count: {transfer_count}")
    print(f"  - Recipients: {recipients}")
    print(f"  - If count: {if_count}")
    print(f"  - And count: {and_count}")
    print(f"  - Complex indicators: {[i for i, indicator in enumerate(complex_indicators) if indicator]}")
    
    return any(complex_indicators)
