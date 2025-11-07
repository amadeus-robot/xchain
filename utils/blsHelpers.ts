/**
 * BLS12-381 Helper Utilities
 * 
 * This module provides utilities for working with BLS12-381 signatures
 * and formatting them for use with the Bls12381Verifier contract.
 * 
 * @module utils/blsHelpers
 */

/**
 * Converts an Fp element (bigint) to a 64-byte big-endian hex string
 * as required by the EIP-2537 precompile format.
 * 
 * @param fp - The Fp field element (bigint)
 * @returns Hex string with 0x prefix, padded to 128 hex characters (64 bytes)
 */
export function fpToBytes64(fp: bigint): string {
  let hex = fp.toString(16);
  // Remove '0x' prefix if present and ensure even length
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  // Pad to 128 hex characters (64 bytes)
  const paddedHex = hex.padStart(128, '0');
  return "0x" + paddedHex;
}

/**
 * Converts an Fp2 element to two 64-byte big-endian hex strings
 * as required by the EIP-2537 precompile format.
 * 
 * @param fp2 - The Fp2 field element with c0 and c1 components
 * @returns Tuple of two hex strings [c0Hex, c1Hex], each 64 bytes
 */
export function fp2ToBytes64(fp2: { c0: bigint; c1: bigint }): [string, string] {
  let c0Hex = fp2.c0.toString(16);
  let c1Hex = fp2.c1.toString(16);
  if (c0Hex.startsWith('0x')) c0Hex = c0Hex.slice(2);
  if (c1Hex.startsWith('0x')) c1Hex = c1Hex.slice(2);
  if (c0Hex.length % 2 !== 0) c0Hex = '0' + c0Hex;
  if (c1Hex.length % 2 !== 0) c1Hex = '0' + c1Hex;
  c0Hex = c0Hex.padStart(128, '0');
  c1Hex = c1Hex.padStart(128, '0');
  return [
    "0x" + c0Hex,
    "0x" + c1Hex
  ];
}

/**
 * Formats a BLS signature (G1 point) for contract verification.
 * 
 * @param signature - The signature point from @noble/curves
 * @returns Object with sigX and sigY as hex strings (64 bytes each)
 */
export function formatSignature(signature: { x: bigint; y: bigint }): {
  sigX: string;
  sigY: string;
} {
  return {
    sigX: fpToBytes64(signature.x),
    sigY: fpToBytes64(signature.y)
  };
}

/**
 * Formats a message hash (G1 point) for contract verification.
 * Automatically negates the Y coordinate as required by the contract.
 * 
 * @param messageHash - The message hash point from @noble/curves
 * @param Fp - The Fp field from bls12_381.fields.Fp
 * @returns Object with hX and hY (negated) as hex strings (64 bytes each)
 */
export function formatMessageHash(
  messageHash: { x: bigint; y: bigint },
  Fp: { neg: (val: bigint) => bigint }
): {
  hX: string;
  hY: string;
} {
  const hX = fpToBytes64(messageHash.x);
  // Negate Y coordinate as required by the contract
  const hYNeg = Fp.neg(messageHash.y);
  const hY = fpToBytes64(hYNeg);
  return { hX, hY };
}

/**
 * Formats a public key (G2 point) for contract verification.
 * 
 * @param publicKey - The public key point from @noble/curves
 * @returns Object with pkXc0, pkXc1, pkYc0, pkYc1 as hex strings (64 bytes each)
 */
export function formatPublicKey(publicKey: { x: { c0: bigint; c1: bigint }; y: { c0: bigint; c1: bigint } }): {
  pkXc0: string;
  pkXc1: string;
  pkYc0: string;
  pkYc1: string;
} {
  const [pkXc0, pkXc1] = fp2ToBytes64(publicKey.x);
  const [pkYc0, pkYc1] = fp2ToBytes64(publicKey.y);
  return { pkXc0, pkXc1, pkYc0, pkYc1 };
}

