# x402scan zkML Integration - Visual Mockups

This document shows visual comparisons of x402scan before and after zkML integration.

---

## 1. Transaction List Page

### BEFORE (Current x402scan)
```
┌──────────────────────────────────────────────────────────────┐
│ Transactions                                   [Filter] [⚙️]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 0xabc123...def456                        2 mins ago         │
│ 0x742...891 → 0x123...456               $1.00 USDC         │
│                                                              │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ 0xdef456...abc123                        5 mins ago         │
│ 0x456...789 → 0x789...012               $2.50 USDC         │
│                                                              │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ 0x789abc...123def                        10 mins ago        │
│ 0x321...654 → 0x987...321               $0.50 USDC         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Problems**:
- ❌ No indication of AI agent involvement
- ❌ No proof that agents followed rules
- ❌ Users must trust blindly

---

### AFTER (With zkML Integration)
```
┌──────────────────────────────────────────────────────────────┐
│ Transactions                                   [Filter] [⚙️]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 0xabc123...def456  [✅ zkML Verified (95%)]  2 mins ago     │
│ 0x742...891 → 0x123...456               $1.00 USDC         │
│                                         ↑ Click for details │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ 0xdef456...abc123  [⚠️ Pending]           5 mins ago        │
│ 0x456...789 → 0x789...012               $2.50 USDC         │
│                                                              │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ 0x789abc...123def  [❌ Unverified]        10 mins ago       │
│ 0x321...654 → 0x987...321               $0.50 USDC         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Improvements**:
- ✅ **Green badge**: Proof exists (clickable)
- ⚠️ **Yellow badge**: Verification in progress
- ❌ **Gray badge**: No proof (still allowed)
- ✅ Shows AI confidence level (95%)
- ✅ Visual trust signal at a glance

---

## 2. Verification Badge States

### Verified (Green)
```
┌──────────────────────────┐
│ ✅ zkML Verified (95%)   │  ← Clickable
└──────────────────────────┘
   Hover: "View proof details"
```

**Meaning**: JOLT-Atlas proof found on-chain
**Action**: Click to open modal with full proof details

---

### Pending (Yellow)
```
┌──────────────────────────┐
│ ⏳ Pending               │  ← Non-clickable
└──────────────────────────┘
   Hover: "Verification in progress"
```

**Meaning**: Proof submitted, waiting for on-chain confirmation
**Action**: Auto-refreshes until confirmed

---

### Unverified (Gray)
```
┌──────────────────────────┐
│ ❌ Unverified            │  ← Non-clickable
└──────────────────────────┘
   Hover: "No zkML proof found"
```

**Meaning**: No proof submitted (not required, but recommended)
**Action**: None (informational only)

---

## 3. Verification Modal (Proof Details)

```
┌───────────────────────────────────────────────────────────────┐
│ zkML Proof Details                                        [✕] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Decision: Approved            Confidence: 95%          │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  AI Decision Breakdown:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Budget Remaining    95% ████████████████████░           │ │
│  │  Merchant Trust      90% ██████████████████░░            │ │
│  │  Transaction Amount   5% █░░░░░░░░░░░░░░░░░░             │ │
│  │  Category Match     100% ████████████████████            │ │
│  │  Velocity Check      80% ████████████████░░░░            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Proof Hash:                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  0xda099d93b8c4e2f1a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1  │ │
│  │                                            [Copy] [📋]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Verifier Contract:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  0xf752509cb5af017f465B42053d41B730991c6624            │ │
│  │  → Base Sepolia                         [View Contract] │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Verification Stats:                                          │
│  Chain: Base Sepolia        Gas Used: 148,234                │
│  Timestamp: 2025-10-11 14:23:17 UTC                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [View Transaction on BaseScan →]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Large display of decision + confidence
- Visual bars for AI input features
- Copyable proof hash (for sharing)
- Link to verifier contract on explorer
- Gas cost and timestamp info
- Direct link to transaction on block explorer

---

## 4. Agent Trust Score Dashboard (NEW PAGE)

```
┌───────────────────────────────────────────────────────────────┐
│ Agent Trust Scores                             [Search] [⚙️]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Top Agents by Trust Score:                                    │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 1. TravelDealHunter      💎 Platinum      Score: 96     │  │
│ │    1,234 txns  •  98% verified  •  Avg confidence: 94%  │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 2. GroceryOptimizer      🥇 Gold          Score: 89     │  │
│ │    856 txns  •  82% verified  •  Avg confidence: 91%    │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 3. ResearchAgentPro      🥈 Silver        Score: 76     │  │
│ │    423 txns  •  57% verified  •  Avg confidence: 88%    │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ───────────────────────────────────────────────────────────  │
│                                                               │
│ Trust Score Distribution:                                     │
│                                                               │
│   # of                                                        │
│  Agents                                                       │
│    50 │     ┌──┐                                             │
│    40 │     │  │  ┌──┐                                       │
│    30 │  ┌──┤  │  │  │                                       │
│    20 │  │  │  │  │  │  ┌──┐                                │
│    10 │  │  │  │  │  │  │  │  ┌──┐                          │
│     0 └──┴──┴──┴──┴──┴──┴──┴──┴──┴──                        │
│        0  20  40  60  80  100  Trust Score                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Leaderboard of top agents by trust score
- Badge tiers (Platinum, Gold, Silver, Bronze)
- Key metrics inline (txns, verification rate, confidence)
- Histogram showing score distribution
- Search and filter capabilities

