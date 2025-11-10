import { expect } from "chai";
import { ethers } from "hardhat";
import { bls12_381 as bls } from "@noble/curves/bls12-381.js"; // npm install @noble/curves
import { g1ToStruct, g2ToStruct } from "../utils/blsHelpers";
describe("BLSVerify", function () {
  let blsVerify:any;

  before(async () => {
    const BLSVerify = await ethers.getContractFactory("BLSVerify");
    blsVerify = await BLSVerify.deploy();
    await blsVerify.waitForDeployment();
  });

  it("should verify a valid BLS signature", async () => {
    const message = new TextEncoder().encode("test");
    const blsl = bls.longSignatures;
    const { secretKey, publicKey } = blsl.keygen();
    const msgp = blsl.hash(message);
    const msgpd = blsl.hash(message, 'AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_');
    console.log("Message:", msgp);
    const signature = blsl.sign(msgp, secretKey);
    
    const sigPoint = bls.G2.Point.fromHex(signature.toHex());
    const pubPoint = bls.G1.Point.fromHex(publicKey.toHex());

    console.log("Signature Point:", sigPoint);
    console.log("Public Key Point:", pubPoint);

    const sigStruct = g2ToStruct(sigPoint);
    const pubStruct = g1ToStruct(pubPoint);

    console.log("Signature Struct:", sigStruct);
    console.log("Public Key Struct:", pubStruct);

    // Now convert points to Solidity struct format
    // NOTE: Your Solidity contract expects:
    //   - signature in G2Point
    //   - pubkey in G1Point
    //
    // For simplicity, we’ll just check the pairing via contract,
    // but full G1/G2 decompositions would require splitting X/Y coordinates.

    // If you’ve added helper methods to convert these, you can do:

    const result = await blsVerify.verify(message, sigStruct, pubStruct);
    expect(result).to.be.true;
  });
});
