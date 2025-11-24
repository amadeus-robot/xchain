// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract ERC20Mock is ERC20 {
    constructor(
    ) ERC20("Fake USDT", "FAKEUSDT") {
        _mint(msg.sender, 1000000*10**18);
    }
}