---

## 5. Agent Detail Page (NEW)

```
┌───────────────────────────────────────────────────────────────┐
│ ← Back to Agents                                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  TravelDealHunter                           💎 Platinum      │
│  Agent ID: 0xagent123...                    Score: 96        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TRUST METRICS                                          │ │
│  │                                                          │ │
│  │  Verification Rate      98%  ████████████████████░      │ │
│  │  Average Confidence     94%  ██████████████████░░       │ │
│  │  Budget Adherence       99%  ███████████████████░       │ │
│  │  Velocity Compliance    97%  ███████████████████░       │ │
│  │  Account Age           145 days                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ACTIVITY SUMMARY                                       │ │
│  │                                                          │ │
│  │  Total Transactions:    1,234                           │ │
│  │  Verified Transactions: 1,209 (98%)                     │ │
│  │  Total Volume:          $12,340 USDC                    │ │
│  │  Active Since:          June 18, 2025                   │ │
│  │  Last Active:           2 hours ago                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Trust Score Over Time:                                       │
│                                                               │
│  Score                                                        │
│   100 │                    ──────────────                    │
│    90 │         ──────────                                   │
│    80 │   ─────                                              │
│    70 │                                                      │
│    60 │                                                      │
│     0 └──────────────────────────────────────────           │
│       Jun    Jul    Aug    Sep    Oct    Now                │
│                                                               │
│  Recent Transactions:                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 0xabc...123  [✅ Verified 95%]  $1.00  2 mins ago       │ │
│  │ 0xdef...456  [✅ Verified 98%]  $2.50  1 hour ago       │ │
│  │ 0x789...abc  [✅ Verified 92%]  $5.00  3 hours ago      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Overall trust score with badge
- Breakdown of all 5 metrics
- Activity summary (txns, volume, account age)
- Trust score chart over time
- Recent transactions with verification status

---

## 6. Verifier Contract Registry (NEW PAGE)

```
┌───────────────────────────────────────────────────────────────┐
│ Verifier Contract Registry               [Add Verifier] [⚙️]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ [Base Sepolia] [Ethereum Sepolia] [Arbitrum Sepolia] [All]   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ JOLT Decision Verifier (3-signal)        Status: Active │  │
│ │ 0xf752509cb5af017f465B42053d41B730991c6624              │  │
│ │ Chain: Base Sepolia (84532)                             │  │
│ │                                                          │  │
│ │ Circuit: decision_with_commitment                       │  │
│ │ Public Signals: [decision, confidence, proofHash]       │  │
│ │                                                          │  │
│ │ Stats:                                                   │  │
│ │ • Total Verifications: 1,234                            │  │
│ │ • Avg Gas: 148,234 (~$0.002)                            │  │
│ │ • Success Rate: 99.2%                                    │  │
│ │ • Deployed: Oct 5, 2025                                 │  │
│ │                                                          │  │
│ │ [View Contract →]  [Copy Address]  [Integration Code]  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ JOLT Decision Verifier (2-signal)    Status: Deprecated │  │
│ │ 0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308              │  │
│ │ Chain: Ethereum Sepolia (11155111)                      │  │
│ │                                                          │  │
│ │ Circuit: jolt_decision_simple                           │  │
│ │ Public Signals: [decision, confidence]                  │  │
│ │                                                          │  │
│ │ Note: Replaced by 3-signal version with proof binding   │  │
│ │                                                          │  │
│ │ [View Contract →]  [Copy Address]                       │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Multi-chain tabs for filtering
- Contract address with copy button
- Circuit details (name, public signals)
- Stats (verifications, gas, success rate)
- Status indicator (active, deprecated)
- Integration code snippets
- Links to block explorers

