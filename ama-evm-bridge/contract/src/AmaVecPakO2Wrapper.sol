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

    /**
     * @notice Validate a block using the validator contract
     * @param header The AMA block header (signer must be 48 bytes compressed G1)
     * @param expectedHash The expected block hash
     * @param signatureG2 The BLS signature in G2 (256 bytes uncompressed)
     * @return isValid True if validation passes
     */
    function validateBlock(
        AmaVecPakO2.AmaHeader calldata header,
        bytes32 expectedHash,
        bytes calldata signatureG2
    ) external view returns (bool) {
        return validator.validateBlock(header, expectedHash, signatureG2);
    }
}

