import { TransactionReceipt, zeroAddress, zeroHash } from "viem";
import { hemiSepolia } from "viem/chains";
import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { allowance, approve } from "viem-erc20/actions";
import { describe, expect, it, vi } from "vitest";

import { mintTier1, mintTier2 } from "../../../src/actions/wallet/mint";
import { TIER1_PRICE, TIER2_PRICE } from "../../../src/constants";

vi.mock("viem/actions", () => ({
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
}));

vi.mock("viem-erc20/actions", () => ({
  allowance: vi.fn(),
  approve: vi.fn(),
}));

const validWalletClient = {
  chain: hemiSepolia,
} as any;

describe("mintTier1", function () {
  it('should emit "unexpected-error" if wallet client has no chain', async function () {
    const { emitter, promise } = mintTier1({
      walletClient: {} as any,
      account: zeroAddress,
    });

    const unexpectedError = vi.fn();
    emitter.on("unexpected-error", unexpectedError);

    await promise;

    expect(unexpectedError).toHaveBeenCalledExactlyOnceWith(
      new Error("Chain ID not available from wallet client"),
    );
  });

  it("should approve tokens and mint when allowance is insufficient", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(0));
    vi.mocked(approve).mockResolvedValue(zeroHash);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt)
      // approve
      .mockResolvedValueOnce({ status: "success" } as TransactionReceipt)
      // mint
      .mockResolvedValueOnce({
        status: "success",
        logs: [
          {
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event
              "0x0000000000000000000000000000000000000000000000000000000000000000", // from zero address
              "0x0000000000000000000000000000000000000000000000000000000000000000", // to zeroAddress
              "0x0000000000000000000000000000000000000000000000000000000000000001", // tokenId = 1
            ],
          },
        ],
      } as TransactionReceipt);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const checkingAllowance = vi.fn();
    const approvingTokens = vi.fn();
    const userSignedApproval = vi.fn();
    const approvalTransactionSucceeded = vi.fn();
    const preMint = vi.fn();
    const userSignedMint = vi.fn();
    const mintingTransactionSucceeded = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("checking-allowance", checkingAllowance);
    emitter.on("approving-tokens", approvingTokens);
    emitter.on("user-signed-approval", userSignedApproval);
    emitter.on("approval-transaction-succeeded", approvalTransactionSucceeded);
    emitter.on("pre-mint", preMint);
    emitter.on("user-signed-mint", userSignedMint);
    emitter.on("minting-transaction-succeeded", mintingTransactionSucceeded);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(checkingAllowance).toHaveBeenCalledOnce();
    expect(approvingTokens).toHaveBeenCalledWith(TIER1_PRICE);
    expect(userSignedApproval).toHaveBeenCalledWith(zeroHash);
    expect(approvalTransactionSucceeded).toHaveBeenCalledOnce();
    expect(preMint).toHaveBeenCalledOnce();
    expect(userSignedMint).toHaveBeenCalledWith(zeroHash);
    expect(mintingTransactionSucceeded).toHaveBeenCalledOnce();
    expect(mintComplete).toHaveBeenCalledWith(BigInt(1));

    expect(approve).toHaveBeenCalledWith(
      validWalletClient,
      expect.objectContaining({
        amount: TIER1_PRICE,
      }),
    );

    expect(writeContract).toHaveBeenCalledWith(
      validWalletClient,
      expect.objectContaining({
        functionName: "mintTier1",
        account: zeroAddress,
      }),
    );
  });

  it("should skip approval if allowance is sufficient", async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE + BigInt(1));
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce({
      status: "success",
      logs: [
        {
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000002",
          ],
        },
      ],
    } as TransactionReceipt);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const allowanceSufficient = vi.fn();
    const approvingTokens = vi.fn();
    const preMint = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("allowance-sufficient", allowanceSufficient);
    emitter.on("approving-tokens", approvingTokens);
    emitter.on("pre-mint", preMint);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(allowanceSufficient).toHaveBeenCalledWith(TIER1_PRICE + BigInt(1));
    expect(approvingTokens).not.toHaveBeenCalled();
    expect(approve).not.toHaveBeenCalled();
    expect(preMint).toHaveBeenCalledOnce();
    expect(mintComplete).toHaveBeenCalledWith(BigInt(2));
  });

  it("should handle user rejecting approval", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(0));
    vi.mocked(approve).mockRejectedValue(new Error("User rejected"));

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const userSigningApprovalError = vi.fn();
    const preMint = vi.fn();

    emitter.on("user-signing-approval-error", userSigningApprovalError);
    emitter.on("pre-mint", preMint);

    await promise;

    expect(userSigningApprovalError).toHaveBeenCalledOnce();
    expect(preMint).not.toHaveBeenCalled();
  });

  it("should handle approval transaction failure", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(0));
    vi.mocked(approve).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockRejectedValue(
      new Error("Transaction failed"),
    );

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const approvalTransactionFailed = vi.fn();
    const preMint = vi.fn();

    emitter.on("approval-transaction-failed", approvalTransactionFailed);
    emitter.on("pre-mint", preMint);

    await promise;

    expect(approvalTransactionFailed).toHaveBeenCalledOnce();
    expect(preMint).not.toHaveBeenCalled();
  });

  it("should handle approval transaction reverted", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(0));
    vi.mocked(approve).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({
      status: "reverted",
    } as TransactionReceipt);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const approvalTransactionReverted = vi.fn();
    const approvalTransactionSucceeded = vi.fn();
    const preMint = vi.fn();

    emitter.on("approval-transaction-reverted", approvalTransactionReverted);
    emitter.on("approval-transaction-succeeded", approvalTransactionSucceeded);
    emitter.on("pre-mint", preMint);

    await promise;

    expect(approvalTransactionReverted).toHaveBeenCalledOnce();
    expect(approvalTransactionSucceeded).not.toHaveBeenCalled();
    expect(preMint).not.toHaveBeenCalled();
  });

  it("should handle user rejecting mint", async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE);
    vi.mocked(writeContract).mockRejectedValue(new Error("User rejected"));

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const userSigningMintError = vi.fn();
    const mintingTransactionSucceeded = vi.fn();

    emitter.on("user-signing-mint-error", userSigningMintError);
    emitter.on("minting-transaction-succeeded", mintingTransactionSucceeded);

    await promise;

    expect(userSigningMintError).toHaveBeenCalledOnce();
    expect(mintingTransactionSucceeded).not.toHaveBeenCalled();
  });

  it("should handle minting transaction failure", async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockRejectedValue(
      new Error("Transaction failed"),
    );

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const mintingTransactionFailed = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("minting-transaction-failed", mintingTransactionFailed);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(mintingTransactionFailed).toHaveBeenCalledOnce();
    expect(mintComplete).not.toHaveBeenCalled();
  });

  it("should handle minting transaction reverted", async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({
      status: "reverted",
    } as TransactionReceipt);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const mintingTransactionReverted = vi.fn();
    const mintingTransactionSucceeded = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("minting-transaction-reverted", mintingTransactionReverted);
    emitter.on("minting-transaction-succeeded", mintingTransactionSucceeded);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(mintingTransactionReverted).toHaveBeenCalledOnce();
    expect(mintingTransactionSucceeded).not.toHaveBeenCalled();
    expect(mintComplete).not.toHaveBeenCalled();
  });

  it('should emit "unexpected-error" if token ID cannot be extracted', async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({
      status: "success",
      logs: [],
    } as TransactionReceipt);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const unexpectedError = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("unexpected-error", unexpectedError);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(unexpectedError).toHaveBeenCalledExactlyOnceWith(
      new Error("Failed to extract token ID from mint transaction"),
    );
    expect(mintComplete).not.toHaveBeenCalled();
  });

  it('should emit "unexpected-error" if Transfer event has no tokenId', async function () {
    vi.mocked(allowance).mockResolvedValue(TIER1_PRICE);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({
      status: "success",
      logs: [
        {
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            // Missing tokenId (topics[3])
          ],
        },
      ],
    } as any);

    const { emitter, promise } = mintTier1({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const unexpectedError = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("unexpected-error", unexpectedError);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(unexpectedError).toHaveBeenCalledExactlyOnceWith(
      new Error("Failed to extract token ID from mint transaction"),
    );
    expect(mintComplete).not.toHaveBeenCalled();
  });
});

