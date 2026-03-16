# Blazor JSON Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable, NuGet-packable Blazor Razor Class Library providing a JSON editor component with syntax highlighting, auto-close brackets, `$ref` link support, auto-format, and error handling.

**Architecture:** Textarea + synchronized `<pre><code>` overlay for syntax highlighting (no external JS library dependencies). JavaScript interop handles keystroke processing (auto-close brackets, tab indentation) and tokenization for highlighting. The C# Razor component exposes configuration via `JsonEditorOptions` and communicates errors/refs via `EventCallback` parameters.

**Tech Stack:** .NET 8, Blazor (supports Server + WASM + SSR), Razor Class Library, System.Text.Json, JavaScript interop, bUnit for testing.

---

### Task 1: Create Solution and Project Structure

**Files:**
- Create: `src/BlazorJsonEditor/BlazorJsonEditor.csproj`
- Create: `src/BlazorJsonEditor.Demo/BlazorJsonEditor.Demo.csproj`
- Create: `src/BlazorJsonEditor.Tests/BlazorJsonEditor.Tests.csproj`
- Create: `BlazorJsonEditor.sln`

**Step 1: Create the solution file**

```bash
cd d:/git/BlazorJsonEditor
dotnet new sln -n BlazorJsonEditor
```

**Step 2: Create the Razor Class Library project**

```bash
dotnet new razorclasslib -n BlazorJsonEditor -o src/BlazorJsonEditor --support-pages-and-views false
```

**Step 3: Create the demo Blazor WebAssembly project**

```bash
dotnet new blazorwasm -n BlazorJsonEditor.Demo -o src/BlazorJsonEditor.Demo
```

**Step 4: Create the test project**

```bash
dotnet new xunit -n BlazorJsonEditor.Tests -o src/BlazorJsonEditor.Tests
```

**Step 5: Add projects to solution and references**

```bash
dotnet sln add src/BlazorJsonEditor/BlazorJsonEditor.csproj
dotnet sln add src/BlazorJsonEditor.Demo/BlazorJsonEditor.Demo.csproj
dotnet sln add src/BlazorJsonEditor.Tests/BlazorJsonEditor.Tests.csproj
dotnet add src/BlazorJsonEditor.Demo reference src/BlazorJsonEditor
dotnet add src/BlazorJsonEditor.Tests reference src/BlazorJsonEditor
dotnet add src/BlazorJsonEditor.Tests package bunit
dotnet add src/BlazorJsonEditor.Tests package Moq
```

**Step 6: Verify it builds**

```bash
dotnet build
```
Expected: Build succeeded.

**Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold solution with RCL, demo, and test projects"
```

---

### Task 2: Define Models and Options

**Files:**
- Create: `src/BlazorJsonEditor/Models/JsonEditorOptions.cs`
- Create: `src/BlazorJsonEditor/Models/JsonRef.cs`
- Create: `src/BlazorJsonEditor/Models/JsonValidationError.cs`

**Step 1: Write JsonEditorOptions**

```csharp
namespace BlazorJsonEditor.Models;

public class JsonEditorOptions
{
    /// <summary>Whether to auto-close brackets, braces, and quotes.</summary>
    public bool AutoCloseBrackets { get; set; } = true;

    /// <summary>Whether to enable syntax highlighting.</summary>
    public bool SyntaxHighlighting { get; set; } = true;

    /// <summary>Whether $ref values are rendered as clickable links.</summary>
    public bool EnableRefLinks { get; set; } = true;

    /// <summary>Whether to show line numbers.</summary>
    public bool ShowLineNumbers { get; set; } = true;

    /// <summary>Number of spaces for indentation (used by auto-format).</summary>
    public int IndentSize { get; set; } = 2;

    /// <summary>Whether to validate JSON in real-time as the user types.</summary>
    public bool LiveValidation { get; set; } = true;

    /// <summary>Debounce delay in ms for live validation.</summary>
    public int ValidationDebounceMs { get; set; } = 300;

    /// <summary>Tab size in the editor.</summary>
    public int TabSize { get; set; } = 2;

    /// <summary>Whether the editor is read-only.</summary>
    public bool ReadOnly { get; set; } = false;

    /// <summary>CSS class to apply to the editor container.</summary>
    public string? CssClass { get; set; }

    /// <summary>Editor height (CSS value, e.g. "400px" or "100%").</summary>
    public string Height { get; set; } = "400px";
}
```

**Step 2: Write JsonRef**

```csharp
namespace BlazorJsonEditor.Models;

/// <summary>
/// Represents a parsed $ref reference found in JSON content.
/// Format: "$ref:JsonFile#Element"
/// </summary>
public class JsonRef
{
    /// <summary>The file being referenced (e.g. "JsonFile").</summary>
    public string File { get; set; } = string.Empty;

    /// <summary>The element path within the file (e.g. "Element").</summary>
    public string Element { get; set; } = string.Empty;

    /// <summary>The raw $ref value string.</summary>
    public string RawValue { get; set; } = string.Empty;

