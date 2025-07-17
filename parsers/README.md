# Parsers Directory

This directory contains general-purpose parsers used throughout the Verifiable Agent Kit system.

## Structure

```
parsers/
└── workflow/
    ├── workflowParser.js         # Main workflow parser for all proof types and operations
    ├── workflowParser_final.js   # Enhanced version with better conditional logic
    ├── workflowExecutor.js       # Executes parsed workflows via WebSocket
    ├── workflowCLI.js           # Command-line interface for workflow execution
    ├── openaiWorkflowParser.py   # Basic OpenAI-based workflow parser
    └── openaiWorkflowParserEnhanced.py  # Enhanced OpenAI parser with better parsing
```

## Workflow Parsers

### JavaScript Parsers

**workflowParser.js**
- Parses natural language commands into structured workflow steps
- Supports multiple proof types: KYC, location, AI content, collatz, prime, digital root
- Handles conditional logic ("if X then Y")
- Extracts transfer details (amount, recipient, blockchain)

**workflowExecutor.js**
- Executes parsed workflows step-by-step
- Communicates with Rust backend via WebSocket
- Manages proof generation and verification
- Handles conditional transfers based on verification results

### Python Parsers

**openaiWorkflowParserEnhanced.py**
- Uses OpenAI GPT models for complex natural language parsing
- Better handling of multi-step workflows
- Supports advanced conditional logic
- Used by the langchain_service.py API

## Usage Examples

### JavaScript
```javascript
import WorkflowParser from './parsers/workflow/workflowParser_final.js';

const parser = new WorkflowParser();
const workflow = parser.parseCommand("Generate KYC proof for alice then send 0.05 USDC");
```

### Python
```python
from parsers.workflow.openaiWorkflowParserEnhanced import EnhancedOpenAIWorkflowParser

parser = EnhancedOpenAIWorkflowParser(api_key="...")
workflow = parser.parse_workflow("Complex multi-step command...")
```

## Migration Note

These parsers were previously located in the `circle/` directory but have been moved here as they are general-purpose utilities used across the entire system, not just for Circle operations.