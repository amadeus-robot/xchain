// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
//
// Note: For upgradeable contracts with Transparent proxy, use the deploy script instead:
// npm run deploy:transparent
// This module deploys the implementation contract only.

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenLockForAMA = buildModule("TokenLockForAMAModule", (m) => {
  
  // Deploy the implementation contract
  // For production deployment with proxy, use: npm run deploy:transparent
  const implementation = m.contract("TokenLockForAMATransparent");

  return { implementation };
});

export default TokenLockForAMA;
