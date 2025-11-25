// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AmaVecPakO2.sol";
import "./AmaBlockValidator.sol";

/**
 * @title AmaVecPakO2Wrapper
 * @notice Wrapper contract to expose library functions for testing
 */
contract AmaVecPakO2Wrapper {
    using AmaVecPakO2 for AmaVecPakO2.AmaHeader;
    
    AmaBlockValidator public validator;
    
    constructor() {
        validator = new AmaBlockValidator();
    }

    function computeHeaderHash(AmaVecPakO2.AmaHeader calldata h)
        external
        pure
        returns (bytes32)
    {
        AmaVecPakO2.AmaHeader memory m = AmaVecPakO2.AmaHeader(
            h.height,
            h.prev_hash,
            h.slot,
            h.prev_slot,
            h.signer,
            h.dr,
            h.vr,
            h.root_tx,
            h.root_validator
        );
        return AmaVecPakO2.hashAmaHeader(m);
    }

    function encodeAmaHeader(AmaVecPakO2.AmaHeader calldata h)
        external
        pure
        returns (bytes memory)
    {
        AmaVecPakO2.AmaHeader memory m = AmaVecPakO2.AmaHeader(
            h.height,
            h.prev_hash,
            h.slot,
            h.prev_slot,
            h.signer,
            h.dr,
            h.vr,
            h.root_tx,
            h.root_validator
        );
        return AmaVecPakO2.encodeAmaHeader(m);
    }

    function encodeVarInt(uint256 value) external pure returns (bytes memory) {
        return AmaVecPakO2.encodeVarInt(value);
    }

    function encodeInt(uint256 v) external pure returns (bytes memory) {
        return AmaVecPakO2.encodeInt(v);
    }

    function encodeBytes(bytes memory b) external pure returns (bytes memory) {
        return AmaVecPakO2.encodeBytes(b);
    }
}

