# x402scan zkML Integration - Quick Start Guide

This guide helps you implement the first iteration of zkML verification badges on x402scan in **one week**.

---

## MVP Scope (Week 1)

**Goal**: Add verification badges to the transaction list page

**Deliverables**:
1. ✅ Backend API endpoint to check if transaction has zkML proof
2. ✅ Frontend badge component showing verification status
3. ✅ Simple proof detail modal on badge click

---

## Step-by-Step Implementation

### Day 1: Database Setup

#### 1. Add zkML Verification Table

```sql
-- Add to your migrations folder
-- migrations/add_zkml_verifications.sql

CREATE TABLE zkml_verifications (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  proof_hash VARCHAR(66),
  model_hash VARCHAR(66),
  decision INTEGER,           -- 0 = denied, 1 = approved
  confidence INTEGER,          -- 0-100
  verifier_contract VARCHAR(42),
  chain_id INTEGER,
  block_number BIGINT,
  timestamp TIMESTAMP,
  gas_used INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tx_hash ON zkml_verifications(tx_hash);
CREATE INDEX idx_timestamp ON zkml_verifications(timestamp);
CREATE INDEX idx_chain_id ON zkml_verifications(chain_id);
```

#### 2. Run Migration

```bash
# Using your preferred migration tool
npm run migrate:up
# Or manually
psql $DATABASE_URL -f migrations/add_zkml_verifications.sql
```

---

### Day 2: Indexer Integration

#### 1. Add Verifier Contract ABI

```typescript
// lib/abis/JoltVerifier.ts
export const JOLT_VERIFIER_ABI = [
  {
    type: 'event',
    name: 'VerificationStored',
    inputs: [
      { name: 'proofHash', type: 'bytes32', indexed: true },
      { name: 'decision', type: 'uint256' },
      { name: 'confidence', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'verifyAndStore',
    inputs: [
      { name: 'a', type: 'uint256[2]' },
      { name: 'b', type: 'uint256[2][2]' },
      { name: 'c', type: 'uint256[2]' },
      { name: 'publicSignals', type: 'uint256[3]' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;
```

#### 2. Add Verifier Addresses

```typescript
// lib/contracts/verifiers.ts
export const VERIFIER_CONTRACTS = {
  'base-sepolia': {
    chainId: 84532,
    address: '0xf752509cb5af017f465B42053d41B730991c6624',
    deployedAt: 21474396 // Block number
  },
  // Add more chains as they deploy
  'ethereum-sepolia': {
    chainId: 11155111,
    address: '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308',
    deployedAt: 7234567
  }
} as const;
```

#### 3. Create Indexer Task

```typescript
// indexer/tasks/index-zkml-verifications.ts
import { defineTask } from "@trigger.dev/sdk";
import { createPublicClient, decodeEventLog, http } from "viem";
import { baseSepolia } from "viem/chains";
import { JOLT_VERIFIER_ABI } from "@/lib/abis/JoltVerifier";
import { VERIFIER_CONTRACTS } from "@/lib/contracts/verifiers";
import { db } from "@/lib/db";

export const indexZkMLVerifications = defineTask({
  id: "index-zkml-verifications",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { chainId: number; fromBlock: bigint; toBlock: bigint }) => {
    const { chainId, fromBlock, toBlock } = payload;

    // Get verifier config
    const verifierConfig = Object.values(VERIFIER_CONTRACTS).find(
      v => v.chainId === chainId
    );
    if (!verifierConfig) {
      throw new Error(`No verifier for chain ${chainId}`);
    }

    // Create client
    const client = createPublicClient({
      chain: baseSepolia, // TODO: Make dynamic based on chainId
      transport: http()
    });

    // Fetch logs
    const logs = await client.getLogs({
      address: verifierConfig.address as `0x${string}`,
      event: JOLT_VERIFIER_ABI[0],
      fromBlock,
      toBlock
    });

    console.log(`Found ${logs.length} verification events`);

    // Process each log
    for (const log of logs) {
      const decoded = decodeEventLog({
        abi: JOLT_VERIFIER_ABI,
        data: log.data,
        topics: log.topics
      });

      // Get transaction receipt for gas info
      const receipt = await client.getTransactionReceipt({
        hash: log.transactionHash
      });

      // Insert into database
      await db.zkmlVerifications.upsert({
        where: { txHash: log.transactionHash },
        create: {
          txHash: log.transactionHash,
          proofHash: decoded.args.proofHash,
          decision: Number(decoded.args.decision),
          confidence: Number(decoded.args.confidence),
          verifierContract: log.address,
          chainId: chainId,
          blockNumber: Number(log.blockNumber),
          timestamp: new Date(Number(decoded.args.timestamp) * 1000),
          gasUsed: Number(receipt.gasUsed)
        },
        update: {
          // Update if already exists (idempotent)
          decision: Number(decoded.args.decision),
          confidence: Number(decoded.args.confidence)
        }
      });
    }

    return { processed: logs.length };
  }
});
```

