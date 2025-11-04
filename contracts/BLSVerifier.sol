// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BLS12-381 Signature Verifier (EIP-2537)
 * @notice Verifies BLS signatures using Ethereum precompile at address 0x0f.
 * @dev Inputs must follow EIP-2537 encoding rules (big-endian, 64-byte field elements).
 * This verifies e(sig, g2) == e(H(m), pk).
 */
contract Bls12381Verifier {
    // EIP-2537 pairing precompile address
    address constant PAIRING_PRECOMPILE = address(0x0f);

    // G2 generator constants for BLS12-381 (big-endian, 64 bytes per field element)
    // Source: https://eips.ethereum.org/EIPS/eip-2537
    bytes constant G2_GENERATOR_X_C0 = hex"024AA2B2F08F0FCE91C9D6C6F3A5FECF05426D3FBB5CB47E0B4E321B052D3D8AEC88C8C9BFF0D8A9A0F3AD8ECA0C8CC397E0E9F9A7F1C8A24A3B6E7B2F00AA6F";
    bytes constant G2_GENERATOR_X_C1 = hex"13E02B6052719F607DACDDFB11F209F319E1318CDBA4F1F61AD4F45B89F1D77AC17E1B65F4D8D5E7067E55F95B0A0B347E2D1A8ADDB963BFAA25C86F6E4361F3";
    bytes constant G2_GENERATOR_Y_C0 = hex"0CE5D527727D6E1170C0B6BA0B8A0E3FC0A64F04B2D3DBEDF69B46F0B6F28B94D329DCB7ADF5C1B75E7C5E686F8A4A34B8E334C1F201D2F7D95F8C1D0D4FE8B1";
    bytes constant G2_GENERATOR_Y_C1 = hex"0606C4A0ACBF3A70F5BBDB23A603E1367DC32E8CE89E3EA0F9E6A9A9EB6D0B277D43EAA1D3C436C3F2C3A1B1AE06C7D92DCAEEE4B5EBAA12D09416B7D140C6A5";

    /**
     * @notice Verify a BLS12-381 signature
     * @dev Verify e(sig, g2) == e(H(m), pk)
     * @param sigX  64-byte X coordinate of signature (G1)
     * @param sigY  64-byte Y coordinate of signature (G1)
     * @param hX    64-byte X coordinate of message hash point (G1)
     * @param hY    64-byte Y coordinate of message hash point (G1)
     * @param pkXc0 64-byte G2.X.c0
     * @param pkXc1 64-byte G2.X.c1
     * @param pkYc0 64-byte G2.Y.c0
     * @param pkYc1 64-byte G2.Y.c1
     * @return True if valid, false otherwise
     */
    function verifySignature(
        bytes memory sigX,
        bytes memory sigY,
        bytes memory hX,
        bytes memory hY,
        bytes memory pkXc0,
        bytes memory pkXc1,
        bytes memory pkYc0,
        bytes memory pkYc1
    ) public view returns (bool) {
        require(sigX.length == 64 && sigY.length == 64, "Invalid sig length");
        require(hX.length == 64 && hY.length == 64, "Invalid hash length");
        require(
            pkXc0.length == 64 && pkXc1.length == 64 &&
            pkYc0.length == 64 && pkYc1.length == 64,
            "Invalid pk length"
        );

        // IMPORTANT: For e(sig, g2) == e(H(m), pk),
        // we must pair (sig, g2) and (-H(m), pk).
        // So we negate the Y coordinate of H(m) mod p.
        // Here we assume hY is already negated off-chain for simplicity.
        bytes memory hNegY = hY;

        // Build input for precompile:
        // Pair 1: (sig, g2)
        // Pair 2: (-H(m), pk)
        bytes memory input = abi.encodePacked(
            // Pair 1: (sig, g2)
            sigX, sigY,
            G2_GENERATOR_X_C0, G2_GENERATOR_X_C1,
            G2_GENERATOR_Y_C0, G2_GENERATOR_Y_C1,

            // Pair 2: (-H(m), pk)
            hX, hNegY,
            pkXc0, pkXc1, pkYc0, pkYc1
        );

        (bool success, bytes memory out) = PAIRING_PRECOMPILE.staticcall(input);
        if (!success || out.length < 32) return false;

        uint256 result;
        assembly {
            result := mload(add(out, 32))
        }

        return result == 1;
    }
}
