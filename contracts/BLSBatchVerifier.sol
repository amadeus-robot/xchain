// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BLS12-381 Batch & Aggregated Signature Verifier (EIP-2537)
 * @notice Verifies multiple BLS signatures or aggregated signatures in a single call.
 * @dev Inputs must follow EIP-2537 encoding rules (big-endian, 64-byte field elements).
 */
contract Bls12381BatchVerifier {
    // EIP-2537 pairing precompile address
    address constant PAIRING_PRECOMPILE = address(0x0f);

    // G2 generator constants for BLS12-381 (big-endian, 64 bytes per field element)
    // Source: https://eips.ethereum.org/EIPS/eip-2537
    bytes constant G2_GENERATOR_X_C0 = hex"024AA2B2F08F0FCE91C9D6C6F3A5FECF05426D3FBB5CB47E0B4E321B052D3D8AEC88C8C9BFF0D8A9A0F3AD8ECA0C8CC397E0E9F9A7F1C8A24A3B6E7B2F00AA6F";
    bytes constant G2_GENERATOR_X_C1 = hex"13E02B6052719F607DACDDFB11F209F319E1318CDBA4F1F61AD4F45B89F1D77AC17E1B65F4D8D5E7067E55F95B0A0B347E2D1A8ADDB963BFAA25C86F6E4361F3";
    bytes constant G2_GENERATOR_Y_C0 = hex"0CE5D527727D6E1170C0B6BA0B8A0E3FC0A64F04B2D3DBEDF69B46F0B6F28B94D329DCB7ADF5C1B75E7C5E686F8A4A34B8E334C1F201D2F7D95F8C1D0D4FE8B1";
    bytes constant G2_GENERATOR_Y_C1 = hex"0606C4A0ACBF3A70F5BBDB23A603E1367DC32E8CE89E3EA0F9E6A9A9EB6D0B277D43EAA1D3C436C3F2C3A1B1AE06C7D92DCAEEE4B5EBAA12D09416B7D140C6A5";

    /**
     * @notice Batch verify multiple individual signatures
     * @dev Each signature is verified independently. All must be valid.
     * @param sigs Array of signatures, each as (sigX, sigY)
     * @param hashes Array of message hash points, each as (hX, hY)
     * @param publicKeys Array of public keys, each as (pkXc0, pkXc1, pkYc0, pkYc1)
     * @return True if all signatures are valid, false otherwise
     */
    function verifyBatch(
        bytes[] memory sigs,
        bytes[] memory hashes,
        bytes[] memory publicKeys
    ) public view returns (bool) {
        require(
            sigs.length == hashes.length && hashes.length == publicKeys.length,
            "Array length mismatch"
        );
        require(sigs.length > 0, "Empty arrays");

        // Verify each signature individually
        for (uint256 i = 0; i < sigs.length; i++) {
            require(sigs[i].length == 128, "Invalid sig length"); // 64 bytes X + 64 bytes Y
            require(hashes[i].length == 128, "Invalid hash length"); // 64 bytes X + 64 bytes Y
            require(publicKeys[i].length == 256, "Invalid pk length"); // 4 * 64 bytes

            bytes memory sigX = _slice(sigs[i], 0, 64);
            bytes memory sigY = _slice(sigs[i], 64, 64);
            bytes memory hX = _slice(hashes[i], 0, 64);
            bytes memory hY = _slice(hashes[i], 64, 64);
            bytes memory pkXc0 = _slice(publicKeys[i], 0, 64);
            bytes memory pkXc1 = _slice(publicKeys[i], 64, 64);
            bytes memory pkYc0 = _slice(publicKeys[i], 128, 64);
            bytes memory pkYc1 = _slice(publicKeys[i], 192, 64);

            if (!_verifySingle(sigX, sigY, hX, hY, pkXc0, pkXc1, pkYc0, pkYc1)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Verify an aggregated signature for multiple messages
     * @dev Verifies e(aggSig, g2) == ∏ e(H(mi), pki)
     *      This is equivalent to: e(aggSig, g2) * ∏ e(-H(mi), pki) == 1
     * @param aggSigX 64-byte X coordinate of aggregated signature (G1)
     * @param aggSigY 64-byte Y coordinate of aggregated signature (G1)
     * @param hashes Array of message hash points, each as (hX, hY)
     * @param publicKeys Array of public keys, each as (pkXc0, pkXc1, pkYc0, pkYc1)
     * @return True if aggregated signature is valid, false otherwise
     */
    function verifyAggregated(
        bytes memory aggSigX,
        bytes memory aggSigY,
        bytes[] memory hashes,
        bytes[] memory publicKeys
    ) public view returns (bool) {
        require(aggSigX.length == 64 && aggSigY.length == 64, "Invalid aggSig length");
        require(
            hashes.length == publicKeys.length && hashes.length > 0,
            "Array length mismatch or empty"
        );

        uint256 n = hashes.length;

        // Build input for pairing precompile:
        // Pair 1: (aggSig, g2)
        // Pair 2: (-H(m1), pk1)
        // Pair 3: (-H(m2), pk2)
        // ...
        // Pair n+1: (-H(mn), pkn)
        // Result: e(aggSig, g2) * ∏ e(-H(mi), pki) == 1

        bytes memory input = abi.encodePacked(
            // Pair 1: (aggSig, g2)
            aggSigX,
            aggSigY,
            G2_GENERATOR_X_C0,
            G2_GENERATOR_X_C1,
            G2_GENERATOR_Y_C0,
            G2_GENERATOR_Y_C1
        );

        // Add pairs for each message: (-H(mi), pki)
        for (uint256 i = 0; i < n; i++) {
            require(hashes[i].length == 128, "Invalid hash length");
            require(publicKeys[i].length == 256, "Invalid pk length");

            bytes memory hX = _slice(hashes[i], 0, 64);
            bytes memory hY = _slice(hashes[i], 64, 64);
            bytes memory pkXc0 = _slice(publicKeys[i], 0, 64);
            bytes memory pkXc1 = _slice(publicKeys[i], 64, 64);
            bytes memory pkYc0 = _slice(publicKeys[i], 128, 64);
            bytes memory pkYc1 = _slice(publicKeys[i], 192, 64);

            // Note: hY should be negated off-chain before calling this function
            input = abi.encodePacked(
                input,
                hX,
                hY, // Assumed to be negated
                pkXc0,
                pkXc1,
                pkYc0,
                pkYc1
            );
        }

        (bool success, bytes memory out) = PAIRING_PRECOMPILE.staticcall(input);
        if (!success || out.length < 32) return false;

        uint256 result;
        assembly {
            result := mload(add(out, 32))
        }

        return result == 1;
    }

    /**
     * @notice Verify a single signature (helper function)
     * @dev Internal function used by verifyBatch
     */
    function _verifySingle(
        bytes memory sigX,
        bytes memory sigY,
        bytes memory hX,
        bytes memory hY,
        bytes memory pkXc0,
        bytes memory pkXc1,
        bytes memory pkYc0,
        bytes memory pkYc1
    ) internal view returns (bool) {
        // Build input for precompile:
        // Pair 1: (sig, g2)
        // Pair 2: (-H(m), pk)
        bytes memory input = abi.encodePacked(
            // Pair 1: (sig, g2)
            sigX,
            sigY,
            G2_GENERATOR_X_C0,
            G2_GENERATOR_X_C1,
            G2_GENERATOR_Y_C0,
            G2_GENERATOR_Y_C1,
            // Pair 2: (-H(m), pk)
            // Note: hY should be negated off-chain
            hX,
            hY,
            pkXc0,
            pkXc1,
            pkYc0,
            pkYc1
        );

        (bool success, bytes memory out) = PAIRING_PRECOMPILE.staticcall(input);
        if (!success || out.length < 32) return false;

        uint256 result;
        assembly {
            result := mload(add(out, 32))
        }

        return result == 1;
    }

    /**
     * @notice Slice a bytes array (helper function)
     * @dev Returns a slice of the input bytes array
     */
    function _slice(
        bytes memory data,
        uint256 start,
        uint256 length
    ) internal pure returns (bytes memory) {
        require(start + length <= data.length, "Slice out of bounds");
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[start + i];
        }
        return result;
    }
}

