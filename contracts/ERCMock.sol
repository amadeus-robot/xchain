// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ERC20 Mock Token for Testing
/// @notice Simple ERC20 token used for unit tests and local dev
contract ERC20Mock is ERC20 {
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param initialAccount Address to mint initial supply to
    /// @param initialBalance Initial token supply (in wei/units)
    constructor(
        string memory name,
        string memory symbol,
        address initialAccount,
        uint256 initialBalance
    ) ERC20(name, symbol) {
        _mint(initialAccount, initialBalance);
    }
}
