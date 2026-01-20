import { useQueryState, parseAsStringLiteral } from "nuqs";

type ChainName = "hemi" | "hemiSepolia";

const chainParser = parseAsStringLiteral(["hemi", "hemiSepolia"] as const);

export function useChainQueryState() {
  return useQueryState<ChainName>(
    "chain",
    chainParser.withDefault("hemiSepolia"),
  );
}
