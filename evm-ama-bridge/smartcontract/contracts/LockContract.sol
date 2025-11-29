// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EthUSDTProofLock is Ownable {
    // mapping(token => mapping(user => amount))
    mapping(address => mapping(address => uint256)) public locked;
    mapping(address => uint256) public totalLocked;
    bool public paused;

    event Locked(address indexed token, address indexed user, uint256 amount);
    event Unlocked(address indexed token, address indexed to, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);

    error ContractPaused();
    error InvalidToken();
    error InvalidAmount();
    error InsufficientLocked();
    error TransferFailed();

    constructor() Ownable(msg.sender) {}

    function lock(address token, uint256 amount) external {
        if (paused) revert ContractPaused();
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();

        // transfer in (USDT style tokens may return bool or revert; we use require)
        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "TRANSFER_FAILED");

        locked[token][msg.sender] += amount;
        totalLocked[token] += amount;

        emit Locked(token, msg.sender, amount);
    }

    // only owner (bridge operator) can unlock after verifying proof on ETH side
    function unlock(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();

        uint256 userLock = locked[token][to];
        if (userLock < amount) revert InsufficientLocked();

        locked[token][to] = userLock - amount;
        totalLocked[token] -= amount;

        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "TRANSFER_FAILED");

        emit Unlocked(token, to, amount);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
