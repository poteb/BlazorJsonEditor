// blazor-json-editor.js — ES module for BlazorJsonEditor component

const editors = new Map();

/**
 * Initialize the editor: attach event handlers for auto-close, tab, scroll sync.
 * @param {DotNetObjectReference} dotNetRef - Blazor component reference for callbacks
 * @param {string} editorId - unique ID of the editor container
 * @param {object} options - editor options from C#
 */
export function initEditor(dotNetRef, editorId, options) {
    const container = document.getElementById(editorId);
    if (!container) return;

    const textarea = container.querySelector('.bje-textarea');
    const highlight = container.querySelector('.bje-highlight-overlay code');
    const lineNumbers = container.querySelector('.bje-line-numbers');

    if (!textarea) return;

    const state = { dotNetRef, options, textarea, highlight, lineNumbers, container };
    editors.set(editorId, state);

    // Auto-close brackets
    textarea.addEventListener('keydown', (e) => handleKeyDown(e, state));

    // Sync highlighting on input
    textarea.addEventListener('input', () => {
        syncHighlight(state);
        syncLineNumbers(state);
        notifyValueChanged(state);
    });

    // Sync scroll positions
    textarea.addEventListener('scroll', () => syncScroll(state));

    // Initial sync
    syncHighlight(state);
    syncLineNumbers(state);
}

/**
 * Handle keydown events for auto-close brackets, tab indentation, and enter auto-indent.
 */
function handleKeyDown(e, state) {
    const { textarea, options } = state;

    if (options.readOnly) return;

    const pairs = { '{': '}', '[': ']', '"': '"' };
    const closers = new Set(['}', ']', '"']);
    const indent = ' '.repeat(options.tabSize || 2);

    // Tab / Shift+Tab
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        if (e.shiftKey) {
            // Dedent current line
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            const linePrefix = val.substring(lineStart, start);
            const spaces = indent.length;
            if (linePrefix.startsWith(indent)) {
                textarea.value = val.substring(0, lineStart) + val.substring(lineStart + spaces);
                textarea.selectionStart = textarea.selectionEnd = start - spaces;
            }
        } else {
            // Insert indent
            textarea.value = val.substring(0, start) + indent + val.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        }
        fireInputEvent(textarea);
        return;
    }

    // Auto-close brackets
    if (options.autoCloseBrackets && pairs[e.key]) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        // For quotes, skip if we're closing an existing quote
        if (e.key === '"' && val[start] === '"') {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            return;
        }

        e.preventDefault();
        const open = e.key;
        const close = pairs[e.key];
        const selected = val.substring(start, end);
        textarea.value = val.substring(0, start) + open + selected + close + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + selected.length;

        // If wrapping selected text, position after closing bracket
        if (selected.length > 0) {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = start + 1 + selected.length;
        }

        fireInputEvent(textarea);
        return;
    }

    // Skip over closing bracket if next char matches
    if (options.autoCloseBrackets && closers.has(e.key)) {
        const start = textarea.selectionStart;
        const val = textarea.value;
        if (val[start] === e.key) {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            return;
        }
    }

    // Enter: auto-indent
    if (e.key === 'Enter') {
        const start = textarea.selectionStart;
        const val = textarea.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const currentLine = val.substring(lineStart, start);
        const currentIndent = currentLine.match(/^\s*/)[0];

        const charBefore = val[start - 1];
        const charAfter = val[start];

        // If between { } or [ ], add extra indent and closing line
        if ((charBefore === '{' && charAfter === '}') || (charBefore === '[' && charAfter === ']')) {
            e.preventDefault();
            const newIndent = currentIndent + indent;
            const insertion = '\n' + newIndent + '\n' + currentIndent;
            textarea.value = val.substring(0, start) + insertion + val.substring(start);
            textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
            fireInputEvent(textarea);
            return;
        }

        // Regular enter: maintain indent, add extra if line ends with { or [
        if (charBefore === '{' || charBefore === '[' || charBefore === ',') {
            e.preventDefault();
            const extra = (charBefore === '{' || charBefore === '[') ? indent : '';
            const newIndent = currentIndent + extra;
            textarea.value = val.substring(0, start) + '\n' + newIndent + val.substring(start);
            textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
            fireInputEvent(textarea);
            return;
        }
    }

    // Backspace: remove matching pair if cursor is between empty brackets
    if (e.key === 'Backspace' && options.autoCloseBrackets) {
        const start = textarea.selectionStart;
        const val = textarea.value;
        const before = val[start - 1];
        const after = val[start];
        const matchingPairs = { '{': '}', '[': ']', '"': '"' };
        if (before && matchingPairs[before] === after) {
            e.preventDefault();
            textarea.value = val.substring(0, start - 1) + val.substring(start + 1);
            textarea.selectionStart = textarea.selectionEnd = start - 1;
            fireInputEvent(textarea);
        }
    }
}

