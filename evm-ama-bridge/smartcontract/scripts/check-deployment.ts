import { ethers, upgrades } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";

  if (!PROXY_ADDRESS) {
    throw new Error("Please set PROXY_ADDRESS environment variable");
  }

  console.log("Checking deployment at:", PROXY_ADDRESS);
  console.log("=====================================\n");

  try {
    // Get contract instance
    const tokenLock = await ethers.getContractAt("TokenLockForAMAUpgradeable", PROXY_ADDRESS);

    // Get proxy admin addresses
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    const adminAddress = await upgrades.erc1967.getAdminAddress(PROXY_ADDRESS);

    // Get contract state
    const owner = await tokenLock.owner();
    const version = await tokenLock.version();
    const isPaused = await tokenLock.isPaused();

    console.log("📋 Contract Information:");
    console.log("  Proxy Address:", PROXY_ADDRESS);
    console.log("  Implementation:", implementationAddress);
    console.log("  Admin Address:", adminAddress);
    console.log("  Owner:", owner);
    console.log("  Version:", version);
    console.log("  Is Paused:", isPaused);

    // Check if it's V2
    try {
      const minLockAmount = await tokenLock.getMinLockAmount();
      console.log("  Min Lock Amount:", ethers.formatEther(minLockAmount), "tokens");
      console.log("  Contract Type: V2");
    } catch {
      console.log("  Contract Type: V1");
    }

    console.log("\n📊 Network Information:");
    const network = await ethers.provider.getNetwork();
    console.log("  Network:", network.name);
    console.log("  Chain ID:", network.chainId.toString());

    console.log("\n💰 Owner Balance:");
    const balance = await ethers.provider.getBalance(owner);
    console.log("  ", ethers.formatEther(balance), "ETH");

    console.log("\n✅ Contract is operational!");
    console.log("=====================================");

  } catch (error: any) {
    console.error("\n❌ Error checking deployment:");
    console.error(error.message);
    console.log("\nMake sure:");
    console.log("1. The PROXY_ADDRESS is correct");
    console.log("2. You're connected to the right network");
    console.log("3. The contract is deployed at that address");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

