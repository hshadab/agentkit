// CodeDisplay Component - SES-safe modular component
// Displays and highlights C, WASM, Circom code with line numbers

window.CodeDisplay = (function() {
    'use strict';
    
    // Language configurations
    const LANGUAGES = {
        'c': {
            name: 'C',
            icon: '🔧',
            fileExtension: '.c',
            keywords: ['int', 'void', 'return', 'if', 'else', 'while', 'for', 'struct', 'typedef', 'const', 'static'],
            highlightClass: 'language-c'
        },
        'wasm': {
            name: 'WebAssembly',
            icon: '⚡',
            fileExtension: '.wasm',
            keywords: ['module', 'func', 'param', 'result', 'local', 'get', 'set', 'call', 'return'],
            highlightClass: 'language-wasm'
        },
        'wat': {
            name: 'WebAssembly Text',
            icon: '📝',
            fileExtension: '.wat',
            keywords: ['module', 'func', 'param', 'result', 'local', 'get', 'set', 'call', 'return'],
            highlightClass: 'language-wasm'
        },
        'circom': {
            name: 'Circom',
            icon: '🔐',
            fileExtension: '.circom',
            keywords: ['template', 'signal', 'input', 'output', 'private', 'component', 'var', 'for', 'if'],
            highlightClass: 'language-rust'  // Use rust highlighting as fallback
        },
        'json': {
            name: 'JSON',
            icon: '📋',
            fileExtension: '.json',
            keywords: [],
            highlightClass: 'language-json'
        }
    };
    
    // Code display modes
    const DISPLAY_MODES = {
        FULL: 'full',
        COMPACT: 'compact',
        DIFF: 'diff',
        SPLIT: 'split'
    };
    
    // Create code display HTML
    function create(codeData) {
        const language = codeData.language || 'c';
        const langConfig = LANGUAGES[language];
        const displayId = 'code-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const mode = codeData.mode || DISPLAY_MODES.FULL;
        
        const html = `
            <div class="code-display" id="${displayId}" data-language="${language}" data-mode="${mode}">
                <div class="code-header">
                    <div class="code-title-row">
                        <span class="code-icon">${langConfig.icon}</span>
                        <span class="code-title">${codeData.title || langConfig.name + ' Code'}</span>
                        ${codeData.filename ? `<span class="code-filename">${codeData.filename}</span>` : ''}
                    </div>
                    <div class="code-actions">
                        ${renderCodeActions(codeData, language)}
                    </div>
                </div>
                
                ${mode === DISPLAY_MODES.SPLIT ? 
                    renderSplitView(codeData) : 
                    renderSingleView(codeData, language, mode)
                }
                
                ${codeData.showStats ? renderCodeStats(codeData) : ''}
            </div>
        `;
        
        return { html, displayId };
    }
    
    // Render single code view
    function renderSingleView(data, language, mode) {
        const lines = (data.code || '').split('\n');
        const startLine = data.startLine || 1;
        
        return `
            <div class="code-container ${mode}">
                <div class="code-wrapper">
                    <div class="line-numbers">
                        ${lines.map((_, i) => `<span>${startLine + i}</span>`).join('')}
                    </div>
                    <pre class="code-content"><code class="${LANGUAGES[language].highlightClass}">${escapeHtml(data.code || '')}</code></pre>
                </div>
                ${data.highlights ? renderHighlights(data.highlights) : ''}
            </div>
        `;
    }
    
    // Render split view for before/after comparison
    function renderSplitView(data) {
        return `
            <div class="code-split-container">
                <div class="split-pane left">
                    <div class="split-header">Before</div>
                    ${renderSingleView({ code: data.before }, data.beforeLanguage || 'c', DISPLAY_MODES.COMPACT)}
                </div>
                <div class="split-pane right">
                    <div class="split-header">After</div>
                    ${renderSingleView({ code: data.after }, data.afterLanguage || 'wasm', DISPLAY_MODES.COMPACT)}
                </div>
            </div>
        `;
    }
    
    // Render code highlights/annotations
    function renderHighlights(highlights) {
        return `
            <div class="code-highlights">
                ${highlights.map(h => `
                    <div class="highlight-marker" style="top: ${h.line * 20}px" title="${h.message}">
                        <span class="highlight-icon">${h.type === 'error' ? '❌' : h.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Render code statistics
    function renderCodeStats(data) {
        return `
            <div class="code-stats">
                ${data.lines ? `<div class="stat">Lines: ${data.lines}</div>` : ''}
                ${data.size ? `<div class="stat">Size: ${formatBytes(data.size)}</div>` : ''}
                ${data.complexity ? `<div class="stat">Complexity: ${data.complexity}</div>` : ''}
                ${data.compilationTime ? `<div class="stat">Compilation: ${data.compilationTime}ms</div>` : ''}
            </div>
        `;
    }
    
    // Render code action buttons
    function renderCodeActions(data, language) {
        const actions = [];
        
        actions.push(`<button class="code-action-btn copy" onclick="CodeDisplay.copyCode('${data.id || ''}')">Copy</button>`);
        
        if (data.canDownload) {
            actions.push(`<button class="code-action-btn download" onclick="CodeDisplay.download('${data.id || ''}', '${language}')">Download</button>`);
        }
        
        if (language === 'c' && data.canCompile) {
            actions.push(`<button class="code-action-btn compile" onclick="CodeDisplay.compile('${data.id || ''}')">Compile to WASM</button>`);
        }
        
        if (language === 'circom' && data.canGenerateProof) {
            actions.push(`<button class="code-action-btn generate" onclick="CodeDisplay.generateProof('${data.id || ''}')">Generate Proof</button>`);
        }
        
        if (data.canFormat) {
            actions.push(`<button class="code-action-btn format" onclick="CodeDisplay.format('${data.id || ''}', '${language}')">Format</button>`);
        }
        
        return actions.join('');
    }
    
    // Update existing code display
    function update(displayId, newData) {
        const display = document.getElementById(displayId);
        if (!display) return;
        
        const language = display.dataset.language;
        const mode = display.dataset.mode;
        
        // Update code content
        if (newData.code) {
            const codeContent = display.querySelector('.code-content');
            if (codeContent) {
                codeContent.innerHTML = `<code class="${LANGUAGES[language].highlightClass}">${escapeHtml(newData.code)}</code>`;
                
                // Update line numbers
                const lineNumbers = display.querySelector('.line-numbers');
                if (lineNumbers) {
                    const lines = newData.code.split('\n');
                    const startLine = newData.startLine || 1;
                    lineNumbers.innerHTML = lines.map((_, i) => `<span>${startLine + i}</span>`).join('');
                }
            }
        }
        
        // Update stats if present
        if (newData.showStats) {
            let statsDiv = display.querySelector('.code-stats');
            if (!statsDiv) {
                statsDiv = document.createElement('div');
                statsDiv.className = 'code-stats';
                display.appendChild(statsDiv);
            }
            statsDiv.innerHTML = renderCodeStats(newData).match(/<div class="code-stats">(.*?)<\/div>/s)[1];
        }
    }
    
    // Add highlight to specific line
    function addHighlight(displayId, lineNumber, type, message) {
        const display = document.getElementById(displayId);
        if (!display) return;
        
        let highlightsDiv = display.querySelector('.code-highlights');
        if (!highlightsDiv) {
            const container = display.querySelector('.code-container');
            highlightsDiv = document.createElement('div');
            highlightsDiv.className = 'code-highlights';
            container.appendChild(highlightsDiv);
        }
        
        const marker = document.createElement('div');
        marker.className = 'highlight-marker';
        marker.style.top = (lineNumber - 1) * 20 + 'px';
        marker.title = message;
        marker.innerHTML = `<span class="highlight-icon">${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>`;
        highlightsDiv.appendChild(marker);
    }
    
    // Helper functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    
    // Action handlers
    function copyCode(codeId) {
        const display = document.querySelector(`[data-code-id="${codeId}"]`);
        if (display) {
            const code = display.querySelector('.code-content').textContent;
            navigator.clipboard.writeText(code).then(() => {
                console.log('Code copied to clipboard');
            });
        }
    }
    
    function download(codeId, language) {
        const display = document.querySelector(`[data-code-id="${codeId}"]`);
        if (display) {
            const code = display.querySelector('.code-content').textContent;
            const langConfig = LANGUAGES[language];
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code-${Date.now()}${langConfig.fileExtension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    function compile(codeId) {
        console.log('Compiling code:', codeId);
        window.dispatchEvent(new CustomEvent('compileCode', { detail: { codeId } }));
    }
    
    function generateProof(codeId) {
        console.log('Generating proof for code:', codeId);
        window.dispatchEvent(new CustomEvent('generateProofFromCode', { detail: { codeId } }));
    }
    
    function format(codeId, language) {
        console.log('Formatting code:', codeId, language);
        window.dispatchEvent(new CustomEvent('formatCode', { detail: { codeId, language } }));
    }
    
    // Public API
    return {
        create,
        update,
        addHighlight,
        copyCode,
        download,
        compile,
        generateProof,
        format,
        LANGUAGES,
        DISPLAY_MODES
    };
})();