function fireInputEvent(textarea) {
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Tokenize JSON and produce syntax-highlighted HTML.
 */
export function getHighlightedHtml(json, enableRefLinks) {
    if (!json) return '';

    // Escape HTML first
    const escaped = escapeHtml(json);

    // Tokenize and highlight
    let html = escaped
        // Strings (keys and values) - must come first
        .replace(/(&quot;)((?:[^&]|&(?!quot;))*)(&quot;)/g, (match, open, content, close, offset, str) => {
            // Check if this is a key (followed by a colon)
            const after = str.substring(offset + match.length).trimStart();
            const isKey = after.startsWith(':');

            // Check if this is a $ref value
            const refMatch = content.match(/^\$ref:([^#]+)#(.+)$/);
            if (refMatch && enableRefLinks) {
                const file = refMatch[1];
                const element = refMatch[2];
                const raw = `$ref:${file}#${element}`;
                return `<span class="bje-string">${open}<a class="bje-ref-link" data-ref-file="${escapeAttr(file)}" data-ref-element="${escapeAttr(element)}" data-ref-raw="${escapeAttr(raw)}" title="Go to ${raw}">${content}</a>${close}</span>`;
            }

            const cls = isKey ? 'bje-key' : 'bje-string';
            return `<span class="${cls}">${open}${content}${close}</span>`;
        })
        // Numbers
        .replace(/\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, '<span class="bje-number">$1</span>')
        // Booleans
        .replace(/\b(true|false)\b/g, '<span class="bje-boolean">$1</span>')
        // Null
        .replace(/\bnull\b/g, '<span class="bje-null">null</span>');

    return html;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Sync the highlight overlay with the textarea content.
 */
function syncHighlight(state) {
    const { textarea, highlight, options } = state;
    if (!highlight) return;

    const html = getHighlightedHtml(textarea.value, options.enableRefLinks);
    // Add trailing newline so the overlay height matches textarea
    highlight.innerHTML = html + '\n';
}

/**
 * Sync line numbers with the textarea content.
 */
function syncLineNumbers(state) {
    const { textarea, lineNumbers, options } = state;
    if (!lineNumbers || !options.showLineNumbers) return;

    const lines = textarea.value.split('\n');
    lineNumbers.innerHTML = lines.map((_, i) =>
        `<div class="bje-line-number">${i + 1}</div>`
    ).join('');
}

/**
 * Sync scroll position between textarea and overlay/line numbers.
 */
function syncScroll(state) {
    const { textarea, highlight, lineNumbers } = state;
    if (highlight && highlight.parentElement) {
        highlight.parentElement.scrollTop = textarea.scrollTop;
        highlight.parentElement.scrollLeft = textarea.scrollLeft;
    }
    if (lineNumbers) {
        lineNumbers.scrollTop = textarea.scrollTop;
    }
}

/**
 * Notify the Blazor component of value changes (debounced).
 */
let valueChangeTimers = new Map();
function notifyValueChanged(state) {
    const { dotNetRef, textarea, options } = state;
    const editorId = state.container.id;

    if (valueChangeTimers.has(editorId)) {
        clearTimeout(valueChangeTimers.get(editorId));
    }

    valueChangeTimers.set(editorId, setTimeout(() => {
        dotNetRef.invokeMethodAsync('OnJsValueChanged', textarea.value);
        valueChangeTimers.delete(editorId);
    }, 16)); // Near-immediate, actual validation debounce is in C#
}

/**
 * Format JSON with the given indent size.
 * Returns formatted JSON string or null if invalid.
 */
export function formatJson(json, indentSize) {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, indentSize || 2);
    } catch {
        return null;
    }
}

/**
 * Set the textarea value and sync the display.
 */
export function setValue(editorId, value) {
    const state = editors.get(editorId);
    if (!state) return;

    state.textarea.value = value;
    syncHighlight(state);
    syncLineNumbers(state);
}

/**
 * Get current textarea value.
 */
export function getValue(editorId) {
    const state = editors.get(editorId);
    return state ? state.textarea.value : '';
}

/**
 * Update editor options at runtime.
 */
export function updateOptions(editorId, options) {
    const state = editors.get(editorId);
    if (!state) return;
    state.options = options;
    syncHighlight(state);
    syncLineNumbers(state);
}

/**
 * Clean up event listeners and state for an editor.
 */
export function destroy(editorId) {
    const state = editors.get(editorId);
    if (!state) return;

    if (valueChangeTimers.has(editorId)) {
        clearTimeout(valueChangeTimers.get(editorId));
        valueChangeTimers.delete(editorId);
    }

    editors.delete(editorId);
}

/**
 * Set up click delegation for $ref links on the editor container.
 */
export function initRefClickHandler(dotNetRef, editorId) {
    const container = document.getElementById(editorId);
    if (!container) return;

    container.addEventListener('click', (e) => {
        const link = e.target.closest('.bje-ref-link');
        if (link) {
            e.preventDefault();
            const file = link.dataset.refFile;
            const element = link.dataset.refElement;
            const raw = link.dataset.refRaw;
            dotNetRef.invokeMethodAsync('OnJsRefClicked', file, element, raw);
        }
    });
}
