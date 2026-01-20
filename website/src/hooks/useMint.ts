import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWalletClient } from "wagmi";
import { mintTier1, mintTier2 } from "@hemilabs/hemi-tattoos-minter/actions";
import type { Hash } from "viem";

import { hasMintedQueryKey } from "./useHasMinted";
import { useEnsureConnectedTo } from "./useEnsureConnectedTo";
import { useSelectedChain } from "./useSelectedChain";

export type MintStatus = "IDLE" | "APPROVING" | "MINTING" | "SUCCESS" | "ERROR";

type UseMintParams = {
  tier: 1 | 2;
  onStatusChange: (status: MintStatus) => void;
  onTransactionHash?: (hash: Hash) => void;
};

export function useMint({
  tier,
  onStatusChange,
  onTransactionHash,
}: UseMintParams) {
  const { address } = useAccount();
  const ensureConnectedTo = useEnsureConnectedTo();
  const hemiChain = useSelectedChain();
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient({ chainId: hemiChain.id });

  return useMutation({
    async mutationFn() {
      if (!address || !walletClient) {
        throw new Error("Wallet not connected");
      }

      await ensureConnectedTo(hemiChain.id);

      const mintFn = tier === 1 ? mintTier1 : mintTier2;
      const { emitter, promise } = mintFn({
        account: address,
        walletClient,
      });

      emitter.on("user-signed-approval", (transactionHash: Hash) => {
        onStatusChange("APPROVING");
        onTransactionHash?.(transactionHash);
      });

      emitter.on("user-signing-approval-error", function () {
        throw new Error("User rejected approval");
      });

      emitter.on("approval-transaction-reverted", function () {
        throw new Error("Approval transaction failed");
      });

      // Listen for mint events
      emitter.on("pre-mint", () => {
        onStatusChange("MINTING");
      });

      emitter.on("user-signed-mint", (transactionHash: Hash) => {
        onStatusChange("MINTING");
        onTransactionHash?.(transactionHash);
      });

      emitter.on("user-signing-mint-error", () => {
        throw new Error("User rejected mint");
      });

      emitter.on("minting-transaction-succeeded", () => {
        onStatusChange("SUCCESS");

        queryClient.invalidateQueries({
          queryKey: hasMintedQueryKey(address, walletClient?.chain?.id),
        });

        queryClient.invalidateQueries({
          queryKey: ["userToken", address],
        });
      });

      emitter.on("minting-transaction-reverted", function () {
        throw new Error("Mint transaction failed");
      });

      return promise;
    },
  });
}
