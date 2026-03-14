namespace BlazorJsonEditor.Models;

/// <summary>
/// Represents a parsed $ref reference found in JSON content.
/// Expected format: "$ref:FileName#ElementPath"
/// </summary>
public class JsonRef
{
    /// <summary>The file being referenced (e.g. "schemas/user").</summary>
    public string File { get; set; } = string.Empty;

    /// <summary>The element/path within the file (e.g. "definitions/Address").</summary>
    public string Element { get; set; } = string.Empty;

    /// <summary>The raw $ref value string as it appears in the JSON.</summary>
    public string RawValue { get; set; } = string.Empty;

    /// <summary>Line number where this $ref appears (1-based).</summary>
    public int Line { get; set; }

    /// <summary>Column offset where this $ref value starts (0-based).</summary>
    public int Column { get; set; }

    /// <summary>Whether the ref was clicked with Ctrl+Shift, indicating it should open in a new tab.</summary>
    public bool OpenInNewTab { get; set; }
}
