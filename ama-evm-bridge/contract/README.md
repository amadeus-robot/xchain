# AMA EVM Bridge - Contract

A highly optimized Solidity implementation for AMA (Amadeus) block header encoding and validation, supporting both Foundry and Hardhat testing frameworks.

## Overview

This project implements a complete bridge contract system for validating AMA blockchain blocks on EVM-compatible chains. It includes:

**VecPak Encoding (O2 - Optimized):**
- Highly optimized VecPak encoder library specifically for AMA block headers
- Supports only required types: `TYPE_INT` (0x03), `TYPE_BYTES` (0x05), `TYPE_MAP` (0x07)
- Pre-encoded and pre-sorted keys in canonical VecPak order for maximum gas efficiency
- Optimized for `uint64` inputs

**BLS12-381 Signature Verification:**
- BLS signature verification with hash-to-curve (G2, XMD:SHA-256, SSWU, RO)
- G1 point decompression from 48-byte compressed format to 128-byte uncompressed format
- Uses EIP-2537 precompiles for efficient on-chain verification
- Domain Separation Tag (DST): `"AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_ENTRY_"`

**Block Validation:**
- Block hash computation and verification using SHA256
- Complete block header validation with BLS signature verification
- Gas-optimized implementation using Foundry IR pipeline

## Project Structure

```
.
├── src/
│   ├── AmaVecPakO2.sol              # Main VecPak encoder library (O2 optimized)
│   ├── AmaVecPakO2Wrapper.sol       # Wrapper contract exposing library functions for testing
│   ├── AmaBlockValidator.sol        # Main block validation contract
│   ├── BLSPrecompiles.sol           # BLS12-381 precompile library (EIP-2537)
│   ├── BLSVerifyWithHashToCurve.sol # BLS verification with hash-to-curve implementation
│   └── BLSG1Decompress.sol          # G1 point decompression from 48 to 128 bytes
├── test/
│   ├── AmaVecPakO2.test.js          # VecPak encoder tests
│   ├── AmaBlockValidator.test.js    # Block validation tests
│   ├── BLSG1Decompress.test.js      # G1 decompression tests
│   └── bls-utils.js                 # BLS utility functions for testing
├── foundry.toml                      # Foundry configuration (Solc 0.8.24, IR pipeline)
├── hardhat.config.js                 # Hardhat configuration (Solc 0.8.24, 10k optimizer runs)
├── remappings.txt                    # Foundry remappings
└── package.json                      # Node.js dependencies
```

## Setup

### Prerequisites

