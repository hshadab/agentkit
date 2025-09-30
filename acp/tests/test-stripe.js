/**
 * Test Stripe Integration
 * Verifies Stripe SDK is working with provided API key
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripe() {
  console.log('\n🧪 Testing Stripe Integration');
  console.log('='.repeat(50));

  try {
    // Test 1: Verify API key works
    console.log('\n1. Testing API key...');
    const balance = await stripe.balance.retrieve();
    console.log('   ✅ API key valid');
    console.log(`   Available: ${balance.available[0].amount / 100} ${balance.available[0].currency.toUpperCase()}`);

    // Test 2: Create a test payment method
    console.log('\n2. Creating test payment method...');
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa', // Stripe test token
      },
    });
    console.log(`   ✅ Payment method created: ${paymentMethod.id}`);

    // Test 3: Create a test payment intent
    console.log('\n3. Creating test payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      payment_method: paymentMethod.id,
      confirm: false,
      metadata: {
        test: 'acp-integration',
        has_authorization_proof: 'true'
      }
    });
    console.log(`   ✅ Payment intent created: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Amount: $${paymentIntent.amount / 100}`);

    // Test 4: Cancel the test payment
    console.log('\n4. Canceling test payment...');
    await stripe.paymentIntents.cancel(paymentIntent.id);
    console.log('   ✅ Payment intent canceled');

    console.log('\n' + '='.repeat(50));
    console.log('✅ All Stripe tests passed!');
    console.log('\nStripe integration is fully functional:');
    console.log('  - API key authenticated');
    console.log('  - Can create payment methods');
    console.log('  - Can create payment intents');
    console.log('  - Can cancel payments');
    console.log('\nReady for real payment processing!');

  } catch (error) {
    console.error('\n❌ Stripe test failed:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n⚠️  API key issue. Please check:');
      console.log('   STRIPE_SECRET_KEY in .env');
      console.log('   Should start with: sk_test_');
    }
    process.exit(1);
  }
}

testStripe();