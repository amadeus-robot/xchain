import { bls12_381 as bls } from "@noble/curves/bls12-381";
import { blake3 } from "@noble/hashes/blake3";
import "dotenv/config";
import { canonicalSerialize } from "./vanillaser";
import bs58 from "bs58";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TxAction {
  op: "call";
  contract: string;
  function: string;
  args: any;
}

export interface TxObject {
  signer: string;
  nonce: bigint;
  actions: TxAction[];
}

export interface PackedTx {
  tx_encoded: Uint8Array;
  hash: Uint8Array;
  signature: Uint8Array;
}

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

export function format_9(number: number, precision: number = 2): string {
  const str = number.toString();
  const prefix = str.slice(0, -9).padStart(9, "0");
  const suffix = str.slice(-9).padStart(9, "0");
  return Number(`${prefix}.${suffix}`).toFixed(precision);
}

// -----------------------------------------------------------------------------
// BLS + Hashing
// -----------------------------------------------------------------------------

const BLS12_381_ORDER = BigInt(
  "0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001"
);

/**
 * Reduce 64-byte LE buffer → mod BLS12-381 order → return 32-byte BE Uint8Array
 */
export function reduce512To256LE(bytes64: Uint8Array): Uint8Array {
  if (!(bytes64 instanceof Uint8Array) || bytes64.length !== 64) {
    throw new Error("Expected 64-byte Uint8Array");
  }

  // Convert LE → bigint
  let x = 0n;
  for (let i = 0; i < 64; i++) {
    x += BigInt(bytes64[i]) << (8n * BigInt(i));
  }

  // Reduce
  x = x % BLS12_381_ORDER;

  // Convert to BE
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }

  return out;
}

// -----------------------------------------------------------------------------
// Signing
// -----------------------------------------------------------------------------

export function sign_tx(hash: Uint8Array): Uint8Array {
  const sk = process.env.AMA_SK;



  if (!sk) {
    throw new Error("Missing AMA_SK in environment");
  }

  return bls.sign(hash, bs58.decode(sk));
}

// -----------------------------------------------------------------------------
// TX Builder
// -----------------------------------------------------------------------------

export function build_tx(
  contract: string,
  func: string,
  args: any
): Uint8Array {
  const tx: TxObject = {
    signer:
      "7bP1XvjYapT6prSwjh4LcfjPS9UERmV8mMRVhKQCrUqoqZHpQXkiWcMB5yJBvHwZtK",
    nonce: BigInt(Date.now()) * 1_000_000n,
    actions: [{ op: "call", contract, function: func, args }]
  };

  const tx_encoded = canonicalSerialize(tx);
  const hash = blake3(tx_encoded);
  const signature = sign_tx(hash);

  const packed = {
    tx_encoded,
    hash,
    signature
  };

  return canonicalSerialize(packed);
}

// -----------------------------------------------------------------------------
// Base58
// -----------------------------------------------------------------------------

const BASE58_MAP =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Encode bytes → base58
 */
export function to_b58(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input;

  return base58Encode(bytes);
}

/**
 * Decode base58 → bytes
 */
export function from_b58(str: string): Uint8Array {
  return base58Decode(str);
}

// -----------------------------------------------------------------------------
// Base58 Implementations (clean + typed)
// -----------------------------------------------------------------------------

function base58Encode(bytes: Uint8Array): string {
  let digits = [0];

  for (const byte of bytes) {
    let carry = byte;

    for (let j = 0; j < digits.length; ++j) {
      const x = digits[j] * 256 + carry;
      digits[j] = x % 58;
      carry = Math.floor(x / 58);
    }

    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  // Handle leading zeros
  for (const byte of bytes) {
    if (byte === 0) digits.push(0);
    else break;
  }

  return digits
    .reverse()
    .map((d) => BASE58_MAP[d])
    .join("");
}

function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  let bytes = [0];

  for (const char of str) {
    const value = BASE58_MAP.indexOf(char);
    if (value < 0) throw new Error(`Invalid base58 char: ${char}`);

    let carry = value;

    for (let j = 0; j < bytes.length; ++j) {
      const x = bytes[j] * 58 + carry;
      bytes[j] = x & 0xff;
      carry = x >> 8;
    }

    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Handle leading zeros
  let zeros = 0;
  for (const char of str) {
    if (char === BASE58_MAP[0]) zeros++;
    else break;
  }

  return new Uint8Array([
    ...Array(zeros).fill(0),
    ...bytes.reverse()
  ]);
}
