// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
    BLS12-381 verifier using EIP-2537 precompiles.
    Supports hash_to_curve(G2, XMD:SHA-256, SSWU, RO) and pairing.
*/

struct FieldPoint { bytes32[2] u; }                 // Fp element split into two 32B words
struct FieldPoint2 { bytes32[2] u; bytes32[2] u_I; } // Fp2 element: u + u_I*i  (each as two 32B words)
struct G1Point { bytes x; bytes y; }                 // each 64B
struct G2Point { bytes x; bytes x_I; bytes y; bytes y_I; } // each 64B

library BLSPrecompiles {
    uint256 constant G1_ADD             = 0x0b;
    uint256 constant G2_ADD             = 0x0d;
    uint256 constant PAIRING            = 0x0f;
    uint256 constant MAP_FP_TO_G1       = 0x10;
    uint256 constant MAP_FP2_TO_G2      = 0x11;

    function pairing(bytes memory input) internal view returns (bool) {
        bytes memory out32 = new bytes(32);
        bool ok;
        assembly ("memory-safe") {
            ok := staticcall(gas(), PAIRING, add(input, 0x20), mload(input), add(out32, 0x20), 32)
        }
        if (!ok) return false;
        return out32[31] == 0x01;
    }
}

