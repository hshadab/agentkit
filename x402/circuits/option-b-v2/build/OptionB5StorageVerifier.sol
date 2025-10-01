// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface IOptionB5Groth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[5] calldata _pubSignals
    ) external view returns (bool);
}

contract Groth16StorageVerifierV5 {
    IOptionB5Groth16Verifier public immutable verifier;
    mapping(bytes32 => bool) public stored; // signalsHash -> present
    event Verified(address indexed caller, bytes32 signalsHash);

    constructor(address _verifier) { verifier = IOptionB5Groth16Verifier(_verifier); }

    function verifyAndStore(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[5] calldata _pubSignals
    ) external returns (bool) {
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "invalid_proof");
        bytes32 h = keccak256(abi.encodePacked(_pubSignals));
        stored[h] = true;
        emit Verified(msg.sender, h);
        return true;
    }
}

