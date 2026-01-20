import type { MintTier } from "../types";

type TierCardProps = {
  tier: MintTier;
  price: string;
  symbol: string | undefined;
  onMint: () => void;
  disabled: boolean;
  disabledReason?: string;
  loading: boolean;
};

export function TierCard({
  tier,
  price,
  symbol,
  onMint,
  disabled,
  disabledReason,
  loading,
}: TierCardProps) {
  return (
    <div className="border border-gray-300 rounded-lg p-6 flex flex-col gap-4 bg-white shadow-sm">
      <h3 className="text-2xl font-bold text-gray-900">Tier {tier}</h3>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-4xl font-bold text-gray-900">
          {price} {symbol}
        </p>
      </div>

      <button
        onClick={onMint}
        disabled={disabled || loading}
        className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 disabled:hover:bg-blue-600"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Checking...
          </span>
        ) : disabledReason ? (
          disabledReason
        ) : (
          `Mint Tier ${tier} NFT`
        )}
      </button>
    </div>
  );
}
