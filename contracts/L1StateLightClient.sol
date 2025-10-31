// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library KZGPointEval {
    address constant PRECOMPILE = 0x000000000000000000000000000000000000000A;

    /// @dev Pass the 192-byte payload: vh|z|y|commitment|proof
    function verifyPayload(bytes calldata payload192) internal view returns (bool ok) {
        require(payload192.length == 192, "bad len");
        (ok, ) = PRECOMPILE.staticcall(payload192);
    }
}

contract L1StateLightClient {
    using KZGPointEval for bytes;

    // Store the trusted L1 state commitment's versioned hash to pin the state header
    bytes32 public trustedVH;
    // (or store the 48-byte commitment and recompute kzg_to_versioned_hash inside Solidity via sha256)

    function setTrustedVersionedHash(bytes32 vh) external { trustedVH = vh; }

    /// @notice Verifies the payload and also checks it matches the trusted versioned hash.
    function proveKV(bytes calldata payload192) external view returns (bool) {
        require(payload192.length == 192, "bad len");
        // First 32 bytes are the versioned hash
        bytes32 vh;
        assembly { vh := calldataload(payload192.offset) }
        require(vh == trustedVH, "wrong header");

        bool ok = KZGPointEval.verifyPayload(payload192);
        return ok;
    }
}