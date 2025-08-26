# Fix Phantom Service Worker - Step by Step

The Phantom service worker is completely disconnected and needs a manual restart.

## Quick Fix Steps:

### Option 1: Browser Extension Reset (Fastest)
1. **Click the Extensions icon** (puzzle piece) in your browser toolbar
2. **Find Phantom** in the list
3. **Click the toggle to disable it** (turns gray)
4. **Wait 2-3 seconds**
5. **Click the toggle again to enable it** (turns blue)
6. **Go back to AgentKit tab and refresh** (Ctrl+R or Cmd+R)

### Option 2: Full Extension Page Reset
1. **Open a new tab**
2. **Navigate to:**
   - Firefox: `about:addons`
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
3. **Find Phantom wallet**
4. **Toggle OFF** (disable)
5. **Wait 3 seconds**
6. **Toggle ON** (enable)
7. **Close the extensions tab**
8. **Go back to AgentKit and refresh**

### Option 3: Nuclear Option (If above don't work)
1. **Close ALL browser tabs**
2. **Quit browser completely**
3. **Restart browser**
4. **Open AgentKit**
5. **Unlock Phantom**
6. **Make sure Phantom is on Ethereum → Sepolia network**

## After Fixing:

1. The AgentKit page should auto-connect to Phantom
2. Try "Verify on Ethereum" again
3. You should see MetaMask-style transaction popup from Phantom

## Why This Happens:

Phantom's service worker (background script) can disconnect due to:
- Browser memory management
- Computer sleep/wake
- Extension updates
- Long running sessions

This is a known Phantom issue, not a problem with your code.