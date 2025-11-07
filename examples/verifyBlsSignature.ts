/**
 * Example: How to verify a BLS signature using the Bls12381Verifier contract
 * 
 * This example demonstrates the complete workflow:
 * 1. Generate BLS keys using @noble/curves
 * 2. Sign a message
 * 3. Format the data for the contract
 * 4. Verify the signature on-chain
 */

import hre from "hardhat";
import { prepareBlsVerification } from "../utils/blsHelpers";

async function main() {
  // Dynamic import for ES module
  const importModule = new Function('specifier', 'return import(specifier)');
  const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
  
  // Use short signatures: signatures in G1, public keys in G2
  const bls = bls12_381.shortSignatures;
  
  // Step 1: Generate a key pair
  console.log("Generating BLS key pair...");
  const { secretKey, publicKey } = bls.keygen();
  console.log("✓ Key pair generated");
  
  // Step 2: Create and sign a message
  const message = new TextEncoder().encode("Hello, BLS12-381!");
  console.log(`Message: ${new TextDecoder().decode(message)}`);
  
  // Hash message to G1 point
  const messageHash = bls.hash(message);
  console.log("✓ Message hashed to G1");
  
  // Sign the hashed message
  const signature = bls.sign(messageHash, secretKey);
  console.log("✓ Message signed");
  
  // Step 3: Verify signature using library (off-chain)
  const isValid = bls.verify(signature, messageHash, publicKey);
  if (!isValid) {
    throw new Error("Signature verification failed in library");
  }
  console.log("✓ Signature verified off-chain");
  
  // Step 4: Format data for contract using helper utilities
  const Fp = bls12_381.fields.Fp;
  const formatted = prepareBlsVerification(
    signature,
    messageHash,
    publicKey,
    Fp,
    hre.ethers
  );
  console.log("✓ Data formatted for contract");
  
  // Step 5: Deploy contract (or use existing deployment)
  const Bls12381Verifier = await hre.ethers.getContractFactory("Bls12381Verifier");
  const verifier = await Bls12381Verifier.deploy();
  await verifier.waitForDeployment();
  console.log(`✓ Contract deployed at: ${await verifier.getAddress()}`);
  
  // Step 6: Verify signature on-chain
  console.log("Verifying signature on-chain...");
  const result = await verifier.verifySignature(
    formatted.sigX,
    formatted.sigY,
    formatted.hX,
    formatted.hY,
    formatted.pkXc0,
    formatted.pkXc1,
    formatted.pkYc0,
    formatted.pkYc1
  );
  
  if (result) {
    console.log("✅ Signature verified successfully on-chain!");
  } else {
    console.log("⚠️  Contract returned false - this may be because:");
    console.log("   - Hardhat's default network doesn't support BLS12-381 precompile");
    console.log("   - Fork mainnet to test with precompile support");
    console.log("");
    console.log("However, the signature IS valid (verified off-chain)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

