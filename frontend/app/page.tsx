import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BridgeForm } from "@/components/BridgeForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Bridge Your Tokens
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Seamlessly transfer tokens from Ethereum to AMA chain. 
              Fast, secure, and decentralized cross-chain bridging.
            </p>
          </div>
          
          <div className="flex justify-center">
            <BridgeForm />
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Fast Transfers</h3>
              <p className="text-gray-600 text-sm">
                Bridge your tokens in minutes with our optimized protocol
              </p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Secure</h3>
              <p className="text-gray-600 text-sm">
                Smart contracts audited and battle-tested for your safety
              </p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Low Fees</h3>
              <p className="text-gray-600 text-sm">
                Minimal gas costs for cross-chain token transfers
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
