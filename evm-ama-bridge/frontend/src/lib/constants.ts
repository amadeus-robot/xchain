// Chain configuration for multi-chain support
export interface ChainConfig {
  chainId: number;
  name: string;
  bridgeContract: string;
  explorerUrl: string;
  tokens: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  }[];
}

export const CHAIN_CONFIGS: { [key: number]: ChainConfig } = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum',
    bridgeContract: '0x14B36Cf405592eA2354f896d6f9568c01577FdBe',
    explorerUrl: 'https://etherscan.io',
    tokens: [
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6
      }
    ]
  },
  // BSC Mainnet
  56: {
    chainId: 56,
    name: 'BSC',
    bridgeContract: process.env.NEXT_PUBLIC_BSC_BRIDGE_CONTRACT || '0x57611547BbE6B8b566c87759d1ad2706d05Ab895',
    explorerUrl: 'https://bscscan.com',
    tokens: [
      {
        address: process.env.NEXT_PUBLIC_BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18
      }
    ]
  },
  // Base Mainnet
  8453: {
    chainId: 8453,
    name: 'Base',
    bridgeContract: process.env.NEXT_PUBLIC_BASE_BRIDGE_CONTRACT || '0x9bA6287bFe540674eEB71d7fc8A5Ca25103e19B1',
    explorerUrl: 'https://basescan.org',
    tokens: [
      {
        address: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      }
    ]
  }
};

// Helper functions to get chain-specific data
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return CHAIN_CONFIGS[chainId];
};

export const getBridgeContractAddress = (chainId: number): string => {
  return CHAIN_CONFIGS[chainId]?.bridgeContract || '';
};

export const getSupportedTokens = (chainId: number) => {
  return CHAIN_CONFIGS[chainId]?.tokens || [];
};

export const getExplorerUrl = (chainId: number): string => {
  return CHAIN_CONFIGS[chainId]?.explorerUrl || 'https://etherscan.io';
};

// Backward compatibility (defaults to Ethereum mainnet)
export const BRIDGE_CONTRACT_ADDRESS = CHAIN_CONFIGS[1].bridgeContract;
export const USDT_TOKEN_ADDRESS = CHAIN_CONFIGS[1].tokens[0].address;
export const ETHEREUM_CHAIN_ID = 1;
export const SUPPORTED_TOKENS = CHAIN_CONFIGS[1].tokens;


