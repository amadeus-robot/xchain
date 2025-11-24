# BLS Helper Utilities

This directory contains TypeScript utilities for working with BLS12-381 signatures and formatting them for use with the smart contracts.

## Overview

The helper utilities simplify the process of:
- Converting BLS signature data to the format required by contracts
- Formatting field elements (Fp, Fp2) to 64-byte hex strings
- Handling Y-coordinate negation for message hashes
- Preparing complete signature data for contract verification

## Quick Start

```typescript
import { prepareBlsVerification } from "./utils/blsHelpers";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import hre from "hardhat";

// Generate keys and sign a message
const bls = bls12_381.shortSignatures;
const { secretKey, publicKey } = bls.keygen();
const message = new TextEncoder().encode("Hello!");
const messageHash = bls.hash(message);
const signature = bls.sign(messageHash, secretKey);

// Format data for contract
const Fp = bls12_381.fields.Fp;
const formatted = prepareBlsVerification(
  signature,
  messageHash,
  publicKey,
  Fp,
  hre.ethers
);

// Verify on-chain
const result = await verifier.verifySignature(
  formatted.sigX,
  formatted.sigY,
  formatted.hX,
  formatted.hY,
  formatted.pkXc0,
  formatted.pkXc1,
  formatted.pkYc0,
  formatted.pkYc1
);
```

## API Reference

### `prepareBlsVerification()`

**Main function** - Prepares all BLS signature data for contract verification in one call.

```typescript
prepareBlsVerification(
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
}
```

Returns formatted data as `Uint8Array` ready for contract calls.

### Individual Helper Functions

#### `fpToBytes64(fp: bigint): string`

Converts an Fp field element (bigint) to a 64-byte big-endian hex string.

#### `fp2ToBytes64(fp2: { c0: bigint; c1: bigint }): [string, string]`

Converts an Fp2 field element to two 64-byte hex strings (c0 and c1).

#### `formatSignature(signature: { x: bigint; y: bigint }): { sigX: string; sigY: string }`

Formats a BLS signature (G1 point) for contract verification.

#### `formatMessageHash(messageHash: { x: bigint; y: bigint }, Fp: {...}): { hX: string; hY: string }`

Formats a message hash (G1 point) with Y-coordinate negation.

#### `formatPublicKey(publicKey: {...}): { pkXc0: string; pkXc1: string; pkYc0: string; pkYc1: string }`

Formats a public key (G2 point) for contract verification.

#### `formatBlsSignatureData(...): {...}`

Formats all BLS signature data in one call (returns hex strings).

#### `hexToBytes(hexStrings: T, ethers: {...}): Record<keyof T, Uint8Array>`

Converts hex strings to Uint8Array bytes for ethers.js.

## Examples

See `examples/verifyBlsSignature.ts` for a complete working example.

## Testing

Run the helper utilities tests:

```bash
npx hardhat test utils/blsHelpers.test.ts
```

## Notes

- All field elements are padded to 64 bytes (128 hex characters) as required by EIP-2537
- Message hash Y-coordinate is automatically negated as required by the contract
- The utilities handle the conversion from `@noble/curves` format to contract format

