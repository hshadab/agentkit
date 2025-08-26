# Troubleshooting Guide

This guide consolidates all troubleshooting information for AgentKit.

## Table of Contents
- [Common Issues](#common-issues)
- [Circle API Issues](#circle-api-issues)
- [Blockchain Issues](#blockchain-issues)
- [Proof Generation Issues](#proof-generation-issues)

---

## Common Issues

### 1. Server Won't Start

**Problem**: The WebSocket server fails to start.

**Solutions**:
- Check if port 8001 is already in use: `lsof -i :8001`
- Ensure all dependencies are installed: `npm install`
- Check if the Python service is running on port 8002

### 2. OpenAI API Errors

**Problem**: Getting OpenAI API errors or workflow parsing fails.

**Solutions**:
- Verify your API key is set: `echo $OPENAI_API_KEY`
- Check if the key is valid and has credits
- Ensure the key is in your `.env` file

### 3. Missing zkEngine Binary

**Problem**: Error about zkEngine binary not found.

**Solutions**:
- The binary is at `./zkengine_binary/zkEngine`
- Make it executable: `chmod +x ./zkengine_binary/zkEngine`
- Set the path in `.env`: `ZKENGINE_BINARY=./zkengine_binary/zkEngine`

---

## Circle API Issues

### 1. Wallet Creation Fails

**Problem**: Cannot create Circle wallets.

**Solutions**:
- Verify your Circle API key is valid
- Check if you're using the sandbox environment
- Ensure you have the correct permissions

### 2. USDC Transfer Failures

**Problem**: USDC transfers fail or timeout.

**Solutions**:
- Check wallet balances first
- Verify destination addresses are valid
- For Solana, ensure the destination has a USDC token account
- Monitor the Circle dashboard for transaction status

### 3. Authentication Errors

**Problem**: Getting 401 or 403 errors from Circle API.

**Solutions**:
- Double-check your API key
- Ensure you're using the correct environment (sandbox vs production)
- Verify IP whitelist settings in Circle dashboard

---

## Blockchain Issues

### 1. MetaMask Connection

**Problem**: Cannot connect to MetaMask.

**Solutions**:
- Ensure MetaMask is installed and unlocked
- Check you're on the correct network (Sepolia, Base Sepolia, etc.)
- Clear MetaMask's connected sites and reconnect

### 2. Transaction Failures

**Problem**: Blockchain transactions fail.

**Solutions**:
- Check wallet has enough native tokens for gas
- Verify contract addresses are correct
- Ensure you're on the right network
- Check block explorer for detailed error messages

### 3. Wrong Network

**Problem**: Transactions going to wrong network.

**Solutions**:
- MetaMask: Check network selector
- Verify chainId in the application matches MetaMask
- Use the network switcher in the UI

---

## Proof Generation Issues

### 1. Proof Generation Timeout

**Problem**: Proof generation takes too long or times out.

**Solutions**:
- Check system resources (CPU, memory)
- Verify zkEngine binary is working: `./zkengine_binary/zkEngine --version`
- Try with simpler proof parameters first

### 2. Invalid Proof Data

**Problem**: Generated proofs fail verification.

**Solutions**:
- Ensure input data format is correct
- Check if the correct circuit is being used
- Verify the proof format matches the verifier contract

### 3. Circuit Loading Errors

**Problem**: Cannot load circuit files.

**Solutions**:
- Check `.wasm` and `.zkey` files exist in the correct locations
- Verify file permissions
- Ensure paths in configuration are correct

---

## Getting Help

If you're still experiencing issues:

1. Check the [DEBUG_GUIDE.md](../../DEBUG_GUIDE.md) for enabling debug mode
2. Look for error messages in the browser console
3. Check server logs for detailed error information
4. Search existing GitHub issues
5. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - System information
   - Debug logs (with sensitive data removed)