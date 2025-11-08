// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BLSHashToCurve.sol";

contract Bls12381Verifier {
    address constant PAIRING_PRECOMPILE = address(0x0f);
    bytes constant G2_GENERATOR_X_C0 = hex"024AA2B2F08F0FCE91C9D6C6F3A5FECF05426D3FBB5CB47E0B4E321B052D3D8AEC88C8C9BFF0D8A9A0F3AD8ECA0C8CC397E0E9F9A7F1C8A24A3B6E7B2F00AA6F";
    bytes constant G2_GENERATOR_X_C1 = hex"13E02B6052719F607DACDDFB11F209F319E1318CDBA4F1F61AD4F45B89F1D77AC17E1B65F4D8D5E7067E55F95B0A0B347E2D1A8ADDB963BFAA25C86F6E4361F3";
    bytes constant G2_GENERATOR_Y_C0 = hex"0CE5D527727D6E1170C0B6BA0B8A0E3FC0A64F04B2D3DBEDF69B46F0B6F28B94D329DCB7ADF5C1B75E7C5E686F8A4A34B8E334C1F201D2F7D95F8C1D0D4FE8B1";
    bytes constant G2_GENERATOR_Y_C1 = hex"0606C4A0ACBF3A70F5BBDB23A603E1367DC32E8CE89E3EA0F9E6A9A9EB6D0B277D43EAA1D3C436C3F2C3A1B1AE06C7D92DCAEEE4B5EBAA12D09416B7D140C6A5";

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

        bytes memory hNegY = negateYCoordinate(hY);
        bytes memory input = abi.encodePacked(
            sigX, sigY,
            G2_GENERATOR_X_C0, G2_GENERATOR_X_C1,
            G2_GENERATOR_Y_C0, G2_GENERATOR_Y_C1,
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

    function verifySignatureWithMessage(
        bytes memory sigX,
        bytes memory sigY,
        bytes memory message,
        bytes memory pkXc0,
        bytes memory pkXc1,
        bytes memory pkYc0,
        bytes memory pkYc1
    ) public view returns (bool) {
        require(sigX.length == 64 && sigY.length == 64, "Invalid sig length");
        require(
            pkXc0.length == 64 && pkXc1.length == 64 &&
            pkYc0.length == 64 && pkYc1.length == 64,
            "Invalid pk length"
        );

        (bytes memory hX, bytes memory hY) = BLSHashToCurve.hashToCurve(message);
        return verifySignature(sigX, sigY, hX, hY, pkXc0, pkXc1, pkYc0, pkYc1);
    }

    function negateYCoordinate(bytes memory y) internal pure returns (bytes memory) {
        require(y.length == 64, "Invalid Y coordinate length");
        
        uint256 yValue = 0;
        for (uint256 i = 0; i < 32; i++) {
            yValue = (yValue << 8) | uint8(y[i]);
        }
        
        uint256 p = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;
        uint256 negY = (p - yValue) % p;
        
        bytes memory result = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            result[63 - i] = bytes1(uint8(negY & 0xff));
            negY = negY >> 8;
        }
        
        return result;
    }
}
