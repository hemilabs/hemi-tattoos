import { type Address, parseUnits } from "viem";
import { hemi, hemiSepolia } from "viem/chains";

// Contract addresses per chain
export const CONTRACT_ADDRESSES: Partial<Record<number, Address>> = {
  [hemiSepolia.id]: "0xa6658EeF58AF91fEC2052784f9dcecdf0A5AEf80",
  // [hemi.id]: "0x..." - To be filled after mainnet deployment
};

export const HBUSD_ADDRESSES: Record<number, Address> = {
  [hemi.id]: "0xb14646f019598bb5e48eaad28C5e692bF0496B47",
  // mkt token
  [hemiSepolia.id]: "0xbaacf81C8341c3Cb983BC48051Cc7377d2A2Eb93",
};

// Tier prices
export const TIER1_PRICE = parseUnits("100", 18); // 100 tokens (18 decimals)
export const TIER2_PRICE = parseUnits("10", 18); // 10 tokens (18 decimals)

/**
 * Get the HemiTattoos contract address for a given chain ID
 * @throws Error if chain ID is not supported
 */
export function getContractAddress(chainId: number): Address {
  const address = CONTRACT_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return address;
}

/**
 * Get the hbUSD token address for a given chain ID
 * @throws Error if chain ID is not supported
 */
export function getHbUSDAddress(chainId: number): Address {
  const address = HBUSD_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return address;
}
