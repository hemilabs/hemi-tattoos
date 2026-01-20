# Hemi Tattoos - Soul-Bound NFT Project

A monorepo containing smart contracts and web applications for Hemi Tattoos soul-bound NFTs.

## Project Structure

```
soul-bound-nft/
├── contracts/          # Smart contracts and deployment scripts
├── packages/           # (Planned) NPM workspace packages
│   ├── minter/        # (Planned) Contract interaction library
│   └── website/       # (Planned) React minting interface
└── package.json       # Workspace root configuration
```

## Current Status

**✅ Implemented:**

- Smart contracts for soul-bound NFT minting
- Testing and deployment infrastructure

**🚧 Planned:**

- TypeScript package for contract interactions
- React website for NFT minting

## Projects

### Contracts

Solidity smart contracts implementing ERC721 soul-bound NFTs with two purchase tiers. See [contracts/README.md](contracts/README.md) for detailed information.

## Development

This project uses npm workspaces. Run commands from the root directory:

```bash
# Install dependencies for all packages
npm install
```

Individual project commands should be run from their respective directories or using workspace-specific scripts.

## License

MIT
