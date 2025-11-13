import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
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
      url: "https://eth-sepolia.g.alchemy.com/v2/oFfvEpXYjGo8Nj4QQIkU3kXd6Z0JvfJZ",
  		accounts : [process.env.PRIVKEY]
    },
    base: {
      url: "https://base-mainnet.g.alchemy.com/v2/VwsudXzil6Fin9wYCZCp8HU4_zm5LYQM",
  		accounts : [process.env.PRIVKEY]
    }
  },
  etherscan: {
    apiKey:"RDBJ8KGXNEUNKFCAWKAMTVAK6UKWHF47HI"
  }
};

export default config;
