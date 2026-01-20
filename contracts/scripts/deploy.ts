import { readFileSync } from "fs";
import { join } from "path";
import hre from "hardhat";

async function main() {
  const networkName = hre.network.name;
  console.log(`Deploying to network: ${networkName}`);

  // Network configuration map
  const networkConfig = {
    hemiSepolia: {
      burnableTokenAddress: "0xbaacf81C8341c3Cb983BC48051Cc7377d2A2Eb93",
      tier1ImagePath: join(process.cwd(), "./resources/tier1_test.base64"),
      tier2ImagePath: join(process.cwd(), "./resources/tier2_test.base64"),
      symbol: "MKT",
    },
    hemi: {
      burnableTokenAddress: "0xb14646f019598bb5e48eaad28C5e692bF0496B47",
      tier1ImagePath: join(process.cwd(), "./resources/hbusd1.base64"),
      tier2ImagePath: join(process.cwd(), "./resources/hbusd2.base64"),
      symbol: "hbUSD",
    },
  };

  const config = networkConfig[networkName as keyof typeof networkConfig];
  if (!config) {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  const { burnableTokenAddress, tier1ImagePath, tier2ImagePath, symbol } =
    config;

  console.log(`Using ${symbol} address: ${burnableTokenAddress}`);

  console.log("Reading image files...");
  const tier1Image = readFileSync(tier1ImagePath, "utf8").trim();
  const tier2Image = readFileSync(tier2ImagePath, "utf8").trim();

  console.log(`Tier 1 image size: ${tier1Image.length} characters`);
  console.log(`Tier 2 image size: ${tier2Image.length} characters`);

  // Deploy HemiTattoos contract
  console.log("\nDeploying HemiTattoos contract...");
  const HemiTattoos = await hre.ethers.getContractFactory("HemiTattoos");
  const hemiTattoos = await HemiTattoos.deploy(
    burnableTokenAddress,
    tier1Image,
    tier2Image,
  );

  await hemiTattoos.waitForDeployment();
  const address = await hemiTattoos.getAddress();

  console.log(`\n✅ HemiTattoos deployed to: ${address}`);
  console.log(`\nDeployment Summary:`);
  console.log(`- Network: ${networkName}`);
  console.log(`- Contract: ${address}`);
  console.log(`- ${symbol}: ${burnableTokenAddress}`);
  console.log(`- Tier 1 Price: 100 ${symbol}`);
  console.log(`- Tier 2 Price: 10 ${symbol}`);

  // Verify contract on block explorer (if not local network)
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    await hemiTattoos.deploymentTransaction()?.wait(5);

    console.log("Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [burnableTokenAddress, tier1Image, tier2Image],
      });
      console.log("✅ Contract verified successfully");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified");
      } else {
        console.log("Verification failed:", error.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
