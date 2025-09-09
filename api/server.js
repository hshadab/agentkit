#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const UI_PORT = process.env.UI_PORT || 8000;
const IOTEX_PORT = process.env.IOTEX_PORT || 8007;
const ZKML_PORT = process.env.ZKML_PORT || 8002;
const GROTH16_PORT = process.env.GROTH16_PORT || 3004;
const GATEWAY_API = process.env.GATEWAY_API || 'https://gateway-api-testnet.circle.com';

const app = express();
app.use(cors());

// Serve static UI
app.use(express.static(path.join(__dirname, '..', 'static'), {
  setHeaders: (res) => res.set('Cache-Control', 'no-store')
}));

// Lightweight health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      iotex: `http://localhost:${IOTEX_PORT}`,
      zkml: `http://localhost:${ZKML_PORT}`,
      groth16: `http://localhost:${GROTH16_PORT}`,
      gateway: GATEWAY_API
    }
  });
});

// Proxies (keep paths stable for UI)
app.use('/iotex/status', createProxyMiddleware({ target: `http://localhost:${IOTEX_PORT}/status`, changeOrigin: true, pathRewrite: { '^/iotex/status': '' } }));
app.use('/iotex/verify-proximity', createProxyMiddleware({ target: `http://localhost:${IOTEX_PORT}/verify-proximity`, changeOrigin: true, pathRewrite: { '^/iotex/verify-proximity': '' } }));

app.use('/zkml', createProxyMiddleware({ target: `http://localhost:${ZKML_PORT}`, changeOrigin: true }));
app.use('/groth16', createProxyMiddleware({ target: `http://localhost:${GROTH16_PORT}`, changeOrigin: true }));

// Gateway API proxy to avoid CORS
app.use('/gateway', createProxyMiddleware({ target: GATEWAY_API, changeOrigin: true, pathRewrite: { '^/gateway': '' } }));

// Fallback to UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'static', 'index-clean2.html'));
});

app.listen(UI_PORT, () => {
  console.log(`\nUnified UI + API proxy running:`);
  console.log(`  UI:       http://localhost:${UI_PORT}/index-clean2.html`);
  console.log(`  IoTeX:    /iotex/*  -> http://localhost:${IOTEX_PORT}`);
  console.log(`  zkML:     /zkml/*   -> http://localhost:${ZKML_PORT}`);
  console.log(`  Groth16:  /groth16/*-> http://localhost:${GROTH16_PORT}`);
  console.log(`  Gateway:  /gateway/*-> ${GATEWAY_API}\n`);
});