- Node.js (v16 or later)
- Foundry (forge, cast, anvil) - See [Foundry Book](https://book.getfoundry.sh/getting-started/installation)
- npm or yarn

### Installation

1. **Install Foundry** (if not already installed):
   
   On Linux/macOS:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
   
   On Windows:
   ```powershell
   # Using Git Bash or PowerShell
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

## Usage

### Compile Contracts

Using Hardhat:
```bash
npm run compile
# or
npx hardhat compile
```

Using Foundry:
```bash
forge build
```

### Run Tests

JavaScript tests (Hardhat):
```bash
npm test
# or
npx hardhat test
```

Foundry tests:
```bash
npm run test:foundry
# or
forge test
```

### Clean Build Artifacts

```bash
npm run clean
# This cleans both Hardhat and Foundry artifacts
```

## Contracts and Libraries

### `AmaVecPakO2` (Library)

The core VecPak encoder library with the following functions:

- **`encodeVarInt(uint256 value)`** - Encodes a variable-length integer (optimized for uint64)
- **`encodeInt(uint256 v)`** - Encodes an integer with TYPE_INT prefix
- **`encodeBytes(bytes memory b)`** - Encodes bytes with TYPE_BYTES prefix
- **`encodeAmaHeader(AmaHeader memory h)`** - Encodes a complete AMA header structure
- **`hashAmaHeader(AmaHeader memory h)`** - Computes SHA256 hash of an encoded AMA header

### `AmaBlockValidator` (Contract)

Main contract for validating AMA blocks. It:
- Deploys `BLSVerifyWithHashToCurve` and `BLSG1Decompress` contracts in constructor
- Validates block headers by computing hash and verifying BLS signatures

**Main Functions:**
- **`validateBlock(AmaHeader calldata header, bytes32 expectedHash, bytes calldata signatureG2)`** - Validates a block
- **`getDST()`** - Returns the Domain Separation Tag used for BLS verification

### `BLSG1Decompress` (Contract)

Decompresses BLS12-381 G1 points from 48-byte compressed format to 128-byte uncompressed format.

- **`decompress(bytes memory compressed)`** - Takes 48-byte compressed G1 point, returns 128-byte uncompressed format

### `BLSVerifyWithHashToCurve` (Contract)

Performs BLS signature verification with hash-to-curve using EIP-2537 precompiles.

### `BLSPrecompiles` (Library)

Library wrapper for EIP-2537 BLS12-381 precompile operations.

### `AmaVecPakO2Wrapper` (Contract)

Wrapper contract for testing that exposes library functions and provides a convenient interface for validation.

## Block Validation Details

### Validation Flow

The `validateBlock` function performs the following steps:

1. **Hash Verification**: Computes the SHA256 hash of the VecPak-encoded header and verifies it matches `expectedHash`
2. **Key Decompression**: Decompresses the `header.signer` from 48-byte compressed G1 format to 128-byte uncompressed format
3. **Signature Verification**: Verifies the BLS signature over the block hash using:
   - Decompressed public key from `header.signer`
   - Uncompressed signature in G2
   - Domain Separation Tag (DST): `"AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_ENTRY_"`

### Function Signature

```solidity
function validateBlock(
    AmaVecPakO2.AmaHeader calldata header,
    bytes32 expectedHash,
    bytes calldata signatureG2
) external view returns (bool)
```

**Parameters:**
- `header`: The AMA block header (must have `signer` as 48-byte compressed G1 format)
- `expectedHash`: The expected block hash (bytes32)
- `signatureG2`: BLS signature in G2 (256 bytes uncompressed: `x_im||x_re||y_im||y_re`)

**Returns:** `bool` - `true` if both hash and signature are valid, `false` otherwise

**Reverts if:**
- `header.signer.length != 48` (must be compressed G1 format)
- `signatureG2.length != 256` (must be uncompressed G2 format)

**Note:** The DST (Domain Separation Tag) used for BLS verification is:
```
"AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_ENTRY_"
```

## AMA Header Structure

```solidity
struct AmaHeader {
    uint64 height;           // Block height
    bytes32 prev_hash;       // Previous block hash
    uint64 slot;             // Current slot number
    uint64 prev_slot;        // Previous slot number
    bytes signer;            // 48 bytes - Compressed BLS12-381 G1 public key
    bytes32 dr;              // Data root
    bytes vr;                // 96 bytes - Validator root
    bytes32 root_tx;         // Transaction root
    bytes32 root_validator;  // Validator set root
}
```

### VecPak Encoding Order

Keys are encoded in canonical VecPak order:
1. `dr` → `height` → `prev_hash` → `prev_slot` → `root_tx` → `root_validator` → `signer` → `slot` → `vr`

This pre-sorted order eliminates the need for runtime sorting and significantly reduces gas costs.

## Compiler Configuration

- **Solidity Version**: 0.8.24
- **EVM Version**: Paris (Cancun-compatible)
- **Optimizer**: Enabled
  - Foundry: 200 runs, via-IR enabled
  - Hardhat: 10,000 runs, via-IR enabled

The project uses the IR (Intermediate Representation) pipeline for optimized code generation, which is particularly beneficial for gas-intensive operations like BLS verification.

## Testing

The test suite includes:
- VecPak encoding/decoding tests (`AmaVecPakO2.test.js`)
- Block validation tests with real BLS signatures (`AmaBlockValidator.test.js`)
- G1 decompression tests (`BLSG1Decompress.test.js`)
- BLS utility functions for test data generation (`bls-utils.js`)

Run tests with:
```bash
# Hardhat tests
npm test

# Foundry tests
npm run test:foundry
# or
forge test
```

## License

MIT