---

## 7. Real-Time Analytics Dashboard (NEW PAGE)

```
┌───────────────────────────────────────────────────────────────┐
│ zkML Analytics                              [Time: 24h ▼]     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  KEY METRICS (Last 24 Hours)                                  │
│  ┌───────────────┬───────────────┬───────────────┐           │
│  │ Total Txns    │ Verified      │ Verification  │           │
│  │ 1,234         │ 856 (69.4%)   │ Rate: 69.4%   │           │
│  │ +12.3% ↑      │ +18.7% ↑      │ +5.1% ↑       │           │
│  └───────────────┴───────────────┴───────────────┘           │
│                                                               │
│  Verification Rate Over Time:                                 │
│   %                                                           │
│  100 │                                                        │
│   80 │                        ────────────                   │
│   60 │          ─────────────                                │
│   40 │   ──────                                              │
│   20 │                                                        │
│    0 └───────────────────────────────────────────            │
│      12am  4am   8am   12pm  4pm   8pm   Now                 │
│                                                               │
│  ───────────────────────────────────────────────────────────  │
│                                                               │
│  Proof Performance:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Average Generation Time:  650ms                        │ │
│  │  Average Verification Time: 3.2s                        │ │
│  │  Success Rate:             99.2%                        │ │
│  │  Failed Proofs:            10 (0.8%)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Chain Distribution:                                          │
│         ┌────────┐                                            │
│         │   69%  │  Base Sepolia                             │
│         │  Base  │                                            │
│         └────────┘                                            │
│      ┌──────┐        Ethereum Sepolia                        │
│      │ 22%  │                                                 │
│      │ ETH  │                                                 │
│      └──────┘                                                 │
│   ┌────┐             Arbitrum Sepolia                        │
│   │ 9% │                                                      │
│   │ARB │                                                      │
│   └────┘                                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Time period selector (24h, 7d, 30d, all)
- Key metrics with trend indicators
- Verification rate line chart
- Proof performance stats
- Chain distribution pie chart
- Real-time updates (WebSocket)

---

## 8. Facilitator Page with Badges

```
┌───────────────────────────────────────────────────────────────┐
│ Top Facilitators                                  [Filter] ⚙️ │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 1. CircleFacilitator     💎 Platinum (97% verified)     │  │
│ │    Volume: $123,456  •  Txns: 4,567  •  Fee: 0.1%      │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 2. QuickPayFacilitator   🥇 Gold (78% verified)         │  │
│ │    Volume: $89,123  •  Txns: 2,345  •  Fee: 0.2%       │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 3. FastTransfer          🥈 Silver (52% verified)       │  │
│ │    Volume: $45,678  •  Txns: 1,234  •  Fee: 0.15%      │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 4. BasicPay              🥉 Bronze (27% verified)       │  │
│ │    Volume: $12,345  •  Txns: 456  •  Fee: 0.3%         │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 5. NoProofPay            ❌ No Badge (0% verified)      │  │
│ │    Volume: $5,678  •  Txns: 123  •  Fee: 0.5%          │  │
│ │    [View Details →]                                     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ Verification Tier Requirements:                               │
│ 🥉 Bronze: 25%+  •  🥈 Silver: 50%+  •  🥇 Gold: 75%+  •     │
│ 💎 Platinum: 95%+                                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Features**:
- Badge tiers based on verification rate
- Volume and transaction count
- Fee percentage for comparison
- Sort by verification rate (default)
- Tier requirements legend
- Visual gamification

---

## 9. Mobile Responsive Design

