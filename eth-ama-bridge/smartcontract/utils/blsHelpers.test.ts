/**
 * Tests for BLS Helper Utilities
 * 
 * These tests verify that the helper functions work correctly
 * with @noble/curves library.
 */

import { expect } from "chai";
import { describe, it } from "mocha";
import {
  fpToBytes64,
  fp2ToBytes64,
  formatSignature,
  formatMessageHash,
  formatPublicKey,
  formatBlsSignatureData,
  prepareBlsVerification
} from "./blsHelpers";

describe("BLS Helper Utilities", function () {
  // Dynamic import for ES module
  const importModule = new Function('specifier', 'return import(specifier)');
  
  it("Should convert Fp to 64-byte hex string", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const { secretKey } = bls.keygen();
    const message = new TextEncoder().encode("test");
    const messageHash = bls.hash(message);
    const signature = bls.sign(messageHash, secretKey);
    
    // Use a valid Fp element from the signature
    const value = signature.x;
    const result = fpToBytes64(value);
    
    expect(result).to.have.length(130); // 0x + 128 hex chars
    expect(result).to.match(/^0x[0-9a-f]{128}$/i);
  });

  it("Should convert Fp2 to two 64-byte hex strings", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const { publicKey } = bls.keygen();
    
    // Use a valid Fp2 element from the public key
    const value = publicKey.x;
    const [c0, c1] = fp2ToBytes64(value);
    
    expect(c0).to.have.length(130);
    expect(c1).to.have.length(130);
    expect(c0).to.match(/^0x[0-9a-f]{128}$/i);
    expect(c1).to.match(/^0x[0-9a-f]{128}$/i);
  });

  it("Should format signature correctly", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const { secretKey } = bls.keygen();
    const message = new TextEncoder().encode("test");
    const messageHash = bls.hash(message);
    const signature = bls.sign(messageHash, secretKey);
    
    const formatted = formatSignature(signature);
    
    expect(formatted.sigX).to.have.length(130);
    expect(formatted.sigY).to.have.length(130);
  });

  it("Should format message hash with negated Y", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const Fp = bls12_381.fields.Fp;
    const message = new TextEncoder().encode("test");
    const messageHash = bls.hash(message);
    
    const formatted = formatMessageHash(messageHash, Fp);
    
    expect(formatted.hX).to.have.length(130);
    expect(formatted.hY).to.have.length(130);
    
    // Verify Y is negated
    const originalY = fpToBytes64(messageHash.y);
    const negatedY = fpToBytes64(Fp.neg(messageHash.y));
    expect(formatted.hY).to.equal(negatedY);
    expect(formatted.hY).to.not.equal(originalY);
  });

  it("Should format public key correctly", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const { publicKey } = bls.keygen();
    
    const formatted = formatPublicKey(publicKey);
    
    expect(formatted.pkXc0).to.have.length(130);
    expect(formatted.pkXc1).to.have.length(130);
    expect(formatted.pkYc0).to.have.length(130);
    expect(formatted.pkYc1).to.have.length(130);
  });

  it("Should format all BLS data in one call", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const Fp = bls12_381.fields.Fp;
    const { secretKey, publicKey } = bls.keygen();
    const message = new TextEncoder().encode("test");
    const messageHash = bls.hash(message);
    const signature = bls.sign(messageHash, secretKey);
    
    const formatted = formatBlsSignatureData(signature, messageHash, publicKey, Fp);
    
    expect(formatted).to.have.all.keys([
      'sigX', 'sigY', 'hX', 'hY',
      'pkXc0', 'pkXc1', 'pkYc0', 'pkYc1'
    ]);
    
    // All values should be 64-byte hex strings
    Object.values(formatted).forEach(value => {
      expect(value).to.have.length(130);
      expect(value).to.match(/^0x[0-9a-f]{128}$/i);
    });
  });

  it("Should prepare data for contract verification", async function () {
    const { bls12_381 } = await importModule("@noble/curves/bls12-381.js");
    const bls = bls12_381.shortSignatures;
    const Fp = bls12_381.fields.Fp;
    const { secretKey, publicKey } = bls.keygen();
    const message = new TextEncoder().encode("test");
    const messageHash = bls.hash(message);
    const signature = bls.sign(messageHash, secretKey);
    
    // Mock ethers object
    const mockEthers = {
      getBytes: (hex: string) => {
        return new Uint8Array(Buffer.from(hex.slice(2), 'hex'));
      }
    };
    
    const prepared = prepareBlsVerification(
      signature,
      messageHash,
      publicKey,
      Fp,
      mockEthers
    );
    
    expect(prepared).to.have.all.keys([
      'sigX', 'sigY', 'hX', 'hY',
      'pkXc0', 'pkXc1', 'pkYc0', 'pkYc1'
    ]);
    
    // All values should be Uint8Array of length 64
    Object.values(prepared).forEach(value => {
      expect(value).to.be.instanceOf(Uint8Array);
      expect(value.length).to.equal(64);
    });
  });
});

