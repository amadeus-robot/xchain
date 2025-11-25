// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
    AMA-ONLY HIGHLY OPTIMIZED VECPAK ENCODER (O2)
    ------------------------------------------------
    Supports only the types required by AMA block headers:
      - TYPE_INT   (0x03)
      - TYPE_BYTES (0x05)
      - TYPE_MAP   (0x07)

    Keys are pre-encoded and pre-sorted (canonical VecPak order).
    No dynamic map sorting, no string encoding, no recursion.
*/

library AmaVecPakO2 {

    uint8 constant TYPE_INT   = 0x03;
    uint8 constant TYPE_BYTES = 0x05;
    uint8 constant TYPE_MAP   = 0x07;

    // ------------------------------------------------------------
    // Pre-encoded keys in canonical order (TYPE_BYTES + varint(len) + utf8)
    // ------------------------------------------------------------

    bytes constant K_DR              = hex"0501026472";                         // "dr"
    bytes constant K_HEIGHT          = hex"050106686569676874";                 // "height"
    bytes constant K_PREV_HASH       = hex"050109707265765f68617368";           // "prev_hash"
    bytes constant K_PREV_SLOT       = hex"050109707265765f736c6f74";           // "prev_slot"
    bytes constant K_ROOT_TX         = hex"050107726f6f745f7478";               // "root_tx"
    bytes constant K_ROOT_VALIDATOR  = hex"05010e726f6f745f76616c696461746f72"; // "root_validator"
    bytes constant K_SIGNER          = hex"0501067369676e6572";                 // "signer"
    bytes constant K_SLOT            = hex"050104736c6f74";                     // "slot"
    bytes constant K_VR              = hex"0501027672";                         // "vr"

    // ------------------------------------------------------------
    // AMA Header Struct
    // ------------------------------------------------------------
    struct AmaHeader {
        uint64 height;
        bytes32 prev_hash;
        uint64 slot;
        uint64 prev_slot;
        bytes signer;         // 48 bytes
        bytes32 dr;
        bytes vr;             // 96 bytes
        bytes32 root_tx;
        bytes32 root_validator;
    }

    // ------------------------------------------------------------
    // encodeVarInt: optimized for uint64 inputs
    // ------------------------------------------------------------
    function encodeVarInt(uint256 value) internal pure returns (bytes memory out) {
        if (value == 0) {
            return hex"00";
        }

        // uint64 → up to 8 significant bytes
        uint256 temp = value;
        uint8 len = 0;

        // Determine number of non-zero bytes
        for (uint8 i = 0; i < 8; i++) {
            if (temp >> (8 * (7 - i)) != 0) {
                len = uint8(8 - i);
                break;
            }
        }

        out = new bytes(1 + len);
        out[0] = bytes1(len);

        for (uint8 i = 0; i < len; i++) {
            out[1 + i] = bytes1(uint8(value >> (8 * (len - 1 - i))));
        }
    }

    // ------------------------------------------------------------
    // encodeInt: TYPE_INT + varint
    // ------------------------------------------------------------
    function encodeInt(uint256 v) internal pure returns (bytes memory) {
        return abi.encodePacked(TYPE_INT, encodeVarInt(v));
    }

    // ------------------------------------------------------------
    // encodeBytes: TYPE_BYTES + varint(len) + raw bytes
    // ------------------------------------------------------------
    function encodeBytes(bytes memory b) internal pure returns (bytes memory) {
        return abi.encodePacked(TYPE_BYTES, encodeVarInt(b.length), b);
    }

    // ------------------------------------------------------------
    // encodeAmaHeader: using static key order → huge gas savings
    // ------------------------------------------------------------
    function encodeAmaHeader(AmaHeader memory h) internal pure returns (bytes memory) {
        return abi.encodePacked(
            // MAP prefix
            TYPE_MAP,
            encodeVarInt(9),

            // dr
            K_DR,
            encodeBytes(abi.encodePacked(h.dr)),

            // vr
            K_VR,
            encodeBytes(h.vr),

            // slot
            K_SLOT,
            encodeInt(h.slot),

            // height
            K_HEIGHT,
            encodeInt(h.height),

            // signer
            K_SIGNER,
            encodeBytes(h.signer),

            // root_tx
            K_ROOT_TX,
            encodeBytes(abi.encodePacked(h.root_tx)),

            // prev_hash
            K_PREV_HASH,
            encodeBytes(abi.encodePacked(h.prev_hash)),

            // prev_slot
            K_PREV_SLOT,
            encodeInt(h.prev_slot),

            // root_validator
            K_ROOT_VALIDATOR,
            encodeBytes(abi.encodePacked(h.root_validator))
        );
    }

    // ------------------------------------------------------------
    // Hash header
    // ------------------------------------------------------------
    function hashAmaHeader(AmaHeader memory h) internal pure returns (bytes32) {
        return sha256(encodeAmaHeader(h));
    }

}

