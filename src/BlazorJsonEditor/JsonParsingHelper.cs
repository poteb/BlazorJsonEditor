using System.Text.Json;
using System.Text.RegularExpressions;
using pote.BlazorJsonEditor.Models;

namespace pote.BlazorJsonEditor;

/// <summary>
/// Static helpers for JSON validation and $ref parsing.
/// </summary>
public static partial class JsonParsingHelper
{
    [GeneratedRegex(@"""\$ref""\s*:\s*""([^""]+)""")]
    private static partial Regex RefPattern();

    /// <summary>
    /// Validate a JSON string and return any errors.
    /// </summary>
    public static List<JsonValidationError> Validate(string? json)
    {
        var errors = new List<JsonValidationError>();
        if (string.IsNullOrWhiteSpace(json)) return errors;

        try
        {
            using var doc = JsonDocument.Parse(json, new JsonDocumentOptions
            {
                AllowTrailingCommas = true,
                CommentHandling = JsonCommentHandling.Skip
            });
        }
        catch (JsonException ex)
        {
            errors.Add(new JsonValidationError
            {
                Message = ex.Message,
                Line = (int)(ex.LineNumber ?? 0) + 1,
                Column = (int)(ex.BytePositionInLine ?? 0)
            });
        }

        return errors;
    }

    /// <summary>
    /// Parse $ref patterns from a JSON string.
    /// Expected format: "$ref": "$ref:File#Element"
    /// </summary>
    public static List<JsonRef> ParseRefs(string? json)
    {
        var refs = new List<JsonRef>();
        if (string.IsNullOrWhiteSpace(json)) return refs;

        var lines = json.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            var matches = RefPattern().Matches(lines[i]);
            foreach (Match match in matches)
            {
                var refValue = match.Groups[1].Value;
                var hashIndex = refValue.IndexOf('#');

                var jsonRef = new JsonRef
                {
                    RawValue = refValue,
                    Line = i + 1,
                    Column = match.Groups[1].Index
                };

                if (hashIndex < 0)
                    continue;

                jsonRef.File = refValue[..hashIndex];
                jsonRef.Element = refValue[(hashIndex + 1)..];

                refs.Add(jsonRef);
            }
        }

        return refs;
    }
}
