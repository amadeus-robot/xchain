// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BLSG1Decompress
 * @notice Contract for decompressing BLS12-381 G1 points from 48 bytes to 128 bytes
 * 
 * Compressed format: 48 bytes [flags(1 byte) | x_coordinate(47 bytes)]
 *   - flags: bit 7 = compressed flag (must be 1), bit 6 = infinity (must be 0), bit 5 = larger y flag
 * Uncompressed format: 128 bytes [x(64 bytes) | y(64 bytes)]
 * 
 * Based on BLS2 library implementation.
 */
contract BLSG1Decompress {
    // Field order p for BLS12-381
    uint128 private constant P_HI = 0x1a0111ea397fe69a4b1ba7b6434bacd7;
    uint256 private constant P_LO = 0x64774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab;
    
    // (p+1)/4 for square root computation
    uint128 private constant P_PLUS_ONE_SLASH_2_HI = 0x0680447a8e5ff9a692c6e9ed90d2eb35;
    uint256 private constant P_PLUS_ONE_SLASH_2_LO = 0xd91dd2e13ce144afd9cc34a83dac3d8907aaffffac54ffffee7fbfffffffeaab;
    
    uint256 private constant MODEXP_ADDRESS = 0x05;

    /**
     * @notice Decompress a 48-byte compressed G1 point to 128-byte uncompressed format
     * @param compressed 48-byte compressed G1 point
     * @return uncompressed 128-byte uncompressed G1 point (64 bytes x || 64 bytes y)
     */
    function decompress(bytes memory compressed) external view returns (bytes memory) {
        require(compressed.length == 48, "compressed G1 must be 48 bytes");

        uint128 x_hi;
        uint256 x_lo;
        uint128 y_hi;
        uint256 y_lo;

        bytes memory buf = new bytes(288);

        uint8 flags;
        bool larger = false;

        assembly {
            // Load first 16 bytes (x_hi) and extract flags
            x_hi := shr(128, mload(add(compressed, 0x20)))
            x_lo := mload(add(compressed, 0x30))
            flags := byte(16, x_hi)
            // Clear flag bits from x_hi (keep only lower 127 bits)
            x_hi := and(x_hi, 0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        }

        // Check compression flag (bit 7)
        if (flags & 0x80 == 0) {
            revert("Invalid G1 point: not compressed");
        }
        // Check infinity flag (bit 6) - not supported
        if (flags & 0x40 != 0) {
            revert("unsupported: point at infinity");
        }
        // Check larger y flag (bit 5)
        if (flags & 0x20 == 0) {
            larger = true;
        }

        // Compute x^3 mod p
        bool ok;
        assembly {
            let p := add(buf, 32)
            mstore(p, 64) // length of base
            p := add(p, 32)
            mstore(p, 1) // length of exponent (3 as single byte)
            p := add(p, 32)
            mstore(p, 64) // length of modulus
            p := add(p, 32)
            mstore(p, x_hi)
            p := add(p, 32)
            mstore(p, x_lo)
            p := add(p, 32)
            mstore8(p, 3) // exponent = 3
            p := add(p, 1)
            mstore(p, P_HI)
            p := add(p, 32)
            mstore(p, P_LO)
            ok := staticcall(gas(), MODEXP_ADDRESS, add(32, buf), 225, add(32, buf), 64)
            y_hi := mload(add(buf, 32))
            y_lo := mload(add(buf, 64))
        }
        require(ok, "modexp x^3 failed");
        
        // Add 4: y^2 = x^3 + 4
        unchecked {
            y_lo += 4;
        }
        if (y_lo < 4) {
            // overflow -> carry
            y_hi += 1;
        }

        // Compute y = sqrt(y^2) mod p = (y^2)^((p+1)/4) mod p
        assembly {
            let p := add(buf, 32)
            mstore(p, 64) // length of base
            p := add(p, 32)
            mstore(p, 64) // length of exponent
            p := add(p, 32)
            mstore(p, 64) // length of modulus
            p := add(p, 32)
            mstore(p, y_hi)
            p := add(p, 32)
            mstore(p, y_lo)
            p := add(p, 32)
            mstore(p, P_PLUS_ONE_SLASH_2_HI)
            p := add(p, 32)
            mstore(p, P_PLUS_ONE_SLASH_2_LO)
            p := add(p, 32)
            mstore(p, P_HI)
            p := add(p, 32)
            mstore(p, P_LO)
            ok := staticcall(gas(), MODEXP_ADDRESS, add(32, buf), 288, add(32, buf), 64)
            y_hi := mload(add(buf, 32))
            y_lo := mload(add(buf, 64))
        }
        require(ok, "modexp sqrt failed");

        // Compute alternative y: p - y
        uint128 alt_y_hi = P_HI - y_hi;
        uint256 alt_y_lo;
        unchecked {
            alt_y_lo = P_LO - y_lo;
        }
        if (alt_y_lo > P_LO) {
            // underflow -> carry
            alt_y_hi -= 1;
        }

        // Select correct y based on larger flag
        // If larger flag is set, we want the larger y value
        bool do_swap = y_hi > alt_y_hi || (y_hi == alt_y_hi && y_lo > alt_y_lo);
        do_swap = larger == do_swap;
        if (do_swap) {
            y_hi = alt_y_hi;
            y_lo = alt_y_lo;
        }

        // Marshal to bytes in EIP-2537 format: x_hi(32) || x_lo(32) || y_hi(32) || y_lo(32)
        // Where x_hi and y_hi have 16 bytes of padding at the start, then 16 bytes of data
        // Format matches g1PublicKeyToEIP2537: [padding(16) | x_hi(16)] || x_lo(32) || [padding(16) | y_hi(16)] || y_lo(32)
        // In fp48ToEIP2537: hi.set(b48.slice(0, 16), 16) puts high 16 bytes at offset 16
        // So we need: bytes 0-15 = zeros, bytes 16-31 = x_hi
        bytes memory result = new bytes(128);
        assembly {
            // x_hi is uint128 (16 bytes). We need: [zeros(16) | x_hi(16)]
            // In Yul memory (big-endian), mstore stores 32-byte words
            // shl(128, x_hi) shifts x_hi to the high 16 bytes of the word
            // But in big-endian memory, high bytes are stored first, so this puts x_hi at bytes 0-15
            // We need x_hi at bytes 16-31, so we should NOT shift, or shift differently
            // Actually, we need to manually construct: [0...0 | x_hi]
            // Store zeros in first 16 bytes, then x_hi in next 16 bytes
            mstore(add(result, 0x20), 0)  // Clear first 32 bytes (will be overwritten)
            mstore(add(result, 0x30), x_hi)  // Store x_hi at bytes 16-31 (offset 0x30 = 48 bytes = 16 bytes into the 32-byte word)
            
            // Actually, wait. mstore stores 32 bytes. If we do mstore(offset, x_hi), it stores x_hi
            // at the low end of the 32-byte word. So mstore(add(result, 0x30), x_hi) stores
            // x_hi at bytes 16-47, which is wrong.
            
            // Correct approach: Store zeros at bytes 0-15, x_hi at bytes 16-31
            // We can do: mstore(add(result, 0x20), shl(128, x_hi)) but this puts x_hi at high end
            // In big-endian, high end = bytes 0-15, so this is wrong.
            
            // We need to store x_hi at the low end of the second 16 bytes
            // Let's construct the word manually: [zeros(16) | x_hi(16)]
            let x_hi_padded := or(shl(128, 0), x_hi)  // This doesn't work, x_hi is already at low end
            
            // Better: Store x_hi directly, then shift the whole word
            // Actually, x_hi is uint128, which is 16 bytes. When stored in a 32-byte word,
            // it occupies the low 16 bytes. To put it at bytes 16-31, we need to shift it left by 128 bits.
            // But shl(128, x_hi) in Yul shifts the VALUE, not the bytes.
            
            // Let me think differently: In the result array, we want:
            // result[0-15] = 0
            // result[16-31] = x_hi
            // When we mstore a 32-byte word at offset 0x20, it stores bytes 0-31
            // If we want x_hi at bytes 16-31, we need x_hi at the low 16 bytes of the word
            // So we should NOT shift, just store x_hi directly, but pad with zeros first
            
            // Store zeros in first 16 bytes, x_hi in second 16 bytes
            // We can do: word = (x_hi << 128) but that puts x_hi at high end
            // We need: word = x_hi (at low end), but we're storing at offset that gives us bytes 16-31
            
            // Actually, I think the issue is the offset. Let me check:
            // mstore(add(result, 0x20)) stores at bytes 0-31
            // mstore(add(result, 0x30)) would store at bytes 16-47 (overlapping!)
            
            // Correct: Store [zeros(16) | x_hi(16)] as a 32-byte word at offset 0x20
            // x_hi is uint128, stored as low 16 bytes of a word
            // To get [zeros(16) | x_hi(16)], we need x_hi at low 16 bytes, which it already is!
            // So we just need to ensure high 16 bytes are zero, then store
            mstore(add(result, 0x20), x_hi)  // This stores x_hi at bytes 0-15, zeros at 16-31 (wrong!)
            
            // Wait, that's also wrong. Let me reconsider the memory layout.
            // In Solidity/Yul, memory is byte-addressable, big-endian
            // mstore(addr, value) stores the 32-byte value starting at addr
            // The value is stored in big-endian: high byte first
            
            // If x_hi is uint128 (16 bytes), and we do mstore(addr, x_hi):
            // - x_hi is zero-extended to 32 bytes (zeros at high end)
            // - Stored at addr, so bytes addr+0 to addr+31
            // - High bytes (zeros) at addr+0 to addr+15
            // - Low bytes (x_hi) at addr+16 to addr+31
            
            // So mstore(add(result, 0x20), x_hi) stores:
            // - result[0-15] = zeros
            // - result[16-31] = x_hi
            // This is exactly what we want!
            
            // But the test shows x_hi at bytes 0-15. Let me check if the issue is elsewhere.
            
            // Actually, I think the issue might be that when we extract x_hi with shr(128, ...),
            // we're getting the high 16 bytes, but in the 48-byte compressed format,
            // the high 16 bytes might be at a different position.
            
            // Let me re-read the extraction code:
            // x_hi := shr(128, mload(add(compressed, 0x20)))
            // This loads 32 bytes starting at compressed[0], shifts right by 128 bits
            // So it gets the high 16 bytes of the first 32 bytes of compressed data
            // But compressed is 48 bytes: [flags(1) | x(47)]
            // The first 32 bytes include the flags byte and 31 bytes of x
            // After shifting right by 128 bits, we get the high 16 bytes of those 32 bytes
            // But we want the high 16 bytes of the 48-byte x coordinate
            
            // I think the issue is in how we extract x_hi. Let me check the reference code.
            
            // Actually, looking at the reference BLS2 code:
            // x_hi := shr(128, mload(add(m, 0x20)))
            // x_lo := mload(add(m, 0x30))
            // flags := byte(16, x_hi)
            // x_hi := and(x_hi, 0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            
            // So x_hi is extracted the same way. The issue must be in how we store it.
            
            // Let me try a different approach: store x_hi without shifting, at the correct offset
            mstore(add(result, 0x20), x_hi)  // Store x_hi, which will be at low 16 bytes = result[16-31]
            
            // Store x_lo: x_lo(32) at offset 0x40 (bytes 32-63)
            mstore(add(result, 0x40), x_lo)
            
            // Store y_hi: [padding(16) | y_hi(16)] at offset 0x60 (bytes 64-95)
            mstore(add(result, 0x60), y_hi)  // Store y_hi at low 16 bytes = result[80-95]
            
            // Store y_lo: y_lo(32) at offset 0x80 (bytes 96-127)
            mstore(add(result, 0x80), y_lo)
        }

        return result;
    }
}
