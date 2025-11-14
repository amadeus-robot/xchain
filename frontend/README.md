# ETH-AMA Bridge Frontend

A modern, user-friendly frontend for the ETH to AMA cross-chain bridge built with Next.js, React, and RainbowKit.

## ✨ Features

- 🔗 **Wallet Connection**: Connect with MetaMask, WalletConnect, and other popular wallets via RainbowKit
- 💱 **Token Bridging**: Select tokens and bridge them from Ethereum to AMA chain
- 📊 **Real-time Balance**: View your token balances in real-time
- ✅ **Transaction Tracking**: Monitor approval and bridge transactions with Etherscan links
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- ⚡ **Fast & Secure**: Built with TypeScript for type safety and reliability

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
# Contract Configuration
NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS=0xYourBridgeContractAddress
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=0x6c41a5b36aE0EBf2bef9C0ccD81aC10487B5Baf8

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

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page with bridge interface
│   └── globals.css         # Global styles
├── components/
│   ├── BridgeForm.tsx      # Main bridge form component
│   ├── Header.tsx          # Header with wallet connection
│   ├── Footer.tsx          # Footer component
│   └── Providers.tsx       # Web3 providers wrapper
├── lib/
│   ├── wagmi.ts           # Wagmi configuration
│   ├── constants.ts       # Contract addresses and ABIs
│   └── abi/
│       └── TokenLockForAMA.json  # Bridge contract ABI
├── .env.local             # Environment variables (create from .env.example)
└── package.json           # Dependencies
```

## 🔧 Configuration

### Supported Networks

Currently configured for:
- **Ethereum Sepolia Testnet** (Chain ID: 11155111)

To add more networks, update `lib/wagmi.ts`:

```typescript
import { sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  // ...
  chains: [sepolia, mainnet],
  // ...
});
```

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

## 🎯 How to Use

1. **Connect Wallet**: Click "Connect Wallet" in the header
2. **Select Token**: Choose the token you want to bridge
3. **Enter Amount**: Input the amount to bridge (or click MAX)
4. **Enter AMA Address**: Provide your destination address on AMA chain
5. **Approve Token**: First approve the bridge contract to spend your tokens
6. **Bridge**: Execute the bridge transaction
7. **Wait**: Tokens will be released on AMA chain after confirmation

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **TanStack Query** - Data fetching and caching

## 🔐 Security Notes

- Never commit `.env.local` to version control
- Always verify contract addresses before bridging
- Test with small amounts first on testnet
- Keep your private keys secure
- Verify transactions on Etherscan before confirming

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS` | Bridge contract address | Yes |
| `NEXT_PUBLIC_MOCK_TOKEN_ADDRESS` | Token contract address | Yes |
| `NEXT_PUBLIC_ETHEREUM_CHAIN_ID` | Ethereum chain ID | Yes |
| `NEXT_PUBLIC_ETHEREUM_RPC_URL` | RPC endpoint URL | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Yes |

## 🐛 Troubleshooting

**Wallet not connecting?**
- Make sure you're on the correct network (Sepolia)
- Try refreshing the page
- Clear browser cache and reconnect

**Transaction failing?**
- Ensure you have enough ETH for gas fees
- Check if you've approved the token first
- Verify the contract address is correct

**Balance not showing?**
- Wait a few seconds for the blockchain to sync
- Refresh the page
- Check if you're connected to the right network

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js, RainbowKit, and Wagmi
