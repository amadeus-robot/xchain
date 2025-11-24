/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { ethers } from 'ethers';
import LockContractAbi from './abi/LockContractAbi.json';
import { from_b58, build_tx, to_b58 } from './utils/utils';

/**
 * Decode logs from a transaction receipt
 * @param receipt - Transaction receipt containing logs
 * @param abi - Optional ABI array to decode events. If not provided, logs will be returned as raw data
 * @returns Array of decoded log events
 */
async function decodeLogs(receipt: ethers.TransactionReceipt | null, abi?: ethers.InterfaceAbi): Promise<any[]> {
	if (!receipt || !receipt.logs || receipt.logs.length === 0) {
		return [];
	}

	const decodedLogs: any[] = [];

	// If ABI is provided, create an interface for decoding
	let iface: ethers.Interface | null = null;
	if (abi) {
		try {
			iface = new ethers.Interface(abi);
		} catch (err) {
			console.error('Failed to create interface from ABI:', err);
			return decodedLogs;
		}
	}

	receipt.logs.forEach((log) => {
		const logEntry: any = {
			address: log.address,
			topics: log.topics,
			data: log.data,
			index: log.index,
			blockNumber: log.blockNumber,
			blockHash: log.blockHash,
			transactionHash: log.transactionHash,
			transactionIndex: log.transactionIndex,
		};

		// Try to decode if interface is available
		if (iface) {
			try {
				const decoded = iface.parseLog({
					topics: log.topics as string[],
					data: log.data,
				});
				if (decoded) {
					logEntry.eventName = decoded.name;
					logEntry.args = decoded.args.map((arg: any) => {
						// Convert BigNumber to string for JSON serialization
						if (typeof arg === 'bigint') {
							return arg.toString();
						}
						return arg;
					});
					logEntry.decoded = true;
				} else {
					logEntry.decoded = false;
					logEntry.message = 'Could not decode log';
				}
			} catch (err) {
				// Not from this contract or can't decode
				logEntry.decoded = false;
				logEntry.error = err instanceof Error ? err.message : 'Unknown decoding error';
			}
		} else {
			logEntry.decoded = false;
			logEntry.message = 'No ABI provided for decoding';
		}

		decodedLogs.push(logEntry);
	});

	return decodedLogs;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// CORS configuration
		const corsHeaders = {
			'Access-Control-Allow-Origin': 'https://my-next-app.amadeusprotocolxyz.workers.dev',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400',
		};

		// Handle OPTIONS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		// Handle POST requests
		if (request.method === 'POST') {
			try {
				// Parse the request body
				const contentType = request.headers.get('content-type') || '';
				let txhash: string;

				if (contentType.includes('application/json')) {
					const body = await request.json() as { txhash?: string };
					txhash = body.txhash || '';
				} else if (contentType.includes('application/x-www-form-urlencoded')) {
					const formData = await request.formData();
					txhash = formData.get('txhash')?.toString() || '';
				} else {
					// Try to parse as JSON anyway
					const body = await request.json() as { txhash?: string };
					txhash = body.txhash || '';
				}

				// Validate txhash
				if (!txhash || txhash.trim() === '') {
					return new Response(
						JSON.stringify({ error: 'txhash is required' }),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				}

				// Validate txhash format (should be a valid hex string)
				if (!ethers.isHexString(txhash)) {
					return new Response(
						JSON.stringify({ error: 'Invalid transaction hash format' }),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				}

				// Get RPC URL from environment or use default public RPC
				const rpcUrl = (env as { RPC_URL?: string }).RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/SurwjWo5gaGSMhdiImAp_';
				const provider = new ethers.JsonRpcProvider(rpcUrl);

				// Fetch transaction data
				const tx = await provider.getTransaction(txhash);
				
				if (!tx) {
					return new Response(
						JSON.stringify({ error: 'Transaction not found' }),
						{
							status: 404,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				}

				// Get transaction receipt for additional data
				const receipt = await provider.getTransactionReceipt(txhash);

				// Decode logs using the local ABI
				const decodedLogs = await decodeLogs(receipt, LockContractAbi as ethers.InterfaceAbi);

				// Filter for 'Locked' events and extract specific arguments
				const lockedEvents = decodedLogs
					.filter((log) => log.eventName === 'Locked' && log.decoded && log.args && log.args.length >= 4)
					.map((log) => ({
						tokenAddress: log.args[0], // First arg: Token address
						fromAccount: log.args[1],  // Second arg: from account (user)
						amount: log.args[2],        // Third arg: amount
						targetAddress: log.args[3], // Fourth arg: targetAddress
						// Include additional log metadata if needed
						blockNumber: log.blockNumber,
						transactionHash: log.transactionHash,
						logIndex: log.index,
					}));
				// Check if we have locked events
				if (!lockedEvents || lockedEvents.length === 0) {
					return new Response(
						JSON.stringify({ error: 'No Locked events found in transaction' }),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				}

				const realAmount = Number(lockedEvents[0].amount) / 10**6;
				const packedTx = build_tx(
					"Coin", 
					"transfer", 
					[
						from_b58(lockedEvents[0].targetAddress), 
						Number(realAmount*1000000000).toString(), 
						"AMA"
					], 
					(env as { SEED?: string }).SEED as string
				);
				
				console.log(to_b58(packedTx), "+++++");
				// Submit packed transaction to the API
				let submitResponse;
				try {
					submitResponse = await fetch(`${(env as { API_HOST?: string }).API_HOST}/api/tx/submit_and_wait`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/octet-stream',
						},
						body: packedTx,
					});

					const submitResult = await submitResponse.json();
					console.log(submitResult, "+++++");
					return new Response(
						JSON.stringify({
							success: true,
							txhash: txhash,
							lockedEvents: lockedEvents,
							submittedTx: {
								status: submitResponse.status,
								response: submitResult,
							},
						}),
						{
							status: 200,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				} catch (submitError) {
					return new Response(
						JSON.stringify({
							error: 'Failed to submit transaction',
							message: submitError instanceof Error ? submitError.message : 'Unknown error',
							lockedEvents: lockedEvents,
						}),
						{
							status: 500,
							headers: { 'Content-Type': 'application/json', ...corsHeaders },
						}
					);
				}
			} catch (error) {
				// Handle different types of errors
				let status = 500;
				let errorMessage = 'Unknown error';
				
				if (error instanceof Error) {
					errorMessage = error.message;
					// Check for RPC errors
					if (error.message.includes('not found') || error.message.includes('does not exist')) {
						status = 404;
					} else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
						status = 400;
					}
				}

				return new Response(
					JSON.stringify({
						error: 'Failed to fetch transaction data',
						message: errorMessage,
					}),
					{
						status: status,
						headers: { 'Content-Type': 'application/json', ...corsHeaders },
					}
				);
			}
		}

		// Handle GET requests (original behavior)
		if (request.method === 'GET') {
			return new Response('Hello World!', {
				headers: corsHeaders,
			});
		}

		// Handle other methods
		return new Response(
			JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
			{
				status: 405,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			}
		);
	},
} satisfies ExportedHandler<Env>;
