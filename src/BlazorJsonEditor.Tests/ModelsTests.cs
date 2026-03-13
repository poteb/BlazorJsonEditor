using BlazorJsonEditor.Models;

namespace BlazorJsonEditor.Tests;

public class ModelsTests
{
    [Fact]
    public void JsonEditorOptions_HasCorrectDefaults()
    {
        var options = new JsonEditorOptions();
        Assert.True(options.AutoCloseBrackets);
        Assert.True(options.SyntaxHighlighting);
        Assert.True(options.EnableRefLinks);
        Assert.True(options.ShowLineNumbers);
        Assert.Equal(2, options.IndentSize);
        Assert.True(options.LiveValidation);
        Assert.Equal(300, options.ValidationDebounceMs);
        Assert.Equal(2, options.TabSize);
        Assert.False(options.ReadOnly);
        Assert.Null(options.CssClass);
        Assert.Equal("400px", options.Height);
    }

    [Fact]
    public void JsonRef_HasCorrectDefaults()
    {
        var jsonRef = new JsonRef();
        Assert.Equal(string.Empty, jsonRef.File);
        Assert.Equal(string.Empty, jsonRef.Element);
        Assert.Equal(string.Empty, jsonRef.RawValue);
        Assert.Equal(0, jsonRef.Line);
        Assert.Equal(0, jsonRef.Column);
    }

    [Fact]
    public void JsonValidationError_HasCorrectDefaults()
    {
        var error = new JsonValidationError();
        Assert.Equal(string.Empty, error.Message);
        Assert.Equal(0, error.Line);
        Assert.Equal(0, error.Column);
    }
}
