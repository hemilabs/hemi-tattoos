import type { Chain } from "viem";
import { useAccount, useSwitchChain } from "wagmi";

export const useEnsureConnectedTo = function () {
  const { switchChainAsync } = useSwitchChain();
  const { address, chainId: evmChainId } = useAccount();

  return async function ensureConnectedTo(targetChainId: Chain["id"]) {
    if (!address) {
      throw new Error("No EVM account connected");
    }
    if (evmChainId !== targetChainId) {
      await switchChainAsync({ chainId: targetChainId });
    }
    return;
  };
};