/**
 * Formats all BLS signature data for contract verification in one call.
 * 
 * @param signature - The signature point (G1)
 * @param messageHash - The message hash point (G1)
 * @param publicKey - The public key point (G2)
 * @param Fp - The Fp field from bls12_381.fields.Fp
 * @returns Formatted data ready for contract verification
 */
export function formatBlsSignatureData(
  signature: { x: bigint; y: bigint },
  messageHash: { x: bigint; y: bigint },
  publicKey: { x: { c0: bigint; c1: bigint }; y: { c0: bigint; c1: bigint } },
  Fp: { neg: (val: bigint) => bigint }
): {
  sigX: string;
  sigY: string;
  hX: string;
  hY: string;
  pkXc0: string;
  pkXc1: string;
  pkYc0: string;
  pkYc1: string;
} {
  const sig = formatSignature(signature);
  const hash = formatMessageHash(messageHash, Fp);
  const pk = formatPublicKey(publicKey);
  
  return {
    ...sig,
    ...hash,
    ...pk
  };
}

/**
 * Converts hex strings to Uint8Array bytes for ethers.js contract calls.
 * 
 * @param hexStrings - Object with hex string values
 * @param ethers - The ethers object from hardhat or ethers library
 * @returns Object with the same keys but Uint8Array values
 */
export function hexToBytes<T extends Record<string, string>>(
  hexStrings: T,
  ethers: { getBytes: (hex: string) => Uint8Array }
): Record<keyof T, Uint8Array> {
  const result: any = {};
  for (const [key, value] of Object.entries(hexStrings)) {
    result[key] = ethers.getBytes(value);
  }
  return result;
}

/**
 * Complete helper function to prepare BLS signature data for contract verification.
 * This is the main function developers should use.
 * 
 * @example
 * ```typescript
 * import { bls12_381 } from "@noble/curves/bls12-381.js";
 * import { prepareBlsVerification } from "./utils/blsHelpers";
 * import hre from "hardhat";
 * 
 * const bls = bls12_381.shortSignatures;
 * const { secretKey, publicKey } = bls.keygen();
 * const message = new TextEncoder().encode("Hello!");
 * const messageHash = bls.hash(message);
 * const signature = bls.sign(messageHash, secretKey);
 * 
 * const formatted = prepareBlsVerification(
 *   signature,
 *   messageHash,
 *   publicKey,
 *   bls12_381.fields.Fp,
 *   hre.ethers
 * );
 * 
 * const result = await verifier.verifySignature(
 *   formatted.sigX,
 *   formatted.sigY,
 *   formatted.hX,
 *   formatted.hY,
 *   formatted.pkXc0,
 *   formatted.pkXc1,
 *   formatted.pkYc0,
 *   formatted.pkYc1
 * );
 * ```
 * 
 * @param signature - The signature point (G1)
 * @param messageHash - The message hash point (G1)
 * @param publicKey - The public key point (G2)
 * @param Fp - The Fp field from bls12_381.fields.Fp
 * @param ethers - The ethers object with getBytes method
 * @returns Formatted data as Uint8Array ready for contract calls
 */
export function prepareBlsVerification(
  signature: { x: bigint; y: bigint },
  messageHash: { x: bigint; y: bigint },
  publicKey: { x: { c0: bigint; c1: bigint }; y: { c0: bigint; c1: bigint } },
  Fp: { neg: (val: bigint) => bigint },
  ethers: { getBytes: (hex: string) => Uint8Array }
): {
  sigX: Uint8Array;
  sigY: Uint8Array;
  hX: Uint8Array;
  hY: Uint8Array;
  pkXc0: Uint8Array;
  pkXc1: Uint8Array;
  pkYc0: Uint8Array;
  pkYc1: Uint8Array;
} {
  const hexData = formatBlsSignatureData(signature, messageHash, publicKey, Fp);
  return hexToBytes(hexData, ethers) as any;
}

