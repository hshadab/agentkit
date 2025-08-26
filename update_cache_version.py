#!/usr/bin/env python3
"""
Update cache buster version to force browser refresh
"""
import re
import os

def update_cache_version():
    new_version = "20250822-224000"
    old_version = "20250821-103714"
    
    print(f"🔄 Updating cache version from {old_version} to {new_version}")
    
    files_to_update = [
        "static/index.html",
        "static/js/main.js"
    ]
    
    for file_path in files_to_update:
        if os.path.exists(file_path):
            print(f"📝 Updating {file_path}...")
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Replace version numbers
            updated_content = content.replace(old_version, new_version)
            
            if updated_content != content:
                with open(file_path, 'w') as f:
                    f.write(updated_content)
                print(f"   ✅ Updated version numbers in {file_path}")
            else:
                print(f"   ℹ️  No version numbers found in {file_path}")
        else:
            print(f"   ❌ File not found: {file_path}")
    
    print(f"\n🎯 Cache buster updated to: {new_version}")
    print("   This will force browsers to reload the fixed Gateway workflow manager")

if __name__ == "__main__":
    update_cache_version()