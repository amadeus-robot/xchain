// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const ERC20Mock = buildModule("ERC20MockModule", (m) => {
  
  const mock = m.contract("ERC20Mock", );

  return { mock };
});

export default ERC20Mock;
