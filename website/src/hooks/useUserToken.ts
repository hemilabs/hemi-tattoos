import { getUserToken } from "@hemilabs/hemi-tattoos-minter/actions";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useHemiClient } from "./useHemiClient";

export const userTokenQueryKey = (
  address: string | undefined,
  chainId: number | undefined,
) => ["userToken", address, chainId];

export function useUserToken() {
  const { address } = useAccount();
  const client = useHemiClient();

  return useQuery({
    enabled: !!client && !!address,
    // @ts-expect-error viem's inference is off here
    queryFn: () => getUserToken(client, address),
    queryKey: userTokenQueryKey(address, client?.chain?.id),
  });
}
