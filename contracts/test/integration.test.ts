import { expect } from "chai";
import hre from "hardhat";

import type { HemiTattoos, MockERC20 } from "../typechain-types";

describe("HemiTattoos Integration Tests", function () {
  let hemiTattoos: HemiTattoos;
  let hbUSD: MockERC20;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  const TIER1_PRICE = hre.ethers.parseEther("100");
  const TIER2_PRICE = hre.ethers.parseEther("10");

  before(async function () {
    [owner, user1, user2, user3] = await hre.ethers.getSigners();

    // Deploy mock hbUSD token
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    hbUSD = (await MockERC20.deploy()) as unknown as MockERC20;
    await hbUSD.waitForDeployment();

    // Mint hbUSD to users
    await hbUSD.mint(user1.address, hre.ethers.parseEther("1000"));
    await hbUSD.mint(user2.address, hre.ethers.parseEther("1000"));
    await hbUSD.mint(user3.address, hre.ethers.parseEther("50"));

    // Read base64-encoded images (use small test data for speed)
    const tier1Image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const tier2Image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    // Deploy HemiTattoos contract
    const HemiTattoos = await hre.ethers.getContractFactory("HemiTattoos");
    hemiTattoos = (await HemiTattoos.deploy(
      await hbUSD.getAddress(),
      tier1Image,
      tier2Image,
    )) as unknown as HemiTattoos;
    await hemiTattoos.waitForDeployment();

    console.log(
      `    HemiTattoos deployed to: ${await hemiTattoos.getAddress()}`,
    );
    console.log(`    hbUSD deployed to: ${await hbUSD.getAddress()}`);
  });

  describe("Deployment", function () {
    it("Should set the correct hbUSD address", async function () {
      expect(await hemiTattoos.hbUSD()).to.equal(await hbUSD.getAddress());
    });

    it("Should have correct token name and symbol", async function () {
      expect(await hemiTattoos.name()).to.equal("Hemi Tattoos");
      expect(await hemiTattoos.symbol()).to.equal("HEMITATT");
    });

    it("Should have correct tier prices", async function () {
      expect(await hemiTattoos.TIER1_PRICE()).to.equal(TIER1_PRICE);
      expect(await hemiTattoos.TIER2_PRICE()).to.equal(TIER2_PRICE);
    });
  });

  describe("Tier 1 Minting", function () {
    it("Should mint Tier 1 NFT successfully", async function () {
      // Approve hbUSD spending
      await hbUSD
        .connect(user1)
        .approve(await hemiTattoos.getAddress(), TIER1_PRICE);

      // Mint Tier 1
      const tx = await hemiTattoos.connect(user1).mintTier1();
      const receipt = await tx.wait();

      // Verify minting
      expect(await hemiTattoos.ownerOf(1)).to.equal(user1.address);
      expect(await hemiTattoos.tokenTier(1)).to.equal(1);
      expect(await hemiTattoos.hasMinted(user1.address)).to.be.true;

      // Verify payment
      const contractBalance = await hbUSD.balanceOf(
        await hemiTattoos.getAddress(),
      );
      expect(contractBalance).to.equal(TIER1_PRICE);

      // Verify Locked event
      const events = receipt?.logs.filter((log: any) => {
        try {
          const parsed = hemiTattoos.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          return parsed?.name === "Locked";
        } catch {
          return false;
        }
      });
      expect(events).to.have.lengthOf(1);
    });

    it("Should generate valid metadata for Tier 1", async function () {
      const tokenURI = await hemiTattoos.tokenURI(1);
      expect(tokenURI).to.include("data:application/json;base64,");

      // Decode and verify JSON structure
      const base64Data = tokenURI.split("data:application/json;base64,")[1];
      const jsonString = Buffer.from(base64Data, "base64").toString("utf8");
      const metadata = JSON.parse(jsonString);

      expect(metadata.name).to.equal("Hemi Tattoo #1");
      expect(metadata.description).to.equal("A soul-bound Hemi Tattoo NFT");
      expect(metadata.image).to.include("data:image/png;base64,");
    });

    it("Should prevent double minting", async function () {
      await expect(
        hemiTattoos.connect(user1).mintTier1(),
      ).to.be.revertedWithCustomError(hemiTattoos, "AlreadyMinted");
    });
  });

  describe("Tier 2 Minting", function () {
    it("Should mint Tier 2 NFT successfully", async function () {
      // Approve hbUSD spending
      await hbUSD
        .connect(user2)
        .approve(await hemiTattoos.getAddress(), TIER2_PRICE);

      // Mint Tier 2
      await hemiTattoos.connect(user2).mintTier2();

      // Verify minting
      expect(await hemiTattoos.ownerOf(2)).to.equal(user2.address);
      expect(await hemiTattoos.tokenTier(2)).to.equal(2);
      expect(await hemiTattoos.hasMinted(user2.address)).to.be.true;

      // Verify total contract balance
      const contractBalance = await hbUSD.balanceOf(
        await hemiTattoos.getAddress(),
      );
      expect(contractBalance).to.equal(TIER1_PRICE + TIER2_PRICE);
    });

    it("Should generate valid metadata for Tier 2", async function () {
      const tokenURI = await hemiTattoos.tokenURI(2);
      expect(tokenURI).to.include("data:application/json;base64,");

      const base64Data = tokenURI.split("data:application/json;base64,")[1];
      const jsonString = Buffer.from(base64Data, "base64").toString("utf8");
      const metadata = JSON.parse(jsonString);

      expect(metadata.name).to.equal("Hemi Tattoo #2");
      expect(metadata.description).to.equal("A soul-bound Hemi Tattoo NFT");
      expect(metadata.image).to.include("data:image/png;base64,");
    });
  });

  describe("Cross-Tier Minting Prevention", function () {
  it("Should prevent minting Tier 2 after minting Tier 1", async function () {
    const user = (await hre.ethers.getSigners())[4];
    await hbUSD.mint(user.address, hre.ethers.parseEther("1000"));
    await hbUSD.connect(user).approve(await hemiTattoos.getAddress(), TIER1_PRICE);
    await hemiTattoos.connect(user).mintTier1();
    await hbUSD.connect(user).approve(await hemiTattoos.getAddress(), TIER2_PRICE);
    await expect(hemiTattoos.connect(user).mintTier2()).to.be.revertedWithCustomError(hemiTattoos, "AlreadyMinted");
  });

  it("Should prevent minting Tier 1 after minting Tier 2", async function () {
    const user = (await hre.ethers.getSigners())[5];
    await hbUSD.mint(user.address, hre.ethers.parseEther("1000"));
    await hbUSD.connect(user).approve(await hemiTattoos.getAddress(), TIER2_PRICE);
    await hemiTattoos.connect(user).mintTier2();
    await hbUSD.connect(user).approve(await hemiTattoos.getAddress(), TIER1_PRICE);
    await expect(hemiTattoos.connect(user).mintTier1()).to.be.revertedWithCustomError(hemiTattoos, "AlreadyMinted");
  });
});

describe("Soul-Bound Functionality", function () {
    it("Should return true for locked()", async function () {
      expect(await hemiTattoos.locked(1)).to.be.true;
      expect(await hemiTattoos.locked(2)).to.be.true;
    });

    it("Should block transferFrom", async function () {
      await expect(
        hemiTattoos
          .connect(user1)
          .transferFrom(user1.address, user3.address, 1),
      ).to.be.revertedWithCustomError(hemiTattoos, "TransferNotAllowed");
    });

    it("Should block safeTransferFrom", async function () {
      await expect(
        hemiTattoos
          .connect(user1)
          [
            "safeTransferFrom(address,address,uint256)"
          ](user1.address, user3.address, 1),
      ).to.be.revertedWithCustomError(hemiTattoos, "TransferNotAllowed");
    });

    it("Should block approve", async function () {
      await expect(
        hemiTattoos.connect(user1).approve(user3.address, 1),
      ).to.be.revertedWithCustomError(hemiTattoos, "TransferNotAllowed");
    });

    it("Should block setApprovalForAll", async function () {
      await expect(
        hemiTattoos.connect(user1).setApprovalForAll(user3.address, true),
      ).to.be.revertedWithCustomError(hemiTattoos, "TransferNotAllowed");
    });

    it("Should return address(0) for getApproved", async function () {
      expect(await hemiTattoos.getApproved(1)).to.equal(hre.ethers.ZeroAddress);
    });

    it("Should return false for isApprovedForAll", async function () {
      expect(await hemiTattoos.isApprovedForAll(user1.address, user3.address))
        .to.be.false;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      expect(await hemiTattoos.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      expect(await hemiTattoos.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("Should support ERC5192 interface", async function () {
      expect(await hemiTattoos.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("Should support ERC165 interface", async function () {
      expect(await hemiTattoos.supportsInterface("0x01ffc9a7")).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should revert on insufficient balance", async function () {
      // user3 has only 50 hbUSD, cannot mint Tier 1 (100 hbUSD)
      await hbUSD
        .connect(user3)
        .approve(await hemiTattoos.getAddress(), TIER1_PRICE);
      await expect(hemiTattoos.connect(user3).mintTier1()).to.be.reverted;
    });

    it("Should revert on insufficient approval", async function () {
      // Reset allowance
      const user4 = (await hre.ethers.getSigners())[4];
      await hbUSD.mint(user4.address, hre.ethers.parseEther("1000"));
      await hbUSD
        .connect(user4)
        .approve(await hemiTattoos.getAddress(), hre.ethers.parseEther("50"));

      await expect(hemiTattoos.connect(user4).mintTier1()).to.be.reverted;
    });

    it("Should revert tokenURI for nonexistent token", async function () {
      await expect(hemiTattoos.tokenURI(999)).to.be.reverted;
    });

    it("Should revert locked for nonexistent token", async function () {
      await expect(hemiTattoos.locked(999)).to.be.reverted;
    });
  });
});
