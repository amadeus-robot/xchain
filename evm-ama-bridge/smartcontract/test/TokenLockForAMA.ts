import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";

describe("TokenLockForAMATransparent", function () {
  let tokenLock: any;
  let token: any;
  let owner: Signer;
  let user: Signer;
  let other: Signer;
  let ownerAddress: string;
  let userAddress: string;

  const initialSupply = ethers.parseUnits("1000", 18);

  before(async function () {
    [owner, user, other] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    userAddress = await user.getAddress();

    // Deploy ERC20 mock
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy();
    await token.waitForDeployment();

    // Deploy TokenLockForAMATransparent with Transparent proxy
    const TokenLockTransparent = await ethers.getContractFactory("TokenLockForAMATransparent");
    tokenLock = await upgrades.deployProxy(TokenLockTransparent, [], {
      initializer: "initialize",
      kind: "transparent",
    });
    await tokenLock.waitForDeployment();

    // Transfer some tokens to user
    await token.transfer(userAddress, ethers.parseUnits("500", 18));
  });

  describe("Initialization", function () {
    it("should initialize with correct owner", async function () {
      expect(await tokenLock.owner()).to.equal(ownerAddress);
    });

    it("should have correct version", async function () {
      expect(await tokenLock.version()).to.equal("1.0.0");
    });

    it("should start unpaused", async function () {
      expect(await tokenLock.isPaused()).to.be.false;
    });

    it("should prevent re-initialization", async function () {
      await expect(tokenLock.initialize()).to.be.reverted;
    });
  });

  describe("Lock Function", function () {
    it("locks tokens correctly", async function () {
      const amount = ethers.parseUnits("50", 18);
      await token.connect(user).approve(tokenLock.target, amount);

      await expect(tokenLock.connect(user).lock(token.target, amount, "ama1address"))
        .to.emit(tokenLock, "Locked");
      
      const contractBalance = await token.balanceOf(tokenLock.target);
      expect(contractBalance).to.equal(amount);

      const totalLocked = await tokenLock.getTotalLocked(token.target);
      expect(totalLocked).to.equal(amount);
    });

    it("should lock multiple times and accumulate", async function () {
      const amount1 = ethers.parseUnits("50", 18);
      const amount2 = ethers.parseUnits("30", 18);

      await token.connect(user).approve(tokenLock.target, amount1 + amount2);

      await tokenLock.connect(user).lock(token.target, amount1, "ama1address");
      await tokenLock.connect(user).lock(token.target, amount2, "ama1address2");

      const totalLocked = await tokenLock.getTotalLocked(token.target);
      expect(totalLocked).to.equal(amount1 + amount2);
    });

    it("fails to lock with zero amount", async function () {
      await token.connect(user).approve(tokenLock.target, 0);
      await expect(tokenLock.connect(user).lock(token.target, 0, "ama1address"))
        .to.be.revertedWithCustomError(tokenLock, "InvalidAmount");
    });

    it("fails to lock with zero token address", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        tokenLock.connect(user).lock(ethers.ZeroAddress, amount, "ama1address")
      ).to.be.revertedWithCustomError(tokenLock, "InvalidToken");
    });

    it("fails to lock with empty targetAddress", async function () {
      const amount = ethers.parseUnits("10", 18);
      await token.connect(user).approve(tokenLock.target, amount);
      await expect(tokenLock.connect(user).lock(token.target, amount, ""))
        .to.be.revertedWithCustomError(tokenLock, "EmptyTargetAddress");
    });

    it("fails to lock without approval", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        tokenLock.connect(user).lock(token.target, amount, "ama1address")
      ).to.be.reverted;
    });

    it("fails to lock when paused", async function () {
      const amount = ethers.parseUnits("50", 18);
      await token.connect(user).approve(tokenLock.target, amount);
      
      await tokenLock.pause();
      
      await expect(
        tokenLock.connect(user).lock(token.target, amount, "ama1address")
      ).to.be.revertedWithCustomError(tokenLock, "ContractPaused");
      
      await tokenLock.unpause();
    });
  });

  describe("Unlock Function", function () {
    beforeEach(async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.connect(user).approve(tokenLock.target, amount);
      await tokenLock.connect(user).lock(token.target, amount, "ama1address");
    });

    it("unlocks tokens only by owner", async function () {
      const amount = ethers.parseUnits("50", 18);
      const initialBalance = await token.balanceOf(userAddress);

      await expect(tokenLock.unlock(token.target, userAddress, amount))
        .to.emit(tokenLock, "Unlocked");

      const finalBalance = await token.balanceOf(userAddress);
      expect(finalBalance - initialBalance).to.equal(amount);

      const totalLocked = await tokenLock.getTotalLocked(token.target);
      expect(totalLocked).to.equal(ethers.parseUnits("50", 18));
    });

    it("does not allow non-owner to unlock", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        tokenLock.connect(user).unlock(token.target, userAddress, amount)
      ).to.be.reverted;
    });

    it("fails to unlock with zero token address", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        tokenLock.unlock(ethers.ZeroAddress, userAddress, amount)
      ).to.be.revertedWithCustomError(tokenLock, "InvalidToken");
    });

    it("fails to unlock with zero receiver address", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        tokenLock.unlock(token.target, ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(tokenLock, "InvalidReceiver");
    });

    it("fails to unlock with zero amount", async function () {
      await expect(
        tokenLock.unlock(token.target, userAddress, 0)
      ).to.be.revertedWithCustomError(tokenLock, "InvalidAmount");
    });

    it("does not allow unlocking more than balance", async function () {
      const amount = ethers.parseUnits("300", 18);
      await expect(
        tokenLock.unlock(token.target, userAddress, amount)
      ).to.be.revertedWithCustomError(tokenLock, "InsufficientBalance");
    });
  });

  describe("Pause/Unpause", function () {
    it("should pause and unpause correctly", async function () {
      expect(await tokenLock.isPaused()).to.be.false;

      await expect(tokenLock.pause())
        .to.emit(tokenLock, "Paused")
        .withArgs(ownerAddress);

      expect(await tokenLock.isPaused()).to.be.true;

      await expect(tokenLock.unpause())
        .to.emit(tokenLock, "Unpaused")
        .withArgs(ownerAddress);

      expect(await tokenLock.isPaused()).to.be.false;
    });

    it("should fail when non-owner tries to pause", async function () {
      await expect(tokenLock.connect(user).pause()).to.be.reverted;
    });

    it("should fail when non-owner tries to unpause", async function () {
      await tokenLock.pause();
      await expect(tokenLock.connect(user).unpause()).to.be.reverted;
      await tokenLock.unpause();
    });
  });

  describe("View Functions", function () {
    it("should return correct total locked amount", async function () {
      const amount = ethers.parseUnits("75", 18);
      await token.connect(user).approve(tokenLock.target, amount);
      await tokenLock.connect(user).lock(token.target, amount, "ama1address");

      const totalLocked = await tokenLock.getTotalLocked(token.target);
      expect(totalLocked).to.equal(amount);
    });

    it("should return zero for token with no locks", async function () {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const newToken = await ERC20Mock.deploy();
      await newToken.waitForDeployment();

      const totalLocked = await tokenLock.getTotalLocked(newToken.target);
      expect(totalLocked).to.equal(0);
    });
  });
});
