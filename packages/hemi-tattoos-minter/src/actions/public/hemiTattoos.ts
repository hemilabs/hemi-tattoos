import type { Address, PublicClient } from "viem";
import { readContract } from "viem/actions";
import { balanceOf } from "viem-erc20/actions";

import { HEMI_TATTOOS_ABI } from "../../abi.js";
import { getContractAddress } from "../../constants.js";
import type { TokenMetadata } from "../../types.js";

/**
 * Check if an address has already minted an NFT
 */
export async function hasMinted(publicClient: PublicClient, address: Address) {
  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("Chain ID not available from public client");
  }

  const contractAddress = getContractAddress(chainId);

  return readContract(publicClient, {
    address: contractAddress,
    abi: HEMI_TATTOOS_ABI,
    functionName: "hasMinted",
    args: [address],
  });
}

/**
 * Get the token ID owned by an address
 * Returns null if the address doesn't own a token
 */
export async function getUserToken(
  publicClient: PublicClient,
  address: Address
): Promise<bigint | null> {
  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("Chain ID not available from public client");
  }

  const contractAddress = getContractAddress(chainId);

  // Check balance first using viem-erc20
  const balance = await balanceOf(publicClient, {
    address: contractAddress,
    account: address,
  });

  if (balance === 0n) {
    return null;
  }

  // Use IERC721Enumerable's tokenOfOwnerByIndex to get the token ID
  // Since users can only mint one token, the index is always 0
  const tokenId = await readContract(publicClient, {
    address: contractAddress,
    abi: HEMI_TATTOOS_ABI,
    functionName: "tokenOfOwnerByIndex",
    args: [address, 0n],
  });

  return tokenId;
}

/**
 * Get on-chain metadata for a token
 */
export async function getTokenMetadata(
  publicClient: PublicClient,
  tokenId: bigint
): Promise<TokenMetadata> {
  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("Chain ID not available from public client");
  }

  const contractAddress = getContractAddress(chainId);

  const tokenURI = await readContract(publicClient, {
    address: contractAddress,
    abi: HEMI_TATTOOS_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  });

  // tokenURI returns a data URI: data:application/json;base64,<base64-encoded-json>
  const base64Data = tokenURI.split(",")[1];
  if (!base64Data) {
    throw new Error("Invalid tokenURI format");
  }

  const jsonString = atob(base64Data);
  const metadata = JSON.parse(jsonString) as TokenMetadata;

  return metadata;
}
