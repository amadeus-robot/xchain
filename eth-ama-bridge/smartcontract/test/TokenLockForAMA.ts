import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("TokenLockForAMA", function () {
  let tokenLock: Contract;
  let token: Contract;
  let owner: Signer;
  let user: Signer;
  let other: Signer;

  const initialSupply = ethers.parseUnits("1000", 18);

  before(async function () {
    [owner, user, other] = await ethers.getSigners();

    // Deploy ERC20 mock
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy();
    await token.waitForDeployment();

    // Deploy TokenLockForAMA
    const TokenLock = await ethers.getContractFactory("TokenLockForAMA");
    tokenLock = await TokenLock.deploy();
    await tokenLock.waitForDeployment();

    // Transfer some tokens to user
    await token.transfer(await user.getAddress(), ethers.parseUnits("500", 18));
  });

  it("locks tokens correctly", async function () {
    const amount = ethers.parseUnits("50", 18);
    await token.connect(user).approve(tokenLock.target, amount);

    await expect(tokenLock.connect(user).lock(token.target, amount, "ama1address"))
      .to.emit(tokenLock, "Locked")
    const contractBalance = await token.balanceOf(tokenLock.target);
    expect(contractBalance).to.equal(amount);
  });

  it("fails to lock with zero amount", async function () {
    await token.connect(user).approve(tokenLock.target, 0);
    await expect(tokenLock.connect(user).lock(token.target, 0, "ama1address"))
      .to.be.revertedWith("Invalid amount");
  });

  it("fails to lock with empty targetAddress", async function () {
    const amount = ethers.parseUnits("10", 18);
    await token.connect(user).approve(tokenLock.target, amount);
    await expect(tokenLock.connect(user).lock(token.target, amount, ""))
      .to.be.revertedWith("Empty target address");
  });

  it("unlocks tokens only by owner", async function () {
    const amount = ethers.parseUnits("50", 18);
    await token.connect(user).approve(tokenLock.target, amount);
    await tokenLock.connect(user).lock(token.target, amount, "ama1address");

    await expect(tokenLock.unlock(token.target, await user.getAddress(), amount))
      .to.emit(tokenLock, "Unlocked")
  });

  it("does not allow non-owner to unlock", async function () {
    const amount = ethers.parseUnits("50", 18);
    await token.connect(user).approve(tokenLock.target, amount);
    await tokenLock.connect(user).lock(token.target, amount, "ama1address");

    await expect(tokenLock.connect(user).unlock(token.target, await user.getAddress(), amount))
      .to.be.reverted;
  });

  it("does not allow unlocking more than balance", async function () {
    const amount = ethers.parseUnits("50", 18);
    await token.connect(user).approve(tokenLock.target, amount);
    await tokenLock.connect(user).lock(token.target, amount, "ama1address");

    await expect(tokenLock.unlock(token.target, await user.getAddress(), ethers.parseUnits("300", 18)))
      .to.be.reverted;
  });
});
