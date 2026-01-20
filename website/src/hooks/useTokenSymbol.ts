import { useQuery } from "@tanstack/react-query";
import { symbol } from "viem-erc20/actions";
import type { Address } from "viem";

import { useHemiClient } from "./useHemiClient";

export function useTokenSymbol(tokenAddress: Address) {
  const client = useHemiClient();

  return useQuery({
    queryKey: ["tokenSymbol", tokenAddress],
    queryFn() {
      if (!client) {
        throw new Error("Public client is not available");
      }
      return symbol(client, { address: tokenAddress });
    },
    staleTime: Infinity,
  });
}
