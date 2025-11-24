export const BRIDGE_CONTRACT_ADDRESS = "0x9bA6287bFe540674eEB71d7fc8A5Ca25103e19B1";
export const USDT_TOKEN_ADDRESS = "0x6c41a5b36aE0EBf2bef9C0ccD81aC10487B5Baf8";
export const ETHEREUM_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID || '11155111');

// Supported tokens for bridging
export const SUPPORTED_TOKENS = [
  {
    address: USDT_TOKEN_ADDRESS,
    symbol: 'USDT',
    name: 'USDT',
    decimals: 18
  },
  // Add more tokens here as needed
];


