import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import 'dotenv/config'
const config: HardhatUserConfig = {
  solidity:{ 
    version: "0.8.28",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/oFfvEpXYjGo8Nj4QQIkU3kXd6Z0JvfJZ",
  		accounts: process.env.PRIVKEY ? [process.env.PRIVKEY] : []
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://base-mainnet.g.alchemy.com/v2/VwsudXzil6Fin9wYCZCp8HU4_zm5LYQM",
  		accounts: process.env.PRIVKEY ? [process.env.PRIVKEY] : []
    },
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      accounts: process.env.PRIVKEY ? [process.env.PRIVKEY] : []
    }
  },
  etherscan: {
    apiKey:"R7H3F4JMH3ZD5SBMMTR4KJP2H6AIPJE6AW",
  }
};

export default config;
