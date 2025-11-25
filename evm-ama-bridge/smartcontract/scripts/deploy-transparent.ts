import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Deploying TokenLockForAMATransparent with Transparent proxy...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy the upgradeable contract with Transparent proxy
  const TokenLockForAMATransparent = await ethers.getContractFactory("TokenLockForAMATransparent");
  
  console.log("Deploying proxy, implementation, and ProxyAdmin...");
  const tokenLock = await upgrades.deployProxy(
    TokenLockForAMATransparent,
    [],
    {
      initializer: "initialize",
      kind: "transparent", // Using Transparent proxy pattern
    }
  );

  await tokenLock.waitForDeployment();

  const proxyAddress = await tokenLock.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("\n✅ Deployment successful!");
  console.log("==================================");
  console.log("Proxy address:", proxyAddress);
  console.log("Implementation address:", implementationAddress);
  console.log("ProxyAdmin address:", adminAddress);
  console.log("Owner:", await tokenLock.owner());
  console.log("Version:", await tokenLock.version());
  console.log("Is Paused:", await tokenLock.isPaused());
  console.log("==================================");
  console.log("\n📝 Important Notes:");
  console.log("- Users interact with: " + proxyAddress);
  console.log("- ProxyAdmin controls upgrades: " + adminAddress);
  console.log("- ProxyAdmin owner: " + deployer.address);
  console.log("- Contract owner (for lock/unlock): " + await tokenLock.owner());
  console.log("==================================\n");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    proxy: proxyAddress,
    implementation: implementationAddress,
    proxyAdmin: adminAddress,
    owner: await tokenLock.owner(),
    proxyAdminOwner: deployer.address,
    version: await tokenLock.version(),
    proxyType: "Transparent",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  // Verify on Etherscan (if not local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) {
    console.log("\nWaiting for block confirmations...");
    await tokenLock.deploymentTransaction()?.wait(5);
    
    console.log("\nVerifying implementation contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("✅ Implementation contract verified!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Implementation contract is already verified!");
      } else {
        console.error("Verification failed:", error);
      }
    }
  }

  console.log("\n🎉 Next Steps:");
  console.log("1. Save the proxy address:", proxyAddress);
  console.log("2. Test the contract functions");
  console.log("3. To upgrade later, use: npm run upgrade:transparent:v2");
  console.log("   with PROXY_ADDRESS=" + proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

