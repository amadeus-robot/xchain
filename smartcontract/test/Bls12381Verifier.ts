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
    const signature = blsl.sign(msgp, secretKey);
    const sigStruct = g2ToStruct(signature);
    const pubStruct = g1ToStruct(publicKey);
    const result = await blsVerify.verify(message, sigStruct, pubStruct);
    expect(result).to.be.true;
  });

  it("should verify a valid aggregated BLS signatures", async () => {
    const blsl = bls.longSignatures;
    const messages = [
      new TextEncoder().encode("hello"),
      new TextEncoder().encode("world")
    ];

    const keypairs = Array.from({ length: messages.length }, () => blsl.keygen());
    const pubKeys = keypairs.map((k) => g1ToStruct(k.publicKey));

    const signatures = messages.map((msg, i) => {
      const msgHash = blsl.hash(msg);
      return blsl.sign(msgHash, keypairs[i].secretKey);
    });
    const aggSig = blsl.aggregateSignatures(signatures);
    const aggSigStruct = g2ToStruct(aggSig);
    const result = await blsVerify.verifyAgg(messages, pubKeys, aggSigStruct);

    expect(result).to.be.true;
  });
});
