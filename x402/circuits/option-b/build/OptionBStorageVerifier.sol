// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface IOptionBGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external view returns (bool);
}

contract Groth16StorageVerifier {
    IOptionBGroth16Verifier public immutable verifier;
    mapping(address => uint256) public verificationCount;

    event Verified(address indexed caller, bytes32 signalsHash);

    constructor(address _verifier) {
        verifier = IOptionBGroth16Verifier(_verifier);
    }

    function verifyAndStore(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external returns (bool) {
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "invalid_proof");
        unchecked { verificationCount[msg.sender] += 1; }
        emit Verified(msg.sender, keccak256(abi.encodePacked(_pubSignals)));
        return true;
    }
}

