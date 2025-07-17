const express = require('express');
const RealSNARKProver = require('./real_snark_prover.js');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// Initialize the SNARK prover
const snarkProver = new RealSNARKProver();

// SNARK generation endpoint
app.post('/generate-snark', async (req, res) => {
    console.log('=== SNARK Generation Request ===');
    console.log('Proof ID:', req.body.proofId);
    
    try {
        const { proofId, proofDir } = req.body;
        
        if (!proofId || !proofDir) {
            return res.status(400).json({
                error: 'Missing required fields: proofId and proofDir'
            });
        }
        
        // Read Nova proof data
        const publicJsonPath = path.join(proofDir, 'public.json');
        const metadataPath = path.join(proofDir, 'metadata.json');
        
        // Check if files exist
        try {
            await fs.access(publicJsonPath);
            await fs.access(metadataPath);
        } catch (e) {
            return res.status(404).json({
                error: 'Proof files not found',
                details: e.message
            });
        }
        
        // Read the files
        const publicInputs = JSON.parse(await fs.readFile(publicJsonPath, 'utf8'));
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        
        // Prepare Nova proof data for SNARK generation
        const novaProofData = {
            proofId: proofId,
            publicInputs: publicInputs,
            metadata: metadata
        };
        
        console.log('Generating SNARK proof for:', metadata.function || 'unknown');
        
        // Generate the SNARK proof
        const snarkResult = await snarkProver.generateProof(novaProofData);
        
        // Check if we got a valid proof structure
        if (!snarkResult || !snarkResult.proof || !snarkResult.publicSignals) {
            console.error('SNARK generation failed:', snarkResult);
            throw new Error(snarkResult?.error || 'SNARK generation returned invalid structure');
        }
        
        // Format for Ethereum - handle the format from real_snark_prover.js
        const ethereumData = {
            proof: {
                a: [
                    '0x' + BigInt(snarkResult.proof.a[0]).toString(16).padStart(64, '0'),
                    '0x' + BigInt(snarkResult.proof.a[1]).toString(16).padStart(64, '0')
                ],
                b: [
                    [
                        '0x' + BigInt(snarkResult.proof.b[0][0]).toString(16).padStart(64, '0'),
                        '0x' + BigInt(snarkResult.proof.b[0][1]).toString(16).padStart(64, '0')
                    ],
                    [
                        '0x' + BigInt(snarkResult.proof.b[1][0]).toString(16).padStart(64, '0'),
                        '0x' + BigInt(snarkResult.proof.b[1][1]).toString(16).padStart(64, '0')
                    ]
                ],
                c: [
                    '0x' + BigInt(snarkResult.proof.c[0]).toString(16).padStart(64, '0'),
                    '0x' + BigInt(snarkResult.proof.c[1]).toString(16).padStart(64, '0')
                ]
            },
            publicSignals: snarkResult.publicSignals.map(signal => 
                '0x' + BigInt(signal).toString(16).padStart(64, '0')
            ),
            // Include the original proof ID for tracking
            proof_id_bytes32: '0x' + Buffer.from(proofId).toString('hex').padEnd(64, '0').slice(0, 64)
        };
        
        console.log('✅ SNARK generated successfully');
        console.log('Public signals:', ethereumData.publicSignals.length);
        
        res.json({
            success: true,
            ethereum_data: ethereumData,
            generation_time_ms: snarkResult.generationTime || 0
        });
        
    } catch (error) {
        console.error('❌ SNARK generation error:', error);
        res.status(500).json({
            error: 'SNARK generation failed',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'snark-generation' });
});

const PORT = process.env.SNARK_SERVICE_PORT || 8003;

app.listen(PORT, async () => {
    console.log(`🔐 SNARK Generation Service running on port ${PORT}`);
    console.log('Initializing SNARK prover...');
    try {
        await snarkProver.initPromise;
        console.log('✅ SNARK prover initialized');
    } catch (e) {
        console.error('❌ Failed to initialize SNARK prover:', e);
    }
});