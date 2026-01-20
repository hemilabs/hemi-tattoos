import { useQuery } from "@tanstack/react-query";
import type { Chain } from "viem";
import { balanceOf } from "viem-erc20/actions";
import { useAccount } from "wagmi";

import { useHemiClient } from "./useHemiClient";

export const useTokenBalance = function ({
  chainId,
  tokenAddress,
}: {
  chainId: Chain["id"];
  tokenAddress: string;
}) {
  const { address } = useAccount();
  const client = useHemiClient();
  return useQuery({
    queryKey: ["token-balance", chainId, tokenAddress, address],
    enabled: !!address,
    queryFn: () =>
      // @ts-expect-error viem's inference is off here
      balanceOf(client, { account: address!, address: tokenAddress }),
  });
};
