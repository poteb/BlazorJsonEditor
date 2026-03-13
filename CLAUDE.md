# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Build (run from repo root or src/)
dotnet build

# Run all tests (xUnit + bUnit)
dotnet test

# Run a single test by name
dotnet test --filter "FullyQualifiedName~JsonParsingHelperTests.Validate_ValidJson_ReturnsNoErrors"

# Run demo app (Blazor WebAssembly, typically http://localhost:5000)
dotnet run --project src/BlazorJsonEditor.Demo

# Create NuGet package
dotnet pack src/BlazorJsonEditor -c Release
```

## Architecture

**BlazorJsonEditor** is a Blazor Razor Class Library (RCL) targeting .NET 10.0 that provides a JSON editor component with syntax highlighting, auto-close brackets, `$ref` link navigation, and real-time validation.

### Solution layout

- **BlazorJsonEditor/** — The RCL (NuGet-packable component library)
- **BlazorJsonEditor.Demo/** — Blazor WebAssembly demo/test harness
- **BlazorJsonEditor.Tests/** — xUnit + bUnit tests

### Core component: JsonEditor

The editor uses a **textarea + overlay** pattern:
- A transparent `<textarea>` captures all user input and focus
- A `<pre><code>` overlay renders syntax-highlighted HTML on top
- JS synchronizes scroll position, line numbers, and highlighted content between the two
- Z-index swapping enables Ctrl+Click on `$ref` links without disrupting normal editing

### C# / JS boundary

- **C# owns:** state management, JSON validation (System.Text.Json), `$ref` extraction (regex), debounced validation timer, parameter binding
- **JS owns:** keystroke handling (auto-close, tab indent, auto-indent on Enter), DOM manipulation, syntax highlight rendering, scroll sync, ref click detection
- Communication: `DotNetObjectReference` + `[JSInvokable]` callbacks from JS → C#; `IJSRuntime` module calls from C# → JS
- JS module: `wwwroot/blazor-json-editor.js` — stores per-editor state in a `Map` keyed by editor GUID

### Key files

- `JsonEditor.razor` / `JsonEditor.razor.cs` — Component markup and code-behind
- `JsonParsingHelper.cs` — Static validation and `$ref` parsing logic
- `Models/` — `JsonEditorOptions`, `JsonRef`, `JsonValidationError`
- `wwwroot/blazor-json-editor.js` — ES module for all DOM interop
- `wwwroot/blazor-json-editor.css` — Dark theme (Catppuccin Mocha) + `.bje-light` override

### Styling

All CSS classes are prefixed `bje-`. Dark theme is default; add `bje-light` class for light theme. The component uses a monospace font stack (Cascadia Code → Fira Code → Consolas → Monaco).

## Testing

Tests use **xUnit** with **bUnit** for component testing. Current tests cover `JsonParsingHelper` (validation + ref parsing) and model defaults. No integration/E2E tests exist yet.
