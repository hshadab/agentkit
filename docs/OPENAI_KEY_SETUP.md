# OpenAI API Key Setup for Verifiable Agent Kit

## Important: OpenAI API Key is Required

As of the latest update, **ALL commands are processed through OpenAI** for natural language understanding. This means the system will not function without a valid OpenAI API key.

## Setup Instructions

### Option 1: Using the Setup Script (Recommended)

```bash
cd ~/agentkit
python setup_openai.py
```

This script will:
- Check for existing API keys
- Test if the key is valid
- Save it to the correct location

### Option 2: Manual Setup

1. Create or edit the `.env` file in the agentkit directory:
   ```bash
   cd ~/agentkit
   cp .env.example .env  # If .env doesn't exist
   nano .env  # Or use your preferred editor
   ```

2. Add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. Save the file

### Option 3: Using Environment Variables

You can also export the API key in your shell:
```bash
export OPENAI_API_KEY="sk-your-actual-api-key-here"
```

Add this to your `~/.bashrc` or `~/.zshrc` to make it permanent.

## Getting an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Save it securely - you won't be able to see it again

## Verifying Your Setup

After setting up your API key, restart the chat service:

```bash
cd ~/agentkit
pkill -f "python.*chat_service.py"
source venv/bin/activate
python chat_service.py
```

You should see:
```
[INFO] OpenAI API key configured (ending in ...XXXX)
```

If you see an error about the API key, double-check your setup.

## Troubleshooting

### "Incorrect API key provided" Error
- Your API key may be invalid or expired
- Check that you copied the entire key including the `sk-` prefix
- Try generating a new key from OpenAI

### "No valid OpenAI API key found"
- The system checked these locations and didn't find a valid key:
  - `~/agentkit/.env`
  - `~/.env`
- Run `python setup_openai.py` to configure

### Key Format
- Valid keys start with `sk-`
- They are typically 51 characters long
- Example format: `sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

## Security Notes

- Never commit your API key to Git
- The `.env` file is already in `.gitignore`
- Don't share your API key with others
- OpenAI charges for API usage - monitor your usage at https://platform.openai.com/usage