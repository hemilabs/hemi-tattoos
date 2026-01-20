import type { Hash, TransactionReceipt } from "viem";

/**
 * Token metadata returned from tokenURI
 */
export type TokenMetadata = {
  attributes: Record<string, string | number>[];
  description: string;
  name: string;
  image: string; // data URI with base64 encoded image
};

/**
 * Events emitted during the minting process
 */
export type MintEvents = {
  "checking-allowance": [];
  "allowance-sufficient": [bigint];
  "approving-tokens": [bigint];
  "user-signed-approval": [Hash];
  "user-signing-approval-error": [Error];
  "approval-transaction-succeeded": [TransactionReceipt];
  "approval-transaction-reverted": [TransactionReceipt];
  "approval-transaction-failed": [Error];
  "pre-mint": [];
  "user-signed-mint": [Hash];
  "user-signing-mint-error": [Error];
  "minting-transaction-succeeded": [TransactionReceipt];
  "minting-transaction-reverted": [TransactionReceipt];
  "minting-transaction-failed": [Error];
  "mint-complete": [bigint];
  "unexpected-error": [Error];
};
