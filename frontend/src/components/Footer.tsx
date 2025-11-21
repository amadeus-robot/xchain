'use client';

export function Footer() {
  return (
    <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
              <p className="text-gray-600 text-sm">
                Secure cross-chain bridge between Ethereum and AMA networks.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Network</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Sepolia Testnet</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>© 2025 ETH-AMA Bridge. Built with Next.js and RainbowKit.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}


