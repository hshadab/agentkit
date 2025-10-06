# Deployment Guide - Render

This guide walks you through deploying the zkML ONNX Verifier on Render (free tier available).

## Overview

The application consists of two services:
1. **Backend API** (port 9100) - Handles ONNX model verification and JOLT proof generation
2. **Frontend UI** (port 9101) - Web interface for proof generation and verification

## Prerequisites

- GitHub account with this repository
- Render account (sign up at https://render.com)
- Both services can run on Render's free tier

## Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

## Step 2: Deploy Backend API

### Option A: Using render.yaml (Recommended)

1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect your GitHub repository: `hshadab/agentkit`
3. Select the `zkml-verifier` directory
4. Render will automatically detect `render.yaml` and create both services
5. Click **"Apply"** to deploy

### Option B: Manual Setup

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure:
   - **Name**: `zkml-verifier-api`
   - **Root Directory**: `zkml-verifier`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Starter` (free)
4. Add environment variables:
   - `PORT` = `9100`
   - `NODE_ENV` = `production`
5. Click **"Create Web Service"**

Your API will be available at: `https://zkml-verifier-api.onrender.com`

## Step 3: Deploy Frontend UI

1. Click **"New +"** → **"Web Service"**
2. Connect the same repository
3. Configure:
   - **Name**: `zkml-verifier-ui`
   - **Root Directory**: `zkml-verifier/ui`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Starter` (free)
4. Add environment variables:
   - `PORT` = `9101`
   - `API_URL` = `https://zkml-verifier-api.onrender.com`
5. Click **"Create Web Service"**

Your UI will be available at: `https://zkml-verifier-ui.onrender.com`

## Step 4: Configure CORS (Important!)

Update `server.js` in the root directory to allow requests from your Render UI domain:

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:9101',
    'https://zkml-verifier-ui.onrender.com'  // Add your Render UI URL
  ]
}));
```

Commit and push this change - Render will auto-deploy.

## Step 5: Update UI to Use Production API

Update `ui/index.html` to use the production API URL:

```javascript
// Change this line:
const API_URL = 'http://localhost:9100';

// To:
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:9100'
  : 'https://zkml-verifier-api.onrender.com';
```

## Costs

**Free Tier** (Render Starter):
- ✅ 750 hours/month (enough for 2 services)
- ✅ Auto-deploy from GitHub
- ✅ Free SSL certificates
- ✅ 512MB RAM per service
- ⚠️ Services spin down after 15 minutes of inactivity (takes ~30s to wake up)

**Paid Tier** ($7/month per service):
- ✅ Always-on (no spin down)
- ✅ More RAM and CPU
- ✅ Better for production use

## Monitoring

1. In Render dashboard, click on your service
2. View logs in real-time
3. Check metrics (CPU, RAM, requests)
4. Set up health checks (already configured in render.yaml)

## Troubleshooting

### Service won't start
- Check logs in Render dashboard
- Verify `package.json` has all dependencies
- Ensure `server.js` exists in root directory

### CORS errors
- Verify CORS configuration includes your Render UI domain
- Check browser console for specific errors

### ONNX models not loading
- Ensure models are in the correct directory
- Check if models are in `.gitignore` (they should be generated on first run)
- Run `python3 create_vision_models.py` during build

### API timeouts
- Render free tier spins down after inactivity
- First request after sleep takes ~30 seconds
- Consider paid tier for always-on service

## Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Custom Domain"**
3. Add your domain (e.g., `verify.yourcompany.com`)
4. Update DNS records as instructed by Render
5. SSL certificate is automatically provisioned

## Auto-Deploy Setup

Already configured! Every push to `main` branch will automatically deploy to Render.

To disable auto-deploy:
1. Go to service settings
2. Toggle **"Auto-Deploy"** off

## Alternative: Netlify (Frontend Only)

If you only want to deploy the UI as a static site:

1. Add `ui/dist/` build output
2. Create `netlify.toml`:
```toml
[build]
  base = "zkml-verifier/ui"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
3. Connect to Netlify
4. Deploy

**Note**: You'll still need to deploy the backend API separately (Render, Railway, or Fly.io).

## Production Checklist

- [ ] Update CORS to include production domain
- [ ] Update API_URL in UI to production endpoint
- [ ] Test proof generation end-to-end
- [ ] Test WASM verification
- [ ] Monitor first 24 hours for errors
- [ ] Set up error alerting (Render integrates with Sentry)
- [ ] Consider paid tier if expecting consistent traffic

## Next Steps

After deployment:
1. Test the live app at your Render URL
2. Share the URL with users
3. Monitor usage and performance
4. Upgrade to paid tier if needed for always-on availability

Need help? Check Render docs: https://render.com/docs
