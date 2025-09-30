# Golden Proof Test Corpus

This directory contains **deterministic test cases** that validate the authorization logic produces consistent, repeatable results.

## Purpose

Golden tests prove that:
1. Authorization decisions are deterministic (not random)
2. Confidence scores are calculated correctly
3. Individual checks (budget, trust, amount, category, velocity) work as specified
4. Same inputs → Same outputs (byte-for-byte reproducibility)

## Test Structure

Each test case is a directory containing:
- `input.json` - Authorization parameters
- `expected-decision.json` - Expected authorization result
- `README.md` (optional) - Test case documentation

## Running Tests

```bash
# Run all golden tests
cd /home/hshadab/agentkit/acp
node tests/golden/run-tests.js

# Expected output:
# ✅ All golden tests passed!
```

## Test Cases

### 1. authorize-high-confidence
**Scenario**: High trust merchant, sufficient budget, reasonable amount

**Input**:
- Budget: $500
- Merchant Trust: 0.95
- Amount: $45
- Category Score: 0.8
- Velocity: 2

**Expected**:
- Authorized: ✅ Yes
- Confidence: 100%
- All 5 checks pass

---

### 2. deny-low-budget
**Scenario**: Insufficient budget for requested amount

**Input**:
- Budget: $30
- Merchant Trust: 0.95
- Amount: $45
- Category Score: 0.8
- Velocity: 2

**Expected**:
- Authorized: ❌ No
- Confidence: 55%
- Failed checks: budget (insufficient), amount (>50% of budget)

---

### 3. deny-untrusted-merchant
**Scenario**: Merchant trust below threshold

**Input**:
- Budget: $500
- Merchant Trust: 0.2
- Amount: $45
- Category Score: 0.8
- Velocity: 2

**Expected**:
- Authorized: ❌ No
- Confidence: 75%
- Failed check: trust (below 0.5 threshold)

---

## Authorization Logic

The system evaluates **5 checks** with weighted scoring:

| Check | Weight | Criteria |
|-------|--------|----------|
| Budget | 25% | `budget_remaining >= amount` |
| Trust | 25% | `merchant_trust >= 0.5` |
| Amount | 20% | `amount <= budget_remaining * 0.5` |
| Category | 15% | `category_score > 0.5` |
| Velocity | 15% | `velocity < 10` |

**Confidence** = Sum of passed check weights / 100

**Authorization** = All critical checks must pass (budget AND trust AND amount AND velocity AND category)

## Adding New Test Cases

1. Create new directory: `tests/golden/my-test-case/`
2. Add `input.json` with authorization parameters
3. Run authorization logic manually to get expected output
4. Create `expected-decision.json` with results
5. Run `node tests/golden/run-tests.js` to validate

## Determinism Guarantee

These tests **must** produce identical results on every run:
- No random number generation
- No timestamps or UUIDs in authorization logic
- No external API calls during evaluation
- Pure function: same inputs → same outputs

## Continuous Integration

Add to CI pipeline:
```bash
npm run test:golden
```

Exit code 0 = all tests passed
Exit code 1 = tests failed (blocking PR merge)

## Troubleshooting

### Test Failing After Code Change

If authorization logic changes, golden tests may fail. Options:

1. **Bug introduced**: Fix the logic to match expected behavior
2. **Intentional change**: Update expected output files
3. **New test needed**: Add test case covering the edge case

### Updating Expected Outputs

```bash
# Re-run logic and manually inspect
node -e "
const { evaluateAuthorization } = require('./run-tests.js');
const result = evaluateAuthorization({
  budget_remaining: 500,
  merchant_trust: 0.95,
  amount: 45,
  category_score: 0.8,
  velocity: 2
});
console.log(JSON.stringify(result, null, 2));
"

# Update expected-decision.json with new output
# Commit with clear explanation of why change was needed
```

---

**Last Updated**: 2025-09-30
**Test Coverage**: 3 scenarios (authorize, deny-budget, deny-trust)
**Pass Rate**: 100%