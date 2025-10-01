#!/usr/bin/env node

const { ethers } = require('ethers');

async function testContractCall() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const CONTRACT_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

    // ABI for verifyProof function
    const ABI = [
        'function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[2] memory input) public view returns (bool)'
    ];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    console.log('🔍 Testing Groth16 Verifier Contract');
    console.log('📍 Address:', CONTRACT_ADDRESS);
    console.log('🌐 Network: Base Sepolia');
    console.log();

    // Use proof from the latest successful verification
    const proof = {
        pi_a: [
            "21391638133836029417851411552299142534778100981053974924433168205225032714936",
            "9016739433451149040497286299909665580711179472697284341514606103120593525135"
        ],
        pi_b: [
            [
                "8604680217425172899403860707709016341456237390595992141153607150444639085443",
                "17009188170119397867188867299166602538047546516166560335156811845241512592728"
            ],
            [
                "6441216553830989960414785134100708266854295311165011290561710765270661639486",
                "18755242250663866077510926512619548601824255192107728174630395285410472426333"
            ]
        ],
        pi_c: [
            "7807736229847785702129156152302440265133696143919951144722475405242393185813",
            "16719196165941494072978453397557729803893718598966397990052046741840214006607"
        ]
    };

    const publicSignals = ["1", "196026773"];

    console.log('📝 Calling verifyProof() function...');
    console.log('   Public Signals:', publicSignals);
    console.log();

    try {
        const result = await contract.verifyProof(
            proof.pi_a,
            proof.pi_b,
            proof.pi_c,
            publicSignals
        );

        console.log('✅ Contract Call Successful!');
        console.log('   Verification Result:', result ? '✅ VALID' : '❌ INVALID');
        console.log();

        if (result) {
            console.log('🎉 This proves the contract at', CONTRACT_ADDRESS);
            console.log('   is the CORRECT Groth16 verifier for AgentAuthorizationSimple circuit!');
            console.log();
            console.log('📊 Contract Details:');
            console.log('   - Type: Groth16 zkSNARK Verifier');
            console.log('   - Circuit: AgentAuthorizationSimple');
            console.log('   - Public Inputs: 2 (authorized, proofHash)');
            console.log('   - Curve: BN128 (Alt-BN128)');
            console.log('   - Verification: Pairing-based (8 checks)');
        }

        return result;

    } catch (error) {
        console.error('❌ Contract call failed:', error.message);
        if (error.data) {
            console.error('   Error data:', error.data);
        }
        process.exit(1);
    }
}

testContractCall();
