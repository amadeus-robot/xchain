'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { BRIDGE_CONTRACT_ADDRESS, SUPPORTED_TOKENS } from '@/lib/constants';
import TokenLockABI from '@/lib/abi/TokenLockForAMA.json';
import ERC20ABI from '@/lib/abi/ERC20.json';
export function BridgeForm() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [amaAddress, setAmaAddress] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'bridge' | 'success'>('input');

  const { writeContract: approveToken, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: lockTokens, data: lockHash, isPending: isLocking } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isLockConfirming, isSuccess: isLockSuccess } = useWaitForTransactionReceipt({
    hash: lockHash,
  });

  // Read token balance
  const { data: balance } = useReadContract({
    address: selectedToken.address as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!selectedToken.address,
    },
  });

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken.address as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, BRIDGE_CONTRACT_ADDRESS as `0x${string}`],
    query: {
      enabled: !!address && !!selectedToken.address && !!BRIDGE_CONTRACT_ADDRESS,
    },
  });

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep('bridge');
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isLockSuccess && lockHash) {
      // Send transaction hash to API
      fetch('https://cloudflare.amadeusprotocolxyz.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txhash: lockHash,
        }),
      })
        .then(response => response.json())
        .then(data => {
          console.log('Transaction hash sent successfully:', data);
        })
        .catch(error => {
          console.error('Error sending transaction hash:', error);
        });

      setStep('success');
      setAmount('');
      setAmaAddress('');
    }
  }, [isLockSuccess, lockHash]);

  const handleApprove = async () => {
    if (!amount || !selectedToken.address) return;

    try {
      const amountInWei = parseUnits(amount, selectedToken.decimals);
      setStep('approve');
      
      approveToken({
        address: selectedToken.address as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [BRIDGE_CONTRACT_ADDRESS as `0x${string}`, amountInWei],
      });
    } catch (error) {
      console.error('Approve error:', error);
      setStep('input');
    }
  };

  const handleBridge = async () => {
    if (!amount || !amaAddress || !selectedToken.address) return;

    try {
      const amountInWei = parseUnits(amount, selectedToken.decimals);
      
      lockTokens({
        address: BRIDGE_CONTRACT_ADDRESS as `0x${string}`,
        abi: TokenLockABI,
        functionName: 'lock',
        args: [selectedToken.address as `0x${string}`, amountInWei, amaAddress],
      });
    } catch (error) {
      console.error('Bridge error:', error);
      setStep('input');
    }
  };

  const needsApproval = () => {
    if (!amount || !allowance) return true;
    try {
      const amountInWei = parseUnits(amount, selectedToken.decimals);
      return BigInt(allowance.toString()) < BigInt(amountInWei.toString());
    } catch {
      return true;
    }
  };

  const isFormValid = () => {
    if (!amount || !amaAddress) return false;
    try {
      const amountNum = parseFloat(amount);
      return amountNum > 0 && amaAddress.length > 0;
    } catch {
      return false;
    }
  };

  const formatBalance = () => {
    if (!balance) return '0';
    return formatUnits(balance as bigint, selectedToken.decimals);
  };

  const setMaxAmount = () => {
    if (balance) {
      setAmount(formatBalance());
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to use the bridge</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bridge Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your tokens have been locked and will be released on AMA chain
          </p>
          {lockHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${lockHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              View on Etherscan
            </a>
          )}
          <button
            onClick={() => setStep('input')}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Bridge More Tokens
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Bridge ETH → AMA</h2>

      {/* Token Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Token
        </label>
        <select
          value={selectedToken.address}
          onChange={(e) => {
            const token = SUPPORTED_TOKENS.find(t => t.address === e.target.value);
            if (token) setSelectedToken(token);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={step !== 'input'}
        >
          {SUPPORTED_TOKENS.map((token) => (
            <option key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <span className="text-sm text-gray-500">
            Balance: {formatBalance()} {selectedToken.symbol}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={step !== 'input'}
            step="any"
          />
          <button
            onClick={setMaxAmount}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
            disabled={step !== 'input'}
          >
            MAX
          </button>
        </div>
      </div>

      {/* AMA Address Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AMA Destination Address
        </label>
        <input
          type="text"
          value={amaAddress}
          onChange={(e) => setAmaAddress(e.target.value)}
          placeholder="Enter your AMA address"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={step !== 'input'}
        />
      </div>

      {/* Bridge Info */}
      {amount && (
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">You will receive:</span>
            <span className="font-semibold text-gray-800">
              {amount} {selectedToken.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated time:</span>
            <span className="font-semibold text-gray-800">~5-10 minutes</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {step === 'input' && needsApproval() ? (
        <button
          onClick={handleApprove}
          disabled={!isFormValid() || isApproving}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? 'Approving...' : 'Approve Token'}
        </button>
      ) : step === 'approve' ? (
        <button
          disabled
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold opacity-50 cursor-not-allowed"
        >
          {isApproveConfirming ? 'Confirming Approval...' : 'Approving...'}
        </button>
      ) : step === 'bridge' ? (
        <button
          onClick={handleBridge}
          disabled={!isFormValid() || isLocking}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocking ? 'Bridging...' : isLockConfirming ? 'Confirming...' : 'Bridge Tokens'}
        </button>
      ) : (
        <button
          onClick={handleBridge}
          disabled={!isFormValid() || isLocking}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocking ? 'Bridging...' : 'Bridge Tokens'}
        </button>
      )}

      {/* Transaction Status */}
      {(approveHash || lockHash) && (
        <div className="mt-4 text-center text-sm">
          {approveHash && step === 'approve' && (
            <a
              href={`https://sepolia.etherscan.io/tx/${approveHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View approval transaction
            </a>
          )}
          {lockHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${lockHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View bridge transaction
            </a>
          )}
        </div>
      )}
    </div>
  );
}


