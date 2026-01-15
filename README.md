# Hemi Tattoos - Soul-Bound NFT

A soul-bound (non-transferable) NFT collection for Hemi Tattoos with two purchase tiers, payable in hbUSD stablecoin. NFTs minted through this contract are permanently locked to the owner's address and cannot be transferred or sold.

## Overview

**Project**: Hemi Tattoos
**Token Symbol**: HEMITATT
**Networks**: Hemi (Mainnet and Sepolia Testnet)
**Standard**: ERC721 with EIP-5192 soul-bound functionality

## Key Features

- **Soul-Bound NFTs**: Non-transferable after minting (EIP-5192 compliant)
- **Two Purchase Tiers**:
  - **Tier 1**: 100 hbUSD
  - **Tier 2**: 10 hbUSD
- **One NFT Per Address**: Each wallet can only mint one NFT
- **On-Chain Metadata**: Image and metadata stored on-chain
- **Immutable**: No admin functions, no upgrades, no pause capability
- **Permanent Payments**: All hbUSD payments are locked in the contract

## Installation

```bash
# Install dependencies
npm install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Basic Commands

### Testing

```bash
# Run Foundry unit tests
npm test

# Run Hardhat integration tests (on Anvil fork)
npm run test:integration
```

### Building & Validation

```bash
# Build the contract
npm run build

# Format Solidity code
npm run format

# Lint Solidity code
npm run lint

# Build and lint (validation check)
npm run check
```

### Deployment

```bash
# Deploy to Hemi Sepolia Testnet
npm run deploy:sepolia

# Deploy to Hemi Mainnet
npm run deploy:mainnet
```

## Contract Architecture

### Core Contract

- **HemiTattoos.sol**: Main NFT contract implementing ERC721 with soul-bound functionality

## Network Configuration

### Hemi Sepolia (Testnet)

```
MKT Token: 0xbaacf81C8341c3Cb983BC48051Cc7377d2A2Eb93
```

### Hemi Mainnet

```
hbUSD Token: 0xb14646f019598bb5e48eaad28C5e692bF0496B47
```

## Development Stack

- **Smart Contracts**: Solidity 0.8.33
- **Testing**: Foundry (unit tests) & Hardhat (integration tests)
- **Deployment**: Hardhat with TypeScript scripts
- **Linting**: Solhint
- **Formatting**: Prettier

## License

MIT
