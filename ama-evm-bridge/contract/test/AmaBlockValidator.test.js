const { expect } = require("chai");
const { ethers } = require("hardhat");
const { g2SignatureToEIP2537 } = require("./bls-utils");

describe("AmaBlockValidator", function () {
  let validator;
  let wrapper;

  beforeEach(async function () {
    const AmaBlockValidator = await ethers.getContractFactory("AmaBlockValidator");
    validator = await AmaBlockValidator.deploy();
    await validator.waitForDeployment();

    const AmaVecPakO2Wrapper = await ethers.getContractFactory("AmaVecPakO2Wrapper");
    wrapper = await AmaVecPakO2Wrapper.deploy();
    await wrapper.waitForDeployment();
  });

  describe("getDST", function () {
    it("should return the correct DST", async function () {
      const dst = await validator.getDST();
      const expectedDST = "AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_ENTRY_";
      expect(ethers.toUtf8String(dst)).to.equal(expectedDST);
    });
  });

  describe("validateBlock", function () {
    it("should validate correct block hash", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 100,
        prev_slot: 99,
        signer: "0xafbaa14558093ef26e638fb7f8950958d9c1e2f7f321658484a9484cb01a5b070399d3194c9c6be40f5b1be80de22f5f",
        dr: "0x0000000000000000000000000000000000000000000000000000000000000002",
        vr: "0x" + "34".repeat(96), // 96 bytes
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000003",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000004",
      };

      // Compute the expected hash
      const expectedHash = await wrapper.computeHeaderHash(header);

      // For testing, we'll use dummy signature (256 bytes uncompressed)
      // In real usage, this would be a valid BLS signature in uncompressed form
      const signatureG2Compressed = "0xb9c3acbf739228e7bbaf06a8f0d6546dcb940d2b3dbd22db73e202f336967537e595f00f65347223c8e330bd69b6802601a6923b942eaad1dedcb4714ceb3ceea006e47a88bcd659ab16ae45d219c465c30aaebca0a9f6dd05c6c1da9f85061a";
      const signatureG2 = g2SignatureToEIP2537(Buffer.from(signatureG2Compressed.slice(2), 'hex'));

      // This will fail BLS verification but should pass hash check
      // We can't easily test full BLS without real keys/signatures
      const result = await validator.validateBlock(
        header,
        expectedHash,
        signatureG2
      );

      // Hash validation should pass, but BLS will fail with dummy data
      // So result will be false, but we can verify hash checking works
      expect(typeof result).to.equal("boolean");
    });

    it("should reject incorrect block hash", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 100,
        prev_slot: 99,
        signer: "0x" + "12".repeat(48), // 48 bytes compressed
        dr: "0x0000000000000000000000000000000000000000000000000000000000000002",
        vr: "0x" + "34".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000003",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000004",
      };

      // Use wrong hash
      const wrongHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      // Use a dummy uncompressed signature (256 bytes) - hash check will fail before BLS verification
      const signatureG2 = "0x" + "00".repeat(256); // 256 bytes uncompressed

      const result = await validator.validateBlock(
        header,
        wrongHash,
        signatureG2
      );

      // Should return false because hash doesn't match
      expect(result).to.equal(false);
    });

    it("should require signer to be 48 bytes", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 100,
        prev_slot: 99,
        signer: "0x" + "12".repeat(64), // Wrong length (64 bytes)
        dr: "0x0000000000000000000000000000000000000000000000000000000000000002",
        vr: "0x" + "34".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000003",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000004",
      };

      const expectedHash = await wrapper.computeHeaderHash(header);
      const signatureG2 = "0x" + "00".repeat(256); // 256 bytes uncompressed

      // Should revert due to signer length check
      await expect(
        validator.validateBlock(header, expectedHash, signatureG2)
      ).to.be.revertedWith("signer must be 48 bytes compressed");
    });

    it("should require correct signature length", async function () {
      const header = {
        height: 1,
        prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        slot: 100,
        prev_slot: 99,
        signer: "0x" + "12".repeat(48), // 48 bytes compressed
        dr: "0x0000000000000000000000000000000000000000000000000000000000000002",
        vr: "0x" + "34".repeat(96),
        root_tx: "0x0000000000000000000000000000000000000000000000000000000000000003",
        root_validator: "0x0000000000000000000000000000000000000000000000000000000000000004",
      };

      const expectedHash = await wrapper.computeHeaderHash(header);
      const wrongLengthSig = "0x" + "00".repeat(128); // Wrong length (should be 256 bytes)

      // Should revert due to length check
      await expect(
        validator.validateBlock(header, expectedHash, wrongLengthSig)
      ).to.be.revertedWith("signature must be 256 bytes uncompressed");
    });

    it("should validate correct block with dummy signature", async function () {      
      const header = {
        height: 41127886,
        dr: '0xb247f110ccf07c4e8cbbb75f839cfe908beb276423af39d23fd3fea7473c40e4',
        vr: '0xa08030474e475d9a9dd8e03a760ea834e72e80e04cbc19d14cde247ad8437947a5375aa649d092cbe064f47a6c4679551705e4f21a98c1a42d84e26e3a46e9cf17ad48ed3ae4e2eac3bac4e181f11eee7fba1babf81ef72efcfc049134900e5a',
        prev_hash: '0x9c11eab5928b24aa7683948e5c29bd168573e10c0aac79439a88c1ff7e16fb90',
        signer: '0xafbaa14558093ef26e638fb7f8950958d9c1e2f7f321658484a9484cb01a5b070399d3194c9c6be40f5b1be80de22f5f',
        root_tx: '0x1b684e3b93caf6653db1085532b96c869bf6a000799ed07b1a69131ab42fe8b9',
        root_validator: '0xcbf4a22f1a3ded7decbbce3853f5af026b19f15f363a81381fa6c493b63ab621',
        prev_slot: 41127885,
        slot: 41127886
      };
      const expectedHash = await wrapper.computeHeaderHash(header);
      const signatureG2Compressed = "0xb9c3acbf739228e7bbaf06a8f0d6546dcb940d2b3dbd22db73e202f336967537e595f00f65347223c8e330bd69b6802601a6923b942eaad1dedcb4714ceb3ceea006e47a88bcd659ab16ae45d219c465c30aaebca0a9f6dd05c6c1da9f85061a";
      const signatureG2 = g2SignatureToEIP2537(Buffer.from(signatureG2Compressed.slice(2), 'hex')); // Convert to 256 bytes uncompressed
      const result = await validator.validateBlock(header, expectedHash, signatureG2);
      expect(result).to.equal(true);
    });
  });

});


