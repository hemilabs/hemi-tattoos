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
      expect(metadata.attributes).to.exist;
      expect(metadata.attributes).to.be.an('array');
      expect(metadata.attributes).to.have.lengthOf(1);
      expect(metadata.attributes[0]).to.deep.equal({
        trait_type: 'tier',
        value: 1
      });
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
      expect(metadata.attributes).to.exist;
      expect(metadata.attributes).to.be.an('array');
      expect(metadata.attributes[0]).to.deep.equal({
        trait_type: 'tier',
        value: 2
      });
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

    it("Should support IERC721Enumerable interface", async function () {
      expect(await hemiTattoos.supportsInterface("0x780e9d63")).to.be.true;
    });
  });

  describe("Enumerable Functionality", function () {
    it("Should track totalSupply correctly", async function () {
      // Already have 2 tokens minted from previous tests (user1 and user2)
      const currentSupply = await hemiTattoos.totalSupply();
      expect(currentSupply).to.be.greaterThan(0);

      // Mint a new token with a fresh user
      const newUser = (await hre.ethers.getSigners())[10];
      await hbUSD.mint(newUser.address, hre.ethers.parseEther("1000"));
      await hbUSD
        .connect(newUser)
        .approve(await hemiTattoos.getAddress(), TIER2_PRICE);
      await hemiTattoos.connect(newUser).mintTier2();

      // Verify totalSupply increased
      expect(await hemiTattoos.totalSupply()).to.equal(currentSupply + 1n);
    });

    it("Should enumerate all tokens with tokenByIndex", async function () {
      const totalSupply = await hemiTattoos.totalSupply();
      expect(totalSupply).to.be.greaterThan(0);

      // Enumerate all tokens
      for (let i = 0; i < Number(totalSupply); i++) {
        const tokenId = await hemiTattoos.tokenByIndex(i);
        expect(tokenId).to.be.greaterThan(0);
        // Verify token exists by checking owner
        const owner = await hemiTattoos.ownerOf(tokenId);
        expect(owner).to.not.equal(hre.ethers.ZeroAddress);
      }
    });

    it("Should revert tokenByIndex for out of bounds", async function () {
      const totalSupply = await hemiTattoos.totalSupply();
      await expect(hemiTattoos.tokenByIndex(totalSupply)).to.be.reverted;
      await expect(hemiTattoos.tokenByIndex(totalSupply + 1n)).to.be.reverted;
    });

    it("Should get user's token with tokenOfOwnerByIndex", async function () {
      // Primary use case: query token ID for a user
      const tokenId = await hemiTattoos.tokenOfOwnerByIndex(user1.address, 0);
      expect(tokenId).to.equal(1); // user1 minted token #1

      // Verify ownership
      expect(await hemiTattoos.ownerOf(tokenId)).to.equal(user1.address);

      // Verify tier
      expect(await hemiTattoos.tokenTier(tokenId)).to.equal(1);
    });

    it("Should revert tokenOfOwnerByIndex for non-owner", async function () {
      // user3 hasn't minted yet (only has 50 hbUSD, not enough for any tier)
      await expect(hemiTattoos.tokenOfOwnerByIndex(user3.address, 0)).to.be
        .reverted;
    });

    it("Should revert tokenOfOwnerByIndex for out of bounds", async function () {
      // user1 only has 1 token (at index 0), so index 1 should revert
      await expect(hemiTattoos.tokenOfOwnerByIndex(user1.address, 1)).to.be
        .reverted;
      await expect(hemiTattoos.tokenOfOwnerByIndex(user1.address, 999)).to.be
        .reverted;
    });

    it("Should enumerate tokens for multiple owners", async function () {
      // user1 has token #1 (Tier 1)
      const token1 = await hemiTattoos.tokenOfOwnerByIndex(user1.address, 0);
      expect(token1).to.equal(1);
      expect(await hemiTattoos.tokenTier(token1)).to.equal(1);

      // user2 has token #2 (Tier 2)
      const token2 = await hemiTattoos.tokenOfOwnerByIndex(user2.address, 0);
      expect(token2).to.equal(2);
      expect(await hemiTattoos.tokenTier(token2)).to.equal(2);
    });

    it("Should match balanceOf with enumeration", async function () {
      const balance = await hemiTattoos.balanceOf(user1.address);
      expect(balance).to.equal(1);

      // Should be able to enumerate exactly 'balance' number of tokens
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await hemiTattoos.tokenOfOwnerByIndex(user1.address, i);
        expect(await hemiTattoos.ownerOf(tokenId)).to.equal(user1.address);
      }

      // Next index should revert
      await expect(hemiTattoos.tokenOfOwnerByIndex(user1.address, balance)).to
        .be.reverted;
    });

    it("Should support real-world usage pattern", async function () {
      // Real-world scenario: Query if user has token and get its details
      const userAddress = user1.address;

      // Check if user has minted
      const balance = await hemiTattoos.balanceOf(userAddress);

      if (balance > 0n) {
        // Get the token ID (always at index 0 for HemiTattoos)
        const tokenId = await hemiTattoos.tokenOfOwnerByIndex(userAddress, 0);

        // Get token details
        const tier = await hemiTattoos.tokenTier(tokenId);
        const metadata = await hemiTattoos.tokenURI(tokenId);
        const isLocked = await hemiTattoos.locked(tokenId);

        // Verify all data is consistent
        expect(tokenId).to.be.greaterThan(0);
        expect(tier).to.be.oneOf([1n, 2n]);
        expect(metadata).to.include("data:application/json;base64,");
        expect(isLocked).to.be.true;

        // Verify ownership
        expect(await hemiTattoos.ownerOf(tokenId)).to.equal(userAddress);
      }
    });

    it("Should maintain enumeration after multiple mints", async function () {
      const supplyBefore = await hemiTattoos.totalSupply();

      // Mint with two new users
      const newUser1 = (await hre.ethers.getSigners())[11];
      const newUser2 = (await hre.ethers.getSigners())[12];

      await hbUSD.mint(newUser1.address, hre.ethers.parseEther("1000"));
      await hbUSD.mint(newUser2.address, hre.ethers.parseEther("1000"));

      await hbUSD
        .connect(newUser1)
        .approve(await hemiTattoos.getAddress(), TIER1_PRICE);
      await hemiTattoos.connect(newUser1).mintTier1();

      await hbUSD
        .connect(newUser2)
        .approve(await hemiTattoos.getAddress(), TIER2_PRICE);
      await hemiTattoos.connect(newUser2).mintTier2();

      // Verify supply increased
      const supplyAfter = await hemiTattoos.totalSupply();
      expect(supplyAfter).to.equal(supplyBefore + 2n);

      // Verify new users can query their tokens
      const token1 = await hemiTattoos.tokenOfOwnerByIndex(newUser1.address, 0);
      const token2 = await hemiTattoos.tokenOfOwnerByIndex(newUser2.address, 0);

      expect(await hemiTattoos.ownerOf(token1)).to.equal(newUser1.address);
      expect(await hemiTattoos.ownerOf(token2)).to.equal(newUser2.address);
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
