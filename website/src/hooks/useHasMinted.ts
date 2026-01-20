import { hasMinted } from "@hemilabs/hemi-tattoos-minter/actions";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useHemiClient } from "./useHemiClient";

export const hasMintedQueryKey = (
  address: string | undefined,
  chainId: number | undefined,
) => ["hasMinted", address, chainId];

export function useHasMinted() {
  const { address } = useAccount();
  const client = useHemiClient();

  return useQuery({
    enabled: !!client && !!address,
    // @ts-expect-error viem's inference is off here
    queryFn: () => hasMinted(client, address),
    queryKey: hasMintedQueryKey(address, client?.chain?.id),
  });
}
