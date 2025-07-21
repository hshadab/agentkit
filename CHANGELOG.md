# Changelog

All notable changes to the Verifiable Agent Kit project will be documented in this file.

## [v4.5] - 2025-01-21

### Added
- Comprehensive documentation for AI Prediction Proof system in `docs/AI_PREDICTION_PROOFS.md`
- Changelog file to track version history

### Changed
- **AI Prediction Proof IDs** - Now generate as `proof_ai_prediction_[timestamp]` instead of `proof_ai_content_[timestamp]`
- **UI Improvements**:
  - Removed toast notifications for AI prediction commitments
  - Simplified AI commitment display to single-line format
  - Removed emojis from AI prediction cards
  - Streamlined commitment info: "View AI prediction commitment on Base blockchain | [Timestamp]"
- **OpenAI Parser Enhancements**:
  - Added explicit rules to distinguish AI proof types from AI processing requests
  - Added examples to prevent multi-step workflows for AI predictions
  - Improved handling of "Prove AI prediction commitment" as single-step proof

### Fixed
- AI prediction proofs now correctly show as single proof cards instead of workflow cards
- Backend no longer adds unnecessary `process_with_ai` step for AI prediction commands

## [v4.4] - 2025-01-20

### Added
- **Base Blockchain Support** - Full integration with Base (Coinbase Layer 2)
- **AI Prediction Commitment Proofs** - Temporal commitment proofs for AI-generated content
- **Solflare Wallet Support** - Native support for Solflare wallet on Solana
- **Smart Contract Deployment** - AI Prediction Commitment contract on Base Sepolia
- **Auto-Connect Wallets** - Automatic wallet reconnection on page load

### Changed
- **Gas Price Optimization** - Capped gas prices at 0.1 gwei for testnet transactions
- **UI Consolidation** - Verification results now appear directly in proof cards
- **Wallet Connection UX** - Removed "Connect All" button for on-demand connections

### Fixed
- Ethereum contract initialization sync issues
- High gas price alerts on testnet transactions
- Blockchain verification timing issues

## [v4.3] - 2025-01-19

### Added
- **OpenAI Workflow Parser** - GPT-4o integration for natural language parsing
- **Modular Frontend Architecture** - ES6 modules for better code organization
- **Proof History Table** - Comprehensive view of all generated proofs
- **Automatic Log Rotation** - Intelligent log management system

### Changed
- **Enhanced UI Design** - Cleaner interface with improved visual hierarchy
- **Real-time Updates** - WebSocket-based live status tracking
- **Optimized Dependencies** - Reduced package size and cleaner structure

### Fixed
- Solana PDA derivation for multiple verifications
- Proof uniqueness with timestamp-based IDs
- Memory leaks in long-running processes

## [v4.2] - 2025-01-18

### Added
- Circle API integration for real USDC transfers
- Multi-chain support (Ethereum Sepolia + Solana Devnet)
- Conditional transfer workflows

### Changed
- Switched from simulated to real blockchain transactions
- Updated smart contracts for production use

## [v4.1] - 2025-01-17

### Added
- zkEngine integration with Nova and Groth16 SNARKs
- WebAssembly proof generation modules
- Basic KYC and location proof types

## [v4.0] - 2025-01-16

### Added
- Initial release of Verifiable Agent Kit
- WebSocket-based real-time UI
- Rust backend server
- Basic proof generation framework