describe("mintTier2", function () {
  it("should approve tokens and mint tier 2 when allowance is insufficient", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(0));
    vi.mocked(approve).mockResolvedValue(zeroHash);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt)
      // approval
      .mockResolvedValueOnce({ status: "success" })
      // minting
      .mockResolvedValueOnce({
        status: "success",
        logs: [
          {
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000000000000000000000000005",
            ],
          },
        ],
      } as any);

    const { emitter, promise } = mintTier2({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const approvingTokens = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("approving-tokens", approvingTokens);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(approvingTokens).toHaveBeenCalledWith(TIER2_PRICE);
    expect(mintComplete).toHaveBeenCalledWith(BigInt(5));

    expect(approve).toHaveBeenCalledWith(
      validWalletClient,
      expect.objectContaining({
        amount: TIER2_PRICE,
      }),
    );

    expect(writeContract).toHaveBeenCalledWith(
      validWalletClient,
      expect.objectContaining({
        functionName: "mintTier2",
        account: zeroAddress,
      }),
    );
  });

  it("should skip approval if allowance is sufficient for tier 2", async function () {
    vi.mocked(allowance).mockResolvedValue(TIER2_PRICE + BigInt(1));
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({
      status: "success",
      logs: [
        {
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000006",
          ],
        },
      ],
    } as any);

    const { emitter, promise } = mintTier2({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const allowanceSufficient = vi.fn();
    const approvingTokens = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("allowance-sufficient", allowanceSufficient);
    emitter.on("approving-tokens", approvingTokens);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(allowanceSufficient).toHaveBeenCalledWith(TIER2_PRICE + BigInt(1));
    expect(approvingTokens).not.toHaveBeenCalled();
    expect(approve).not.toHaveBeenCalled();
    expect(mintComplete).toHaveBeenCalledWith(BigInt(6));
  });

  it("should handle complete approval flow for tier 2", async function () {
    vi.mocked(allowance).mockResolvedValue(BigInt(5));
    vi.mocked(approve).mockResolvedValue(zeroHash);
    vi.mocked(writeContract).mockResolvedValue(zeroHash);
    vi.mocked(waitForTransactionReceipt)
      .mockResolvedValueOnce({
        status: "success",
      } as any)
      .mockResolvedValueOnce({
        status: "success",
        logs: [
          {
            topics: [
              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000000000000000000000000007",
            ],
          },
        ],
      } as any);

    const { emitter, promise } = mintTier2({
      walletClient: validWalletClient,
      account: zeroAddress,
    });

    const userSignedApproval = vi.fn();
    const approvalTransactionSucceeded = vi.fn();
    const userSignedMint = vi.fn();
    const mintingTransactionSucceeded = vi.fn();
    const mintComplete = vi.fn();

    emitter.on("user-signed-approval", userSignedApproval);
    emitter.on("approval-transaction-succeeded", approvalTransactionSucceeded);
    emitter.on("user-signed-mint", userSignedMint);
    emitter.on("minting-transaction-succeeded", mintingTransactionSucceeded);
    emitter.on("mint-complete", mintComplete);

    await promise;

    expect(userSignedApproval).toHaveBeenCalledWith(zeroHash);
    expect(approvalTransactionSucceeded).toHaveBeenCalled();
    expect(userSignedMint).toHaveBeenCalledWith(zeroHash);
    expect(mintingTransactionSucceeded).toHaveBeenCalled();
    expect(mintComplete).toHaveBeenCalledWith(BigInt(7));
  });
});
