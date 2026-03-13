namespace BlazorJsonEditor.Models;

/// <summary>
/// Configuration options for the JsonEditor component.
/// </summary>
public class JsonEditorOptions
{
    /// <summary>Whether to auto-close brackets, braces, and quotes when typed.</summary>
    public bool AutoCloseBrackets { get; set; } = true;

    /// <summary>Whether to enable syntax highlighting.</summary>
    public bool SyntaxHighlighting { get; set; } = true;

    /// <summary>Whether $ref values are rendered as clickable links.</summary>
    public bool EnableRefLinks { get; set; } = true;

    /// <summary>Whether to show line numbers in the gutter.</summary>
    public bool ShowLineNumbers { get; set; } = true;

    /// <summary>Number of spaces for indentation (used by auto-format).</summary>
    public int IndentSize { get; set; } = 2;

    /// <summary>Whether to validate JSON in real-time as the user types.</summary>
    public bool LiveValidation { get; set; } = true;

    /// <summary>Debounce delay in ms for live validation after typing stops.</summary>
    public int ValidationDebounceMs { get; set; } = 300;

    /// <summary>Tab size in the editor.</summary>
    public int TabSize { get; set; } = 2;

    /// <summary>Whether the editor is read-only.</summary>
    public bool ReadOnly { get; set; } = false;

    /// <summary>Additional CSS class to apply to the editor container.</summary>
    public string? CssClass { get; set; }

    /// <summary>Editor height as a CSS value (e.g. "400px", "100%").</summary>
    public string Height { get; set; } = "400px";
}