### Transaction List (Mobile)
```
┌─────────────────────────┐
│ Transactions     [≡]    │
├─────────────────────────┤
│                         │
│ 0xabc...def             │
│ [✅ Verified (95%)]     │
│ $1.00 USDC              │
│ 2 mins ago              │
│                         │
│ ─────────────────────── │
│                         │
│ 0xdef...abc             │
│ [⚠️ Pending]            │
│ $2.50 USDC              │
│ 5 mins ago              │
│                         │
│ ─────────────────────── │
│                         │
│ 0x789...123             │
│ [❌ Unverified]         │
│ $0.50 USDC              │
│ 10 mins ago             │
│                         │
└─────────────────────────┘
```

**Mobile Optimizations**:
- Stack info vertically
- Larger tap targets (badges)
- Simplified transaction display
- Bottom sheet for proof details

---

## Color Palette

### Verification Status Colors
```
Verified:   #10B981 (green-500)  ✅
Pending:    #F59E0B (amber-500)  ⚠️
Unverified: #9CA3AF (gray-400)   ❌
```

### Badge Tiers
```
Platinum: #A78BFA (purple-400)  💎
Gold:     #FBBF24 (yellow-400)  🥇
Silver:   #CBD5E1 (gray-300)    🥈
Bronze:   #F97316 (orange-500)  🥉
```

### UI Elements
```
Background:   #FFFFFF (white)
Card BG:      #F9FAFB (gray-50)
Border:       #E5E7EB (gray-200)
Text Primary: #111827 (gray-900)
Text Muted:   #6B7280 (gray-500)
Link:         #3B82F6 (blue-500)
```

---

## Icon System

### Status Icons
- ✅ Checkmark Circle (verified)
- ⏳ Clock (pending)
- ❌ X Circle (unverified)
- 💎 Diamond (platinum tier)
- 🥇 Gold Medal (gold tier)
- 🥈 Silver Medal (silver tier)
- 🥉 Bronze Medal (bronze tier)

### Action Icons
- 📋 Clipboard (copy)
- 🔗 Link (external)
- 📊 Chart (analytics)
- ⚙️ Gear (settings)
- 🔍 Magnifying Glass (search)
- ℹ️ Info Circle (tooltip)

---

## Animation & Interactions

### Badge Hover
```
Default:  border-green-200
Hover:    border-green-400 + scale(1.02)
Active:   border-green-500
```

### Modal Open
```
Fade in:     300ms ease-out
Scale:       0.95 → 1.0
Background:  opacity 0 → 0.5
```

### Loading States
```
Skeleton:    pulse animation (gray-200 → gray-300)
Spinner:     rotate 360deg @ 1s linear
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Font Sizes
- Heading 1: 2rem (32px) / bold
- Heading 2: 1.5rem (24px) / bold
- Body: 1rem (16px) / regular
- Small: 0.875rem (14px) / regular
- Tiny: 0.75rem (12px) / medium
- Code: 'Fira Code', monospace / 0.875rem

---

## Accessibility

### WCAG 2.1 AA Compliance
- ✅ Color contrast ratio ≥ 4.5:1 (text)
- ✅ Color contrast ratio ≥ 3:1 (UI components)
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Screen reader labels (ARIA)
- ✅ Focus indicators (2px outline)

### ARIA Labels
```html
<button aria-label="View zkML proof details">
  [✅ zkML Verified]
</button>

<div role="dialog" aria-labelledby="modal-title">
  <h2 id="modal-title">zkML Proof Details</h2>
</div>
```

---

## Performance Targets

### Load Times
- Initial page load: <2s
- Badge render: <100ms
- Modal open: <200ms
- API response: <100ms (p95)

### Bundle Size
- Additional JS: ~120KB (gzipped)
- Additional CSS: ~20KB (gzipped)
- Total impact: ~140KB

---

## Implementation Notes

### Component Library
- React + TypeScript
- Tailwind CSS for styling
- Headless UI for accessible components
- Heroicons for consistent icons

### State Management
- React hooks (useState, useEffect)
- SWR for data fetching (caching + revalidation)
- Context for global state (minimal)

### Testing
- Jest + React Testing Library (unit)
- Playwright (E2E)
- Storybook (component docs)

---

*Visual Mockups v1.0*
*Date: 2025-10-11*
*Author: AgentKit Team*
