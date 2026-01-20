// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Hemi Tattoos Soul-Bound NFT
 * @notice A non-transferable (EIP-5192) ERC-721 NFT with two purchase tiers
 * @dev Each address can mint exactly one NFT by paying hbUSD tokens
 */

// EIP-5192: Soul-bound token standard
interface IERC5192 {
  event Locked(uint256 tokenId);
  function locked(uint256 tokenId) external view returns (bool);
}

contract HemiTattoos is ERC721Enumerable, IERC5192, ReentrancyGuard {
  using Strings for uint256;
  using SafeERC20 for IERC20;

  // Custom errors
  error InvalidHbUSDAddress();
  error Tier1ImageRequired();
  error Tier2ImageRequired();
  error AlreadyMinted();
  error TransferNotAllowed();

  // Immutable configuration
  address public immutable hbUSD;
  uint256 public constant TIER1_PRICE = 100 * 10 ** 18; // 100 hbUSD (18 decimals)
  uint256 public constant TIER2_PRICE = 10 * 10 ** 18; // 10 hbUSD (18 decimals)

  // Image storage (set once in constructor)
  string private _tier1Image; // Base64 encoded PNG image
  string private _tier2Image; // Base64 encoded PNG image

  // Token tracking
  uint256 private _tokenIdCounter; // Sequential: 1, 2, 3...
  mapping(address => bool) public hasMinted; // Track if address has minted
  mapping(uint256 => uint8) public tokenTier; // Track tier for each token (1 or 2)

  /**
   * @notice Contract constructor
   * @param _hbUSD Address of the hbUSD token contract
   * @param tier1Image_ Base64 encoded PNG image for Tier 1
   * @param tier2Image_ Base64 encoded PNG image for Tier 2
   */
  constructor(
    address _hbUSD,
    string memory tier1Image_,
    string memory tier2Image_
  ) ERC721("Hemi Tattoos", "HEMITATT") {
    if (_hbUSD == address(0)) revert InvalidHbUSDAddress();
    if (bytes(tier1Image_).length == 0) revert Tier1ImageRequired();
    if (bytes(tier2Image_).length == 0) revert Tier2ImageRequired();

    hbUSD = _hbUSD;
    _tier1Image = tier1Image_;
    _tier2Image = tier2Image_;
  }

  /**
   * @dev Internal mint function shared by tier-specific mint functions
   * @param tier The tier of the NFT (1 or 2)
   * @param price The price in hbUSD tokens
   * @return tokenId The ID of the newly minted token
   */
  function _mintTier(uint8 tier, uint256 price) private returns (uint256) {
    // Check
    if (hasMinted[msg.sender]) revert AlreadyMinted();

    // Effects
    ++_tokenIdCounter;
    uint256 tokenId = _tokenIdCounter;
    hasMinted[msg.sender] = true;
    tokenTier[tokenId] = tier;
    _mint(msg.sender, tokenId);
    emit Locked(tokenId);

    // Interaction
    IERC20(hbUSD).safeTransferFrom(msg.sender, address(this), price);

    return tokenId;
  }

  /**
   * @notice Mint a Tier 1 NFT for 100 hbUSD
   * @return tokenId The ID of the newly minted token
   */
  function mintTier1() external nonReentrant returns (uint256) {
    return _mintTier(1, TIER1_PRICE);
  }

  /**
   * @notice Mint a Tier 2 NFT for 10 hbUSD
   * @return tokenId The ID of the newly minted token
   */
  function mintTier2() external nonReentrant returns (uint256) {
    return _mintTier(2, TIER2_PRICE);
  }

  /**
   * @notice Returns the token metadata URI
   * @param tokenId The ID of the token
   * @return The base64-encoded JSON metadata
   */
  function tokenURI(
    uint256 tokenId
  ) public view override returns (string memory) {
    _requireOwned(tokenId);

    // Select image based on tier
    string memory imageData = tokenTier[tokenId] == 1
      ? _tier1Image
      : _tier2Image;
    string memory fullImageUri = string(
      abi.encodePacked("data:image/png;base64,", imageData)
    );

    // Construct metadata JSON
    string memory metadata = string(
      abi.encodePacked(
        '{"name":"Hemi Tattoo #',
        tokenId.toString(),
        '","description":"A soul-bound Hemi Tattoo NFT","image":"',
        fullImageUri,
        '","attributes":[{"trait_type":"tier","value":',
        Strings.toString(tokenTier[tokenId]),
        '}]}'
      )
    );

    // Return base64-encoded metadata
    return
      string(
        abi.encodePacked(
          "data:application/json;base64,",
          Base64.encode(bytes(metadata))
        )
      );
  }

  /**
   * @notice Returns whether a token is locked (always true for soul-bound NFTs)
   * @param tokenId The ID of the token
   * @return Always returns true
   */
  function locked(uint256 tokenId) external view override returns (bool) {
    _requireOwned(tokenId);
    return true;
  }

  /**
   * @notice ERC-165 interface support
   * @param interfaceId The interface identifier
   * @return True if the interface is supported
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721Enumerable) returns (bool) {
    return
      interfaceId == type(IERC5192).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // ========== SOUL-BOUND FUNCTIONALITY ==========

  /**
   * @dev Internal hook to prevent transfers between non-zero addresses
   */
  function _update(
    address to,
    uint256 tokenId,
    address auth
  ) internal override(ERC721Enumerable) returns (address) {
    address from = _ownerOf(tokenId);

    // Allow minting (from == address(0)) and burning (to == address(0))
    // Block all transfers between non-zero addresses
    if (from != address(0) && to != address(0)) {
      revert TransferNotAllowed();
    }

    return super._update(to, tokenId, auth);
  }

  /**
   * @dev Permanently disabled - soul-bound NFTs cannot be approved
   */
  function approve(address, uint256) public pure override(ERC721, IERC721) {
    revert TransferNotAllowed();
  }

  /**
   * @dev Permanently disabled - soul-bound NFTs cannot be approved for all
   */
  function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
    revert TransferNotAllowed();
  }

  /**
   * @dev Returns address(0) for all valid tokens (better wallet compatibility)
   */
  function getApproved(uint256 tokenId) public view override(ERC721, IERC721) returns (address) {
    _requireOwned(tokenId);
    return address(0);
  }

  /**
   * @dev Returns false for all queries (better wallet compatibility)
   */
  function isApprovedForAll(
    address,
    address
  ) public pure override(ERC721, IERC721) returns (bool) {
    return false;
  }
}
