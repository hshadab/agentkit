# Changelog

All notable changes to the Verifiable Agent Kit project will be documented in this file.

## [1.4.1] - 2025-08-17

### 🚀 Major UX Optimizations & Reward Fixes - Complete IoTeX Integration

#### Fixed
- **MetaMask Connection Optimization**: Reduced confirmation prompts from 15+ to 3 per workflow
  - **Root Cause**: Multiple connection attempts and network switches per step
  - **Solution**: Implemented connection caching and network switch optimization
  - **Files Modified**: 
    - `static/js/blockchain/iotex-device-verifier.js` - Added connection reuse logic
    - `static/js/main.js` - Implemented request deduplication
  - **Impact**: Significantly improved user experience with fewer MetaMask interruptions

- **Device ID Display**: Fixed UI showing "Device: Unknown" instead of actual device ID
  - **Root Cause**: Browser cache preventing updated JavaScript from loading
  - **Solution**: Aggressive cache-busting and direct device ID storage
  - **Files Modified**:
    - `static/js/ui/workflow-manager.js` - Enhanced device ID fallback system
    - `static/index.html` - Updated cache-busting versions
  - **Impact**: Device IDs now properly display as "SENSOR_1755404017572_71" format

- **Network Switching Issues**: Fixed MetaMask stuck on wrong networks (Avalanche chainId 43113)
  - **Root Cause**: MetaMask not properly switching to IoTeX testnet (chainId 4690)
  - **Solution**: Robust network switching with verification and error handling
  - **Impact**: Seamless network switching to IoTeX for all workflow steps

#### Enhanced
- **Reward Amount Optimization**: Reduced from 0.1 IOTX to 0.01 IOTX for sustainability
  - **Reason**: Contract balance optimization - enables 1000+ tests with 10 IOTX
  - **Files Modified**: 
    - `static/js/blockchain/iotex-device-verifier.js` - Updated reward calculations
    - `README.md` - Updated documentation
  - **Impact**: Sustainable testing environment with existing contract balance

- **Contract Balance Management**: Verified 10.053 IOTX balance after faucet funding
  - **Status**: Contract adequately funded for extensive testing
  - **Reward Pool**: Supports 1000+ device verifications at 0.01 IOTX per claim

#### Technical Improvements
- **Master Device ID System**: Implemented locking mechanism for workflow consistency
- **Connection Caching**: Reuse MetaMask connections to reduce confirmation prompts
- **Request Deduplication**: Prevent duplicate WebSocket responses
- **Network Verification**: Always verify correct IoTeX network before operations

#### Technical Details
- **Contract Address**: `0xAafE6C7ab60A8594a673791aB3DaDDb7b7CC0B14` (fully funded)
- **Contract Balance**: 10.053 IOTX (sufficient for 1000+ tests)
- **Workflow Steps**: 
  1. ✅ Device Registration (0.01 IOTX fee) - Optimized UX
  2. ✅ Nova Proof Generation - No changes
  3. ✅ Blockchain Verification (0.001 IOTX fee) - Network switching fixed
  4. ✅ Automatic Reward Distribution (0.01 IOTX) - **Amount optimized, display fixed**

#### Recent Working Transactions
- Latest successful workflow with optimized rewards and UX improvements
- All 4 steps completing with proper device ID display and minimal MetaMask confirmations
- Contract balance verified and sustainable for ongoing testing

---

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