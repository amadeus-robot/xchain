// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title IERC20
 * @dev Interface of the ERC20 standard
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title TokenLockForAMATransparent
 * @dev Upgradeable contract for locking tokens to bridge to AMA chain
 * Uses Transparent Proxy pattern for upgradeability
 */
contract TokenLockForAMATransparent is Initializable, OwnableUpgradeable {

    /// @custom:storage-location erc7201:ama.storage.TokenLockForAMA
    struct TokenLockStorage {
        mapping(address => uint256) totalLocked;
        bool paused;
    }

    // keccak256(abi.encode(uint256(keccak256("ama.storage.TokenLockForAMA")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant TokenLockStorageLocation = 0x8a0d8f5b5e8c5d5e5a5c5b5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e00;

    function _getTokenLockStorage() private pure returns (TokenLockStorage storage $) {
        assembly {
            $.slot := TokenLockStorageLocation
        }
    }

    event Locked(
        address indexed token,
        address indexed user,
        uint256 amount,
        string targetAddress,
        uint256 timestamp
    );

    event Unlocked(
        address indexed token,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error ContractPaused();
    error InvalidToken();
    error InvalidAmount();
    error EmptyTargetAddress();
    error InvalidReceiver();
    error InsufficientBalance();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract setting the deployer as the initial owner
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    /**
     * @dev Lock tokens to be bridged to AMA chain
     * @param token The address of the ERC20 token to lock
     * @param amount The amount of tokens to lock
     * @param targetAddress The destination address on AMA chain
     */
    function lock(address token, uint256 amount, string calldata targetAddress) external virtual {
        TokenLockStorage storage $ = _getTokenLockStorage();
        
        if ($.paused) revert ContractPaused();
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (bytes(targetAddress).length == 0) revert EmptyTargetAddress();

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        $.totalLocked[token] += amount;

        emit Locked(token, msg.sender, amount, targetAddress, block.timestamp);
    }

    /**
     * @dev Unlock tokens (owner only)
     * @param token The address of the ERC20 token to unlock
     * @param to The address to send unlocked tokens to
     * @param amount The amount of tokens to unlock
     */
    function unlock(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        if (to == address(0)) revert InvalidReceiver();
        if (amount == 0) revert InvalidAmount();
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        TokenLockStorage storage $ = _getTokenLockStorage();
        $.totalLocked[token] -= amount;

        bool success = IERC20(token).transfer(to, amount);
        if (!success) revert TransferFailed();

        emit Unlocked(token, to, amount, block.timestamp);
    }

    /**
     * @dev Pause the contract (owner only)
     */
    function pause() external onlyOwner {
        TokenLockStorage storage $ = _getTokenLockStorage();
        $.paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        TokenLockStorage storage $ = _getTokenLockStorage();
        $.paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev Get total locked amount for a token
     * @param token The address of the ERC20 token
     * @return The total amount locked
     */
    function getTotalLocked(address token) external view returns (uint256) {
        TokenLockStorage storage $ = _getTokenLockStorage();
        return $.totalLocked[token];
    }

    /**
     * @dev Check if contract is paused
     * @return true if paused, false otherwise
     */
    function isPaused() external view returns (bool) {
        TokenLockStorage storage $ = _getTokenLockStorage();
        return $.paused;
    }

    /**
     * @dev Get the version of the contract
     * @return The version number
     */
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }
}