#### 4. Schedule Indexer

```typescript
// indexer/scheduler.ts
import { scheduleTask } from "@trigger.dev/sdk";
import { indexZkMLVerifications } from "./tasks/index-zkml-verifications";

// Run every 30 seconds for Base Sepolia
scheduleTask({
  id: "schedule-base-sepolia-zkml",
  cron: "*/30 * * * * *", // Every 30 seconds
  task: indexZkMLVerifications,
  payload: async () => {
    const latestBlock = await getLatestIndexedBlock('base-sepolia');
    const currentBlock = await getCurrentBlock('base-sepolia');

    return {
      chainId: 84532,
      fromBlock: latestBlock + 1n,
      toBlock: currentBlock
    };
  }
});
```

---

### Day 3: Backend API

#### 1. Create API Route

```typescript
// pages/api/v1/verifications/[txHash].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHash } = req.query;

  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'Invalid transaction hash' });
  }

  // Normalize hash (add 0x prefix if missing)
  const normalizedHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;

  try {
    const verification = await db.zkmlVerifications.findUnique({
      where: { txHash: normalizedHash }
    });

    if (!verification) {
      return res.status(404).json({
        verified: false,
        message: 'No zkML proof found for this transaction'
      });
    }

    return res.status(200).json({
      verified: true,
      data: {
        txHash: verification.txHash,
        proofHash: verification.proofHash,
        modelHash: verification.modelHash,
        decision: verification.decision,
        confidence: verification.confidence,
        verifierContract: verification.verifierContract,
        chainId: verification.chainId,
        blockNumber: verification.blockNumber,
        timestamp: verification.timestamp,
        gasUsed: verification.gasUsed,
        explorerUrl: getExplorerUrl(verification.chainId, verification.txHash)
      }
    });
  } catch (error) {
    console.error('Error fetching verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    84532: 'https://sepolia.basescan.org',
    11155111: 'https://sepolia.etherscan.io'
  };
  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}
```

#### 2. Batch Endpoint (for transaction list)

```typescript
// pages/api/v1/verifications/batch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHashes } = req.body as { txHashes: string[] };

  if (!Array.isArray(txHashes) || txHashes.length === 0) {
    return res.status(400).json({ error: 'Invalid transaction hashes' });
  }

  if (txHashes.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 transactions per request' });
  }

  try {
    const verifications = await db.zkmlVerifications.findMany({
      where: {
        txHash: { in: txHashes }
      },
      select: {
        txHash: true,
        decision: true,
        confidence: true,
        timestamp: true
      }
    });

    // Create map for O(1) lookups
    const verificationMap = new Map(
      verifications.map(v => [v.txHash, v])
    );

    // Return results in same order as input
    const results = txHashes.map(hash => ({
      txHash: hash,
      verified: verificationMap.has(hash),
      data: verificationMap.get(hash) || null
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### Day 4: Frontend Components

#### 1. Verification Badge Component

```tsx
// components/VerificationBadge.tsx
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';
import { VerificationModal } from './VerificationModal';

interface Props {
  txHash: string;
  status?: 'verified' | 'pending' | 'unverified';
  confidence?: number;
}

