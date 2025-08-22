#!/usr/bin/env python3
"""
Analyze gateway directory files to identify which ones are needed vs redundant
"""
import os
import glob

def analyze_gateway_files():
    gateway_dir = "/home/hshadab/agentkit/circle/gateway"
    
    print("🔍 Analyzing Gateway Directory Files")
    print("=" * 60)
    
    # Categorize files
    categories = {
        "core_config": [],
        "core_handlers": [],
        "demos": [],
        "funding_scripts": [],
        "balance_checks": [],
        "test_scripts": [],
        "examples": [],
        "documentation": [],
        "duplicates": []
    }
    
    files = []
    for ext in ['*.js', '*.cjs', '*.md']:
        files.extend(glob.glob(os.path.join(gateway_dir, ext)))
    
    for file_path in sorted(files):
        filename = os.path.basename(file_path)
        
        # Core configuration and handlers
        if filename in ['config.js', 'gatewayHandler.js', 'gatewayAPI.js', 'zkpGatewayIntegration.js']:
            categories["core_config"].append(filename)
        elif filename in ['mainnet-config.js', 'sepolia-config.js']:
            categories["core_config"].append(filename)
            
        # Documentation
        elif filename.endswith('.md'):
            categories["documentation"].append(filename)
            
        # Demo files
        elif filename.startswith('demo-'):
            categories["demos"].append(filename)
            
        # Funding scripts
        elif filename.startswith('fund-'):
            categories["funding_scripts"].append(filename)
            
        # Balance check scripts
        elif 'balance' in filename.lower() or filename.startswith('check-'):
            categories["balance_checks"].append(filename)
            
        # Test scripts
        elif filename.startswith('test-') or 'test' in filename:
            categories["test_scripts"].append(filename)
            
        # ZKP authorization (core functionality)
        elif 'zkp' in filename and 'authorization' in filename:
            categories["core_handlers"].append(filename)
            
        # Everything else might be duplicates or one-off scripts
        else:
            categories["duplicates"].append(filename)
    
    print("📂 FILE CATEGORIZATION:")
    print("-" * 40)
    
    for category, files in categories.items():
        if files:
            print(f"\n🔹 {category.upper().replace('_', ' ')}:")
            for file in files:
                print(f"   • {file}")
    
    print("\n" + "=" * 60)
    print("🎯 RECOMMENDED ACTIONS:")
    print("=" * 60)
    
    # Essential files to keep
    essential = []
    essential.extend(categories["core_config"])
    essential.extend(categories["core_handlers"])
    essential.extend(categories["documentation"])
    
    # Files that can likely be removed
    removable = []
    removable.extend(categories["demos"][2:])  # Keep 1-2 demos max
    removable.extend(categories["funding_scripts"][1:])  # Keep 1 funding script
    removable.extend(categories["balance_checks"][1:])  # Keep 1 balance check
    removable.extend(categories["test_scripts"])  # Remove test scripts from main dir
    removable.extend(categories["duplicates"])
    
    print("✅ KEEP (Essential):")
    for file in sorted(essential):
        print(f"   • {file}")
        
    print(f"\n❌ CAN REMOVE ({len(removable)} files):")
    for file in sorted(removable):
        print(f"   • {file}")
        
    print(f"\n📊 SUMMARY:")
    print(f"   Total files: {len(sum(categories.values(), []))}")
    print(f"   Keep: {len(essential)}")
    print(f"   Remove: {len(removable)}")
    print(f"   Space savings: ~{len(removable)/len(sum(categories.values(), [])) * 100:.0f}%")
    
    return removable

if __name__ == "__main__":
    analyze_gateway_files()