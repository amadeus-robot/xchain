'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, bsc, base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ETH-AMA Bridge',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo_project_id',
  chains: [mainnet, bsc, base],
  ssr: true,
});


