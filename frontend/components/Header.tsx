'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ETH-AMA Bridge</h1>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}

