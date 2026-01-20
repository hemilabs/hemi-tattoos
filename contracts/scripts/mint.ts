import hre from "hardhat";

async function main() {
  const networkName = hre.network.name;

  // Only allow on hemiSepolia
  if (networkName !== "hemiSepolia") {
    throw new Error("This script only works on hemiSepolia network");
  }

  // Get mnemonic from environment
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Please set MNEMONIC environment variable");
  }

  // Get contract address from environment or command line
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS environment variable");
  }

  console.log(`Minting Tier 1 NFT on ${networkName}`);
  console.log(`Contract address: ${contractAddress}`);

  // Create signer from mnemonic
  const provider = hre.ethers.provider;
  const signer = hre.ethers.Wallet.fromPhrase(mnemonic, provider);
  console.log(`Signer address: ${signer.address}`);

  // Get contract instance
  const HemiTattoos = await hre.ethers.getContractAt(
    "HemiTattoos",
    contractAddress,
    signer,
  );

  // Get hbUSD address from contract
  const hbUSDAddress = await HemiTattoos.hbUSD();
  console.log(`hbUSD address: ${hbUSDAddress}`);

  // Get hbUSD token contract
  const hbUSD = await hre.ethers.getContractAt("IERC20", hbUSDAddress, signer);

  // Check balance
  const balance = await hbUSD.balanceOf(signer.address);
  const requiredAmount = await HemiTattoos.TIER1_PRICE();
  console.log(`Required amount: ${hre.ethers.formatEther(requiredAmount)} MKT`);
  console.log(`Your balance: ${hre.ethers.formatEther(balance)} MKT`);

  if (balance < requiredAmount) {
    throw new Error("Insufficient MKT balance");
  }

  // Check if already minted
  const hasMinted = await HemiTattoos.hasMinted(signer.address);
  if (hasMinted) {
    throw new Error("Address has already minted an NFT");
  }

  // Approve spending
  console.log("Approving MKT spending...");
  const approveTx = await hbUSD.approve(contractAddress, requiredAmount);
  await approveTx.wait();
  console.log("✅ Approval successful");

  // Mint Tier 1
  console.log("Minting Tier 1 NFT...");
  const mintTx = await HemiTattoos.mintTier1();
  const receipt = await mintTx.wait();
  console.log("✅ Mint successful");

  // Get token ID from events
  const mintEvent = receipt.logs.find((log) => {
    try {
      const parsed = HemiTattoos.interface.parseLog(log);
      return parsed.name === "Transfer";
    } catch {
      return false;
    }
  });
  if (mintEvent) {
    const parsed = HemiTattoos.interface.parseLog(mintEvent);
    const tokenId = parsed.args.tokenId;
    console.log(`Minted token ID: ${tokenId}`);
  }

  console.log("🎉 Minting completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
