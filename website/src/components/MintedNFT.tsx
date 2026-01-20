import type { MintTier } from "../types";

type Props = {
  imageDataUri: string;
  tier: MintTier;
  tokenId: bigint;
};

export function MintedNFT({ tokenId, tier, imageDataUri }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* NFT Image */}
      <div className="flex justify-center">
        <img
          src={imageDataUri}
          alt={`Hemi Tattoo #${tokenId.toString()}`}
          className="w-full max-w-lg rounded-lg shadow-lg"
        />
      </div>

      {/* Token Information */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          Hemi Tattoo #{tokenId.toString()} (Tier {tier})
        </h2>
      </div>
    </div>
  );
}
