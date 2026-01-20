import { getTokenMetadata } from "@hemilabs/hemi-tattoos-minter/actions";
import { useQuery } from "@tanstack/react-query";

import { useHemiClient } from "./useHemiClient";

export function useTokenMetadata(tokenId: bigint | undefined | null) {
  const client = useHemiClient();

  return useQuery({
    queryKey: ["tokenMetadata", tokenId?.toString()],
    // @ts-expect-error viem's inference is off here
    queryFn: async () => getTokenMetadata(client, tokenId),
    enabled: !!client && tokenId !== null && tokenId !== undefined,
  });
}
