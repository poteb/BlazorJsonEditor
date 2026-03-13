namespace BlazorJsonEditor.Models;

/// <summary>
/// Represents a JSON validation or parse error detected in the editor content.
/// </summary>
public class JsonValidationError
{
    /// <summary>Human-readable error message.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Line number where the error was detected (1-based, 0 if unknown).</summary>
    public int Line { get; set; }

    /// <summary>Column position where the error was detected (0-based, 0 if unknown).</summary>
    public int Column { get; set; }
}
