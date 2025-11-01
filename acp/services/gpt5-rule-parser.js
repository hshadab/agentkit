/**
 * Rule Parser Service (optional OpenAI)
 * Converts natural language spending rules into structured format
 * Port: 9005
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.GPT4_PARSER_PORT || 9005;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * System prompt for parsing spending rules
 */
/**
 * Fallback pattern matching parser (for demo when GPT-4 unavailable)
 */
function parseRulesWithPatterns(text) {
  const rules = {
    daily_limit: null,
    weekly_limit: null,
    monthly_limit: null,
    per_transaction_max: null,
    allowed_categories: [],
    blocked_categories: [],
    trusted_merchants: {},
    blocked_merchants: [],
    velocity_limit: null,
    require_approval_above: null
  };

  const lowerText = text.toLowerCase();

  // Extract limits
  const monthlyMatch = lowerText.match(/(\$?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|a)\s*month/);
  if (monthlyMatch) rules.monthly_limit = parseFloat(monthlyMatch[1].replace(/[$,]/g, ''));

  const weeklyMatch = lowerText.match(/(\$?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|a)\s*week/);
  if (weeklyMatch) rules.weekly_limit = parseFloat(weeklyMatch[1].replace(/[$,]/g, ''));

  const dailyMatch = lowerText.match(/(\$?\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|a)\s*day/);
  if (dailyMatch) rules.daily_limit = parseFloat(dailyMatch[1].replace(/[$,]/g, ''));

  const perTransactionMatch = lowerText.match(/(?:no more than|max|maximum)\s+(\$?\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:per transaction|each|per purchase)/);
  if (perTransactionMatch) rules.per_transaction_max = parseFloat(perTransactionMatch[1].replace(/[$,]/g, ''));

  const approvalMatch = lowerText.match(/(?:ask|approval|approve)\s+(?:me\s+)?(?:before|for)\s+(?:buying|purchasing|spending)?\s*(?:anything\s+)?(?:over|above)\s+(\$?\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (approvalMatch) rules.require_approval_above = parseFloat(approvalMatch[1].replace(/[$,]/g, ''));

  // Extract categories
  const categories = ['books', 'groceries', 'entertainment', 'travel', 'food', 'clothing', 'electronics', 'home', 'health'];
  categories.forEach(cat => {
    if (lowerText.includes(cat)) {
      if (lowerText.includes('no ' + cat) || lowerText.includes('block ' + cat)) {
        rules.blocked_categories.push(cat);
      } else {
        rules.allowed_categories.push(cat);
      }
    }
  });

  // Extract merchants
  const merchants = ['amazon', 'whole foods', 'trader joes', 'walmart', 'target', 'etsy', 'shopify'];
  merchants.forEach(merchant => {
    const merchantKey = merchant.replace(/\s+/g, '_');
    if (lowerText.includes(merchant)) {
      if (lowerText.includes('trust ' + merchant) || lowerText.includes('from ' + merchant)) {
        rules.trusted_merchants[merchantKey] = 0.95;
      } else if (lowerText.includes('no ' + merchant) || lowerText.includes('block ' + merchant)) {
        rules.blocked_merchants.push(merchantKey);
      }
    }
  });

  return rules;
}

const SYSTEM_PROMPT = `You are a spending rule parser for autonomous AI agents. Convert natural language spending rules into structured JSON format.

Output ONLY valid JSON with this exact structure:
{
  "daily_limit": <number or null>,
  "weekly_limit": <number or null>,
  "monthly_limit": <number or null>,
  "per_transaction_max": <number or null>,
  "allowed_categories": [<string array>],
  "blocked_categories": [<string array>],
  "trusted_merchants": {<merchant_name>: <trust_score 0-1>},
  "blocked_merchants": [<string array>],
  "velocity_limit": <transactions per hour or null>,
  "require_approval_above": <number or null>
}

Examples:

Input: "I trust Amazon and want to spend max $1000/month on books"
Output: {"daily_limit": null, "weekly_limit": null, "monthly_limit": 1000, "per_transaction_max": null, "allowed_categories": ["books"], "blocked_categories": [], "trusted_merchants": {"amazon": 0.95}, "blocked_merchants": [], "velocity_limit": null, "require_approval_above": null}

Input: "Spend max $500/week on groceries from trusted stores, no more than $100 per transaction. I trust Whole Foods and Trader Joe's"
Output: {"daily_limit": null, "weekly_limit": 500, "monthly_limit": null, "per_transaction_max": 100, "allowed_categories": ["groceries"], "blocked_categories": [], "trusted_merchants": {"whole_foods": 0.95, "trader_joes": 0.95}, "blocked_merchants": [], "velocity_limit": null, "require_approval_above": null}

Input: "No entertainment spending, and ask me before buying anything over $200"
Output: {"daily_limit": null, "weekly_limit": null, "monthly_limit": null, "per_transaction_max": null, "allowed_categories": [], "blocked_categories": ["entertainment"], "trusted_merchants": {}, "blocked_merchants": [], "velocity_limit": null, "require_approval_above": 200}

Rules:
- Convert weekly/monthly limits to daily equivalents if needed
- Default trust score is 0.95 for explicitly trusted merchants
- Category names should be lowercase, hyphenated (e.g., "home-garden")
- Merchant names should be lowercase, underscored (e.g., "whole_foods")
- Return null for unspecified limits
- Be conservative: if unsure, require approval`;

/**
 * POST /parse-rules
 * Parse natural language spending rules
 */
app.post('/parse-rules', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid field: text (string required)'
      });
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your-key')) {
      return res.status(503).json({
        error: 'OpenAI API key not configured',
        message: 'Set OPENAI_API_KEY in .env file'
      });
    }

    console.log(`📝 Parsing spending rules: "${text.substring(0, 100)}..."`);

    const startTime = Date.now();
    let parsed, tokens_used = 0, model_used = OPENAI_MODEL;

    try {
      // Call OpenAI to parse rules (fallback to patterns if unavailable)
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      const responseText = completion.choices[0].message.content.trim();

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.match(/```json\n([\s\S]*?)\n```/)?.[1] || responseText;
      } else if (responseText.includes('```')) {
        jsonText = responseText.match(/```\n([\s\S]*?)\n```/)?.[1] || responseText;
      }

      parsed = JSON.parse(jsonText);
      tokens_used = completion.usage?.total_tokens || 0;
      model_used = completion.model || OPENAI_MODEL;

    } catch (apiError) {
      // Fallback: Use pattern matching for demo
      console.log(`⚠️  OpenAI API unavailable, using pattern matching: ${apiError.message}`);
      model_used = 'pattern-matching';

      parsed = parseRulesWithPatterns(text);
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ Rules parsed in ${processingTime}ms`);

    res.json({
      success: true,
      rules: parsed,
      original_text: text,
      processing_time_ms: processingTime,
      model: model_used,
      tokens_used: tokens_used
    });

  } catch (error) {
    console.error('❌ Rule parsing error:', error.message);

    // If outer catch triggered, use pattern matching fallback
    try {
      console.log('⚠️  Using pattern matching fallback');
      const parsed = parseRulesWithPatterns(req.body.text);
      const processingTime = Date.now() - startTime;

      return res.json({
        success: true,
        rules: parsed,
        original_text: req.body.text,
        processing_time_ms: processingTime,
        model: 'pattern-matching',
        tokens_used: 0,
        note: 'OpenAI unavailable, used pattern matching'
      });
    } catch (fallbackError) {
      return res.status(500).json({
        error: 'Failed to parse spending rules',
        message: error.message
      });
    }
  }
});

/**
 * POST /convert-to-model-params
 * Convert parsed rules into ONNX model parameters
 */
app.post('/convert-to-model-params', async (req, res) => {
  try {
    const { rules, transaction } = req.body;

    if (!rules || !transaction) {
      return res.status(400).json({
        error: 'Missing required fields: rules, transaction'
      });
    }

    // Calculate daily budget from weekly/monthly limits
    // For demo: use monthly limit directly instead of dividing
    let daily_limit = rules.daily_limit;
    if (!daily_limit && rules.weekly_limit) {
      daily_limit = rules.weekly_limit / 7;
    } else if (!daily_limit && rules.monthly_limit) {
      daily_limit = rules.monthly_limit;  // Use monthly limit directly for demo
    } else {
      daily_limit = 10000; // Default: $10k/day
    }

    // Calculate merchant trust
    const merchant_trust = rules.trusted_merchants[transaction.merchant_id] || 0.5;

    // Calculate category score
    const category = transaction.category || 'unknown';
    let category_score = 0.5; // Default: neutral
    if (rules.allowed_categories.includes(category)) {
      category_score = 1.0;
    } else if (rules.blocked_categories.includes(category)) {
      category_score = 0.0;
    }

    // Convert to model input format
    const model_params = {
      budget_remaining: daily_limit - (transaction.spent_today || 0),
      merchant_trust: merchant_trust,
      amount: transaction.amount,
      category_score: category_score,
      velocity: transaction.transactions_today || 0
    };

    res.json({
      success: true,
      model_params: model_params,
      user_rules: rules,
      notes: {
        daily_limit: daily_limit,
        merchant_trust: merchant_trust,
        category_score: category_score,
        will_require_approval: transaction.amount > (rules.require_approval_above || Infinity)
      }
    });

  } catch (error) {
    console.error('❌ Parameter conversion failed:', error.message);
    res.status(500).json({
      error: 'Failed to convert rules to model parameters',
      message: error.message
    });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rule-parser',
    openai_configured: !!OPENAI_API_KEY && !OPENAI_API_KEY.includes('your-key'),
    model: OPENAI_MODEL,
    uptime: process.uptime()
  });
});

/**
 * GET /examples
 * Get example natural language inputs
 */
app.get('/examples', (req, res) => {
  res.json({
    examples: [
      {
        text: "I trust Amazon and want to spend max $1000/month on books",
        description: "Simple monthly limit with trusted merchant"
      },
      {
        text: "Spend max $500/week on groceries from trusted stores, no more than $100 per transaction. I trust Whole Foods and Trader Joe's",
        description: "Weekly limit with per-transaction cap and multiple merchants"
      },
      {
        text: "No entertainment spending, and ask me before buying anything over $200",
        description: "Category blocking with approval threshold"
      },
      {
        text: "Max $50/day on coffee shops, no more than 5 transactions per hour",
        description: "Daily limit with velocity control"
      },
      {
        text: "I trust Etsy sellers, max $2000/month on crafts and home goods, but nothing from China",
        description: "Platform trust with category and geographic restrictions"
      }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🤖 Rule Parser Service running on port', PORT);
  console.log('🔗 OpenAI API:', OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured');
  console.log(`✨ Model: ${OPENAI_MODEL} (patterns fallback)`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/parse-rules`);
  console.log(`  POST http://localhost:${PORT}/convert-to-model-params`);
  console.log(`  GET  http://localhost:${PORT}/examples`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log('');
});