export function VerificationBadge({ txHash, status = 'unverified', confidence }: Props) {
  const [showModal, setShowModal] = useState(false);

  const config = {
    verified: {
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'zkML Verified',
      hoverText: 'View proof details'
    },
    pending: {
      icon: ClockIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'Pending',
      hoverText: 'Verification in progress'
    },
    unverified: {
      icon: XCircleIcon,
      color: 'text-gray-400',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'Unverified',
      hoverText: 'No zkML proof found'
    }
  }[status];

  const Icon = config.icon;

  return (
    <>
      <button
        onClick={() => status === 'verified' && setShowModal(true)}
        disabled={status !== 'verified'}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          ${config.bg} ${config.border} border
          ${status === 'verified' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
          transition-all duration-150
          group
        `}
        title={config.hoverText}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          {config.text}
        </span>
        {confidence !== undefined && status === 'verified' && (
          <span className={`text-xs ${config.color} opacity-70`}>
            ({confidence}%)
          </span>
        )}
      </button>

      {showModal && (
        <VerificationModal
          txHash={txHash}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

#### 2. Verification Modal

```tsx
// components/VerificationModal.tsx
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect, useState } from 'react';

interface VerificationData {
  txHash: string;
  proofHash: string;
  decision: number;
  confidence: number;
  verifierContract: string;
  chainId: number;
  timestamp: string;
  gasUsed: number;
  explorerUrl: string;
}

interface Props {
  txHash: string;
  onClose: () => void;
}

export function VerificationModal({ txHash, onClose }: Props) {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/verifications/${txHash}`)
      .then(res => res.json())
      .then(result => {
        if (result.verified) {
          setData(result.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [txHash]);

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-start justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-gray-900">
                    zkML Proof Details
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading proof details...</p>
                  </div>
                ) : !data ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No verification data found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Decision */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Decision</p>
                          <p className="text-2xl font-bold text-green-700">
                            {data.decision === 1 ? 'Approved' : 'Denied'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Confidence</p>
                          <p className="text-2xl font-bold text-green-700">
                            {data.confidence}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Proof Hash */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Proof Hash</p>
                      <code className="block bg-gray-100 rounded px-3 py-2 text-sm font-mono break-all">
                        {data.proofHash}
                      </code>
                    </div>

                    {/* Verifier Contract */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Verifier Contract</p>
                      <a
                        href={`${data.explorerUrl.replace('/tx/', '/address/')}/${data.verifierContract}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gray-100 rounded px-3 py-2 text-sm font-mono break-all hover:bg-gray-200 transition-colors text-blue-600"
                      >
                        {data.verifierContract}
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Chain</p>
                        <p className="font-medium">
                          {data.chainId === 84532 ? 'Base Sepolia' : `Chain ${data.chainId}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Gas Used</p>
                        <p className="font-medium">{data.gasUsed.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Timestamp</p>
                        <p className="font-medium">
                          {new Date(data.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* View on Explorer */}
                    <a
                      href={data.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      View Transaction on Explorer →
                    </a>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
```

---

### Day 5: Integrate into Transaction List

#### 1. Add Hook for Batch Verification

```tsx
// hooks/useVerifications.ts
import { useEffect, useState } from 'react';

interface VerificationStatus {
  txHash: string;
  verified: boolean;
  confidence?: number;
}

export function useVerifications(txHashes: string[]) {
  const [verifications, setVerifications] = useState<Map<string, VerificationStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (txHashes.length === 0) {
      setLoading(false);
      return;
    }

    fetch('/api/v1/verifications/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHashes })
    })
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, VerificationStatus>();
        data.results.forEach((result: any) => {
          map.set(result.txHash, {
            txHash: result.txHash,
            verified: result.verified,
            confidence: result.data?.confidence
          });
        });
        setVerifications(map);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch verifications:', err);
        setLoading(false);
      });
  }, [txHashes.join(',')]);

  return { verifications, loading };
}
```

#### 2. Update Transaction List Component

```tsx
// components/TransactionList.tsx (modify existing)
import { VerificationBadge } from './VerificationBadge';
import { useVerifications } from '@/hooks/useVerifications';

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const txHashes = transactions.map(tx => tx.hash);
  const { verifications, loading: verificationsLoading } = useVerifications(txHashes);

  return (
    <div className="space-y-4">
      {transactions.map(tx => {
        const verification = verifications.get(tx.hash);
        const status = verification?.verified ? 'verified' : 'unverified';

        return (
          <div key={tx.hash} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <a
                    href={`/tx/${tx.hash}`}
                    className="font-mono text-sm hover:text-blue-600"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </a>

                  {/* ADD VERIFICATION BADGE HERE */}
                  {!verificationsLoading && (
                    <VerificationBadge
                      txHash={tx.hash}
                      status={status}
                      confidence={verification?.confidence}
                    />
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  <span>{tx.from.slice(0, 8)}...</span>
                  <span className="mx-2">→</span>
                  <span>{tx.to.slice(0, 8)}...</span>
                  <span className="ml-4 font-medium">{tx.amount} USDC</span>
                </div>
              </div>

              <div className="text-right text-sm text-gray-500">
                {new Date(tx.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Day 6: Testing

#### 1. Create Test Transaction

```bash
# From agentkit/x402/
# Make sure services are running
npm run demo:up

# Generate a test transaction with zkML proof
curl -X POST http://localhost:8610/ui/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "amount": 1.00,
      "merchant": "test-merchant",
      "category": "api"
    },
    "useAI": true
  }' | tee /tmp/proof.json

# Get session ID from response
SESSION_ID=$(jq -r '.sessionId' /tmp/proof.json)

# Wait for proof to complete
sleep 5

# Get proof status (includes transaction hash after on-chain verification)
curl http://localhost:8610/ui/zkml/status/$SESSION_ID | jq .

# Note the transaction hash from the response
```

#### 2. Test API Endpoints

```bash
# Test single verification lookup
TX_HASH="0x..." # From previous step
curl "http://localhost:3000/api/v1/verifications/$TX_HASH" | jq .

# Test batch lookup
curl -X POST http://localhost:3000/api/v1/verifications/batch \
  -H "Content-Type: application/json" \
  -d "{\"txHashes\": [\"$TX_HASH\"]}" | jq .
```

#### 3. Manual UI Testing

1. Visit transaction list page
2. Find your test transaction
3. Verify green badge appears
4. Click badge → Modal opens
5. Check all details display correctly
6. Click "View on Explorer" → Opens Basescan
7. Verify proof hash matches

---

### Day 7: Deploy & Monitor

#### 1. Deploy to Staging

```bash
# Build frontend
npm run build

# Deploy (adjust for your hosting platform)
vercel deploy --prod  # or similar

# Deploy indexer
npm run trigger:deploy
```

#### 2. Monitoring Setup

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function trackVerificationCheck(txHash: string, found: boolean) {
  Sentry.addBreadcrumb({
    category: 'zkml',
    message: `Verification check for ${txHash}`,
    data: { found },
    level: 'info'
  });
}

export function trackVerificationIndexed(data: {
  txHash: string;
  chainId: number;
  gasUsed: number;
}) {
  Sentry.captureMessage('zkML verification indexed', {
    level: 'info',
    tags: {
      chain: data.chainId
    },
    contexts: {
      verification: data
    }
  });
}
```

#### 3. Health Check Endpoint

```typescript
// pages/api/health/zkml.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check database connection
    const recentCount = await db.zkmlVerifications.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 3600000) // Last hour
        }
      }
    });

    // Check indexer is running (expect at least 1 verification per hour)
    const isHealthy = recentCount > 0;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      verificationsLastHour: recentCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

---

## Success Criteria

By end of Week 1, you should have:

- [x] ✅ Database table with zkML verification data
- [x] ✅ Indexer running and populating database
- [x] ✅ API endpoints returning verification status
- [x] ✅ Verification badges visible on transaction list
- [x] ✅ Modal showing proof details when clicked
- [x] ✅ At least 1 test transaction verified end-to-end

---

## Next Steps (Week 2+)

Once MVP is live, tackle these in order:

1. **Week 2**: Agent trust score calculation
2. **Week 3**: Trust score dashboard page
3. **Week 4**: Verifier contract registry
4. **Week 5**: Real-time analytics charts
5. **Week 6+**: Developer tools & integration guides

---

## Troubleshooting

### Indexer not finding events
**Check**:
- Is verifier contract address correct?
- Is ABI matching deployed contract?
- Are you querying the right chain?
- Is block range too far back? (Try last 1000 blocks)

**Debug**:
```bash
# Check verifier contract directly
cast call $VERIFIER_ADDRESS "verificationCount()(uint256)" --rpc-url $BASE_RPC_URL
```

### Badge not appearing
**Check**:
- Browser console for API errors
- Network tab: Is `/api/v1/verifications/batch` returning data?
- Component props: Is txHash formatted correctly (0x prefix)?

**Debug**:
```javascript
// Add to component
console.log('Verifications:', verifications);
console.log('TX Hash:', tx.hash, 'Status:', verification);
```

### Modal not loading data
**Check**:
- API endpoint returning 200?
- CORS headers set correctly?
- Transaction exists in database?

**Debug**:
```bash
# Check database directly
psql $DATABASE_URL -c "SELECT * FROM zkml_verifications WHERE tx_hash = '0x...';"
```

---

## Resources

- **Full Proposal**: See `X402SCAN_ENHANCEMENT_PROPOSAL.md`
- **x402 Implementation**: `/home/hshadab/agentkit/x402/`
- **JOLT-Atlas**: https://github.com/ICME-Lab/jolt-atlas
- **x402scan**: https://www.x402scan.com/

---

*Quick Start Guide v1.0*
*Last Updated: 2025-10-11*
