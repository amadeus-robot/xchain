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
							Seamlessly transfer tokens from Ethereum, BSC, or Base to AMA chain. 
							Fast, secure, and decentralized cross-chain bridging.
						</p>
					</div>
					
					<div className="flex justify-center">
						<BridgeForm />
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
}
