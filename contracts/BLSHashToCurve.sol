// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library BLSHashToCurve {
    uint256 constant P_LOW = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;
    uint256 constant CURVE_A = 0;
    uint256 constant CURVE_B = 4;
    uint256 constant COFACTOR = 0x396c8c005555e1568c00aaab0000aaab;
    bytes constant DST = "BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_";
    uint256 constant Z_NEG = 2;
    
    function hashToCurve(bytes memory message) internal pure returns (bytes memory x, bytes memory y) {
        bytes memory uniformBytes = expandMessageXMD(message, DST, 96);
        (uint256 u0, uint256 u1) = bytesToFieldElements(uniformBytes);
        (uint256 x0, uint256 y0) = mapToCurveSSWU(u0);
        (uint256 x1, uint256 y1) = mapToCurveSSWU(u1);
        (uint256 xSum, uint256 ySum) = ecAdd(x0, y0, x1, y1);
        (uint256 xFinal, uint256 yFinal) = scalarMultiply(xSum, ySum, COFACTOR);
        x = uint256ToBytes64(xFinal);
        y = uint256ToBytes64(yFinal);
    }
    
    function expandMessageXMD(
        bytes memory message,
        bytes memory dst,
        uint256 lenInBytes
    ) internal pure returns (bytes memory uniformBytes) {
        uint256 ell = (lenInBytes + 31) / 32;
        require(ell <= 255, "len_in_bytes too large");
        
        bytes memory zPad = new bytes(64);
        bytes memory libStr = abi.encodePacked(uint8(lenInBytes >> 8), uint8(lenInBytes & 0xff));
        bytes memory dstPrime = abi.encodePacked(dst, uint8(dst.length));
        
        bytes memory msgPrime = abi.encodePacked(zPad, message, libStr, uint8(0), dstPrime);
        bytes32 b0 = sha256(msgPrime);
        
        bytes memory b1Input = abi.encodePacked(b0, uint8(1), dstPrime);
        bytes32 b1 = sha256(b1Input);
        
        uniformBytes = abi.encodePacked(b0, b1);
        
        if (ell > 2) {
            bytes memory b2Input = abi.encodePacked(xorBytes(b0, b1), uint8(2), dstPrime);
            bytes32 b2 = sha256(b2Input);
            uniformBytes = abi.encodePacked(uniformBytes, b2);
        }
    }
    
    function xorBytes(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a ^ b;
    }
    
    function bytesToFieldElements(bytes memory uniformBytes) internal pure returns (uint256 u0, uint256 u1) {
        require(uniformBytes.length >= 96, "Insufficient uniform bytes");
        
        bytes memory u0Bytes = new bytes(48);
        for (uint256 i = 0; i < 48; i++) {
            u0Bytes[i] = uniformBytes[i];
        }
        u0 = bytes48ToUint256(u0Bytes);
        u0 = u0 % P_LOW;
        
        bytes memory u1Bytes = new bytes(48);
        for (uint256 i = 0; i < 48; i++) {
            u1Bytes[i] = uniformBytes[i + 48];
        }
        u1 = bytes48ToUint256(u1Bytes);
        u1 = u1 % P_LOW;
    }
    
    function bytes48ToUint256(bytes memory data) internal pure returns (uint256 result) {
        require(data.length == 48, "Invalid data length");
        for (uint256 i = 0; i < 48; i++) {
            result = (result << 8) | uint8(data[i]);
        }
    }
    
    function mapToCurveSSWU(uint256 u) internal pure returns (uint256 x, uint256 y) {
        uint256 u2 = mulmod(u, u, P_LOW);
        uint256 u4 = mulmod(u2, u2, P_LOW);
        uint256 z2u4 = mulmod(4, u4, P_LOW);
        uint256 zu2 = submod(P_LOW, mulmod(2, u2, P_LOW), P_LOW);
        uint256 tv1 = addmod(z2u4, zu2, P_LOW);
        tv1 = inv0(tv1);
        
        uint256 x1 = mulmod(CURVE_B, inv0(mulmod(Z_NEG, u2, P_LOW)), P_LOW);
        x1 = mulmod(x1, addmod(1, tv1, P_LOW), P_LOW);
        x1 = submod(P_LOW, x1, P_LOW);
        
        uint256 gx1 = addmod(mulmod(mulmod(x1, x1, P_LOW), x1, P_LOW), CURVE_B, P_LOW);
        uint256 x2 = mulmod(mulmod(Z_NEG, u2, P_LOW), x1, P_LOW);
        x2 = submod(P_LOW, x2, P_LOW);
        uint256 gx2 = addmod(mulmod(mulmod(x2, x2, P_LOW), x2, P_LOW), CURVE_B, P_LOW);
        
        bool gx1IsSquare = isSquare(gx1);
        uint256 gx = gx1IsSquare ? gx1 : gx2;
        x = gx1IsSquare ? x1 : x2;
        y = sqrt(gx);
        
        if (sgn0(u) != sgn0(y)) {
            y = submod(P_LOW, y, P_LOW);
        }
    }
    
    function isSquare(uint256 a) internal pure returns (bool) {
        if (a == 0) return true;
        uint256 exp = (P_LOW - 1) / 2;
        return modExp(a, exp, P_LOW) == 1;
    }
    
    function sqrt(uint256 a) internal pure returns (uint256) {
        if (a == 0) return 0;
        if (!isSquare(a)) return 0;
        
        uint256 candidate = modExp(a, (P_LOW + 1) / 4, P_LOW);
        if (mulmod(candidate, candidate, P_LOW) == a) {
            return candidate;
        }
        
        candidate = submod(P_LOW, candidate, P_LOW);
        if (mulmod(candidate, candidate, P_LOW) == a) {
            return candidate;
        }
        
        return 0;
    }
    
    function sgn0(uint256 a) internal pure returns (uint256) {
        return a % 2;
    }
    
    function inv0(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        return invMod(x, P_LOW);
    }
    
    function modExp(uint256 base, uint256 exp, uint256 mod) internal pure returns (uint256 result) {
        result = 1;
        base = base % mod;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, mod);
            }
            exp = exp >> 1;
            base = mulmod(base, base, mod);
        }
    }
    
    function ecAdd(
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) internal pure returns (uint256 x3, uint256 y3) {
        if (x1 == 0 && y1 == 0) {
            return (x2, y2);
        }
        if (x2 == 0 && y2 == 0) {
            return (x1, y1);
        }
        if (x1 == x2) {
            if (y1 == y2) {
                return ecDouble(x1, y1);
            } else {
                return (0, 0);
            }
        }
        
        uint256 s = mulmod(
            submod(y2, y1, P_LOW),
            invMod(submod(x2, x1, P_LOW), P_LOW),
            P_LOW
        );
        
        x3 = submod(submod(mulmod(s, s, P_LOW), x1, P_LOW), x2, P_LOW);
        y3 = submod(mulmod(s, submod(x1, x3, P_LOW), P_LOW), y1, P_LOW);
    }
    
    function ecDouble(uint256 x1, uint256 y1) internal pure returns (uint256 x3, uint256 y3) {
        if (y1 == 0) {
            return (0, 0);
        }
        
        uint256 s = mulmod(
            mulmod(3, mulmod(x1, x1, P_LOW), P_LOW),
            invMod(mulmod(2, y1, P_LOW), P_LOW),
            P_LOW
        );
        
        x3 = submod(mulmod(s, s, P_LOW), mulmod(2, x1, P_LOW), P_LOW);
        y3 = submod(mulmod(s, submod(x1, x3, P_LOW), P_LOW), y1, P_LOW);
    }
    
    function scalarMultiply(
        uint256 x,
        uint256 y,
        uint256 k
    ) internal pure returns (uint256 xOut, uint256 yOut) {
        (xOut, yOut) = (0, 0);
        (uint256 currentX, uint256 currentY) = (x, y);
        
        while (k > 0) {
            if (k % 2 == 1) {
                (xOut, yOut) = ecAdd(xOut, yOut, currentX, currentY);
            }
            (currentX, currentY) = ecDouble(currentX, currentY);
            k = k >> 1;
        }
    }
    
    function invMod(uint256 a, uint256 m) internal pure returns (uint256) {
        if (a == 0) return 0;
        
        int256 t0 = 0;
        int256 t1 = 1;
        uint256 r0 = m;
        uint256 r1 = a;
        
        while (r1 != 0) {
            uint256 q = r0 / r1;
            (t0, t1) = (t1, t0 - int256(q) * t1);
            (r0, r1) = (r1, r0 - q * r1);
        }
        
        if (r0 > 1) return 0;
        if (t0 < 0) return uint256(t0 + int256(m));
        return uint256(t0);
    }
    
    function submod(uint256 a, uint256 b, uint256 mod) internal pure returns (uint256) {
        if (a >= b) {
            return (a - b) % mod;
        } else {
            return (mod - ((b - a) % mod)) % mod;
        }
    }
    
    function uint256ToBytes64(uint256 value) internal pure returns (bytes memory) {
        bytes memory result = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            result[63 - i] = bytes1(uint8(value & 0xff));
            value = value >> 8;
        }
        return result;
    }
}
