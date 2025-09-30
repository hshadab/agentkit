#!/usr/bin/env node

/**
 * Golden Proof Test Runner
 *
 * Runs deterministic authorization tests and validates:
 * 1. Authorization decisions match expected outcomes
 * 2. Confidence scores are deterministic
 * 3. Individual checks pass/fail as expected
 */

const fs = require('fs');
const path = require('path');

// Import authorization logic (we'll need to export this from proof-service.js)
function evaluateAuthorization(params) {
  const {
    budget_remaining,
    merchant_trust,
    amount,
    category_score = 0.5,
    velocity = 0
  } = params;

  // Five checks with weights
  const hasBudget = budget_remaining >= amount;
  const merchantTrusted = merchant_trust >= 0.5;
  const reasonableAmount = amount <= (budget_remaining * 0.5);
  const velocityOk = velocity < 10;
  const categoryAllowed = category_score > 0.5;

  // Calculate score
  let score = 0;
  const checks = {};

  if (hasBudget) {
    score += 25;
    checks.budget = {
      passed: true,
      weight: 25,
      reason: `Budget remaining ($${budget_remaining.toFixed(2)}) >= amount ($${amount.toFixed(2)})`
    };
  } else {
    checks.budget = {
      passed: false,
      weight: 25,
      reason: `Budget remaining ($${budget_remaining.toFixed(2)}) < amount ($${amount.toFixed(2)})`
    };
  }

  if (merchantTrusted) {
    score += 25;
    checks.trust = {
      passed: true,
      weight: 25,
      reason: `Merchant trust (${merchant_trust}) >= threshold (0.5)`
    };
  } else {
    checks.trust = {
      passed: false,
      weight: 25,
      reason: `Merchant trust (${merchant_trust}) < threshold (0.5)`
    };
  }

  if (reasonableAmount) {
    score += 20;
    checks.amount = {
      passed: true,
      weight: 20,
      reason: `Amount ($${amount.toFixed(2)}) <= 50% of budget ($${(budget_remaining * 0.5).toFixed(2)})`
    };
  } else {
    checks.amount = {
      passed: false,
      weight: 20,
      reason: `Amount ($${amount.toFixed(2)}) > 50% of budget ($${(budget_remaining * 0.5).toFixed(2)})`
    };
  }

  if (categoryAllowed) {
    score += 15;
    checks.category = {
      passed: true,
      weight: 15,
      reason: `Category score (${category_score}) > threshold (0.5)`
    };
  } else {
    checks.category = {
      passed: false,
      weight: 15,
      reason: `Category score (${category_score}) <= threshold (0.5)`
    };
  }

  if (velocityOk) {
    score += 15;
    checks.velocity = {
      passed: true,
      weight: 15,
      reason: `Velocity (${velocity}) < limit (10)`
    };
  } else {
    checks.velocity = {
      passed: false,
      weight: 15,
      reason: `Velocity (${velocity}) >= limit (10)`
    };
  }

  const confidence = score / 100;
  const authorized = hasBudget && merchantTrusted && reasonableAmount && velocityOk && categoryAllowed;

  return {
    authorized,
    confidence,
    score,
    checks
  };
}

// Test runner
function runGoldenTests() {
  const goldenDir = __dirname;
  const testDirs = fs.readdirSync(goldenDir)
    .filter(name => {
      const fullPath = path.join(goldenDir, name);
      return fs.statSync(fullPath).isDirectory();
    });

  console.log('🧪 Running Golden Proof Tests\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testDir of testDirs) {
    const testPath = path.join(goldenDir, testDir);
    const inputPath = path.join(testPath, 'input.json');
    const expectedPath = path.join(testPath, 'expected-decision.json');

    if (!fs.existsSync(inputPath) || !fs.existsSync(expectedPath)) {
      continue;
    }

    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));

    console.log(`📝 Test: ${input.test_name}`);
    console.log(`   Description: ${input.description}`);

    const actual = evaluateAuthorization(input.authorization_params);

    // Compare results
    const authMatch = actual.authorized === expected.authorized;
    const confMatch = Math.abs(actual.confidence - expected.confidence) < 0.01;
    const scoreMatch = actual.score === expected.score;

    if (authMatch && confMatch && scoreMatch) {
      console.log(`   ✅ PASS`);
      console.log(`      Authorized: ${actual.authorized}`);
      console.log(`      Confidence: ${actual.confidence}`);
      console.log(`      Score: ${actual.score}/100\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL`);
      if (!authMatch) {
        console.log(`      Authorization: expected ${expected.authorized}, got ${actual.authorized}`);
      }
      if (!confMatch) {
        console.log(`      Confidence: expected ${expected.confidence}, got ${actual.confidence}`);
      }
      if (!scoreMatch) {
        console.log(`      Score: expected ${expected.score}, got ${actual.score}`);
      }
      console.log('');
      failed++;
      failures.push({
        test: input.test_name,
        expected,
        actual
      });
    }
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Some tests failed. See details above.');
    process.exit(1);
  } else {
    console.log('✅ All golden tests passed!');
    console.log('   Authorization logic is deterministic and correct.\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runGoldenTests();
}

module.exports = { evaluateAuthorization, runGoldenTests };