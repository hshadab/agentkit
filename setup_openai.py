#!/usr/bin/env python3
"""
Setup script to configure OpenAI API key for the Verifiable Agent Kit
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key

def check_api_key(api_key):
    """Check if an API key looks valid"""
    if not api_key:
        return False
    if api_key == 'your-openai-api-key-here':
        return False
    if not api_key.startswith('sk-'):
        return False
    if len(api_key) < 20:
        return False
    return True

def test_api_key(api_key):
    """Test if the API key actually works"""
    try:
        import openai
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        # Try a simple completion to test the key
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'test'"}],
            max_tokens=5
        )
        return True
    except Exception as e:
        print(f"API key test failed: {str(e)}")
        return False

def main():
    print("🔧 Verifiable Agent Kit - OpenAI Setup")
    print("=" * 50)
    
    # Ensure we're in the agentkit directory
    if not Path.cwd().name == 'agentkit':
        print("⚠️  Warning: This script should be run from the agentkit directory")
        print(f"   Current directory: {Path.cwd()}")
    
    # Check current .env file
    env_path = Path.cwd() / '.env'
    print(f"📁 Working with: {env_path}")
    
    # Load existing environment
    if env_path.exists():
        load_dotenv(env_path)
        current_key = os.getenv('OPENAI_API_KEY')
        
        if check_api_key(current_key):
            print(f"✓ Found existing API key: ...{current_key[-8:]}")
            
            # Test if it works
            print("Testing API key...")
            if test_api_key(current_key):
                print("✅ API key is valid and working!")
                return
            else:
                print("❌ API key is invalid or expired")
    else:
        print("No .env file found. Creating one...")
        # Copy from example
        example_path = Path.cwd() / '.env.example'
        if example_path.exists():
            with open(example_path, 'r') as f:
                content = f.read()
            with open(env_path, 'w') as f:
                f.write(content)
    
    # Prompt for new key
    print("\nPlease enter your OpenAI API key")
    print("You can get one at: https://platform.openai.com/api-keys")
    print("It should start with 'sk-'")
    
    while True:
        api_key = input("\nAPI Key: ").strip()
        
        if not check_api_key(api_key):
            print("❌ Invalid key format. OpenAI keys start with 'sk-'")
            continue
        
        print("\nTesting API key...")
        if test_api_key(api_key):
            print("✅ API key is valid!")
            
            # Save to .env file
            set_key(env_path, 'OPENAI_API_KEY', api_key)
            print(f"\n✅ Saved API key to {env_path}")
            
            # Also update export format if present
            with open(env_path, 'r') as f:
                content = f.read()
            
            # Replace both formats
            content = content.replace('OPENAI_API_KEY=your-openai-api-key-here', f'OPENAI_API_KEY={api_key}')
            content = content.replace('export OPENAI_API_KEY="your-openai-api-key-here"', f'export OPENAI_API_KEY="{api_key}"')
            
            with open(env_path, 'w') as f:
                f.write(content)
            
            print("\n🎉 Setup complete!")
            print("\nTo start the service, run:")
            print("  source venv/bin/activate")
            print("  python chat_service.py")
            
            break
        else:
            print("❌ API key test failed. Please check your key and try again.")

if __name__ == '__main__':
    main()