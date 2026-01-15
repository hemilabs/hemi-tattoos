import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.33",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://testnet.rpc.hemi.network/rpc",
      },
    },
    hemiSepolia: {
      url: "https://testnet.rpc.hemi.network/rpc",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    hemi: {
      url: "https://rpc.hemi.network/rpc",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
  },
};

export default config;
