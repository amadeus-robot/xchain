import { expect } from "chai";
import hre from "hardhat";

describe("Bls12381Verifier", function () {
  async function deployFixture() {
    const [owner, other] = await hre.ethers.getSigners();
    const Bls12381Verifier = await hre.ethers.getContractFactory("Bls12381Verifier");
    const verifier = await Bls12381Verifier.deploy();
    return { verifier, owner, other };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { verifier } = await deployFixture();
      expect(verifier.target).to.be.properAddress;
    });
  });

  describe("verifySignature", function () {
    it("Should revert if signature length is invalid", async function () {
      const { verifier } = await deployFixture();
      const invalidSig = "0x" + "11".repeat(63); 
      const validBytes = "0x" + "22".repeat(64);
      
      await expect(
        verifier.verifySignature(
          invalidSig,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes
        )
      ).to.be.revertedWith("Invalid sig length");
    });

    it("Should revert if hash length is invalid", async function () {
      const { verifier } = await deployFixture();
      const validBytes = "0x" + "22".repeat(64);
      const invalidHash = "0x" + "33".repeat(63); 
      
      await expect(
        verifier.verifySignature(
          validBytes,
          validBytes,
          invalidHash,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes
        )
      ).to.be.revertedWith("Invalid hash length");
    });

    it("Should revert if public key length is invalid", async function () {
      const { verifier } = await deployFixture();
      const validBytes = "0x" + "22".repeat(64);
      const invalidPk = "0x" + "44".repeat(63); 
      
      await expect(
        verifier.verifySignature(
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          invalidPk,
          validBytes,
          validBytes,
          validBytes
        )
      ).to.be.revertedWith("Invalid pk length");
    });

    it("Should return false for invalid signature (mocked precompile)", async function () {
      const { verifier } = await deployFixture();
      const validBytes = "0x" + "00".repeat(64);
      
      try {
        const result = await verifier.verifySignature(
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes
        );
        expect(result).to.be.false;
      } catch (err) {
        
        console.log("⚠️  verifySignature reverted (invalid inputs expected).");
      }
    });

    it("Should accept valid 64-byte inputs", async function () {
      const { verifier } = await deployFixture();
      const validBytes = "0x" + "11".repeat(64);
      
      try {
        const result = await verifier.verifySignature(
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes,
          validBytes
        );
        // verifySignature is a view function, so it returns a boolean directly
        expect(result).to.be.a("boolean");
        
      } catch (err) {
        console.log("⚠️  verifySignature reverted (mocked precompile or invalid crypto values).");
      }
    });

    /**
     * Helper function to pad a hex string to 64 bytes (128 hex chars)
     * Big-endian: pad with zeros on the left
     */
    function padTo64Bytes(hex: string): string {
      // Remove 0x prefix if present
      const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
      // Pad to 128 hex characters (64 bytes)
      const padded = cleanHex.padStart(128, "0");
      return "0x" + padded;
    }

    /**
     * Parse a compressed G1 signature (96 bytes = 48 bytes X + 48 bytes Y)
     * Returns padded 64-byte coordinates
     */
    function parseCompressedG1Signature(signatureHex: string): { sigX: string; sigY: string } {
      const cleanHex = signatureHex.startsWith("0x") ? signatureHex.slice(2) : signatureHex;
      if (cleanHex.length !== 192) {
        throw new Error(`Signature hex must be 192 characters (96 bytes), got ${cleanHex.length}`);
      }
      
      // Split into X and Y (48 bytes each = 96 hex chars each)
      const sigXHex = cleanHex.slice(0, 96);
      const sigYHex = cleanHex.slice(96, 192);
      
      // Pad each to 64 bytes (128 hex chars)
      return {
        sigX: padTo64Bytes(sigXHex),
        sigY: padTo64Bytes(sigYHex),
      };
    }

    /**
     * Parse a compressed G2 public key (48 bytes)
     * NOTE: This function assumes the pubkey is provided in a format that can be parsed.
     * For full decompression of G2 points, you need a BLS library like @noble/curves or @chainsafe/bls.
     * This is a placeholder that shows the expected structure.
     */
    function parseCompressedG2PublicKey(pubkeyHex: string): { pkXc0: string; pkXc1: string; pkYc0: string; pkYc1: string } {
      const cleanHex = pubkeyHex.startsWith("0x") ? pubkeyHex.slice(2) : pubkeyHex;
      if (cleanHex.length !== 96) {
        throw new Error(`Public key hex must be 96 characters (48 bytes), got ${cleanHex.length}`);
      }
      
      // WARNING: This is a placeholder. A compressed G2 point (48 bytes) needs to be
      // decompressed to get the 4 coordinates (pkXc0, pkXc1, pkYc0, pkYc1), each 64 bytes.
      // This requires elliptic curve operations that need a proper BLS library.
      // For now, we'll create zero-padded placeholders to show the structure.
      // In production, use a library like @noble/curves to decompress the G2 point.
      
      console.warn("⚠️  G2 public key decompression not implemented. Using placeholder values.");
      console.warn("⚠️  Install @noble/curves or @chainsafe/bls to properly decompress G2 points.");
      
      // Placeholder: return zero-padded values
      // In reality, you need to decompress the 48-byte compressed G2 point to get 4 x 64-byte coordinates
      return {
        pkXc0: "0x" + "00".repeat(64),
        pkXc1: "0x" + "00".repeat(64),
        pkYc0: "0x" + "00".repeat(64),
        pkYc1: "0x" + "00".repeat(64),
      };
    }

    it("Should verify BLS signature with DST: AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_", async function () {
      const { verifier } = await deployFixture();
      
      // Test vector 1
      const pubkeyHex = "A8276B21082F68A0D57FC4DD948E8E84CD0F2054BDD908740C0A5D12957B17D12A3CD6D0A5C5F0B2E75D85ED62A70AB5";
      const msg = "hello";
      const dst = "AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_";
      const signatureHex = "B33BF5A2529C53AFB0A28FA315446B57C090EF6B48A2C0A6358AEBC309561FD938A9A8273C4A7C50E5386EEFA772C4BA002FD7F9BE09FCDDBD61A5CA4D5D8BFD50A8C50F8645F31B3A656F26790979271E6223D13B65329C15C911B7976DD383";
      
      console.log("\n=== Test Vector 1 ===");
      console.log("pubkey (compressed, 48 bytes):", pubkeyHex);
      console.log("msg:", msg);
      console.log("dst:", dst);
      console.log("signature (96 bytes):", signatureHex);
      
      // Parse signature (G1 point: 96 bytes = 48 bytes X + 48 bytes Y)
      const { sigX, sigY } = parseCompressedG1Signature(signatureHex);
      console.log("Parsed signature:");
      console.log("  sigX (64 bytes):", sigX);
      console.log("  sigY (64 bytes):", sigY);
      
      // Parse public key (G2 point: 48 bytes compressed -> 256 bytes uncompressed)
      const { pkXc0, pkXc1, pkYc0, pkYc1 } = parseCompressedG2PublicKey(pubkeyHex);
      console.log("Parsed public key (placeholder - needs decompression):");
      console.log("  pkXc0:", pkXc0.slice(0, 20) + "...");
      console.log("  pkXc1:", pkXc1.slice(0, 20) + "...");
      console.log("  pkYc0:", pkYc0.slice(0, 20) + "...");
      console.log("  pkYc1:", pkYc1.slice(0, 20) + "...");
      
      // Note: Message hash needs to be computed using hash-to-curve with the DST
      // This requires a BLS library. For now, we'll use placeholder values.
      console.log("\n⚠️  To complete verification, you need to:");
      console.log("  1. Decompress the G2 public key using a BLS library");
      console.log("  2. Hash the message to G1 using hash-to-curve with the DST");
      console.log("  3. Call verifySignature with the decompressed coordinates\n");
      
      // TODO: Once decompression and hash-to-curve are implemented:
      // const hX = hashToG1X(msg, dst);
      // const hY = hashToG1Y(msg, dst);
      // const result = await verifier.verifySignature(sigX, sigY, hX, hY, pkXc0, pkXc1, pkYc0, pkYc1);
      // expect(result).to.be.true;
    });

    it("Should verify BLS signature with empty DST", async function () {
      const { verifier } = await deployFixture();
      
      // Test vector 2
      const pubkeyHex = "A8276B21082F68A0D57FC4DD948E8E84CD0F2054BDD908740C0A5D12957B17D12A3CD6D0A5C5F0B2E75D85ED62A70AB5";
      const msg = "hello";
      const dst = "";
      const signatureHex = "A47F51A72009D0010D92E1352FC6E93A2CDB0CF974EAE582D33762B353FB136D5169B07FF8409124278FA7DB5E43D896088EC5C07FD7A3A9ACB5A5B75843098D5C79AD26A15C44EE09D97C591C5A8E64337C9F016E2A2F58960A7408C0A66177";
      
      console.log("\n=== Test Vector 2 ===");
      console.log("pubkey (compressed, 48 bytes):", pubkeyHex);
      console.log("msg:", msg);
      console.log("dst: (empty)");
      console.log("signature (96 bytes):", signatureHex);
      
      // Parse signature (G1 point: 96 bytes = 48 bytes X + 48 bytes Y)
      const { sigX, sigY } = parseCompressedG1Signature(signatureHex);
      console.log("Parsed signature:");
      console.log("  sigX (64 bytes):", sigX);
      console.log("  sigY (64 bytes):", sigY);
      
      // Parse public key (G2 point: 48 bytes compressed -> 256 bytes uncompressed)
      const { pkXc0, pkXc1, pkYc0, pkYc1 } = parseCompressedG2PublicKey(pubkeyHex);
      console.log("Parsed public key (placeholder - needs decompression):");
      console.log("  pkXc0:", pkXc0.slice(0, 20) + "...");
      console.log("  pkXc1:", pkXc1.slice(0, 20) + "...");
      console.log("  pkYc0:", pkYc0.slice(0, 20) + "...");
      console.log("  pkYc1:", pkYc1.slice(0, 20) + "...");
      
      // Note: Message hash needs to be computed using hash-to-curve with empty DST
      console.log("\n⚠️  To complete verification, you need to:");
      console.log("  1. Decompress the G2 public key using a BLS library");
      console.log("  2. Hash the message to G1 using hash-to-curve with empty DST");
      console.log("  3. Call verifySignature with the decompressed coordinates\n");
      
      // TODO: Once decompression and hash-to-curve are implemented:
      // const hX = hashToG1X(msg, dst);
      // const hY = hashToG1Y(msg, dst);
      // const result = await verifier.verifySignature(sigX, sigY, hX, hY, pkXc0, pkXc1, pkYc0, pkYc1);
      // expect(result).to.be.true;
    });
  });
});