    /// <summary>Line number where this ref appears (1-based).</summary>
    public int Line { get; set; }

    /// <summary>Column offset where this ref appears (0-based).</summary>
    public int Column { get; set; }
}
```

**Step 3: Write JsonValidationError**

```csharp
namespace BlazorJsonEditor.Models;

public class JsonValidationError
{
    /// <summary>Error message.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Line number where the error was detected (1-based, 0 if unknown).</summary>
    public int Line { get; set; }

    /// <summary>Column position (0-based, 0 if unknown).</summary>
    public int Column { get; set; }
}
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add editor models - options, ref, and validation error"
```

---

### Task 3: Build the JavaScript Interop Module

**Files:**
- Create: `src/BlazorJsonEditor/wwwroot/blazor-json-editor.js`

This is the core JS that powers syntax highlighting, auto-close brackets, and cursor management. It's loaded as a JS module via `IJSRuntime`.

**Key functions:**
- `initEditor(dotNetRef, editorId, options)` — sets up keystroke handlers
- `getHighlightedHtml(json)` — tokenizes JSON and returns highlighted HTML
- `formatJson(json, indent)` — pretty-prints JSON
- `destroy(editorId)` — cleanup

**Step 1: Write the JS module** (full implementation in code)

**Step 2: Verify file is included in the project as static web asset**

The RCL project automatically serves files under `wwwroot/` at `_content/BlazorJsonEditor/`.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add JS interop module for editor behavior"
```

---

### Task 4: Build the CSS Stylesheet

**Files:**
- Create: `src/BlazorJsonEditor/wwwroot/blazor-json-editor.css`

**Step 1: Write the CSS** covering:
- Editor container (textarea + overlay positioning)
- Syntax highlighting token colors (strings, numbers, booleans, null, keys, punctuation)
- Line numbers gutter
- Error highlighting
- `$ref` link styling
- Toolbar button styling

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add editor CSS with syntax highlighting theme"
```

---

### Task 5: Build the JsonEditor Razor Component

**Files:**
- Create: `src/BlazorJsonEditor/JsonEditor.razor`
- Create: `src/BlazorJsonEditor/JsonEditor.razor.cs`

**Step 1: Write the Razor markup** — toolbar (format button, error indicator), editor area (line numbers gutter, textarea, highlighting overlay), error panel.

**Step 2: Write the code-behind** with:
- Parameters: `Value`, `ValueChanged`, `Options`, `OnRefsFound`, `OnRefClicked`, `OnValidationErrors`
- JS interop lifecycle: `OnAfterRenderAsync` to init, `IAsyncDisposable` to cleanup
- Methods: `FormatJson()`, `ValidateJson()`, `ParseRefs()`
- Auto-close bracket insertion via JS callback

**Step 3: Verify it builds**

```bash
dotnet build src/BlazorJsonEditor
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: implement JsonEditor Razor component with full interop"
```

---

### Task 6: Configure NuGet Package Metadata

**Files:**
- Modify: `src/BlazorJsonEditor/BlazorJsonEditor.csproj`

**Step 1: Add package metadata** (PackageId, Version, Authors, Description, PackageTags, RepositoryUrl, license, icon, etc.)

**Step 2: Verify pack works**

```bash
dotnet pack src/BlazorJsonEditor -c Release
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: configure NuGet package metadata"
```

---

### Task 7: Wire Up Demo Project

**Files:**
- Modify: `src/BlazorJsonEditor.Demo/Pages/Home.razor`
- Modify: `src/BlazorJsonEditor.Demo/wwwroot/index.html` (add CSS/JS references)
- Modify: `src/BlazorJsonEditor.Demo/_Imports.razor`

**Step 1: Add `@using BlazorJsonEditor` to _Imports.razor**

**Step 2: Update Home.razor** with a demo page showing the editor with sample JSON, event handlers for ref clicks and validation errors, and a format button.

**Step 3: Run the demo**

```bash
dotnet run --project src/BlazorJsonEditor.Demo
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire up demo project with sample editor usage"
```

---

### Task 8: Add Tests

**Files:**
- Create: `src/BlazorJsonEditor.Tests/JsonEditorTests.cs`
- Create: `src/BlazorJsonEditor.Tests/JsonRefParserTests.cs`
- Create: `src/BlazorJsonEditor.Tests/JsonValidationTests.cs`

**Step 1: Write JsonRefParserTests** — test parsing `$ref:File#Element` from JSON strings, edge cases (no #, empty file, nested refs).

**Step 2: Write JsonValidationTests** — test that valid JSON produces no errors, invalid JSON produces correct error with line/column.

**Step 3: Write JsonEditorTests** (bUnit) — test that the component renders, that parameters bind correctly, that format button triggers formatting.

**Step 4: Run tests**

```bash
dotnet test
```
Expected: All pass.

**Step 5: Commit**

```bash
git add -A && git commit -m "test: add unit tests for ref parsing, validation, and component"
```

---

Plan complete and saved to `docs/plans/2026-03-13-blazor-json-editor.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?