// Utility functions

export function debugLog(message, type = 'info', isDebugMode = true) {
    try {
        if (!isDebugMode) return;
        
        const debugMessages = document.getElementById('debug-messages');
        if (!debugMessages) return;
        
        const timestamp = new Date().toTimeString().split(' ')[0];
        const msgElement = document.createElement('div');
        msgElement.className = `debug-message debug-${type}`;
        msgElement.textContent = `[${timestamp}] ${message}`;
        debugMessages.appendChild(msgElement);
        debugMessages.scrollTop = debugMessages.scrollHeight;
    } catch (e) {
        console.error('Debug log error:', e);
    }
}

export function formatProofSize(sizeStr) {
    // If it's a number, treat it as bytes
    if (typeof sizeStr === 'number') {
        let size = sizeStr / (1024 * 1024); // Convert bytes to MB
        if (size < 0.01) {
            return (sizeStr / 1024).toFixed(2) + ' KB';
        } else if (size < 1000) {
            return size.toFixed(2) + ' MB';
        } else {
            return (size / 1024).toFixed(2) + ' GB';
        }
    }
    
    // Ensure sizeStr is a string
    if (typeof sizeStr !== 'string') {
        sizeStr = String(sizeStr);
    }
    
    // Extract numeric value from string like "13.2 KB" or "13200 bytes"
    const match = sizeStr.match(/([\d.]+)\s*(\w+)/);
    if (!match) {
        // If no unit found, assume it's bytes
        const bytes = parseFloat(sizeStr);
        if (!isNaN(bytes)) {
            let size = bytes / (1024 * 1024); // Convert to MB
            if (size < 0.01) {
                return (bytes / 1024).toFixed(2) + ' KB';
            } else if (size < 1000) {
                return size.toFixed(2) + ' MB';
            } else {
                return (size / 1024).toFixed(2) + ' GB';
            }
        }
        return sizeStr;
    }
    
    let size = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    // Convert to MB
    if (unit === 'bytes' || unit === 'b') {
        size = size / (1024 * 1024);
    } else if (unit === 'kb' || unit === 'kilobytes') {
        size = size / 1024;
    } else if (unit === 'mb' || unit === 'megabytes') {
        // Already in MB
    } else if (unit === 'gb' || unit === 'gigabytes') {
        size = size * 1024;
    }
    
    // Format with appropriate precision
    if (size < 0.01) {
        return (size * 1024).toFixed(2) + ' KB';
    } else {
        return size.toFixed(2) + ' MB';
    }
}

export function getStepIcon(step) {
    switch(step.type) {
        case 'proof_generation':
        case 'generate_proof':
        case 'kyc_proof':
            return '🔐';
        case 'verification':
        case 'verify_proof':
        case 'kyc_verification':
            return '✓';
        case 'transfer':
        case 'payment':
            return '💸';
        case 'error':
            return '❌';
        case 'success':
            return '✅';
        default:
            return '•';
    }
}

export function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pending';
        case 'executing': return 'Processing';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        case 'skipped': return 'Skipped';
        default: return status;
    }
}

export function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
}

export function formatTimestamp(timestamp) {
    try {
        if (typeof timestamp === 'number') {
            // Unix timestamp
            return new Date(timestamp * 1000).toLocaleString();
        } else if (typeof timestamp === 'string') {
            // ISO string
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return date.toLocaleString();
            }
        }
    } catch (e) {
        console.error('Error parsing timestamp:', e);
    }
    return 'N/A';
}

export function createExplorerLink(transferData) {
    if (!transferData || !transferData.blockchainTxHash) {
        return '';
    }

    let explorerUrl = '';
    const txHash = transferData.blockchainTxHash;
    const blockchain = transferData.blockchain?.toLowerCase() || 'ethereum';

    if (blockchain === 'ethereum' || blockchain === 'eth') {
        explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    } else if (blockchain === 'solana' || blockchain === 'sol') {
        explorerUrl = `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    }

    if (explorerUrl) {
        return `<a href="${explorerUrl}" target="_blank" class="explorer-link">
            View on Explorer →
        </a>`;
    }

    return '';
}