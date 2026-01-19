import { EventEmitter } from "events";
import type { Address, WalletClient } from "viem";
import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { allowance, approve } from "viem-erc20/actions";

import { HEMI_TATTOOS_ABI } from "../../abi.js";
import {
  getContractAddress,
  getHbUSDAddress,
  TIER1_PRICE,
  TIER2_PRICE,
} from "../../constants.js";
import type { MintEvents } from "../../types.js";

/**
 * Helper to wrap a callback that uses EventEmitter into a promise and emitter
 */
const toPromiseEvent = function (
  callback: (emitter: EventEmitter<MintEvents>) => Promise<void>,
) {
  const emitter = new EventEmitter<MintEvents>();
  // Let's ensure the error is handled as a Promise rejection
  // eslint-disable-next-line promise/no-callback-in-promise
  const promise = Promise.resolve().then(() => callback(emitter));
  return { emitter, promise };
};

/**
 * Internal function to handle minting for both tiers
 */
const runMint = ({
  walletClient,
  account,
  tier,
  price,
}: {
  walletClient: WalletClient;
  account: Address;
  tier: 1 | 2;
  price: bigint;
}) =>
  async function (emitter: EventEmitter<MintEvents>) {
    const chainId = walletClient.chain?.id;
    if (!chainId) {
      const error = new Error("Chain ID not available from wallet client");
      emitter.emit("unexpected-error", error);
      return;
    }

    const contractAddress = getContractAddress(chainId);
    const hbUSDAddress = getHbUSDAddress(chainId);

    // Check current allowance
    emitter.emit("checking-allowance");
    const currentAllowance = await allowance(walletClient, {
      address: hbUSDAddress,
      owner: account,
      spender: contractAddress,
    });

    // If allowance is insufficient, request approval
    if (currentAllowance < price) {
      emitter.emit("approving-tokens", price);

      const approvalHash = await approve(walletClient, {
        address: hbUSDAddress,
        spender: contractAddress,
        amount: price,
      }).catch(function (error) {
        emitter.emit("user-signing-approval-error", error);
      });

      if (!approvalHash) {
        return;
      }

      emitter.emit("user-signed-approval", approvalHash);

      // Wait for approval transaction to be mined
      const approvalReceipt = await waitForTransactionReceipt(walletClient, {
        hash: approvalHash,
      }).catch(function (error) {
        emitter.emit("approval-transaction-failed", error);
      });

      if (!approvalReceipt) {
        return;
      }

      if (approvalReceipt.status === "reverted") {
        emitter.emit("approval-transaction-reverted", approvalReceipt);
        return;
      }

      emitter.emit("approval-transaction-succeeded", approvalReceipt);
    } else {
      emitter.emit("allowance-sufficient", currentAllowance);
    }

    // Execute mint transaction
    emitter.emit("pre-mint");

    const mintFunctionName = tier === 1 ? "mintTier1" : "mintTier2";
    const mintHash = await writeContract(walletClient, {
      address: contractAddress,
      abi: HEMI_TATTOOS_ABI,
      chain: walletClient.chain,
      functionName: mintFunctionName,
      account,
    }).catch((error) => {
      emitter.emit("user-signing-mint-error", error);
    });

    if (!mintHash) {
      return;
    }

    emitter.emit("user-signed-mint", mintHash);

    // Wait for mint transaction to be mined
    const receipt = await waitForTransactionReceipt(walletClient, {
      hash: mintHash,
    }).catch(function (error) {
      emitter.emit("minting-transaction-failed", error);
    });

    if (!receipt) {
      return;
    }

    if (receipt.status === "reverted") {
      emitter.emit("minting-transaction-reverted", receipt);
      return;
    }

    emitter.emit("minting-transaction-succeeded", receipt);

    // Extract token ID from Transfer event logs
    const transferLog = receipt.logs.find(function (log) {
      try {
        // Check if this is a Transfer event to the minting account
        return (
          log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && // Transfer event signature
          log.topics[2]?.toLowerCase() ===
            `0x${account.slice(2).toLowerCase().padStart(64, "0")}`
        );
      } catch {
        return false;
      }
    });

    if (!transferLog || !transferLog.topics[3]) {
      const error = new Error(
        "Failed to extract token ID from mint transaction",
      );
      emitter.emit("unexpected-error", error);
      return;
    }

    const tokenId = BigInt(transferLog.topics[3]);

    emitter.emit("mint-complete", tokenId);
  };

/**
 * Mint a Tier 1 NFT (100 tokens)
 * Returns an EventEmitter and Promise for the minting process
 */
export const mintTier1 = ({
  account,
  walletClient,
}: {
  account: Address;
  walletClient: WalletClient;
}) =>
  toPromiseEvent(
    runMint({ walletClient, account, tier: 1, price: TIER1_PRICE }),
  );

/**
 * Mint a Tier 2 NFT (10 tokens)
 * Returns an EventEmitter and Promise for the minting process
 */
export const mintTier2 = ({
  account,
  walletClient,
}: {
  account: Address;
  walletClient: WalletClient;
}) =>
  toPromiseEvent(
    runMint({ walletClient, account, tier: 2, price: TIER2_PRICE }),
  );
