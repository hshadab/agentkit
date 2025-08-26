#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_API_URL = 'https://api-sandbox.circle.com/v1';

console.log('🔍 Checking Solana USDC on Circle Sandbox/Devnet');
console.log('================================================\n');

async function checkSolanaStatus() {
    try {
        // 1. Check if we have API credentials
        if (!CIRCLE_API_KEY) {
            console.error('❌ CIRCLE_API_KEY not found in environment');
            return;
        }
        console.log('✅ Circle API Key found\n');

        // 2. Test API connectivity
        console.log('📡 Testing Circle API connectivity...');
        const configResponse = await axios.get(`${CIRCLE_API_URL}/configuration`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Circle API is accessible\n');

        // 3. Get wallet information
        console.log('💳 Fetching wallet information...');
        const walletsResponse = await axios.get(`${CIRCLE_API_URL}/wallets`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const wallets = walletsResponse.data.data;
        console.log(`Found ${wallets.length} wallet(s)\n`);

        // 4. Check Solana addresses and balances
        let solanaWallet = null;
        for (const wallet of wallets) {
            console.log(`Wallet ID: ${wallet.walletId}`);
            
            // Get addresses for this wallet
            const addressesResponse = await axios.get(`${CIRCLE_API_URL}/wallets/${wallet.walletId}/addresses`, {
                headers: {
                    'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const addresses = addressesResponse.data.data;
            const solanaAddress = addresses.find(addr => addr.chain === 'SOL');
            
            if (solanaAddress) {
                solanaWallet = { ...wallet, address: solanaAddress.address };
                console.log(`  ✅ Solana address: ${solanaAddress.address}`);
                
                // Get balance
                const balancesResponse = await axios.get(`${CIRCLE_API_URL}/wallets/${wallet.walletId}/balances`, {
                    headers: {
                        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                const balances = balancesResponse.data.data;
                const usdcBalance = balances.find(b => b.currency === 'USD');
                console.log(`  💰 USDC Balance: ${usdcBalance ? usdcBalance.amount : '0'} USDC`);
            } else {
                console.log('  ❌ No Solana address found');
            }
            console.log('');
        }

        // 5. Check recent Solana transfers
        console.log('📜 Checking recent Solana transfers...');
        const transfersResponse = await axios.get(`${CIRCLE_API_URL}/transfers`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            params: {
                pageSize: 50
            }
        });

        const transfers = transfersResponse.data.data;
        const solanaTransfers = transfers.filter(t => 
            t.destination && t.destination.chain === 'SOL'
        );

        console.log(`Found ${solanaTransfers.length} Solana transfers (out of ${transfers.length} total)\n`);

        if (solanaTransfers.length > 0) {
            console.log('Recent Solana transfers:');
            solanaTransfers.slice(0, 5).forEach(transfer => {
                console.log(`  Transfer ID: ${transfer.id}`);
                console.log(`  Status: ${transfer.status}`);
                console.log(`  Amount: ${transfer.amount.amount} ${transfer.amount.currency}`);
                console.log(`  Created: ${new Date(transfer.createDate).toLocaleString()}`);
                if (transfer.transactionHash) {
                    console.log(`  Tx Hash: ${transfer.transactionHash}`);
                    console.log(`  Explorer: https://explorer.solana.com/tx/${transfer.transactionHash}?cluster=devnet`);
                } else {
                    console.log(`  Tx Hash: Not yet available`);
                }
                console.log('  ---');
            });
        }

        // 6. Test creating a Solana transfer (optional)
        if (solanaWallet) {
            console.log('\n🧪 Testing Solana transfer creation...');
            console.log('⚠️  This will create a real transfer on the sandbox/devnet\n');
            
            // Create a small test transfer
            const testTransferData = {
                idempotencyKey: `test-sol-${Date.now()}`,
                source: {
                    type: 'wallet',
                    id: solanaWallet.walletId
                },
                destination: {
                    type: 'blockchain',
                    address: solanaWallet.address, // Send to self for testing
                    chain: 'SOL'
                },
                amount: {
                    amount: '0.01',
                    currency: 'USD'
                }
            };

            console.log('Creating test transfer to self...');
            console.log(`From wallet: ${solanaWallet.walletId}`);
            console.log(`To address: ${solanaWallet.address}`);
            console.log(`Amount: 0.01 USDC\n`);

            try {
                const createResponse = await axios.post(
                    `${CIRCLE_API_URL}/transfers`,
                    testTransferData,
                    {
                        headers: {
                            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const transfer = createResponse.data.data;
                console.log('✅ Test transfer created successfully!');
                console.log(`Transfer ID: ${transfer.id}`);
                console.log(`Status: ${transfer.status}`);
                
                // Wait a bit and check status
                console.log('\nWaiting 5 seconds before checking status...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const statusResponse = await axios.get(
                    `${CIRCLE_API_URL}/transfers/${transfer.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                const updatedTransfer = statusResponse.data.data;
                console.log(`\nUpdated status: ${updatedTransfer.status}`);
                if (updatedTransfer.transactionHash) {
                    console.log(`Transaction hash: ${updatedTransfer.transactionHash}`);
                    console.log(`Explorer: https://explorer.solana.com/tx/${updatedTransfer.transactionHash}?cluster=devnet`);
                }
            } catch (error) {
                console.error('❌ Error creating test transfer:', error.response?.data || error.message);
            }
        }

        // 7. Summary
        console.log('\n📊 SUMMARY');
        console.log('==========');
        console.log(`✅ Circle API: Working`);
        console.log(`${solanaWallet ? '✅' : '❌'} Solana Wallet: ${solanaWallet ? 'Found' : 'Not found'}`);
        console.log(`📊 Pending Solana transfers: ${solanaTransfers.filter(t => t.status === 'pending').length}`);
        console.log(`✅ Completed Solana transfers: ${solanaTransfers.filter(t => t.status === 'complete').length}`);
        
        // Check if Solana is working based on recent transfers
        const recentCompleted = solanaTransfers.filter(t => 
            t.status === 'complete' && 
            new Date(t.createDate) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        );
        
        if (recentCompleted.length > 0) {
            console.log('\n✅ VERDICT: Solana USDC transfers are WORKING on devnet');
            console.log(`   ${recentCompleted.length} successful transfer(s) in the last 24 hours`);
        } else if (solanaTransfers.filter(t => t.status === 'pending').length > 5) {
            console.log('\n⚠️  VERDICT: Solana USDC transfers may be DELAYED');
            console.log('   Many transfers stuck in pending status');
            console.log('   This is a known issue with Circle sandbox for Solana');
        } else {
            console.log('\n❓ VERDICT: Unable to determine Solana status');
            console.log('   No recent completed transfers found');
        }

    } catch (error) {
        console.error('\n❌ Error checking Solana status:', error.response?.data || error.message);
    }
}

checkSolanaStatus().catch(console.error);