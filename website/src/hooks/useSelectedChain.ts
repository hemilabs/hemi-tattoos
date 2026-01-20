import { hemi, hemiSepolia } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

import { useChainQueryState } from "./useChainQueryState";

export function useSelectedChain(): Chain {
  const [chainName] = useChainQueryState();
  return chainName === "hemi" ? hemi : hemiSepolia;
}
