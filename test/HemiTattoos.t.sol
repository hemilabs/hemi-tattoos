// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {HemiTattoos} from "../src/HemiTattoos.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockERC20 is ERC20 {
  constructor() ERC20("Mock hbUSD", "hbUSD") {
    _mint(msg.sender, 1000000 * 10 ** 18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract HemiTattoosTest is Test {
  HemiTattoos public hemiTattoos;
  MockERC20 public hbUSD;

  address public user1 = address(0x1);
  address public user2 = address(0x2);
  address public user3 = address(0x3);

  string constant TIER1_IMAGE = "tier1ImageData";
  string constant TIER2_IMAGE = "tier2ImageData";

  event Locked(uint256 tokenId);

  function setUp() public {
    // Deploy mock hbUSD token
    hbUSD = new MockERC20();

    // Deploy HemiTattoos contract
    hemiTattoos = new HemiTattoos(address(hbUSD), TIER1_IMAGE, TIER2_IMAGE);

    // Mint hbUSD to users
    hbUSD.mint(user1, 1000 * 10 ** 18);
    hbUSD.mint(user2, 1000 * 10 ** 18);
    // user without enough balance
    hbUSD.mint(user3, 50 * 10 ** 18);
  }

  // ========== Constructor Tests ==========

  function testConstructorValidParameters() public view {
    assertEq(hemiTattoos.hbUSD(), address(hbUSD));
    assertEq(hemiTattoos.name(), "Hemi Tattoos");
    assertEq(hemiTattoos.symbol(), "HEMITATT");
  }

  function testConstructorRevertsZeroAddressHbUSD() public {
    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.InvalidHbUSDAddress.selector)
    );
    new HemiTattoos(address(0), TIER1_IMAGE, TIER2_IMAGE);
  }

  function testConstructorRevertsEmptyTier1Image() public {
    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.Tier1ImageRequired.selector)
    );
    new HemiTattoos(address(hbUSD), "", TIER2_IMAGE);
  }

  function testConstructorRevertsEmptyTier2Image() public {
    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.Tier2ImageRequired.selector)
    );
    new HemiTattoos(address(hbUSD), TIER1_IMAGE, "");
  }

  // ========== Minting Tests ==========

  function testMintTier1Success() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);

    vm.expectEmit(true, true, true, true);
    emit Locked(1);

    uint256 tokenId = hemiTattoos.mintTier1();

    assertEq(tokenId, 1);
    assertEq(hemiTattoos.ownerOf(1), user1);
    assertEq(hemiTattoos.tokenTier(1), 1);
    assertTrue(hemiTattoos.hasMinted(user1));
    assertEq(hbUSD.balanceOf(address(hemiTattoos)), 100 * 10 ** 18);
    vm.stopPrank();
  }

  function testMintTier2Success() public {
    vm.startPrank(user2);
    hbUSD.approve(address(hemiTattoos), 10 * 10 ** 18);

    vm.expectEmit(true, true, true, true);
    emit Locked(1);

    uint256 tokenId = hemiTattoos.mintTier2();

    assertEq(tokenId, 1);
    assertEq(hemiTattoos.ownerOf(1), user2);
    assertEq(hemiTattoos.tokenTier(1), 2);
    assertTrue(hemiTattoos.hasMinted(user2));
    assertEq(hbUSD.balanceOf(address(hemiTattoos)), 10 * 10 ** 18);
    vm.stopPrank();
  }

  function testSequentialTokenIds() public {
    // User1 mints Tier1
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 token1 = hemiTattoos.mintTier1();
    vm.stopPrank();

    // User2 mints Tier2
    vm.startPrank(user2);
    hbUSD.approve(address(hemiTattoos), 10 * 10 ** 18);
    uint256 token2 = hemiTattoos.mintTier2();
    vm.stopPrank();

    assertEq(token1, 1);
    assertEq(token2, 2);
  }

  function testCannotMintTwice() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 200 * 10 ** 18);
    hemiTattoos.mintTier1();

    vm.expectRevert(abi.encodeWithSelector(HemiTattoos.AlreadyMinted.selector));
    hemiTattoos.mintTier1();

    vm.expectRevert(abi.encodeWithSelector(HemiTattoos.AlreadyMinted.selector));
    hemiTattoos.mintTier2();
    vm.stopPrank();
  }

  function testMintRevertsInsufficientBalance() public {
    vm.startPrank(user3);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);

    vm.expectRevert();
    hemiTattoos.mintTier1();
    vm.stopPrank();
  }

  function testMintRevertsInsufficientApproval() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 50 * 10 ** 18);

    vm.expectRevert();
    hemiTattoos.mintTier1();
    vm.stopPrank();
  }

  // ========== Metadata Tests ==========

  function testTokenURITier1() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();
    vm.stopPrank();

    string memory uri = hemiTattoos.tokenURI(tokenId);
    assertTrue(bytes(uri).length > 0);
    // Check it starts with data URI prefix
    assertEq(bytes(uri)[0], bytes1("d"));
  }

  function testTokenURITier2() public {
    vm.startPrank(user2);
    hbUSD.approve(address(hemiTattoos), 10 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier2();
    vm.stopPrank();

    string memory uri = hemiTattoos.tokenURI(tokenId);
    assertTrue(bytes(uri).length > 0);
  }

  function testTokenURIRevertsNonexistent() public {
    vm.expectRevert();
    hemiTattoos.tokenURI(999);
  }

  // ========== Soul-Bound Tests ==========

  function testLockedReturnsTrue() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();
    vm.stopPrank();

    assertTrue(hemiTattoos.locked(tokenId));
  }

  function testLockedRevertsNonexistent() public {
    vm.expectRevert();
    hemiTattoos.locked(999);
  }

  function testTransferFromReverts() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();

    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.TransferNotAllowed.selector)
    );
    hemiTattoos.transferFrom(user1, user2, tokenId);
    vm.stopPrank();
  }

  function testSafeTransferFromReverts() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();

    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.TransferNotAllowed.selector)
    );
    hemiTattoos.safeTransferFrom(user1, user2, tokenId);
    vm.stopPrank();
  }

  function testSafeTransferFromWithDataReverts() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();

    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.TransferNotAllowed.selector)
    );
    hemiTattoos.safeTransferFrom(user1, user2, tokenId, "");
    vm.stopPrank();
  }

  function testApproveReverts() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();

    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.TransferNotAllowed.selector)
    );
    hemiTattoos.approve(user2, tokenId);
    vm.stopPrank();
  }

  function testSetApprovalForAllReverts() public {
    vm.expectRevert(
      abi.encodeWithSelector(HemiTattoos.TransferNotAllowed.selector)
    );
    hemiTattoos.setApprovalForAll(user2, true);
  }

  function testGetApprovedReturnsZero() public {
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    uint256 tokenId = hemiTattoos.mintTier1();
    vm.stopPrank();

    assertEq(hemiTattoos.getApproved(tokenId), address(0));
  }

  function testGetApprovedRevertsNonexistent() public {
    vm.expectRevert();
    hemiTattoos.getApproved(999);
  }

  function testIsApprovedForAllReturnsFalse() public {
    assertFalse(hemiTattoos.isApprovedForAll(user1, user2));
    assertFalse(hemiTattoos.isApprovedForAll(address(0), address(0)));
  }

  // ========== Interface Tests ==========

  function testSupportsERC721Interface() public view {
    assertTrue(hemiTattoos.supportsInterface(0x80ac58cd)); // ERC721
  }

  function testSupportsERC721MetadataInterface() public view {
    assertTrue(hemiTattoos.supportsInterface(0x5b5e139f)); // ERC721Metadata
  }

  function testSupportsERC5192Interface() public view {
    assertTrue(hemiTattoos.supportsInterface(0xb45a3c0e)); // ERC5192
  }

  function testSupportsERC165Interface() public view {
    assertTrue(hemiTattoos.supportsInterface(0x01ffc9a7)); // ERC165
  }

  // ========== Edge Cases ==========

  function testTokenIdZeroDoesNotExist() public {
    vm.expectRevert();
    hemiTattoos.ownerOf(0);
  }

  function testMultipleUsersCanMint() public {
    // User1 mints
    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    hemiTattoos.mintTier1();
    vm.stopPrank();

    // User2 mints
    vm.startPrank(user2);
    hbUSD.approve(address(hemiTattoos), 10 * 10 ** 18);
    hemiTattoos.mintTier2();
    vm.stopPrank();

    assertTrue(hemiTattoos.hasMinted(user1));
    assertTrue(hemiTattoos.hasMinted(user2));
    assertFalse(hemiTattoos.hasMinted(user3));
  }

  function testPaymentsAreLocked() public {
    uint256 initialBalance = hbUSD.balanceOf(address(hemiTattoos));

    vm.startPrank(user1);
    hbUSD.approve(address(hemiTattoos), 100 * 10 ** 18);
    hemiTattoos.mintTier1();
    vm.stopPrank();

    vm.startPrank(user2);
    hbUSD.approve(address(hemiTattoos), 10 * 10 ** 18);
    hemiTattoos.mintTier2();
    vm.stopPrank();

    uint256 finalBalance = hbUSD.balanceOf(address(hemiTattoos));
    assertEq(finalBalance, initialBalance + 110 * 10 ** 18);
  }
}
