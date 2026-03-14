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
                return `<span class="bje-string">${open}<a class="bje-ref-link" data-ref-file="${escapeAttr(file)}" data-ref-element="${escapeAttr(element)}" data-ref-raw="${escapeAttr(raw)}" title="Ctrl+Click to follow | Ctrl+Shift+Click to open in new tab: ${raw}">${content}</a>${close}</span>`;
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
 * Sanitize JSON string to tolerate trailing commas and comments,
 * matching the leniency of the C# System.Text.Json validator.
 */
function sanitizeJson(json) {
    // Remove single-line comments (// ...)
    // Remove multi-line comments (/* ... */)
    // Be careful not to strip inside strings.
    let result = '';
    let i = 0;
    let inString = false;

    while (i < json.length) {
        if (inString) {
            if (json[i] === '\\') {
                result += json[i] + (json[i + 1] || '');
                i += 2;
            } else if (json[i] === '"') {
                result += '"';
                inString = false;
                i++;
            } else {
                result += json[i];
                i++;
            }
        } else {
            if (json[i] === '"') {
                result += '"';
                inString = true;
                i++;
            } else if (json[i] === '/' && json[i + 1] === '/') {
                // Skip until end of line
                while (i < json.length && json[i] !== '\n') i++;
            } else if (json[i] === '/' && json[i + 1] === '*') {
                // Skip until */
                i += 2;
                while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) i++;
                i += 2;
            } else {
                result += json[i];
                i++;
            }
        }
    }

    // Remove trailing commas before } or ]
    result = result.replace(/,\s*([}\]])/g, '$1');

    return result;
}

/**
 * Format JSON with the given indent size.
 * Returns formatted JSON string or null if invalid.
 */
export function formatJson(json, indentSize) {
    try {
        const parsed = JSON.parse(sanitizeJson(json));
        return JSON.stringify(parsed, null, indentSize || 2);
    } catch {
        return null;
    }
}

/**
 * Format JSON directly in the editor textarea.
 * Reads current value, formats it, writes it back, and notifies .NET.
 * Returns the formatted string or null if invalid.
 */
export function formatEditor(editorId, indentSize) {
    const state = editors.get(editorId);
    if (!state) return null;

    try {
        const parsed = JSON.parse(sanitizeJson(state.textarea.value));
        const formatted = JSON.stringify(parsed, null, indentSize || 2);
        state.textarea.value = formatted;
        syncHighlight(state);
        syncLineNumbers(state);
        return formatted;
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
 * Set up Ctrl+Click handling for $ref links.
 *
 * The textarea (z-index 2) sits above the highlight overlay (z-index 1),
 * so normal clicks never reach the overlay's <a> elements. When the user
 * holds Ctrl/Cmd we add the 'bje-ctrl-held' class which CSS uses to swap
 * the stacking order, letting clicks land on the ref links.
 */
export function initRefClickHandler(dotNetRef, editorId) {
    const container = document.getElementById(editorId);
    if (!container) return;

    const overlay = container.querySelector('.bje-highlight-overlay');

    // Swap z-index while Ctrl/Cmd is held so overlay receives clicks
    function onKeyDown(e) {
        if ((e.key === 'Control' || e.key === 'Meta') && overlay) {
            container.classList.add('bje-ctrl-held');
        }
    }
    function onKeyUp(e) {
        if ((e.key === 'Control' || e.key === 'Meta') && overlay) {
            container.classList.remove('bje-ctrl-held');
        }
    }
    // Also remove on blur (user switches window while Ctrl is held)
    function onBlur() {
        container.classList.remove('bje-ctrl-held');
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Click handler on the overlay — only ref links matter
    container.addEventListener('click', (e) => {
        const link = e.target.closest('.bje-ref-link');
        if (link && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            const file = link.dataset.refFile;
            const element = link.dataset.refElement;
            const raw = link.dataset.refRaw;
            const openInNewTab = e.shiftKey;
            dotNetRef.invokeMethodAsync('OnJsRefClicked', file, element, raw, openInNewTab);
        }
    });
}
