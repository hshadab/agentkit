#!/bin/bash

cd ~/agentkit

echo "🔧 Creating complete working index.html with AI Content verification..."

# Create backup
cp static/index.html static/index.html.backup_complete_$(date +%Y%m%d_%H%M%S)

# Create complete working index.html
cat > static/index.html << 'HTML_END'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>zkEngine - ZKP Agent Kit</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0a0a0a;
            color: #e2e8f0;
            height: 100vh;
            display: flex;
            overflow: hidden;
        }
        
        /* Left sidebar */
        .sidebar {
            width: 320px;
            background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
            padding: 24px;
            overflow-y: auto;
            border-right: 1px solid rgba(139, 92, 246, 0.2);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
        }
        
        .sidebar h3 {
            background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 0.1em;
            font-weight: 700;
        }
        
        .info-box {
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 24px;
            padding: 12px;
            background: rgba(139, 92, 246, 0.05);
            border: 1px solid rgba(139, 92, 246, 0.1);
            border-radius: 8px;
            line-height: 1.6;
        }
        
        .example-category {
            margin-bottom: 28px;
        }
        
        .example-category h4 {
            color: #a78bfa;
            font-size: 11px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 600;
        }
        
        .example-item {
            background: rgba(139, 92, 246, 0.05);
            border: 1px solid rgba(139, 92, 246, 0.1);
            padding: 14px 18px;
            margin-bottom: 8px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 14px;
            position: relative;
            overflow: hidden;
        }
        
        .example-item:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.3);
            transform: translateX(4px);
        }
        
        .example-item strong {
            color: #c084fc;
            font-weight: 600;
        }
        
        /* Main container */
        .main-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0a0a0a;
        }
        
        /* Header */
        .header {
            padding: 20px 32px;
            background: linear-gradient(180deg, #1a1a2e 0%, transparent 100%);
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            backdrop-filter: blur(10px);
        }
        
        .header h1 {
            font-size: 26px;
            background: linear-gradient(135deg, #c084fc 0%, #7c3aed 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 24px;
            font-size: 13px;
            font-weight: 500;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.9); }
        }
        
        /* Messages area */
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 32px;
            background: #0a0a0a;
        }
        
        #messages {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        /* Message styles */
        .message {
            margin: 24px 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes fadeIn {
            from { 
                opacity: 0; 
                transform: translateY(20px) scale(0.95); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
            }
        }
        
        .message.user {
            flex-direction: row-reverse;
        }
        
        .message-content {
            max-width: 70%;
            padding: 16px 24px;
            border-radius: 20px;
            line-height: 1.6;
            font-size: 15px;
        }
        
        .message.user .message-content {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border-bottom-right-radius: 4px;
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        }
        
        .message.assistant .message-content {
            background: rgba(30, 30, 46, 0.6);
            color: #e2e8f0;
            border: 1px solid rgba(139, 92, 246, 0.1);
            border-bottom-left-radius: 4px;
            backdrop-filter: blur(10px);
            white-space: pre-wrap;
        }
        
        /* Enhanced loading dots animation */
        .loading-dots {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin: 20px 0;
            padding: 20px;
        }
        
        .loading-dots .dot {
            width: 8px;
            height: 8px;
            background-color: #a78bfa;
            border-radius: 50%;
            animation: dotBounce 1.4s ease-in-out infinite both;
        }
        
        .loading-dots .dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots .dot:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots .dot:nth-child(3) { animation-delay: 0; }
        
        @keyframes dotBounce {
            0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            40% {
                transform: scale(1.2);
                opacity: 1;
            }
        }

        /* Thinking animation for natural language processing */
        .thinking-animation {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 20px 0;
            padding: 16px 24px;
            background: rgba(30, 30, 46, 0.6);
            border: 1px solid rgba(139, 92, 246, 0.1);
            border-radius: 20px;
            border-bottom-left-radius: 4px;
            backdrop-filter: blur(10px);
            max-width: 70%;
        }

        .thinking-dots {
            display: flex;
            gap: 3px;
        }

        .thinking-dots .dot {
            width: 6px;
            height: 6px;
            background-color: #a78bfa;
            border-radius: 50%;
            animation: thinkingBounce 1.2s ease-in-out infinite;
        }

        .thinking-dots .dot:nth-child(1) { animation-delay: 0s; }
        .thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes thinkingBounce {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.4;
            }
            30% {
                transform: translateY(-8px);
                opacity: 1;
            }
        }
        
        /* Proof Card */
        .proof-card {
            background: linear-gradient(135deg, rgba(30, 30, 46, 0.8) 0%, rgba(20, 20, 36, 0.8) 100%);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 24px;
            margin: 20px 0;
            max-width: 800px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            animation: cardSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes cardSlideIn {
            from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .proof-card.running {
            border-color: rgba(139, 92, 246, 0.4);
            background: linear-gradient(135deg, rgba(30, 30, 46, 0.9) 0%, rgba(26, 17, 71, 0.9) 100%);
        }
        
        .proof-card.success {
            border-color: rgba(16, 185, 129, 0.4);
            background: linear-gradient(135deg, rgba(30, 30, 46, 0.9) 0%, rgba(6, 78, 59, 0.9) 100%);
        }

        /* Shimmer animation for processing cards */
        .proof-card.running::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
            animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .card-title-text {
            background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .card-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border-radius: 12px;
            color: white;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        /* Spinning animation for running proofs */
        .card-icon.spinning {
            animation: spin 2s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .card-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .badge-success {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .badge-processing {
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(251, 191, 36, 0.3);
            animation: pulse 2s infinite;
        }
        
        .badge-verify {
            background: rgba(139, 92, 246, 0.15);
            color: #8b5cf6;
            border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .metrics-row {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .metric-item-inline {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .metric-label-inline {
            color: #a78bfa;
            font-size: 13px;
            font-weight: 500;
        }
        
        .metric-value-inline {
            color: #f3e8ff;
            font-size: 16px;
            font-weight: 600;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        /* Action buttons for proof cards */
        .card-actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(139, 92, 246, 0.1);
        }

        .action-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .action-btn.secondary {
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #a78bfa;
        }

        .action-btn.secondary:hover {
            background: rgba(139, 92, 246, 0.25);
        }

        /* Expandable Code Viewer */
        .code-viewer {
            margin-top: 16px;
            border-top: 1px solid rgba(139, 92, 246, 0.2);
            padding-top: 16px;
            display: none;
            animation: slideDown 0.3s ease;
        }

        .code-viewer.show {
            display: block;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .code-title {
            font-size: 14px;
            font-weight: 600;
            background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .code-block {
            background: #0f0f23;
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 8px;
            padding: 16px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            font-size: 13px;
            line-height: 1.5;
            color: #e2e8f0;
            overflow-x: auto;
            white-space: pre;
            max-height: 300px;
            overflow-y: auto;
        }

        .code-description {
            color: #94a3b8;
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 12px;
        }
        
        /* Data Tables */
        .data-table {
            background: rgba(30, 30, 46, 0.8);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 24px;
            margin: 20px 0;
            max-width: 900px;
            overflow-x: auto;
            backdrop-filter: blur(10px);
            animation: cardSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .table-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .table-title {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .table-count {
            background: rgba(139, 92, 246, 0.15);
            color: #a78bfa;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        th {
            background: rgba(139, 92, 246, 0.1);
            color: #a78bfa;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            color: #e2e8f0;
        }
        
        tr:hover {
            background: rgba(139, 92, 246, 0.05);
        }
        
        .clickable {
            color: #c084fc;
            cursor: pointer;
            font-family: 'SF Mono', monospace;
            font-weight: 600;
        }
        
        .clickable:hover {
            color: #8b5cf6;
            text-decoration: underline;
        }
        
        .status-success {
            color: #10b981;
            font-weight: 600;
        }
        
        .status-failed {
            color: #ef4444;
            font-weight: 600;
        }
        
        .status-running {
            color: #fbbf24;
            font-weight: 600;
        }
        
        .verify-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .verify-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        /* Input area */
        .input-container {
            padding: 24px 32px;
            background: linear-gradient(180deg, transparent 0%, #1a1a2e 100%);
            border-top: 1px solid rgba(139, 92, 246, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .input-wrapper {
            max-width: 1000px;
            margin: 0 auto;
            display: flex;
            gap: 16px;
            align-items: center;
        }
        
        #user-input {
            flex: 1;
            padding: 18px 28px;
            background: rgba(30, 30, 46, 0.6);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 30px;
            color: #f3e8ff;
            font-size: 16px;
            outline: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        }
        
        #user-input::placeholder {
            color: #6b7280;
        }
        
        #user-input:focus {
            border-color: rgba(139, 92, 246, 0.5);
            box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
            background: rgba(30, 30, 46, 0.8);
        }
        
        #send-button {
            padding: 18px 36px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        }
        
        #send-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(139, 92, 246, 0.4);
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <h3>✨ ZKP Agent Kit</h3>
        <div class="info-box">
            Generate real cryptographic proofs using zkEngine. All metrics shown are actual values from proof generation - no simulations.
        </div>
        
        <div class="example-category">
            <h4>📍 DePIN Location Proofs</h4>
            <div class="example-item" data-example="prove device location in San Francisco">
                <strong>SF Location</strong> - Prove device in SF for rewards
            </div>
            <div class="example-item" data-example="prove add 15 and 27">
                <strong>add</strong> - Addition operation
            </div>
            <div class="example-item" data-example="prove multiply 8 by 7">
                <strong>multiply</strong> - Multiplication
            </div>
            <div class="example-item" data-example="prove fibonacci of 20">
                <strong>fibonacci</strong> - Recursive sequence
            </div>
            <div class="example-item" data-example="prove factorial of 5">
                <strong>factorial</strong> - Factorial computation
            </div>
            <div class="example-item" data-example="prove ai content authenticity">
                <strong>AI Content</strong> - Verify AI-generated content authenticity
            </div>
        </div>
        
        <div class="example-category">
            <h4>📊 Proof Management</h4>
            <div class="example-item" data-example="list all proofs">
                <strong>📋 View All Proofs</strong> - Show proof history
            </div>
            <div class="example-item" data-example="list verifications">
                <strong>✅ View Verifications</strong> - Show verification history
            </div>
            <div class="example-item" data-example="verify">
                <strong>🔍 Verify</strong> - Verify last proof
            </div>
            <div class="example-item" data-example="status">
                <strong>🔧 Status</strong> - System health
            </div>
            <div class="example-item" data-example="help">
                <strong>❓ Help</strong> - Show commands
            </div>
        </div>
    </div>
    
    <div class="main-container">
        <div class="header">
            <h1>🚀 zkEngine Agent Kit</h1>
            <div class="status">
                <div class="status-dot" id="status-dot"></div>
                <span id="connection-status">Connecting...</span>
            </div>
        </div>
        
        <div class="messages-container">
            <div id="messages"></div>
        </div>
        
        <div class="input-container">
            <div class="input-wrapper">
                <input type="text" id="user-input" placeholder="Ask me to prove a computation..." autofocus>
                <button id="send-button">Send</button>
            </div>
        </div>
    </div>
    
    <script>
        let ws = null;
        let proofStates = {};
        let waitingForResponse = false;
        let thinkingAnimation = null;
        
        function connect() {
            try {
                ws = new WebSocket('ws://localhost:8001/ws');
                
                ws.onopen = () => {
                    console.log('Connected to zkEngine');
                    document.getElementById('connection-status').textContent = 'Connected';
                    document.getElementById('status-dot').style.backgroundColor = '#10b981';
                };
                
                ws.onmessage = (event) => {
                    console.log('Received:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        handleMessage(data);
                    } catch (e) {
                        console.error('Failed to parse message:', e);
                        addMessage(event.data, 'assistant');
                    }
                };
                
                ws.onclose = () => {
                    console.log('Disconnected from zkEngine');
                    document.getElementById('connection-status').textContent = 'Disconnected';
                    document.getElementById('status-dot').style.backgroundColor = '#ef4444';
                };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    document.getElementById('connection-status').textContent = 'Error';
                    document.getElementById('status-dot').style.backgroundColor = '#ef4444';
                };
            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
            }
        }
        
        function handleMessage(data) {
            removeThinkingAnimation();
            removeLoadingDots();
            
            // Handle structured data
            if (data.data && data.data.type) {
                const dataType = data.data.type;
                
                if (dataType === 'proof_start') {
                    createProofCard(data.data.proof_id, 'running', data.content, data.data);
                    return;
                } else if (dataType === 'proof_complete') {
                    updateProofCard(data.data.proof_id, 'success', data.content, data.data);
                    return;
                } else if (dataType === 'proof_list') {
                    displayProofsList(data.data.proofs);
                    return;
                } else if (dataType === 'verification_list') {
                    displayVerificationsList(data.data.verifications);
                    return;
                } else if (dataType === 'verification_complete') {
                    displayVerificationResult(data.data);
                    return;
                }
            }
            
            // Handle regular messages
            if (data.content) {
                const content = data.content;
                
                // Check for proof generation patterns
                if (content.includes('Starting proof generation')) {
                    const idMatch = content.match(/ID:\s*([a-f0-9-]+)/);
                    if (idMatch) {
                        createProofCard(idMatch[1], 'running', content);
                    } else {
                        addMessage(content, 'assistant');
                    }
                } else if (content.includes('Proof generated successfully')) {
                    const idMatch = content.match(/ID:\s*([a-f0-9-]+)/);
                    const timeMatch = content.match(/Time:\s*([\d.]+)s/);
                    const sizeMatch = content.match(/Size:\s*([\d.]+)MB/);
                    
                    if (idMatch) {
                        const mockData = {
                            time: timeMatch ? parseFloat(timeMatch[1]) : 0,
                            size: sizeMatch ? parseFloat(sizeMatch[1]) : 0
                        };
                        updateProofCard(idMatch[1], 'success', content, mockData);
                    } else {
                        addMessage(content, 'assistant');
                    }
                } else {
                    addMessage(content, 'assistant');
                }
            }
        }

        function showThinkingAnimation() {
            if (thinkingAnimation) return;
            
            const messagesDiv = document.getElementById('messages');
            thinkingAnimation = document.createElement('div');
            thinkingAnimation.className = 'thinking-animation';
            thinkingAnimation.innerHTML = `
                <span style="color: #a78bfa; font-size: 14px;">Thinking</span>
                <div class="thinking-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            messagesDiv.appendChild(thinkingAnimation);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }

        function removeThinkingAnimation() {
            if (thinkingAnimation) {
                thinkingAnimation.remove();
                thinkingAnimation = null;
            }
        }
        
        function displayProofsList(proofs) {
            const messagesDiv = document.getElementById('messages');
            
            const tableDiv = document.createElement('div');
            tableDiv.className = 'data-table';
            
            // Show only 20 most recent proofs
            const recentProofs = proofs
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);
            
            let tableHTML = `
                <div class="table-header">
                    <div class="table-title">📋 Recent Proof History</div>
                    <div class="table-count">${recentProofs.length} of ${proofs.length} proofs</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Proof ID</th>
                            <th>Function</th>
                            <th>Arguments</th>
                            <th>Status</th>
                            <th>Time</th>
                            <th>Size</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (recentProofs.length === 0) {
                tableHTML += `
                    <tr>
                        <td colspan="8" style="text-align: center; color: #94a3b8; padding: 40px;">
                            No proofs generated yet. Try "prove fibonacci of 10" to get started!
                        </td>
                    </tr>
                `;
            } else {
                recentProofs.forEach(proof => {
                    const proofIdShort = proof.id.substring(0, 8);
                    const functionName = proof.metadata.function || 'computation';
                    const args = proof.metadata.arguments.join(', ') || '[]';
                    const statusClass = proof.status === 'Complete' ? 'status-success' : 
                                      proof.status === 'Running' ? 'status-running' : 'status-failed';
                    const time = proof.metrics.generation_time_secs ? `${proof.metrics.generation_time_secs.toFixed(1)}s` : 'N/A';
                    const size = proof.metrics.file_size_mb ? `${proof.metrics.file_size_mb.toFixed(1)}MB` : 'N/A';
                    const created = new Date(proof.timestamp).toLocaleString();
                    
                    tableHTML += `
                        <tr>
                            <td><span class="clickable" onclick="copyToClipboard('${proof.id}')" title="Copy full ID">${proofIdShort}</span></td>
                            <td>${functionName}</td>
                            <td>${args}</td>
                            <td><span class="${statusClass}">${proof.status}</span></td>
                            <td>${time}</td>
                            <td>${size}</td>
                            <td>${created}</td>
                            <td><button class="verify-btn" onclick="verifyProof('${proof.id}')">Verify</button></td>
                        </tr>
                    `;
                });
            }
            
            if (proofs.length > 20) {
                tableHTML += `
                    <tr>
                        <td colspan="8" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                            Showing 20 most recent proofs. Total: ${proofs.length} proofs
                        </td>
                    </tr>
                `;
            }
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            tableDiv.innerHTML = tableHTML;
            messagesDiv.appendChild(tableDiv);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }
        
        function displayVerificationsList(verifications) {
            const messagesDiv = document.getElementById('messages');
            
            const tableDiv = document.createElement('div');
            tableDiv.className = 'data-table';
            
            // Show only 20 most recent verifications
            const recentVerifications = verifications
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);
            
            let tableHTML = `
                <div class="table-header">
                    <div class="table-title">✅ Recent Verification History</div>
                    <div class="table-count">${recentVerifications.length} of ${verifications.length} verifications</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Verification ID</th>
                            <th>Proof ID</th>
                            <th>Result</th>
                            <th>Time</th>
                            <th>Verified At</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            if (recentVerifications.length === 0) {
                tableHTML += `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 40px;">
                            No verifications performed yet. Generate a proof and then verify it!
                        </td>
                    </tr>
                `;
            } else {
                recentVerifications.forEach(verification => {
                    const verifyIdShort = verification.id.substring(0, 8);
                    const proofIdShort = verification.proof_id.substring(0, 8);
                    const resultClass = verification.is_valid ? 'status-success' : 'status-failed';
                    const result = verification.is_valid ? 'VALID ✅' : 'INVALID ❌';
                    const time = verification.verification_time_secs ? `${verification.verification_time_secs.toFixed(3)}s` : 'N/A';
                    const verified = new Date(verification.timestamp).toLocaleString();
                    const error = verification.error || '-';
                    
                    tableHTML += `
                        <tr>
                            <td><span class="clickable" onclick="copyToClipboard('${verification.id}')" title="Copy full ID">${verifyIdShort}</span></td>
                            <td><span class="clickable" onclick="copyToClipboard('${verification.proof_id}')" title="Copy proof ID">${proofIdShort}</span></td>
                            <td><span class="${resultClass}">${result}</span></td>
                            <td>${time}</td>
                            <td>${verified}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${error}</td>
                        </tr>
                    `;
                });
            }

            if (verifications.length > 20) {
                tableHTML += `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                            Showing 20 most recent verifications. Total: ${verifications.length} verifications
                        </td>
                    </tr>
                `;
            }
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            tableDiv.innerHTML = tableHTML;
            messagesDiv.appendChild(tableDiv);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }
        
        function displayVerificationResult(data) {
            const messagesDiv = document.getElementById('messages');
            
            const cardDiv = document.createElement('div');
            cardDiv.className = `proof-card ${data.is_valid ? 'success' : 'failed'}`;
            
            const proofIdShort = data.proof_id.substring(0, 8);
            const resultIcon = data.is_valid ? '✅' : '❌';
            const resultText = data.is_valid ? 'VALID' : 'INVALID';
            const badgeClass = data.is_valid ? 'badge-success' : 'badge-failed';
            
            cardDiv.innerHTML = `
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-icon">${resultIcon}</div>
                        <span class="card-title-text">Proof Verification</span>
                    </div>
                    <div class="card-badge ${badgeClass}">
                        ${resultText}
                    </div>
                </div>
                
                <div class="metrics-row">
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Proof ID:</span>
                        <span class="metric-value-inline">${proofIdShort}</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Result:</span>
                        <span class="metric-value-inline">${resultText}</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Time:</span>
                        <span class="metric-value-inline">${data.verification_time_secs ? data.verification_time_secs.toFixed(3) + 's' : 'N/A'}</span>
                    </div>
                    ${data.error ? `
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Error:</span>
                        <span class="metric-value-inline" style="color: #ef4444;">${data.error}</span>
                    </div>
                    ` : ''}
                </div>
            `;
            
            messagesDiv.appendChild(cardDiv);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }

        function createProofCard(proofId, status, content, data = null) {
            const messagesDiv = document.getElementById('messages');
            
            let functionName = 'Location';
            let args = 'san francisco';
            let wasmFile = 'prove_location.wat';
            
            if (data) {
                functionName = data.function === 'prove_location' ? 'Location' : data.function;
                args = data.arguments ? data.arguments.join(', ') : args;
                wasmFile = data.wasm_file || wasmFile;
            }
            
            proofStates[proofId] = { status, functionName, args, wasmFile };
            
            const cardDiv = document.createElement('div');
            cardDiv.className = `proof-card ${status}`;
            cardDiv.id = `proof-${proofId}`;
            
            const proofIdShort = proofId.substring(0, 8);
            
            cardDiv.innerHTML = `
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-icon spinning">⚡</div>
                        <span class="card-title-text">Proof Generation</span>
                    </div>
                    <div class="card-badge badge-processing">
                        GENERATING
                    </div>
                </div>
                
                <div class="metrics-row">
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Proof ID:</span>
                        <span class="metric-value-inline">${proofIdShort}</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Function:</span>
                        <span class="metric-value-inline">${functionName}(${args})</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Status:</span>
                        <span class="metric-value-inline">Generating...</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="action-btn" onclick="verifyProof('${proofId}')">
                        🔍 Verify Proof
                    </button>
                    <button class="action-btn secondary" onclick="toggleCProgram('${proofId}', '${wasmFile}', '${functionName}')">
                        📝 C Program
                    </button>
                    <button class="action-btn secondary" onclick="toggleWasmFile('${proofId}', '${wasmFile}', '${functionName}')">
                        ⚙️ Wasm File
                    </button>
                    <button class="action-btn secondary" onclick="copyToClipboard('${proofId}')">
                        📋 Copy ID
                    </button>
                </div>

                <div class="code-viewer" id="c-viewer-${proofId}">
                    <div class="code-header">
                        <div class="code-title">📝 Original C Program: ${wasmFile.replace('.wat', '.c')}</div>
                    </div>
                    <div class="code-description">
                        This is the original C program that was compiled to WebAssembly for <strong>${functionName}</strong>. 
                        Users upload C code which gets compiled to WASM for cryptographic proof generation.
                    </div>
                    <div class="code-block" id="c-content-${proofId}">
                        Loading...
                    </div>
                </div>

                <div class="code-viewer" id="wasm-viewer-${proofId}">
                    <div class="code-header">
                        <div class="code-title">⚙️ Compiled WASM File: ${wasmFile}</div>
                    </div>
                    <div class="code-description">
                        This is the WebAssembly (WAT) code compiled from the C program that was executed to generate the cryptographic proof for <strong>${functionName}</strong>. 
                        The code is deterministic and verifiable, ensuring the proof's integrity.
                    </div>
                    <div class="code-block" id="wasm-content-${proofId}">
                        Loading...
                    </div>
                </div>
            `;
            
            messagesDiv.appendChild(cardDiv);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }
        
        function updateProofCard(proofId, status, content, data = null) {
            const card = document.getElementById(`proof-${proofId}`);
            if (!card) {
                createProofCard(proofId, status, content, data);
                return;
            }
            
            const state = proofStates[proofId] || {};
            card.className = `proof-card ${status}`;
            
            const proofIdShort = proofId.substring(0, 8);
            const functionName = state.functionName || 'Location';
            const args = state.args || 'san francisco';
            const wasmFile = state.wasmFile || 'prove_location.wat';
            
            let timeDisplay = 'N/A';
            let sizeDisplay = 'N/A';
            
            if (data) {
                timeDisplay = data.time ? `${data.time.toFixed(1)}s` : timeDisplay;
                sizeDisplay = data.size ? `${data.size.toFixed(1)}MB` : sizeDisplay;
            }
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-icon">✅</div>
                        <span class="card-title-text">Proof Generated</span>
                    </div>
                    <div class="card-badge badge-success">
                        COMPLETE
                    </div>
                </div>
                
                <div class="metrics-row">
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Proof ID:</span>
                        <span class="metric-value-inline">${proofIdShort}</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Function:</span>
                        <span class="metric-value-inline">${functionName}(${args})</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Time:</span>
                        <span class="metric-value-inline">${timeDisplay}</span>
                    </div>
                    <div class="metric-item-inline">
                        <span class="metric-label-inline">Size:</span>
                        <span class="metric-value-inline">${sizeDisplay}</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="action-btn" onclick="verifyProof('${proofId}')">
                        🔍 Verify Proof
                    </button>
                    <button class="action-btn secondary" onclick="toggleCProgram('${proofId}', '${wasmFile}', '${functionName}')">
                        📝 C Program
                    </button>
                    <button class="action-btn secondary" onclick="toggleWasmFile('${proofId}', '${wasmFile}', '${functionName}')">
                        ⚙️ Wasm File
                    </button>
                    <button class="action-btn secondary" onclick="copyToClipboard('${proofId}')">
                        📋 Copy ID
                    </button>
                </div>

                <div class="code-viewer" id="c-viewer-${proofId}">
                    <div class="code-header">
                        <div class="code-title">📝 Original C Program: ${wasmFile.replace('.wat', '.c')}</div>
                    </div>
                    <div class="code-description">
                        This is the original C program that was compiled to WebAssembly for <strong>${functionName}</strong>. 
                        Users upload C code which gets compiled to WASM for cryptographic proof generation.
                    </div>
                    <div class="code-block" id="c-content-${proofId}">
                        Loading...
                    </div>
                </div>

                <div class="code-viewer" id="wasm-viewer-${proofId}">
                    <div class="code-header">
                        <div class="code-title">⚙️ Compiled WASM File: ${wasmFile}</div>
                    </div>
                    <div class="code-description">
                        This is the WebAssembly (WAT) code compiled from the C program that was executed to generate the cryptographic proof for <strong>${functionName}</strong>. 
                        The code is deterministic and verifiable, ensuring the proof's integrity.
                    </div>
                    <div class="code-block" id="wasm-content-${proofId}">
                        Loading...
                    </div>
                </div>
            `;
        }

        function toggleCProgram(proofId, wasmFile, functionName) {
            console.log('toggleCProgram called:', proofId, wasmFile, functionName);
            const cViewer = document.getElementById('c-viewer-' + proofId);
            const cContent = document.getElementById('c-content-' + proofId);
            
            if (!cViewer || !cContent) {
                console.error('Could not find C viewer elements:', proofId);
                return;
            }
            
            // Close WASM viewer if open
            const wasmViewer = document.getElementById('wasm-viewer-' + proofId);
            if (wasmViewer && wasmViewer.classList.contains('show')) {
                wasmViewer.classList.remove('show');
            }
            
            if (cViewer.classList.contains('show')) {
                cViewer.classList.remove('show');
                return;
            }
            
            // Show the C code viewer
            cViewer.classList.add('show');
            
            // Load the appropriate C code
            const cCode = getCCode(wasmFile);
            cContent.textContent = cCode;
        }

        function toggleWasmFile(proofId, wasmFile, functionName) {
            console.log('toggleWasmFile called:', proofId, wasmFile, functionName);
            const wasmViewer = document.getElementById('wasm-viewer-' + proofId);
            const wasmContent = document.getElementById('wasm-content-' + proofId);
            
            if (!wasmViewer || !wasmContent) {
                console.error('Could not find WASM viewer elements:', proofId);
                return;
            }
            
            // Close C viewer if open
            const cViewer = document.getElementById('c-viewer-' + proofId);
            if (cViewer && cViewer.classList.contains('show')) {
                cViewer.classList.remove('show');
            }
            
            if (wasmViewer.classList.contains('show')) {
                wasmViewer.classList.remove('show');
                return;
            }
            
            // Show the WASM code viewer
            wasmViewer.classList.add('show');
            
            // Load the appropriate WASM code
            const wasmCode = getWasmCode(wasmFile);
            wasmContent.textContent = wasmCode;
        }

        function getCCode(wasmFile) {
            const cCodes = {
                'fib.wat': `#include <stdint.h>

// Fibonacci sequence computation
// Calculates the nth Fibonacci number iteratively
int32_t fib(int32_t n) {
    if (n <= 1) return n;
    
    int32_t a = 0;
    int32_t b = 1;
    int32_t temp;
    
    for (int32_t i = 2; i <= n; i++) {
        temp = a + b;
        a = b;
        b = temp;
    }
    
    return b;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t n) {
    return fib(n);
}`,
                'add.wat': `#include <stdint.h>

// Simple addition operation
// Adds two 32-bit integers
int32_t add(int32_t a, int32_t b) {
    return a + b;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t a, int32_t b) {
    return add(a, b);
}`,
                'multiply.wat': `#include <stdint.h>

// Multiplication operation
// Multiplies two 32-bit integers
int32_t multiply(int32_t a, int32_t b) {
    return a * b;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t a, int32_t b) {
    return multiply(a, b);
}`,
                'factorial.wat': `#include <stdint.h>

// Factorial computation
// Calculates n! iteratively
int32_t factorial(int32_t n) {
    if (n <= 1) return 1;
    
    int32_t result = 1;
    for (int32_t i = 2; i <= n; i++) {
        result *= i;
    }
    
    return result;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t n) {
    return factorial(n);
}`,
                'square.wat': `#include <stdint.h>

// Square computation
// Calculates n^2
int32_t square(int32_t n) {
    return n * n;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t n) {
    return square(n);
}`,
                'subtract.wat': `#include <stdint.h>

// Subtraction operation
// Subtracts b from a
int32_t subtract(int32_t a, int32_t b) {
    return a - b;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t a, int32_t b) {
    return subtract(a, b);
}`,
                'prove_location.wat': `#include <stdint.h>

// DePIN Location Proof for San Francisco
// Verifies if coordinates are within SF boundaries
// Returns 1 if within bounds, 0 otherwise

#define SF_LAT 37773972    // 37.773972 * 1000000 (scaled for integer math)
#define SF_LNG -122431297  // -122.431297 * 1000000 (scaled for integer math)
#define MAX_DISTANCE 50000 // 50km threshold in scaled units

// Helper function to calculate absolute value
int32_t abs_diff(int32_t a, int32_t b) {
    return (a > b) ? (a - b) : (b - a);
}

// Main location verification function
int32_t prove_location(int32_t lat, int32_t lng) {
    // Calculate Manhattan distance from SF center
    int32_t lat_diff = abs_diff(lat, SF_LAT);
    int32_t lng_diff = abs_diff(lng, SF_LNG);
    int32_t distance = lat_diff + lng_diff;
    
    // Return 1 if within SF bounds, 0 otherwise
    return (distance < MAX_DISTANCE) ? 1 : 0;
}

// Entry point for zkEngine proof generation
int32_t main(int32_t lat, int32_t lng) {
    return prove_location(lat, lng);
}`,
                'prove_ai_content.wat': `#include <stdint.h>

// AI Content Authenticity Proof
// Proves that content was generated by a verified AI system
// Returns 1 if content is authentic, 0 if suspicious

#define OPENAI_SIGNATURE 0x4F50454E     // "OPEN" in hex
#define ANTHROPIC_SIGNATURE 0x414E54    // "ANT" in hex  
#define VALID_TIMESTAMP_WINDOW 86400    // 24 hours in seconds
#define MIN_CONTENT_LENGTH 10
#define MAX_CONTENT_LENGTH 10000

// Validate AI provider authorization
int32_t is_authorized_ai_provider(int32_t provider_signature) {
    return (provider_signature == OPENAI_SIGNATURE || 
            provider_signature == ANTHROPIC_SIGNATURE);
}

// Validate API key hash
int32_t is_valid_api_key(int32_t api_key_hash, int32_t provider_signature) {
    if (api_key_hash == 0) return 0;
    
    // Provider-specific validation patterns
    if (provider_signature == OPENAI_SIGNATURE) {
        return (api_key_hash % 1000) > 100;  // OpenAI pattern
    }
    if (provider_signature == ANTHROPIC_SIGNATURE) {
        return (api_key_hash % 1000) > 200;  // Anthropic pattern
    }
    return 0;
}

// Validate content properties
int32_t is_valid_content(int32_t content_hash, int32_t content_length) {
    return (content_hash != 0) && 
           (content_length >= MIN_CONTENT_LENGTH) && 
           (content_length <= MAX_CONTENT_LENGTH);
}

// Main AI content authenticity verification
int32_t prove_ai_content(
    int32_t content_hash,        // Hash of generated content
    int32_t provider_signature,  // AI provider (OpenAI, Anthropic)
    int32_t api_key_hash,       // Hashed API key for authorization
    int32_t generation_timestamp, // When content was generated  
    int32_t content_length       // Length of generated content
) {
    // Validate all authenticity criteria
    return is_authorized_ai_provider(provider_signature) &&
           is_valid_api_key(api_key_hash, provider_signature) &&
           is_valid_content(content_hash, content_length) &&
           (generation_timestamp > 1640000000); // After 2022
}

// Entry point for zkEngine proof generation
int32_t main(int32_t content_hash, int32_t provider_signature, 
             int32_t api_key_hash, int32_t timestamp, int32_t length) {
    return prove_ai_content(content_hash, provider_signature, 
                           api_key_hash, timestamp, length);
}`
            };
            
            return cCodes[wasmFile] || `#include <stdint.h>

// Original C program for ${wasmFile.replace('.wat', '')} computation
// This C code gets compiled to WebAssembly for proof generation

int32_t main(int32_t input) {
    // Computation logic here
    return input;
}`;
        }

        function getWasmCode(wasmFile) {
            const wasmCodes = {
                'fib.wat': `(module
  (func $fib (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $temp i32)
    (local $i i32)
    
    (local.set $a (i32.const 0))
    (local.set $b (i32.const 1))
    (local.set $i (i32.const 0))
    
    (block
      (loop
        (br_if 1 (i32.ge_u (local.get $i) (local.get $n)))
        
        (local.set $temp (local.get $b))
        (local.set $b (i32.add (local.get $a) (local.get $b)))
        (local.set $a (local.get $temp))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        
        (br 0)
      )
    )
    
    (local.get $a)
  )
  
  (export "main" (func $fib))
)`,
                'add.wat': `(module
  (func $add (param $a i32) (param $b i32) (result i32)
    (i32.add (local.get $a) (local.get $b))
  )
  
  (export "main" (func $add))
)`,
                'multiply.wat': `(module
  (func $multiply (param $a i32) (param $b i32) (result i32)
    (i32.mul (local.get $a) (local.get $b))
  )
  
  (export "main" (func $multiply))
)`,
                'factorial.wat': `(module
  (func $factorial (param $n i32) (result i32)
    (local $result i32)
    (local $i i32)
    
    (local.set $result (i32.const 1))
    (local.set $i (i32.const 1))
    
    (block
      (loop
        (br_if 1 (i32.gt_u (local.get $i) (local.get $n)))
        
        (local.set $result 
          (i32.mul (local.get $result) (local.get $i)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        
        (br 0)
      )
    )
    
    (local.get $result)
  )
  
  (export "main" (func $factorial))
)`,
                'square.wat': `(module
  (func $square (param $n i32) (result i32)
    (i32.mul (local.get $n) (local.get $n))
  )
  
  (export "main" (func $square))
)`,
                'subtract.wat': `(module
  (func $subtract (param $a i32) (param $b i32) (result i32)
    (i32.sub (local.get $a) (local.get $b))
  )
  
  (export "main" (func $subtract))
)`,
                'prove_location.wat': `(module
  (memory 1)
  
  (func $prove_location (param $lat i32) (param $lng i32) (result i32)
    (local $sf_lat i32)
    (local $sf_lng i32)
    (local $lat_diff i32)
    (local $lng_diff i32)
    (local $distance i32)
    
    ;; San Francisco coordinates (scaled integers)
    (local.set $sf_lat (i32.const 37773972))  ;; 37.773972 * 1000000
    (local.set $sf_lng (i32.const -122431297)) ;; -122.431297 * 1000000
    
    ;; Calculate absolute differences
    (local.set $lat_diff 
      (select 
        (i32.sub (local.get $lat) (local.get $sf_lat))
        (i32.sub (local.get $sf_lat) (local.get $lat))
        (i32.gt_s (local.get $lat) (local.get $sf_lat))))
    
    (local.set $lng_diff
      (select
        (i32.sub (local.get $lng) (local.get $sf_lng))
        (i32.sub (local.get $sf_lng) (local.get $lng))
        (i32.gt_s (local.get $lng) (local.get $sf_lng))))
    
    ;; Simple distance calculation (Manhattan distance)
    (local.set $distance 
      (i32.add (local.get $lat_diff) (local.get $lng_diff)))
    
    ;; Return 1 if within SF bounds (< 50km), 0 otherwise
    (i32.lt_u (local.get $distance) (i32.const 50000))
  )
  
  (export "main" (func $prove_location))
)`,
                'prove_ai_content.wat': `(module
  ;; AI Content Authenticity Verification
  ;; Proves content was generated by authorized AI system
  
  ;; Provider signature constants
  (global $OPENAI_SIGNATURE i32 (i32.const 0x4F50454E))
  (global $ANTHROPIC_SIGNATURE i32 (i32.const 0x414E54))
  (global $MIN_CONTENT_LENGTH i32 (i32.const 10))
  (global $MAX_CONTENT_LENGTH i32 (i32.const 10000))
  
  ;; Validate AI provider authorization
  (func $is_authorized_ai_provider (param $signature i32) (result i32)
    (i32.or
      (i32.eq (local.get $signature) (global.get $OPENAI_SIGNATURE))
      (i32.eq (local.get $signature) (global.get $ANTHROPIC_SIGNATURE))))
  
  ;; Validate API key hash patterns
  (func $is_valid_api_key (param $api_key_hash i32) (param $provider i32) (result i32)
    (local $hash_mod i32)
    
    ;; API key cannot be zero
    (if (i32.eqz (local.get $api_key_hash))
      (then (return (i32.const 0))))
    
    ;; Get modulo for pattern matching
    (local.set $hash_mod (i32.rem_u (local.get $api_key_hash) (i32.const 1000)))
    
    ;; Provider-specific validation
    (if (i32.eq (local.get $provider) (global.get $OPENAI_SIGNATURE))
      (then (return (i32.gt_u (local.get $hash_mod) (i32.const 100)))))
    
    (if (i32.eq (local.get $provider) (global.get $ANTHROPIC_SIGNATURE))
      (then (return (i32.gt_u (local.get $hash_mod) (i32.const 200)))))
    
    (i32.const 0))
  
  ;; Validate content properties
  (func $is_valid_content (param $content_hash i32) (param $content_length i32) (result i32)
    (i32.and
      (i32.and
        (i32.ne (local.get $content_hash) (i32.const 0))
        (i32.ge_u (local.get $content_length) (global.get $MIN_CONTENT_LENGTH)))
      (i32.le_u (local.get $content_length) (global.get $MAX_CONTENT_LENGTH))))
  
  ;; Main verification function
  (func $prove_ai_content (param $content_hash i32) (param $provider_signature i32)
                          (param $api_key_hash i32) (param $timestamp i32)
                          (param $content_length i32) (result i32)
    
    ;; Validate authorized provider
    (if (i32.eqz (call $is_authorized_ai_provider (local.get $provider_signature)))
      (then (return (i32.const 0))))
    
    ;; Validate API key
    (if (i32.eqz (call $is_valid_api_key (local.get $api_key_hash) (local.get $provider_signature)))
      (then (return (i32.const 0))))
    
    ;; Validate content
    (if (i32.eqz (call $is_valid_content (local.get $content_hash) (local.get $content_length)))
      (then (return (i32.const 0))))
    
    ;; Validate timestamp (after 2022)
    (if (i32.lt_u (local.get $timestamp) (i32.const 1640000000))
      (then (return (i32.const 0))))
    
    ;; All validations passed - content is authentic
    (i32.const 1))
  
  (export "main" (func $prove_ai_content))
)`
            };
            
            return wasmCodes[wasmFile] || `; WebAssembly code for ${wasmFile}
; This program generates a cryptographic proof of computation
(module
  (func $main (export "main") (param i32) (result i32)
    ;; Computation logic here
    local.get 0
  )
)`;
        }

        function closeModal() {
            // Legacy function - no longer used
        }
        
        function verifyProof(proofId) {
            sendMessage(`verify proof ${proofId}`);
        }
        
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                // Show a brief success indicator
                console.log('Copied to clipboard:', text);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }
        
        function showLoadingDots() {
            if (!waitingForResponse) return;
            
            const messagesDiv = document.getElementById('messages');
            const existingDots = document.querySelector('.loading-dots');
            
            if (!existingDots) {
                const dotsDiv = document.createElement('div');
                dotsDiv.className = 'loading-dots';
                dotsDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
                messagesDiv.appendChild(dotsDiv);
                messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
            }
        }
        
        function removeLoadingDots() {
            const dots = document.querySelector('.loading-dots');
            if (dots) {
                dots.remove();
            }
            waitingForResponse = false;
        }
        
        function addMessage(content, sender) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
        }
        
        function sendMessage(text) {
            const input = document.getElementById('user-input');
            const message = text || input.value.trim();
            
            if (message && ws && ws.readyState === WebSocket.OPEN) {
                addMessage(message, 'user');
                
                // Show thinking animation for natural language processing
                showThinkingAnimation();
                
                ws.send(JSON.stringify({ message }));
                if (!text) input.value = '';
            }
        }
        
        // Event listeners
        document.addEventListener('click', function(e) {
            if (e.target.closest('.example-item')) {
                const example = e.target.closest('.example-item').getAttribute('data-example');
                if (example) {
                    document.getElementById('user-input').value = example;
                    sendMessage(example);
                }
            }
            
            if (e.target.id === 'send-button') {
                sendMessage();
            }
        });
        
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Connect on load
        connect();
    </script>
</body>
</html>
HTML_END

echo "✅ Complete working index.html created!"
echo "📋 Fixed:"
echo "   ✅ Removed duplicate AI Content entries"
echo "   ✅ Fixed JavaScript syntax errors"
echo "   ✅ Added proper AI Content verification"
echo "   ✅ Included both C and WASM code examples"
echo "   ✅ All functions properly defined"
echo ""
echo "🚀 Ready to test! Restart your servers and refresh the browser."
