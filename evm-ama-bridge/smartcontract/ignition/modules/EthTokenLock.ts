// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const EthTokenProofLock = buildModule("EthTokenProofLock", (m) => {
  
  const lock = m.contract("EthTokenProofLock");

  return { lock };
});

export default EthTokenProofLock;
