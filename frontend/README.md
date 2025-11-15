
## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Web3 wallet (MetaMask recommended)
- Sepolia testnet ETH for gas fees

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Copy `.env.example` to `.env.local` and update the values:

```env
# Network Configuration
NEXT_PUBLIC_ETHEREUM_CHAIN_ID=11155111
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

3. **Run the development server:**

```bash
npm run dev
```

4. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)


## 🔧 Configuration

### Supported Networks

Currently configured for:
- **Ethereum Sepolia Testnet** (Chain ID: 11155111)

To add more networks, update `lib/wagmi.ts`:


### Adding More Tokens

Edit `lib/constants.ts` to add more supported tokens:

```typescript
export const SUPPORTED_TOKENS = [
  {
    address: '0x...',
    symbol: 'TOKEN',
    name: 'Token Name',
    decimals: 18,
    logo: '/tokens/token.png'
  },
  // Add more tokens here
];
```
