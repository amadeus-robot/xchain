const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AmaVecPakO2", function () {
  let wrapper;

  beforeEach(async function () {
    const AmaVecPakO2Wrapper = await ethers.getContractFactory("AmaVecPakO2Wrapper");
    wrapper = await AmaVecPakO2Wrapper.deploy();
    await wrapper.waitForDeployment();
  });

  describe("encodeVarInt", function () {
    it("should encode zero correctly", async function () {
      const result = await wrapper.encodeVarInt(0);
      expect(result).to.equal("0x00");
    });

    it("should encode small values correctly", async function () {
      const result = await wrapper.encodeVarInt(1);
      expect(result).to.equal("0x0101");
    });

    it("should encode 255 correctly", async function () {
      const result = await wrapper.encodeVarInt(255);
      expect(result).to.equal("0x01ff");
    });

    it("should encode 256 correctly", async function () {
      const result = await wrapper.encodeVarInt(256);
      expect(result).to.equal("0x020100");
    });

    it("should encode uint64 max correctly", async function () {
      const maxUint64 = "18446744073709551615";
      const result = await wrapper.encodeVarInt(maxUint64);
      expect(result.length).to.be.greaterThan(2); // Should have length byte + data
      expect(result.slice(0, 4)).to.equal("0x08"); // 8 bytes
    });
  });

  describe("encodeInt", function () {
    it("should encode integer with TYPE_INT prefix", async function () {
      const result = await wrapper.encodeInt(42);
      expect(result.slice(0, 4)).to.equal("0x03"); // TYPE_INT = 0x03
    });

    it("should encode zero correctly", async function () {
      const result = await wrapper.encodeInt(0);
      expect(result).to.equal("0x0300"); // TYPE_INT + varint(0)
    });
  });

  describe("encodeBytes", function () {
    it("should encode empty bytes correctly", async function () {
      const result = await wrapper.encodeBytes("0x");
      expect(result.slice(0, 4)).to.equal("0x05"); // TYPE_BYTES = 0x05
      expect(result.slice(4, 6)).to.equal("00"); // length = 0
    });

    it("should encode bytes with TYPE_BYTES prefix", async function () {
      const testBytes = "0x123456";
      const result = await wrapper.encodeBytes(testBytes);
      expect(result.slice(0, 4)).to.equal("0x05"); // TYPE_BYTES = 0x05
      expect(result).to.include(testBytes.slice(2)); // Should contain the bytes
    });

    it("should encode longer bytes correctly", async function () {
      const testBytes = "0x" + "12".repeat(100);
      const result = await wrapper.encodeBytes(testBytes);
      expect(result.slice(0, 4)).to.equal("0x05"); // TYPE_BYTES = 0x05
    });
  });

  describe("encodeAmaHeader", function () {
    it("should encode a valid AMA header", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 100,
        prev_slot: 99,
        signer: "0x" + "12".repeat(48), // 48 bytes
        dr: "0x0000000000000000000000000000000000000000000000000000000000000002",
        vr: "0x" + "34".repeat(96), // 96 bytes
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000003",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000004",
      };

      const result = await wrapper.encodeAmaHeader(header);
      const gasEstimate = await wrapper.encodeAmaHeader.estimateGas(header);
      const feeData = await ethers.provider.getFeeData();
      const gasPriceWei = feeData.gasPrice ?? feeData.maxFeePerGas;
      if (gasPriceWei) {
        const gasFeeWei = gasEstimate * gasPriceWei;
        console.log(
          `encodeAmaHeader gas=${gasEstimate.toString()} | fee=${gasFeeWei.toString()} wei`
        );
      } else {
        console.log(`encodeAmaHeader gas=${gasEstimate.toString()} (no gas price available)`);
      }

      expect(result).to.be.a("string");
      expect(result.slice(0, 4)).to.equal("0x07"); // TYPE_MAP = 0x07
      expect(result.length).to.be.greaterThan(100); // Should be substantial encoding
    });

    it("should encode header with zero values", async function () {
      const header = {
        height: 0,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        slot: 0,
        prev_slot: 0,
        signer: "0x" + "00".repeat(48),
        dr: "0x0000000000000000000000000000000000000000000000000000000000000000",
        vr: "0x" + "00".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000000",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000000",
      };

      const result = await wrapper.encodeAmaHeader(header);
      expect(result.slice(0, 4)).to.equal("0x07"); // TYPE_MAP = 0x07
    });
  });

  describe("computeHeaderHash", function () {
    it("should compute hash for a valid header", async function () {
      const header = {
        height: 42,
        prev_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        slot: 1000,
        prev_slot: 999,
        signer: "0x" + "ab".repeat(48),
        dr: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        vr: "0x" + "cd".repeat(96),
        root_tx: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        root_validator: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      };

      const hash = await wrapper.computeHeaderHash(header);
      expect(hash).to.be.a("string");
      expect(hash).to.have.length(66); // 0x + 64 hex chars
      expect(hash.slice(0, 2)).to.equal("0x");
    });

    it("should produce deterministic hashes", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 1,
        prev_slot: 0,
        signer: "0x" + "11".repeat(48),
        dr: "0x0000000000000000000000000000000000000000000000000000000000000001",
        vr: "0x" + "22".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000001",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000001",
      };

      const hash1 = await wrapper.computeHeaderHash(header);
      const hash2 = await wrapper.computeHeaderHash(header);
      expect(hash1).to.equal(hash2);
    });

    it("should produce different hashes for different headers", async function () {
      const header1 = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 1,
        prev_slot: 0,
        signer: "0x" + "11".repeat(48),
        dr: "0x0000000000000000000000000000000000000000000000000000000000000001",
        vr: "0x" + "22".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000001",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000001",
      };

      const header2 = {
        ...header1,
        height: 2, // Different height
      };

      const hash1 = await wrapper.computeHeaderHash(header1);
      const hash2 = await wrapper.computeHeaderHash(header2);
      expect(hash1).to.not.equal(hash2);
    });

    it("should handle maximum uint64 values", async function () {
      const maxUint64 = "18446744073709551615";
      const header = {
        height: maxUint64,
        prev_hash: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        slot: maxUint64,
        prev_slot: maxUint64,
        signer: "0x" + "ff".repeat(48),
        dr: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        vr: "0x" + "ff".repeat(96),
        root_tx: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        root_validator: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      };

      const hash = await wrapper.computeHeaderHash(header);
      expect(hash).to.be.a("string");
      expect(hash).to.have.length(66);
    });
  });

  describe("Edge cases", function () {
    it("should handle single byte varint encoding", async function () {
      const result = await wrapper.encodeVarInt(127);
      expect(result).to.equal("0x017f");
    });

    it("should handle two byte varint encoding", async function () {
      const result = await wrapper.encodeVarInt(257);
      expect(result).to.equal("0x020101");
    });

    it("should handle four byte varint encoding", async function () {
      const result = await wrapper.encodeVarInt(0x12345678);
      expect(result.length).to.equal(12); // 0x + 1 length byte + 4 data bytes = 10 chars
    });
  });
});

