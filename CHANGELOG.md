# Changelog

## v4.6.0 (January 26, 2025)

### Added
- **Avalanche C-Chain Integration**: Full support for Avalanche Fuji testnet
  - Deployed real Groth16 Proof-of-Proof verifier at `0x30e93E8B0804fD60b0d151F724c307c61Be37EE1`
  - Automatic network switching for better UX
  - Red-themed UI elements for Avalanche
  - Feature parity with Ethereum and Base verifiers

### Changed
- Updated UI with Novanet logo replacing emoji in header
- Improved network switching logic for all chains
- Enhanced error handling for proof verification

### Fixed
- Resolved "execution reverted" errors on Avalanche
- Fixed proof format compatibility issues
- Corrected API endpoints for proof data fetching

### Technical Details
- Deployed `RealProofOfProofVerifier_New.sol` to Avalanche
- Uses same circuit-specific verification keys as Ethereum/Base
- Performs actual cryptographic verification with BN128 pairing checks
- Gas cost: ~200-300k gas per verification (~$0.01-0.02 on Avalanche)

## v4.5.0 (January 2025)

### Added
- Enhanced AI Prediction Proofs with cleaner UI
- Single-line display for AI prediction commitments
- Smart contract deployment for AI predictions on Base Sepolia

### Changed
- Removed toast notifications for AI predictions
- Simplified commitment display in UI
- Improved OpenAI parser for better AI proof recognition

## v4.4.0 (January 2025)

### Added
- Base blockchain support (Coinbase Layer 2)
- AI Prediction Commitment proofs with temporal verification
- Real blockchain commitments for AI predictions

## Previous Versions
See git history for earlier releases
