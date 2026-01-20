import {
  getHbUSDAddress,
  type TokenMetadata,
} from "@hemilabs/hemi-tattoos-minter";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";

import { TierCard } from "./components/TierCard";
import { MintedNFT } from "./components/MintedNFT";
import { LoadingModal } from "./components/LoadingModal";
import { ErrorModal } from "./components/ErrorModal";
import { ChainSelector } from "./components/ChainSelector";
import { useTokenMetadata } from "./hooks/useTokenMetadata";
import { useUserToken } from "./hooks/useUserToken";
import { useMint, type MintStatus } from "./hooks/useMint";
import { useTokenSymbol } from "./hooks/useTokenSymbol";
import { useSelectedChain } from "./hooks/useSelectedChain";
import type { MintTier } from "./types";
import { useHasMinted } from "./hooks/useHasMinted";
import { useTokenBalance } from "./hooks/useTokenBalance";

const TIER1_PRICE = "100";
const TIER2_PRICE = "10";

function App() {
  const { isConnected } = useAccount();
  const hemiChain = useSelectedChain();

  const [mintStatus, setMintStatus] = useState<MintStatus>("IDLE");
  const [error, setError] = useState<{
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  // Get hbUSD address for current chain
  const hbUSDAddress = getHbUSDAddress(hemiChain.id);

  // Fetch token symbol
  const { data: tokenSymbol } = useTokenSymbol(hbUSDAddress);

  // Check if user has minted
  const { data: hasMintedNFT, isLoading: isCheckingMinted } = useHasMinted();
  const { data: userTokenId } = useUserToken();
  const { data: tokenMetadata } = useTokenMetadata(userTokenId);

  // Get user's hbUSD balance
  const { data: balance, isLoading: isLoadingBalance } = useTokenBalance({
    chainId: hemiChain.id,
    tokenAddress: hbUSDAddress,
  });

  // Mint mutations
  const tier1Mint = useMint({
    tier: 1,
    onStatusChange: setMintStatus,
  });

  const tier2Mint = useMint({
    tier: 2,
    onStatusChange: setMintStatus,
  });

  // Handle mint button click
  const handleMint = (tier: MintTier) => {
    setError(null);

    const mutation = tier === 1 ? tier1Mint : tier2Mint;

    mutation.mutate(undefined, {
      onError: (error) => {
        setMintStatus("ERROR");

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("rejected")) {
          // User rejected transaction - just close modal
          setMintStatus("IDLE");
          return;
        }

        // Show error modal for other errors
        setError({
          title: "Transaction Failed",
          message: "The transaction could not be completed.",
          details: errorMessage,
        });
      },
      onSuccess: () => {
        setMintStatus("IDLE");
      },
    });
  };

  // Calculate if user has sufficient balance
  const tier1Sufficient = balance ? balance >= parseEther(TIER1_PRICE) : false;
  const tier2Sufficient = balance ? balance >= parseEther(TIER2_PRICE) : false;

  const tier1DisabledReason = !tier1Sufficient
    ? `Insufficient ${tokenSymbol} Balance - Need ${(Number(TIER1_PRICE) - Number(balance || 0)).toFixed(1)} more`
    : undefined;

  const tier2DisabledReason = !tier2Sufficient
    ? `Insufficient ${tokenSymbol} Balance - Need ${(Number(TIER2_PRICE) - Number(balance || 0)).toFixed(1)} more`
    : undefined;

  // Format balance for display
  const formattedBalance = balance
    ? `${Number(balance).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${tokenSymbol}`
    : undefined;

  // Loading modal message
  const loadingMessage =
    mintStatus === "APPROVING"
      ? `Approving ${tokenSymbol}...`
      : "Minting NFT...";

  // Determine tier from token metadata
  const getTierFromMetadata = (metadata: TokenMetadata) =>
    (metadata.attributes.find((a) => a.trait_type === "tier")?.value ??
      1) as MintTier;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Hemi Tattoos</h1>
            <div className="flex items-center gap-3">
              <ChainSelector />
              <ConnectButton chainStatus="none" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Show balance if connected and not minted */}
        {isConnected && !hasMintedNFT && formattedBalance && (
          <div className="mb-8 text-center">
            <p className="text-lg text-gray-700">
              Your Balance:{" "}
              <span className="font-semibold">{formattedBalance}</span>
            </p>
          </div>
        )}

        {/* State 1: Disconnected */}
        {!isConnected && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Your Wallet to Mint
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your wallet to mint your soul-bound Hemi Tattoo NFT
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto opacity-50 pointer-events-none">
              <TierCard
                tier={1}
                price={TIER1_PRICE}
                symbol={tokenSymbol}
                onMint={() => {}}
                disabled={true}
                loading={false}
              />
              <TierCard
                tier={2}
                price={TIER2_PRICE}
                symbol={tokenSymbol}
                onMint={() => {}}
                disabled={true}
                loading={false}
              />
            </div>
          </div>
        )}

        {/* State 2: Connected but not minted */}
        {isConnected && !hasMintedNFT && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Select Your Tier
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <TierCard
                tier={1}
                price={TIER1_PRICE}
                symbol={tokenSymbol}
                onMint={() => handleMint(1)}
                disabled={
                  !tier1Sufficient || isCheckingMinted || isLoadingBalance
                }
                disabledReason={tier1DisabledReason}
                loading={isCheckingMinted || isLoadingBalance}
              />
              <TierCard
                tier={2}
                price={TIER2_PRICE}
                symbol={tokenSymbol}
                onMint={() => handleMint(2)}
                disabled={
                  !tier2Sufficient || isCheckingMinted || isLoadingBalance
                }
                disabledReason={tier2DisabledReason}
                loading={isCheckingMinted || isLoadingBalance}
              />
            </div>
          </div>
        )}

        {/* State 3: Connected and already minted */}
        {isConnected && hasMintedNFT && !!userTokenId && tokenMetadata && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Your Hemi Tattoo
            </h2>
            <MintedNFT
              imageDataUri={tokenMetadata.image}
              tokenId={userTokenId}
              tier={getTierFromMetadata(tokenMetadata)}
            />
          </div>
        )}
      </main>

      {/* Loading Modal */}
      {(mintStatus === "APPROVING" || mintStatus === "MINTING") && (
        <LoadingModal message={loadingMessage} />
      )}

      {/* Error Modal */}
      {error && (
        <ErrorModal
          title={error.title}
          message={error.message}
          details={error.details}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}

export default App;
