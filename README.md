<p align="center">
  <img src="BlazorJsonEditor.png" alt="BlazorJsonEditor" width="128" />
</p>

# BlazorJsonEditor

[![GitHub](https://img.shields.io/github/license/poteb/BlazorJsonEditor)](https://github.com/poteb/BlazorJsonEditor)

A smart, configurable JSON editor component for Blazor with syntax highlighting, auto-close brackets, `$ref` link navigation, auto-format, and real-time validation.

## Features

- **Syntax highlighting** — color-coded keys, strings, numbers, booleans, and nulls
- **Real-time validation** — errors shown inline with line/column positions as you type
- **Auto-close brackets** — automatically inserts matching `}`, `]`, and `"` characters
- **Auto-indent** — smart indentation on Enter based on context
- **Tab support** — Tab/Shift+Tab for indentation within the editor
- **JSON formatting** — one-click pretty-print with configurable indent size
- **`$ref` link navigation** — Ctrl+Click on `$ref` values to trigger navigation callbacks
- **Line numbers** — optional gutter with synchronized scroll
- **Dark & light themes** — Catppuccin Mocha dark theme by default, with a `bje-light` class for light mode
- **CSS variable theming** — override any color via `--bje-*` CSS variables
- **Read-only mode** — display JSON without allowing edits
- **Two-way binding** — standard Blazor `@bind-Value` support
- **Multi-target** — supports .NET 7.0, 8.0, 9.0, and 10.0

## Installation

```bash
dotnet add package pote.BlazorJsonEditor
```

## Quick start

Add the namespace to your `_Imports.razor`:

```razor
@using pote.BlazorJsonEditor
```

Then use the component in any Razor page:

```razor
<JsonEditor @bind-Value="_json"
            Options="_options"
            OnRefClicked="HandleRefClicked"
            OnValidationErrors="HandleValidationErrors" />

@code {
    private string _json = """
        {
          "name": "example",
          "version": "1.0.0"
        }
        """;

    private JsonEditorOptions _options = new()
    {
        Height = "500px",
        IndentSize = 2
    };

    private Task HandleRefClicked(JsonRef jsonRef)
    {
        Console.WriteLine($"Navigating to: {jsonRef.File}#{jsonRef.Element}");
        return Task.CompletedTask;
    }

    private void HandleValidationErrors(List<JsonValidationError> errors)
    {
        // React to validation state changes
    }
}
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `Value` | `string` | The JSON string (supports two-way binding via `@bind-Value`) |
| `Options` | `JsonEditorOptions` | Editor configuration (see below) |
| `OnRefClicked` | `EventCallback<JsonRef>` | Fired when a `$ref` link is Ctrl+Clicked |
| `OnRefsFound` | `EventCallback<List<JsonRef>>` | Fired when `$ref` references are detected in the content |
| `OnValidationErrors` | `EventCallback<List<JsonValidationError>>` | Fired when validation errors change |

## Options

| Property | Type | Default | Description |
|---|---|---|---|
| `AutoCloseBrackets` | `bool` | `true` | Auto-insert matching brackets, braces, and quotes |
| `SyntaxHighlighting` | `bool` | `true` | Enable syntax highlighting |
| `EnableRefLinks` | `bool` | `true` | Render `$ref` values as clickable links |
| `ShowLineNumbers` | `bool` | `true` | Show line numbers in the gutter |
| `IndentSize` | `int` | `2` | Spaces per indent level (used by auto-format) |
| `TabSize` | `int` | `2` | Tab size in the editor |
| `LiveValidation` | `bool` | `true` | Validate JSON in real-time as the user types |
| `ValidationDebounceMs` | `int` | `300` | Debounce delay (ms) for live validation |
| `ReadOnly` | `bool` | `false` | Make the editor read-only |
| `Height` | `string` | `"400px"` | Editor height as a CSS value |
| `CssClass` | `string?` | `null` | Additional CSS class on the editor container |

## Theming

The editor ships with a dark theme (Catppuccin Mocha) by default. To switch to light mode, add the `bje-light` CSS class:

```csharp
var options = new JsonEditorOptions { CssClass = "bje-light" };
```

You can customize any color by overriding CSS variables on the `.bje-container` selector:

```css
.bje-container {
    --bje-bg: #1a1b26;
    --bje-key: #7aa2f7;
    --bje-string: #9ece6a;
    --bje-number: #ff9e64;
}
```

See [blazor-json-editor.css](src/BlazorJsonEditor/wwwroot/blazor-json-editor.css) for the full list of variables.

## `$ref` navigation

The editor detects `$ref` values matching the pattern `"$ref": "$ref:file#element"` and renders them as clickable links. The `#` is required, but the element part after it can be empty (e.g. `"$ref:config#"` is valid). Hold **Ctrl** (or **Cmd** on macOS) and click a link to trigger the `OnRefClicked` callback with a `JsonRef` containing the parsed file and element paths. **Ctrl+Shift+Click** sets `OpenInNewTab = true` on the callback.

## Programmatic API

The `JsonEditor` component exposes methods for programmatic control:

```csharp
@ref="_editor"

// Get the current value
string json = _editor.GetValue();

// Set a new value
await _editor.SetValueAsync(newJson);

// Format/pretty-print
await _editor.FormatAsync();
```

## Architecture

The editor uses a **textarea + overlay** pattern:

- A transparent `<textarea>` captures input and focus
- A `<pre><code>` overlay renders syntax-highlighted HTML on top
- JavaScript synchronizes scroll position, line numbers, and highlights between the two layers
- Z-index swapping on Ctrl-hold enables clicking `$ref` links without disrupting normal editing

C# handles state management, validation (`System.Text.Json`), and `$ref` parsing. JavaScript handles keystroke processing, DOM manipulation, and scroll synchronization. Communication uses `DotNetObjectReference` with `[JSInvokable]` callbacks.

## Development

```bash
# Build
dotnet build

# Run tests (xUnit + bUnit)
dotnet test

# Run the demo app
dotnet run --project src/BlazorJsonEditor.Demo

# Create NuGet package
dotnet pack src/BlazorJsonEditor -c Release
```

## Links

- **Project page:** https://github.com/poteb/BlazorJsonEditor
- **NuGet:** https://www.nuget.org/packages/pote.BlazorJsonEditor

## Disclaimer

This entire project has been vibe coded.

## License

[MIT](LICENSE)
