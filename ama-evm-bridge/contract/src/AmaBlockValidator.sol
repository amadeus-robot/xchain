// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AmaVecPakO2.sol";
import "./BLSVerifyWithHashToCurve.sol";
import "./BLSG1Decompress.sol";

/**
 * @title AmaBlockValidator
 * @notice Validates AMA block headers by verifying hash and BLS signature
 */
contract AmaBlockValidator {
    using AmaVecPakO2 for AmaVecPakO2.AmaHeader;

    // DST for BLS signature verification
    bytes constant DST = "AMADEUS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_ENTRY_";
    
    // BLS verifier contract instance
    BLSVerifyWithHashToCurve public immutable blsVerifier;
    
    // G1 decompressor contract instance
    BLSG1Decompress public immutable g1Decompress;
    
    constructor() {
        blsVerifier = new BLSVerifyWithHashToCurve();
        g1Decompress = new BLSG1Decompress();
    }

    /**
     * @notice Validate an AMA block
     * @param header The AMA block header (signer must be 48 bytes compressed G1)
     * @param expectedHash The expected block hash (bytes32)
     * @param signatureG2 The BLS signature in G2 (256 bytes uncompressed)
     * @return isValid True if both hash and signature are valid
     */
    function validateBlock(
        AmaVecPakO2.AmaHeader calldata header,
        bytes32 expectedHash,
        bytes calldata signatureG2
    ) external view returns (bool) {
        require(header.signer.length == 48, "signer must be 48 bytes compressed");
        require(signatureG2.length == 256, "signature must be 256 bytes uncompressed");
        
        // Step 1: Verify block hash
        bytes32 computedHash = _computeHeaderHash(header);
        if (computedHash != expectedHash) {
            return false;
        }

        // Step 2: Decompress signer from 48 bytes to 128 bytes
        bytes memory uncompressedPubkey = g1Decompress.decompress(header.signer);

        // Step 3: Verify BLS signature using decompressed pubkey and uncompressed signature
        // Signature is already in uncompressed form (256 bytes)
        return blsVerifier.verifyWithHashToCurveG2(
            uncompressedPubkey,
            signatureG2,
            abi.encodePacked(expectedHash),
            DST
        );
    }

    /// Internal helper to compute header hash
    function _computeHeaderHash(AmaVecPakO2.AmaHeader calldata header) 
        internal 
        pure 
        returns (bytes32) 
    {
        AmaVecPakO2.AmaHeader memory h = AmaVecPakO2.AmaHeader(
            header.height,
            header.prev_hash,
            header.slot,
            header.prev_slot,
            header.signer,
            header.dr,
            header.vr,
            header.root_tx,
            header.root_validator
        );
        return AmaVecPakO2.hashAmaHeader(h);
    }


    /**
     * @notice Get the DST used for BLS verification
     * @return The DST bytes
     */
    function getDST() external pure returns (bytes memory) {
        return DST;
    }
}

