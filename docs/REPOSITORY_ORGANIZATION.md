# Repository Organization Guide

## Directory Structure

### `/docs`
- **`/archive`** - Historical development documentation (48+ files)
- **`/deployment`** - Deployment guides for Ethereum and Solana
- **`/api`** - API documentation (to be added)
- **`/tests`** - Test reports and results

### `/scripts`
- **`/deploy`** - Deployment scripts
- **`/setup`** - Setup and installation scripts
- **`/utils`** - Utility scripts, database files, and tools

### `/examples`
- Demo files and example HTML pages

### `/tests`
- Organized test files (unit, integration, e2e)

### `/circle`
- Circle API integration (cleaned and organized)

### `/parsers`
- Workflow parsing modules

### `/contracts`
- Smart contracts for Ethereum and Solana

### `/static`
- Frontend files (HTML, JS, CSS)

### `/src`
- Rust source code

### `/zkengine_binary`
- zkEngine binary and WASM files

## Root Directory Files

Only essential files remain in root:
- `README.md` - Main documentation
- `LICENSE` - MIT License
- `package.json` - Node.js dependencies
- `Cargo.toml` - Rust configuration
- `requirements.txt` - Python dependencies
- `config.js` / `config.py` - Application configuration
- `chat_service.py` - Python AI service
- `IMPORTANT_FILES.md` - Guide to important files
- `DATA_FILES_LOCATION.md` - Note about data file locations

## Cleanup Summary

**Before**: 100+ files in root directory
**After**: 13 essential files only

**Files Moved**:
- 48 development docs → `/docs/archive`
- 4 deployment guides → `/docs/deployment`
- 8 test reports → `/docs/tests`
- 30+ scripts → `/scripts/*`
- 10+ demo files → `/examples`

## Benefits

1. **Clean root directory** - Only essential files visible
2. **Organized structure** - Easy to find specific file types
3. **Professional appearance** - Clean GitHub repository view
4. **Better maintenance** - Clear separation of concerns
5. **Easier onboarding** - New developers can navigate easily

## For Developers

- Source code: Check `/src`, `/static`, `/circle`, `/parsers`
- Documentation: Check `/docs`
- Scripts and tools: Check `/scripts`
- Examples: Check `/examples`
- Tests: Check `/tests`