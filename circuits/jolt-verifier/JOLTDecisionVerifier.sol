// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 2193332679201814259401105696992892671221454522290833434250981566518827674794;
    uint256 constant alphay  = 8578727182880960154842541926943115954777816998328395340513550594155606365118;
    uint256 constant betax1  = 17098698623095534886556277529583889441593063630004193138037616033844189323242;
    uint256 constant betax2  = 15868318701396195649710082487970179923124975657721339008120764562446462835196;
    uint256 constant betay1  = 1458048413873554832610270062945439640034612102844906707430218586595606167810;
    uint256 constant betay2  = 14998281877019445073729634837805055794907617136375376145250967061012612914975;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 4383683698064498705764957776023905998844129570007165647757399383923791386401;
    uint256 constant deltax2 = 17641466918983412556990385732150762721311800502483662132646961622333978243802;
    uint256 constant deltay1 = 19106649340699678701678514845723121597660434624611586493132385397590169237754;
    uint256 constant deltay2 = 9750028410483634283526149965769606899998301285496540322054636219120811199583;

    
    uint256 constant IC0x = 3869141387466317340215205148204418248976742300111239675269816212138407481588;
    uint256 constant IC0y = 21376088207104258292074746889264760394579518977077702278251692366842911312840;
    
    uint256 constant IC1x = 1494512032242299865761293963997803965140250701031663696830849096038660147572;
    uint256 constant IC1y = 4604065954925878215534406678842843823461582386169095125326763566525297766810;
    
    uint256 constant IC2x = 8121735755975677346939509141071475674940676801743239695620925946108232655154;
    uint256 constant IC2y = 423108903387058877662123812844173774474923331186884965224826047808954551882;
    
    uint256 constant IC3x = 18087237765707437309310313767768559902093125352954554751359438384010157803108;
    uint256 constant IC3y = 21407437895483938855048832365124383381863150950381011609049811401518587119931;
    
    uint256 constant IC4x = 16295210404405963272907054893479672553211621091984804416451697820966746430481;
    uint256 constant IC4y = 18202949320278780750632231472786724962518356219057207057617772256533481181292;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[4] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }

// Additional JOLT zkML verification logic
contract JOLTzkMLVerifier is Groth16Verifier {
    struct VerifiedDecision {
        uint256 decision;     // 1 = APPROVE, 0 = DENY
        uint256 confidence;   // 0-100
        uint256 threshold;    // Min confidence required
        uint256 timestamp;
        address verifier;
    }
    
    mapping(bytes32 => VerifiedDecision) public verifiedProofs;
    
    event JOLTProofVerified(
        bytes32 indexed proofId,
        uint256 decision,
        uint256 confidence,
        address indexed agent
    );
    
    function verifyAndStore(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals // decision, confidence, threshold, reserved
    ) public returns (bool) {
        require(verifyProof(_pA, _pB, _pC, _pubSignals), "Invalid JOLT proof");
        
        bytes32 proofId = keccak256(abi.encodePacked(_pA, _pB, _pC));
        
        verifiedProofs[proofId] = VerifiedDecision({
            decision: _pubSignals[0],
            confidence: _pubSignals[1],
            threshold: _pubSignals[2],
            timestamp: block.timestamp,
            verifier: msg.sender
        });
        
        emit JOLTProofVerified(proofId, _pubSignals[0], _pubSignals[1], msg.sender);
        
        return true;
    }
}
