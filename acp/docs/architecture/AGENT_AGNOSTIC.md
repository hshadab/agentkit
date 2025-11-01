# Agent-Agnostic Design

**Last Updated**: 2025-09-30

## Why Agent-Agnostic Matters

The Agentic Commerce Protocol (ACP) is an **open standard** maintained by OpenAI and Stripe, designed to work with **any AI agent**, not just ChatGPT.

### ACP Governance
- **Maintainers**: OpenAI + Stripe (co-maintained)
- **License**: Apache 2.0 (open source)
- **Specification**: OpenAPI format (industry standard)
- **Goal**: Enable commerce for **any AI agent**

## Our Implementation

This demo showcases zkML authorization that works with **any AI agent**:

### Supported Agents
- ✅ **Claude** (Anthropic)
- ✅ **ChatGPT** (OpenAI)
- ✅ **Gemini** (Google)
- ✅ **Llama** (Meta)
- ✅ **Custom Agents** (your own)

### Agent-Agnostic Architecture

```
┌─────────────────────────────────────┐
│  Any AI Agent System                │
│  • Claude (Anthropic)               │
│  • ChatGPT (OpenAI)                 │
│  • Gemini (Google)                  │
│  • Llama (Meta)                     │
│  • Custom implementations           │
└──────────────┬──────────────────────┘
               │
               │ Payment Request
               ↓
┌─────────────────────────────────────┐
│  ACP + zkML Authorization Layer     │
│  ────────────────────────────────   │
│  1. Parse user spending rules       │
│  2. Run ONNX authorization model    │
│  3. Generate JOLT-Atlas zkML proof  │
│  4. Bind proof to ACP session       │
│  5. Optional on-chain verification  │
└──────────────┬──────────────────────┘
               │
               ↓
        [Merchant Payment]
```

### What's Agent-Independent

1. **User Rules**: Natural language spending rules (any agent can submit)
2. **ONNX Model**: 5-parameter neural network (agent-agnostic inputs)
3. **zkML Proof**: JOLT-Atlas proof (verifies computation, not agent)
4. **ACP Protocol**: Standard checkout flow (agent-independent)
5. **On-Chain Verification**: Blockchain verification (universal)

### What Varies by Agent

Only the **initial payment request format** differs by agent. Once the request hits the ACP + zkML layer, everything is standardized.

## Key Design Decisions

### 1. No Agent-Specific Logic
The authorization model evaluates:
- Budget remaining
- Merchant trust
- Transaction amount
- Category score
- Velocity

**None of these depend on which agent made the request.**

### 2. Agent Selector is Cosmetic
The UI includes an agent dropdown, but it's **cosmetic only** - it demonstrates universality without affecting the actual authorization logic.

### 3. zkML Proves Computation, Not Agent
The JOLT proof guarantees:
- ✅ The ONNX model ran with these inputs
- ✅ The computation was performed correctly
- ✅ The authorization decision is verifiable

It does **not** prove which agent made the request (intentionally).

## Benefits of Agent-Agnostic Design

### For Users
- **Freedom of choice**: Use any AI assistant
- **Consistency**: Same rules work across all agents
- **Portability**: Rules aren't locked to one provider

### For Merchants
- **Wider adoption**: Accept payments from any agent
- **Single integration**: One verification system for all
- **Future-proof**: New agents work automatically

### For Developers
- **Universal standard**: Build once, works everywhere
- **No vendor lock-in**: Not tied to OpenAI or any provider
- **Open ecosystem**: Collaborate across platforms

## Comparison: OpenAI-Focused vs Agent-Agnostic

### Before (OpenAI-Focused)
```
❌ Title: "ACP × JOLT-Atlas: OpenAI Agent Commerce"
❌ Subtitle: "zkML for ChatGPT"
❌ Logo: OpenAI + ACP
❌ Description: "This demo shows how zkML integrates with OpenAI's ACP"
❌ Workflow: "ChatGPT decides → Generate proof → Process"
```

**Problem**: Looks like proprietary OpenAI technology

### After (Agent-Agnostic)
```
✅ Title: "Verified Agentic Commerce"
✅ Subtitle: "Trustless Agents for ACP"
✅ Logos: ACP × NovaNet zkML
✅ Description: "Works with any AI agent (Claude, GPT, etc.)"
✅ Workflow: "Any agent requests → Authorize → Proof → ACP"
```

**Benefit**: Clearly universal, not OpenAI-specific

## Technical Implementation

### UI Changes
- Removed OpenAI logo and branding
- Added agent selector dropdown (Claude, GPT, Gemini, Llama, Custom)
- Updated all copy from "OpenAI's ACP" → "ACP"
- Changed workflow steps to "Agent Request" (not "ChatGPT Shopping")

### Backend (Already Agent-Agnostic!)
The backend services were already agent-agnostic:
- `acp-openai-server.js` → Name is misleading, but code is universal
- `proof-service.js` → No agent-specific logic
- `gpt5-rule-parser.js` → Rule parser service (optional OpenAI), not agent identification

### Documentation
- Updated README.md with agent-agnostic architecture
- Created this AGENT_AGNOSTIC.md explainer
- Updated VALUE_PROPOSITION.md to emphasize universality

## Future Enhancements

### Phase 1: Agent Metadata (Optional)
Add agent identification to proof metadata for analytics:
```json
{
  "proof": "0xjolt_real_...",
  "agent_meta": {
    "type": "claude",
    "version": "3.5-sonnet",
    "provider": "anthropic"
  }
}
```

**Note**: This is for analytics only, not part of authorization logic.

### Phase 2: Agent-Specific Rules (Advanced)
Allow users to set different rules per agent:
```
"Claude can spend up to $100/day"
"ChatGPT can spend up to $50/day"
```

**Use Case**: Users may trust different agents differently.

### Phase 3: Multi-Agent Workflows
Enable coordinated multi-agent purchases:
```
Agent A requests → Agent B verifies → Both sign → zkML proof
```

**Use Case**: Complex B2B procurement workflows.

## Resources

- **ACP Specification**: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
- **OpenAPI Spec**: `/spec/openapi/openapi.agentic_checkout.yaml`
- **Maintainers**: OpenAI + Stripe
- **License**: Apache 2.0

## FAQ

**Q: Is ACP OpenAI-specific?**
A: No. ACP is an open standard co-maintained by OpenAI and Stripe, designed for any AI agent.

**Q: Does zkML only work with ChatGPT?**
A: No. zkML proves authorization logic ran correctly, regardless of which agent made the request.

**Q: Can I use this with Claude?**
A: Yes! The demo works with any agent that can submit payment requests.

**Q: What about custom/private agents?**
A: Full support. Any agent can use the ACP + zkML authorization layer.

**Q: Do merchants need different integrations per agent?**
A: No. Merchants integrate with ACP once, and all agents work automatically.

---

**Bottom Line**: This is not "zkML for ChatGPT" - it's **universal payment authorization for the agentic economy**, regardless of which AI assistant you use.
