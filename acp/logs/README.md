# Logs Directory

This directory contains runtime logs from ACP services.

## Log Files

All `.log` files are automatically ignored by git (see `.gitignore`).

**Services generate the following logs:**
- `proof-service.log` - JOLT-Atlas proof generation service (port 9001)
- `acp-openai.log` - ACP OpenAI server (port 9006)
- `gpt5-parser.log` - Rule parser service (legacy name, port 9005)
- `onchain.log` - On-chain verification service (port 9004)
- `http-server.log` - Static file server (port 9000)

## Viewing Logs

```bash
# Tail all service logs
tail -f logs/*.log

# View specific service
tail -f logs/proof-service.log

# Clear all logs
rm logs/*.log
```

## Log Rotation

Logs are not automatically rotated. Clean manually when needed:

```bash
cd /path/to/acp
rm logs/*.log
```
