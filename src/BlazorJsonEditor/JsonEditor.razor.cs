using BlazorJsonEditor.Models;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorJsonEditor;

public partial class JsonEditor : IAsyncDisposable
{
    private string _editorId = $"bje-{Guid.NewGuid():N}";
    private string _currentValue = string.Empty;
    private List<JsonValidationError> _errors = new();
    private List<JsonRef> _refs = new();
    private IJSObjectReference? _jsModule;
    private ElementReference _textareaRef;
    private System.Timers.Timer? _validationTimer;
    private bool _jsInitialized;
    private bool _disposed;

    /// <summary>
    /// The JSON string value of the editor.
    /// </summary>
    [Parameter]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Callback invoked when the editor value changes.
    /// </summary>
    [Parameter]
    public EventCallback<string> ValueChanged { get; set; }

    /// <summary>
    /// Editor configuration options.
    /// </summary>
    [Parameter]
    public JsonEditorOptions Options { get; set; } = new();

    /// <summary>
    /// Callback invoked when $ref references are found in the JSON content.
    /// </summary>
    [Parameter]
    public EventCallback<List<JsonRef>> OnRefsFound { get; set; }

    /// <summary>
    /// Callback invoked when a $ref link is clicked.
    /// </summary>
    [Parameter]
    public EventCallback<JsonRef> OnRefClicked { get; set; }

    /// <summary>
    /// Callback invoked when validation errors change.
    /// </summary>
    [Parameter]
    public EventCallback<List<JsonValidationError>> OnValidationErrors { get; set; }

    protected override void OnInitialized()
    {
        _currentValue = Value;
    }

    protected override async Task OnParametersSetAsync()
    {
        // If the parent pushes a new Value, update the editor
        if (Value != _currentValue)
        {
            _currentValue = Value;
            if (_jsInitialized && _jsModule is not null)
            {
                await _jsModule.InvokeVoidAsync("setValue", _editorId, _currentValue);
            }
        }
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            _jsModule = await JS.InvokeAsync<IJSObjectReference>(
                "import", "./_content/BlazorJsonEditor/blazor-json-editor.js");

            var jsOptions = new
            {
                autoCloseBrackets = Options.AutoCloseBrackets,
                tabSize = Options.TabSize,
                showLineNumbers = Options.ShowLineNumbers,
                enableRefLinks = Options.EnableRefLinks,
                readOnly = Options.ReadOnly
            };

            var dotNetRef = DotNetObjectReference.Create(this);
            await _jsModule.InvokeVoidAsync("initEditor", dotNetRef, _editorId, jsOptions);
            await _jsModule.InvokeVoidAsync("initRefClickHandler", dotNetRef, _editorId);

            _jsInitialized = true;

            // Set up validation debounce timer
            if (Options.LiveValidation)
            {
                _validationTimer = new System.Timers.Timer(Options.ValidationDebounceMs);
                _validationTimer.AutoReset = false;
                _validationTimer.Elapsed += async (_, _) =>
                {
                    await InvokeAsync(() =>
                    {
                        ValidateAndParseRefs(_currentValue);
                        StateHasChanged();
                    });
                };
            }

            // Initial validation
            ValidateAndParseRefs(_currentValue);
            StateHasChanged();
        }
    }

    private void OnInput(ChangeEventArgs e)
    {
        // This handles direct Blazor input events (fallback)
        // The main path is via JS interop OnJsValueChanged
    }

    /// <summary>
    /// Called from JavaScript when the editor value changes.
    /// </summary>
    [JSInvokable]
    public async Task OnJsValueChanged(string value)
    {
        _currentValue = value;
        await ValueChanged.InvokeAsync(value);

        // Reset validation debounce timer
        if (Options.LiveValidation && _validationTimer is not null)
        {
            _validationTimer.Stop();
            _validationTimer.Start();
        }
        else
        {
            ValidateAndParseRefs(value);
        }

        await InvokeAsync(StateHasChanged);
    }

    /// <summary>
    /// Called from JavaScript when a $ref link is clicked.
    /// </summary>
    [JSInvokable]
    public async Task OnJsRefClicked(string file, string element, string raw)
    {
        var jsonRef = new JsonRef
        {
            File = file,
            Element = element,
            RawValue = raw
        };
        await OnRefClicked.InvokeAsync(jsonRef);
    }

    /// <summary>
    /// Formats the current JSON content with pretty-printing.
    /// </summary>
    public async Task FormatAsync()
    {
        if (_jsModule is null || Options.ReadOnly) return;

        var formatted = await _jsModule.InvokeAsync<string?>("formatJson", _currentValue, Options.IndentSize);
        if (formatted is not null)
        {
            _currentValue = formatted;
            await _jsModule.InvokeVoidAsync("setValue", _editorId, _currentValue);
            await ValueChanged.InvokeAsync(_currentValue);
            ValidateAndParseRefs(_currentValue);
            StateHasChanged();
        }
    }

    /// <summary>
    /// Gets the current editor value programmatically.
    /// </summary>
    public string GetValue() => _currentValue;

    /// <summary>
    /// Sets the editor value programmatically.
    /// </summary>
    public async Task SetValueAsync(string value)
    {
        _currentValue = value;
        if (_jsModule is not null && _jsInitialized)
        {
            await _jsModule.InvokeVoidAsync("setValue", _editorId, value);
        }
        await ValueChanged.InvokeAsync(value);
        ValidateAndParseRefs(value);
        StateHasChanged();
    }

    private void ValidateAndParseRefs(string json)
    {
        _errors = JsonParsingHelper.Validate(json);
        _refs = JsonParsingHelper.ParseRefs(json);

        _ = OnValidationErrors.InvokeAsync(new List<JsonValidationError>(_errors));
        _ = OnRefsFound.InvokeAsync(new List<JsonRef>(_refs));
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        _validationTimer?.Stop();
        _validationTimer?.Dispose();

        if (_jsModule is not null)
        {
            try
            {
                await _jsModule.InvokeVoidAsync("destroy", _editorId);
                await _jsModule.DisposeAsync();
            }
            catch (JSDisconnectedException)
            {
                // Circuit disconnected, ignore
            }
        }

        GC.SuppressFinalize(this);
    }
}
