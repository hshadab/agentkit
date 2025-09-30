const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function checkModels() {
  try {
    console.log('🔍 Checking available OpenAI models...\n');

    // List all models
    const models = await openai.models.list();

    const modelIds = models.data.map(m => m.id).sort();

    // Filter for GPT models
    const gptModels = modelIds.filter(id => id.includes('gpt'));

    console.log('📋 All GPT Models Available:');
    console.log('─────────────────────────────');
    gptModels.forEach(model => {
      if (model.includes('gpt-5') || model.includes('o1') || model.includes('o3')) {
        console.log(`✨ ${model} (LATEST)`);
      } else if (model.includes('gpt-4')) {
        console.log(`🔥 ${model}`);
      } else {
        console.log(`   ${model}`);
      }
    });

    console.log('\n🎯 Recommended for Spending Rules:');
    if (gptModels.some(m => m.includes('gpt-5') || m.includes('o1') || m.includes('o3'))) {
      const latest = gptModels.find(m => m.includes('gpt-5') || m.includes('o1') || m.includes('o3'));
      console.log(`   → ${latest} (Best accuracy)`);
    }
    if (gptModels.some(m => m.includes('gpt-4-turbo'))) {
      console.log(`   → gpt-4-turbo (Fast + accurate)`);
    }
    if (gptModels.some(m => m.includes('gpt-4') && !m.includes('turbo') && !m.includes('vision'))) {
      console.log(`   → gpt-4 (Reliable)`);
    }

    console.log('\n✅ API Key is valid and working!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 401) {
      console.error('   API key is invalid or expired');
    }
  }
}

checkModels();