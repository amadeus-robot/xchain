// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenLock is Ownable {

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


    constructor() Ownable(msg.sender) {}

    function lock(address token, uint256 amount, string calldata targetAddress) external {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        require(bytes(targetAddress).length > 0, "Empty target address");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        emit Locked(token, msg.sender, amount, targetAddress, block.timestamp);
    }

    function unlock(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid receiver");
        require(amount > 0, "Invalid amount");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");

        bool success = IERC20(token).transfer(to, amount);
        require(success, "Transfer failed");

        emit Unlocked(token, to, amount, block.timestamp);
    }
}
