// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const TokenLockForAMA = buildModule("TokenLockForAMAModule", (m) => {
  
  const lock = m.contract("TokenLockForAMA");

  return { lock };
});

export default TokenLockForAMA;
