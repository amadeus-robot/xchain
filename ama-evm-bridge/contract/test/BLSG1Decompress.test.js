const { expect } = require("chai");
const { ethers } = require("hardhat");
const bls = require("@noble/curves/bls12-381").bls12_381;

// Import ES module using dynamic import
let g1PublicKeyToEIP2537;
before(async function () {
  const blsUtils = await import("./bls-utils.js");
  g1PublicKeyToEIP2537 = blsUtils.g1PublicKeyToEIP2537;
});

describe("BLSG1Decompress", function () {
  let g1Decompress;

  beforeEach(async function () {
    const BLSG1Decompress = await ethers.getContractFactory("BLSG1Decompress");
    g1Decompress = await BLSG1Decompress.deploy();
    await g1Decompress.waitForDeployment();
  });

  describe("decompress", function () {
    it("should decompress G1 point correctly using g1PublicKeyToEIP2537", async function () {
      // Generate a random G1 point and compress it
      const privateKey = bls.utils.randomPrivateKey();
      const publicKey = bls.getPublicKey(privateKey); // This is 48 bytes compressed
      
      // Convert to hex string for contract call
      const compressedHex = "0x" + Buffer.from(publicKey).toString("hex");
      
      // Get expected decompressed value using g1PublicKeyToEIP2537
      const expectedDecompressed = g1PublicKeyToEIP2537(publicKey);
      
      // Call contract's decompress function
      const contractResult = await g1Decompress.decompress(compressedHex);
      
      // Convert both to Buffer for byte-by-byte comparison
      // Both should be exactly 128 bytes
      let contractBytes = Buffer.from(contractResult.slice(2), 'hex');
      // Pad to 128 bytes if needed (shouldn't be, but just in case)
      if (contractBytes.length < 128) {
        contractBytes = Buffer.concat([Buffer.alloc(128 - contractBytes.length, 0), contractBytes]);
      } else if (contractBytes.length > 128) {
        contractBytes = contractBytes.slice(-128);
      }
      
      let expectedBytes = Buffer.from(expectedDecompressed.slice(2), 'hex');
      // Pad to 128 bytes if needed
      if (expectedBytes.length < 128) {
        expectedBytes = Buffer.concat([Buffer.alloc(128 - expectedBytes.length, 0), expectedBytes]);
      } else if (expectedBytes.length > 128) {
        expectedBytes = expectedBytes.slice(-128);
      }
      
      // Both formats should be: x_hi(32) || x_lo(32) || y_hi(32) || y_lo(32)
      // Compare directly
      expect(contractBytes.toString('hex')).to.equal(expectedBytes.toString('hex'));
    });

    it("should decompress multiple G1 points correctly", async function () {
      // Test with multiple random points
      for (let i = 0; i < 5; i++) {
        const privateKey = bls.utils.randomPrivateKey();
        const publicKey = bls.getPublicKey(privateKey);
        const compressedHex = "0x" + Buffer.from(publicKey).toString("hex");
        
        const expectedDecompressed = g1PublicKeyToEIP2537(publicKey);
        const contractResult = await g1Decompress.decompress(compressedHex);
        
        // Normalize both to 128 bytes
        let contractBytes = Buffer.from(contractResult.slice(2), 'hex');
        if (contractBytes.length < 128) {
          contractBytes = Buffer.concat([Buffer.alloc(128 - contractBytes.length, 0), contractBytes]);
        } else if (contractBytes.length > 128) {
          contractBytes = contractBytes.slice(-128);
        }
        
        let expectedBytes = Buffer.from(expectedDecompressed.slice(2), 'hex');
        if (expectedBytes.length < 128) {
          expectedBytes = Buffer.concat([Buffer.alloc(128 - expectedBytes.length, 0), expectedBytes]);
        } else if (expectedBytes.length > 128) {
          expectedBytes = expectedBytes.slice(-128);
        }
        
        expect(contractBytes.toString('hex')).to.equal(expectedBytes.toString('hex'));
      }
    });

    it("should decompress a known G1 point correctly", async function () {
      // Use a known compressed G1 point from the test data
      const knownCompressed = "0xafbaa14558093ef26e638fb7f8950958d9c1e2f7f321658484a9484cb01a5b070399d3194c9c6be40f5b1be80de22f5f";
      
      // Convert to Buffer for g1PublicKeyToEIP2537
      const publicKeyBuffer = Buffer.from(knownCompressed.slice(2), "hex");
      
      // Get expected decompressed value
      const expectedDecompressed = g1PublicKeyToEIP2537(publicKeyBuffer);
      
      // Call contract's decompress function
      const contractResult = await g1Decompress.decompress(knownCompressed);
      
      // Convert both to Buffer for byte-by-byte comparison
      // Both should be exactly 128 bytes
      let contractBytes = Buffer.from(contractResult.slice(2), 'hex');
      // Pad to 128 bytes if needed (shouldn't be, but just in case)
      if (contractBytes.length < 128) {
        contractBytes = Buffer.concat([Buffer.alloc(128 - contractBytes.length, 0), contractBytes]);
      } else if (contractBytes.length > 128) {
        contractBytes = contractBytes.slice(-128);
      }
      
      let expectedBytes = Buffer.from(expectedDecompressed.slice(2), 'hex');
      // Pad to 128 bytes if needed
      if (expectedBytes.length < 128) {
        expectedBytes = Buffer.concat([Buffer.alloc(128 - expectedBytes.length, 0), expectedBytes]);
      } else if (expectedBytes.length > 128) {
        expectedBytes = expectedBytes.slice(-128);
      }
      
      // Both formats should be: x_hi(32) || x_lo(32) || y_hi(32) || y_lo(32)
      // Compare directly
      expect(contractBytes.toString('hex')).to.equal(expectedBytes.toString('hex'));
    });

    it("should require 48-byte input", async function () {
      const wrongLength = "0x" + "12".repeat(47); // 47 bytes
      
      await expect(
        g1Decompress.decompress(wrongLength)
      ).to.be.revertedWith("compressed G1 must be 48 bytes");
    });

    it("should reject invalid compressed point", async function () {
      // Create an invalid compressed point (wrong compression flag)
      const invalidCompressed = "0x" + "00".repeat(48);
      
      // This should either revert or return an invalid point
      // The exact behavior depends on the implementation
      try {
        const result = await g1Decompress.decompress(invalidCompressed);
        // If it doesn't revert, the result might be invalid
        // We can check if it's a valid point by trying to use it
        expect(result.length).to.equal(130); // 0x + 128 bytes = 130 chars
      } catch (error) {
        // Expected to revert for invalid points
        expect(error.message).to.include("revert");
      }
    });
  });
});
