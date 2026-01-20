import { usePublicClient } from "wagmi";

import { useSelectedChain } from "./useSelectedChain";

export const useHemiClient = function () {
  const hemiChain = useSelectedChain();
  return usePublicClient({ chainId: hemiChain.id });
};
