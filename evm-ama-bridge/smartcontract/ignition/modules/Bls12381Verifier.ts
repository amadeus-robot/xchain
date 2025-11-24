// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI: bigint = 1_000_000_000n;

const Bls12381VerifierModule = buildModule("Bls12381VerifierModule", (m) => {
  
  const verifier = m.contract("Bls12381Verifier");

  return { verifier };
});

export default Bls12381VerifierModule;

