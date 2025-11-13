import hre from "hardhat";
import { prepareBlsVerification } from "../utils/blsHelpers";

async function main() {
  const importModule = new Function('specifier', 'return import(specifier)');
  const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
  
  const bls = bls12_381.shortSignatures;
  const { secretKey, publicKey } = bls.keygen();
  const message = new TextEncoder().encode("Hello, BLS12-381 with on-chain hash_to_curve!");
  const messageHash = bls.hash(message);
  const signature = bls.sign(messageHash, secretKey);
  
  const isValid = bls.verify(signature, messageHash, publicKey);
  if (!isValid) {
    throw new Error("Signature verification failed in library");
  }
  
  const Fp = bls12_381.fields.Fp;
  const formatted = prepareBlsVerification(
    signature,
    messageHash,
    publicKey,
    Fp,
    hre.ethers
  );
  
  const Bls12381Verifier = await hre.ethers.getContractFactory("Bls12381Verifier");
  const verifier = await Bls12381Verifier.deploy();
  await verifier.waitForDeployment();
  
  try {
    const result = await verifier.verifySignatureWithMessage(
      formatted.sigX,
      formatted.sigY,
      message,
      formatted.pkXc0,
      formatted.pkXc1,
      formatted.pkYc0,
      formatted.pkYc1
    );
    console.log(result);
  } catch (error: any) {
    console.error(error.message);
  }
  
  try {
    const resultOffChain = await verifier.verifySignature(
      formatted.sigX,
      formatted.sigY,
      formatted.hX,
      formatted.hY,
      formatted.pkXc0,
      formatted.pkXc1,
      formatted.pkYc0,
      formatted.pkYc1
    );
    console.log(resultOffChain);
  } catch (error: any) {
    console.error(error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

