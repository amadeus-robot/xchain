export const BRIDGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || '';
export const MOCK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS || '';
export const ETHEREUM_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID || '11155111');

// Supported tokens for bridging
export const SUPPORTED_TOKENS = [
  {
    address: MOCK_TOKEN_ADDRESS,
    symbol: 'USDT',
    name: 'USDT',
    decimals: 18,
    logo: '/tokens/mock.png'
  },
  // Add more tokens here as needed
];

// ERC20 ABI (minimal for approve and balanceOf)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const;

