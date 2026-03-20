using Bunit;
using pote.BlazorJsonEditor;

namespace BlazorJsonEditor.Tests;

public class JsonEditorAutocompleteTests
{
    [Fact]
    public async Task OnJsRefNameSuggestionsRequested_WhenCallbackIsNull_ReturnsEmptyArray()
    {
        var editor = new JsonEditor();

        var result = await editor.OnJsRefNameSuggestionsRequested("test");

        Assert.Empty(result);
    }

    [Fact]
    public async Task OnJsRefNameSuggestionsRequested_WhenCallbackIsSet_InvokesCallbackAndReturnsResults()
    {
        string? receivedFilter = null;
        var editor = new JsonEditor
        {
            OnRefNameSuggestionsRequested = filter =>
            {
                receivedFilter = filter;
                IEnumerable<string> results = new[] { "AppSettings", "DatabaseConfig" };
                return Task.FromResult(results);
            }
        };

        var result = await editor.OnJsRefNameSuggestionsRequested("App");

        Assert.Equal("App", receivedFilter);
        Assert.Equal(2, result.Length);
        Assert.Equal("AppSettings", result[0]);
        Assert.Equal("DatabaseConfig", result[1]);
    }

    [Fact]
    public async Task OnJsRefPathSuggestionsRequested_WhenCallbackIsNull_ReturnsEmptyArray()
    {
        var editor = new JsonEditor();

        var result = await editor.OnJsRefPathSuggestionsRequested("AppSettings", "db");

        Assert.Empty(result);
    }

    [Fact]
    public async Task OnJsRefPathSuggestionsRequested_WhenCallbackIsSet_InvokesCallbackWithCorrectParameters()
    {
        string? receivedConfigName = null;
        string? receivedFilter = null;
        var editor = new JsonEditor
        {
            OnRefPathSuggestionsRequested = (configName, filter) =>
            {
                receivedConfigName = configName;
                receivedFilter = filter;
                IEnumerable<string> results = new[] { "database/connectionString", "database/timeout" };
                return Task.FromResult(results);
            }
        };

        var result = await editor.OnJsRefPathSuggestionsRequested("AppSettings", "database");

        Assert.Equal("AppSettings", receivedConfigName);
        Assert.Equal("database", receivedFilter);
        Assert.Equal(2, result.Length);
        Assert.Equal("database/connectionString", result[0]);
        Assert.Equal("database/timeout", result[1]);
    }
}
