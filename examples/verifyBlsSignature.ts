import hre from "hardhat";
import { prepareBlsVerification } from "../utils/blsHelpers";
import { bls12_381 } from '@noble/curves/bls12-381.js';


async function main() {
  const blss = bls12_381.shortSignatures;
  const { secretKey, publicKey } = blss.keygen();
  const message = new TextEncoder().encode("hello");
  const msgpd = blss.hash(message, "AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_");
  const signature = blss.sign(msgpd, secretKey);

  
  
  const isValid = blss.verify(signature, msgpd, publicKey);
  if (!isValid) {
    throw new Error("Signature verification failed in library");
  }
  
  // const Fp = bls12_381.fields.Fp;
  // const formatted = prepareBlsVerification(
  //   signature,
  //   messageHash,
  //   publicKey,
  //   Fp,
  //   hre.ethers
  // );
  
  // const Bls12381Verifier = await hre.ethers.getContractFactory("Bls12381Verifier");
  // const verifier = await Bls12381Verifier.deploy();
  // console.log(await verifier.getAddress());
  // await verifier.waitForDeployment();
  
  // const result = await verifier.verifySignature(
  //   formatted.sigX,
  //   formatted.sigY,
  //   formatted.hX,
  //   formatted.hY,
  //   formatted.pkXc0,
  //   formatted.pkXc1,
  //   formatted.pkYc0,
  //   formatted.pkYc1
  // );
  
  // console.log("Result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

