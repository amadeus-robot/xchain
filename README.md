# BLS12-381 Signature Verification & L1 State Light Client

Smart contracts for verifying BLS12-381 signatures and L1 state commitments on Ethereum.

## What This Project Does

This project provides three main contracts:

1. **Bls12381Verifier** - Verifies single BLS12-381 signatures
2. **Bls12381BatchVerifier** - Verifies multiple BLS signatures (batch & aggregated)
3. **L1StateLightClient** - Verifies L1 state commitments using KZG proofs

All contracts use Ethereum precompiles (EIP-2537 for BLS, EIP-4844 for KZG) for efficient on-chain verification.

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/Bls12381Verifier.ts
```

### Deploy Contracts

```bash
# Deploy BLS Verifier
npx hardhat ignition deploy ./ignition/modules/Bls12381Verifier.ts

# Deploy Batch Verifier
npx hardhat ignition deploy ./ignition/modules/Bls12381BatchVerifier.ts

# Deploy L1 State Light Client
npx hardhat ignition deploy ./ignition/modules/L1StateLightClient.ts
```

## Usage Example

### Verifying a BLS Signature

```typescript
import { prepareBlsVerification } from "./utils/blsHelpers";
import { bls12_381 } from "@noble/curves/bls12-381.js";
import hre from "hardhat";

// Generate keys and sign
const bls = bls12_381.shortSignatures;
const { secretKey, publicKey } = bls.keygen();
const message = new TextEncoder().encode("Hello!");
const messageHash = bls.hash(message);
const signature = bls.sign(messageHash, secretKey);

// Format for contract
const formatted = prepareBlsVerification(
  signature,
  messageHash,
  publicKey,
  bls12_381.fields.Fp,
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

See `examples/verifyBlsSignature.ts` for a complete example.

## Helper Utilities

The `utils/` directory contains helper functions for formatting BLS data:

- `prepareBlsVerification()` - Main function to format all signature data
- Individual formatters for signatures, hashes, and public keys

See `utils/README.md` for full API documentation.

## Testing with BLS12-381 Precompile

By default, Hardhat's network doesn't support the BLS12-381 precompile. To test with full precompile support:

1. Create a `.env` file:
   ```env
   FORK_MAINNET=true
   ```

2. Run tests:
   ```bash
   npx hardhat test
   ```

This will fork from mainnet where the precompile is available.

## Project Structure

```
├── contracts/          # Smart contracts
├── test/              # Test files
├── utils/             # Helper utilities for BLS formatting
├── examples/          # Usage examples
└── ignition/          # Deployment scripts
```

## Contracts

### Bls12381Verifier

Verifies a single BLS12-381 signature using the pairing precompile at address `0x0f`.

**Function:** `verifySignature(sigX, sigY, hX, hY, pkXc0, pkXc1, pkYc0, pkYc1)`

### Bls12381BatchVerifier

Verifies multiple BLS signatures efficiently:
- `verifyBatch()` - Verifies multiple individual signatures
- `verifyAggregated()` - Verifies one aggregated signature for multiple messages

### L1StateLightClient

Verifies L1 state commitments using KZG point evaluation (precompile at `0x0A`).

**Function:** `proveKV(payload192)` - Verifies a 192-byte KZG proof payload

## Requirements

- Node.js >= 20.14.0
- Hardhat
- @noble/curves (for BLS operations)

## License

MIT
