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
    
    // Owner address for managing validators and root_validator
    address public owner;
    
    // Mapping to track validators (signer public keys)
    // Key is keccak256 hash of the 48-byte compressed G1 public key
    mapping(bytes32 => bool) public validators;
    
    // Root validator value that must match block's root_validator
    bytes32 public rootValidator;
    
    // Current light client height
    uint64 public height;
    
    // Events
    event ValidatorAdded(bytes indexed signer);
    event ValidatorRemoved(bytes indexed signer);
    event RootValidatorUpdated(bytes32 oldRootValidator, bytes32 newRootValidator);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event BlockValidated(uint64 indexed blockHeight, bytes32 indexed blockHash);
    event ValidatorsUpdated(bytes32 indexed newRootValidator, bytes[] validatorsAdded, bytes[] validatorsRemoved);
    event HeightUpdated(uint64 oldHeight, uint64 newHeight);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        blsVerifier = new BLSVerifyWithHashToCurve();
        g1Decompress = new BLSG1Decompress();
        owner = msg.sender;
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
    ) external returns (bool) {
        require(header.signer.length == 48, "signer must be 48 bytes compressed");
        require(signatureG2.length == 256, "signature must be 256 bytes uncompressed");
        bytes32 signerHash = keccak256(header.signer);
        require(validators[signerHash], "error: not validator");
        require(header.root_validator == rootValidator, "error: validation set changed");
        require(header.height == height + 1, "block height mismatch");
        bytes32 computedHash = _computeHeaderHash(header);
        require(computedHash == expectedHash, "block hash mismatch");
        bytes memory uncompressedPubkey = g1Decompress.decompress(header.signer);

        // Step 6: Verify BLS signature using decompressed pubkey and uncompressed signature
        bool signatureValid = blsVerifier.verifyWithHashToCurveG2(
            uncompressedPubkey,
            signatureG2,
            abi.encodePacked(expectedHash),
            DST
        );
        
        require(signatureValid, "BLS signature verification failed");
        
        height = header.height;
        
        emit BlockValidated(header.height, expectedHash);
        
        return true;
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
    
    /**
     * @notice Add a validator to the validators list
     * @param signer The validator's public key (48 bytes compressed G1)
     */
    function addValidator(bytes calldata signer) external onlyOwner {
        require(signer.length == 48, "signer must be 48 bytes compressed");
        bytes32 signerHash = keccak256(signer);
        require(!validators[signerHash], "Validator already exists");
        validators[signerHash] = true;
        emit ValidatorAdded(signer);
    }
    
    /**
     * @notice Remove a validator from the validators list
     * @param signer The validator's public key (48 bytes compressed G1)
     */
    function removeValidator(bytes calldata signer) external onlyOwner {
        require(signer.length == 48, "signer must be 48 bytes compressed");
        bytes32 signerHash = keccak256(signer);
        require(validators[signerHash], "Validator does not exist");
        validators[signerHash] = false;
        emit ValidatorRemoved(signer);
    }
    
    /**
     * @notice Set the root validator value
     * @param newRootValidator The new root validator value (bytes32)
     */
    function setRootValidator(bytes32 newRootValidator) external onlyOwner {
        bytes32 oldRootValidator = rootValidator;
        rootValidator = newRootValidator;
        emit RootValidatorUpdated(oldRootValidator, newRootValidator);
    }
    
    /**
     * @notice Set the block height
     * @param newHeight The new block height (uint64)
     */
    function setHeight(uint64 newHeight) external onlyOwner {
        uint64 oldHeight = height;
        height = newHeight;
        emit HeightUpdated(oldHeight, newHeight);
    }
    
    /**
     * @notice Transfer ownership of the contract
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @notice Check if a signer is a valid validator
     * @param signer The validator's public key (48 bytes compressed G1)
     * @return True if the signer is a validator
     */
    function isValidator(bytes calldata signer) external view returns (bool) {
        bytes32 signerHash = keccak256(signer);
        return validators[signerHash];
    }
    
    /**
     * @notice Update validators list manually
     * @dev Protocol not ready yet to provide proof of validator change, so do it manually atm
     * @param newRootValidator The new root validator value (bytes32)
     * @param validatorsToAdd Array of validator public keys to add (48 bytes compressed G1 each)
     * @param validatorsToRemove Array of validator public keys to remove (48 bytes compressed G1 each)
     */
    function updateValidators(
        bytes32 newRootValidator,
        bytes[] calldata validatorsToAdd,
        bytes[] calldata validatorsToRemove
    ) external onlyOwner {
        // Update root validator
        bytes32 oldRootValidator = rootValidator;
        rootValidator = newRootValidator;
        
        // Remove validators
        for (uint256 i = 0; i < validatorsToRemove.length; i++) {
            require(validatorsToRemove[i].length == 48, "signer must be 48 bytes compressed");
            bytes32 signerHash = keccak256(validatorsToRemove[i]);
            require(validators[signerHash], "Validator to remove does not exist");
            validators[signerHash] = false;
            emit ValidatorRemoved(validatorsToRemove[i]);
        }
        
        // Add validators
        for (uint256 i = 0; i < validatorsToAdd.length; i++) {
            require(validatorsToAdd[i].length == 48, "signer must be 48 bytes compressed");
            bytes32 signerHash = keccak256(validatorsToAdd[i]);
            require(!validators[signerHash], "Validator to add already exists");
            validators[signerHash] = true;
            emit ValidatorAdded(validatorsToAdd[i]);
        }
        
        emit RootValidatorUpdated(oldRootValidator, newRootValidator);
        emit ValidatorsUpdated(newRootValidator, validatorsToAdd, validatorsToRemove);
    }
}

