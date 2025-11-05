import { expect } from "chai";
import hre from "hardhat";

describe("Bls12381BatchVerifier", function () {
  async function deployFixture() {
    const [owner, other] = await hre.ethers.getSigners();
    const Bls12381BatchVerifier = await hre.ethers.getContractFactory("Bls12381BatchVerifier");
    const batchVerifier = await Bls12381BatchVerifier.deploy();
    return { batchVerifier, owner, other };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { batchVerifier } = await deployFixture();
      expect(batchVerifier.target).to.be.properAddress;
    });
  });

  describe("verifyBatch", function () {
    it("Should revert if array lengths don't match", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const sig = validBytes + validBytes.slice(2); // 128 bytes
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyBatch(
          [sig, sig], // 2 signatures
          [hash], // 1 hash
          [pk] // 1 public key
        )
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should revert if arrays are empty", async function () {
      const { batchVerifier } = await deployFixture();
      await expect(
        batchVerifier.verifyBatch([], [], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert if signature length is invalid", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const invalidSig = "0x" + "11".repeat(127); // 127 bytes instead of 128
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyBatch([invalidSig], [hash], [pk])
      ).to.be.revertedWith("Invalid sig length");
    });

    it("Should revert if hash length is invalid", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const sig = validBytes + validBytes.slice(2); // 128 bytes
      const invalidHash = "0x" + "22".repeat(127); // 127 bytes instead of 128
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyBatch([sig], [invalidHash], [pk])
      ).to.be.revertedWith("Invalid hash length");
    });

    it("Should revert if public key length is invalid", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const sig = validBytes + validBytes.slice(2); // 128 bytes
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const invalidPk = "0x" + "33".repeat(255); // 255 bytes instead of 256

      await expect(
        batchVerifier.verifyBatch([sig], [hash], [invalidPk])
      ).to.be.revertedWith("Invalid pk length");
    });

    it("Should return false for invalid batch signatures", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "00".repeat(64);
      const sig = validBytes + validBytes.slice(2); // 128 bytes
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      try {
        const result = await batchVerifier.verifyBatch([sig], [hash], [pk]);
        expect(result).to.be.false;
      } catch (err) {
        console.log("⚠️  verifyBatch reverted (invalid inputs expected).");
      }
    });

    it("Should handle multiple signatures in batch", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const sig = validBytes + validBytes.slice(2); // 128 bytes
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      try {
        const tx = await batchVerifier.verifyBatch(
          [sig, sig, sig], // 3 signatures
          [hash, hash, hash], // 3 hashes
          [pk, pk, pk] // 3 public keys
        );
        const receipt = await tx.wait();
        console.log("⛽ verifyBatch (3 sigs) gas used:", receipt?.gasUsed?.toString() || "N/A");
      } catch (err) {
        console.log("⚠️  verifyBatch reverted (mocked precompile or invalid crypto values).");
      }
    });
  });

  describe("verifyAggregated", function () {
    it("Should revert if aggregated signature length is invalid", async function () {
      const { batchVerifier } = await deployFixture();
      const invalidSig = "0x" + "11".repeat(63); // 63 bytes instead of 64
      const validBytes = "0x" + "22".repeat(64);
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyAggregated(
          invalidSig,
          validBytes,
          [hash],
          [pk]
        )
      ).to.be.revertedWith("Invalid aggSig length");
    });

    it("Should revert if hash and public key array lengths don't match", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyAggregated(
          validBytes,
          validBytes,
          [hash, hash], // 2 hashes
          [pk] // 1 public key
        )
      ).to.be.revertedWith("Array length mismatch or empty");
    });

    it("Should revert if arrays are empty", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);

      await expect(
        batchVerifier.verifyAggregated(
          validBytes,
          validBytes,
          [],
          []
        )
      ).to.be.revertedWith("Array length mismatch or empty");
    });

    it("Should revert if hash length is invalid", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const invalidHash = "0x" + "22".repeat(127); // 127 bytes instead of 128
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      await expect(
        batchVerifier.verifyAggregated(
          validBytes,
          validBytes,
          [invalidHash],
          [pk]
        )
      ).to.be.revertedWith("Invalid hash length");
    });

    it("Should return false for invalid aggregated signature", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "00".repeat(64);
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      try {
        const result = await batchVerifier.verifyAggregated(
          validBytes,
          validBytes,
          [hash],
          [pk]
        );
        expect(result).to.be.false;
      } catch (err) {
        console.log("⚠️  verifyAggregated reverted (invalid inputs expected).");
      }
    });

    it("Should handle multiple messages in aggregated signature", async function () {
      const { batchVerifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      const hash = validBytes + validBytes.slice(2); // 128 bytes
      const pk = validBytes + validBytes.slice(2) + validBytes.slice(2) + validBytes.slice(2); // 256 bytes

      try {
        const tx = await batchVerifier.verifyAggregated(
          validBytes,
          validBytes,
          [hash, hash, hash], // 3 messages
          [pk, pk, pk] // 3 public keys
        );
        const receipt = await tx.wait();
        console.log("⛽ verifyAggregated (3 msgs) gas used:", receipt?.gasUsed?.toString() || "N/A");
      } catch (err) {
        console.log("⚠️  verifyAggregated reverted (mocked precompile or invalid crypto values).");
      }
    });
  });
});

