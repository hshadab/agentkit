#!/usr/bin/env python3
"""
Auto Cache Buster - Updates cache-busting parameters automatically
"""
import os
import re
import time
from datetime import datetime

def get_cache_buster():
    """Generate a unique cache buster timestamp"""
    return datetime.now().strftime("%Y%m%d-%H%M%S")

def update_file_cache_busters(file_path, cache_buster):
    """Update cache-busting parameters in a file"""
    if not os.path.exists(file_path):
        print(f"⚠️  File not found: {file_path}")
        return False
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Update version parameters in script/link tags
        content = re.sub(r'\?v=[^"\'&>\s]+', f'?v={cache_buster}', content)
        
        # Update cache invalidation timestamp comments
        content = re.sub(
            r'<!-- Force cache invalidation timestamp: [^>]+ -->',
            f'<!-- Force cache invalidation timestamp: {cache_buster} -->',
            content
        )
        
        # Update cache bust comments in JS files
        content = re.sub(
            r'// Cache bust: [^\n]+',
            f'// Cache bust: {cache_buster}',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated cache busters in: {file_path}")
            return True
        else:
            print(f"📝 No cache busters to update in: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating {file_path}: {e}")
        return False

def main():
    """Update all cache busters automatically"""
    print("🔄 Auto Cache Buster - Starting...")
    
    cache_buster = get_cache_buster()
    print(f"🆔 Cache buster: {cache_buster}")
    
    # Files to update
    files_to_update = [
        'static/index.html',
        'static/js/main.js',
        'static/js/ui/gateway-workflow-manager-v2.js',
        'static/js/ui/cctp-workflow-manager.js'
    ]
    
    updated_count = 0
    for file_path in files_to_update:
        if update_file_cache_busters(file_path, cache_buster):
            updated_count += 1
    
    print(f"✅ Auto Cache Buster complete! Updated {updated_count} files with timestamp: {cache_buster}")
    
    # Write cache buster to a file for reference
    with open('static/.cache-buster', 'w') as f:
        f.write(cache_buster)
    
    return cache_buster

if __name__ == '__main__':
    main()