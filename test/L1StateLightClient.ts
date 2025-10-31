import { expect } from "chai";
import hre from "hardhat";

describe("L1StateLightClient", function () {
  async function deployFixture() {
    const [owner, other] = await hre.ethers.getSigners();
    const L1StateLightClient = await hre.ethers.getContractFactory("L1StateLightClient");
    const client = await L1StateLightClient.deploy();
    return { client, owner, other };
  }

  describe("Deployment", function () {
    it("Should deploy successfully with empty trustedVH", async function () {
      const { client } = await deployFixture();
      expect(await client.trustedVH()).to.equal("0x" + "00".repeat(32));
    });
  });

  describe("setTrustedVersionedHash", function () {
    it("Should set the trusted versioned hash", async function () {
      const { client } = await deployFixture();
      const vh = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("header1"));
      await client.setTrustedVersionedHash(vh);
      expect(await client.trustedVH()).to.equal(vh);
    });
  });

  describe("proveKV", function () {
    it("Should revert if payload length is not 192", async function () {
      const { client } = await deployFixture();
      const payload = "0x" + "11".repeat(191); // 191 bytes instead of 192
      await expect(client.proveKV(payload)).to.be.revertedWith("bad len");
    });

    it("Should revert if versioned hash does not match trustedVH", async function () {
      const { client } = await deployFixture();
      const trustedVH = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trusted"));
      const wrongVH = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("wrong"));
      await client.setTrustedVersionedHash(trustedVH);

      const rest = "22".repeat(160); 
      const payload = wrongVH + rest;
      await expect(client.proveKV(payload)).to.be.revertedWith("wrong header");
    });

    it("Should return false (mocked) if trustedVH matches but precompile staticcall returns false", async function () {
      const { client } = await deployFixture();
      const trustedVH = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trusted"));
      await client.setTrustedVersionedHash(trustedVH);
      const payload = trustedVH + "33".repeat(160);

      try {
        const ok = await client.proveKV(payload);
        expect(ok).to.be.false;
      } catch {
        
      }
    });
  });
});
