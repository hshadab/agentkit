# Changelog

All notable changes to the Verifiable Agent Kit project will be documented in this file.

## [1.4.0] - 2025-08-16

### 🔥 Major Bug Fixes - IoTeX Integration Now Fully Working

#### Fixed
- **Critical Bug**: "Device not registered" error in Step 3 of IoTeX workflow
  - **Root Cause**: Device ID inconsistency between workflow steps
  - **Files Modified**: 
    - `parsers/workflow/workflowExecutor.js` - Fixed device ID consistency across all workflow steps
    - `static/js/blockchain/iotex-device-verifier.js` - Improved reward amount parsing
    - `static/index.html` - Updated cache-busting versions
  - **Impact**: All 4 steps of IoTeX device proximity workflow now work correctly

#### Enhanced
- **Reward Display**: Fixed frontend showing "0.0 IOTX" when 0.1 IOTX was actually distributed
  - Added fallback logic to detect IOTX transfers even when events aren't properly parsed
  - Improved transaction log analysis for reward amount detection
- **Device ID Generation**: Enhanced unique device ID generation to prevent registration conflicts
- **Debugging**: Added comprehensive logging for device ID consistency tracking

#### Technical Details
- **Contract Address**: Updated to working contract `0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14`
- **Workflow Steps**: 
  1. ✅ Device Registration (0.01 IOTX fee)
  2. ✅ Nova Proof Generation 
  3. ✅ Blockchain Verification (0.001 IOTX fee) - **NOW WORKING**
  4. ✅ Automatic Reward Distribution (0.1 IOTX) - **NOW WORKING**

#### Verified Working Transactions
- Device Registration: `0x3ff77ae415b4606a37096390b8263e3b6beff1ee917d46f78f10ebf4e7db5bbd`
- Proof Verification: `0xfccb1743c78c734559be0436d30c9e5f4294a7ce397f9086f53394bcdb2956ae`
- Reward Distribution: `0x069f828cd7090db68b99ffe4a5f89a1d6b608a487beffeee62810cf3e2aa5056`

### Breaking Changes
- None - all changes are backward compatible

### Migration Guide
- Clear browser cache (Ctrl+F5) to load updated JavaScript
- No other changes required

---

## [1.3.0] - Previous Release

### Added
- Multi-chain blockchain verification support
- Circle API integration for USDC transfers
- Real zkEngine Nova proof generation
- OpenAI-powered workflow parsing

### Fixed
- Various stability improvements
- Enhanced error handling

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality  
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes