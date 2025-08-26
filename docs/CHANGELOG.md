# Changelog

All notable changes to AgentKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2025-01-29

### Added
- **5 Proof Types**: KYC, Device Proximity (IoT), AI Prediction, Age Verification, Identity Verification
- **5 Blockchain Networks**: Ethereum, Solana, Base, Avalanche, and IoTeX support
- **IoTeX Integration**: Full IoT device support with ioID registry and Nova Decider
- **Device Proximity Proofs**: New proof type specifically for IoT devices
- **Coinbase API**: Alternative USDC transfer method alongside Circle
- **Proof History**: LocalStorage-based proof management with history table
- **Comprehensive Testing**: Test suite for all proofs, blockchains, and transfers
- **Documentation Overhaul**: New ARCHITECTURE.md, SETUP.md, API_DOCUMENTATION.md
- **Test Pages**: HTML-based testing for proof history, blockchain verification, and transfers

### Changed
- **Codebase Reorganization**: Clean modular structure with organized directories
- **Port Configuration**: Chat service now on port 8002 (was 5000), Web UI on port 8000
- **Enhanced Nova Parsers**: Multiple parser versions for different proof formats
- **Improved Error Handling**: Better error messages and recovery mechanisms
- **Updated Dependencies**: Latest versions of all major dependencies

### Fixed
- **Import Path Issues**: All paths updated after reorganization
- **WebSocket Stability**: Improved connection handling and reconnection logic
- **Gas Estimation**: Fixed gas limits for IoTeX and other networks
- **Proof ID Generation**: Consistent UUID-based proof identification

### Security
- **Environment Variables**: Better handling of sensitive configuration
- **Input Validation**: Enhanced validation for all user inputs
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Previous Versions

For historical changelog entries, see the git history or documentation archive.