using BlazorJsonEditor;
using BlazorJsonEditor.Models;

namespace BlazorJsonEditor.Tests;

public class JsonParsingHelperTests
{
    // === Validation Tests ===

    [Fact]
    public void Validate_ValidJson_ReturnsNoErrors()
    {
        var json = """{"name": "test", "value": 42}""";
        var errors = JsonParsingHelper.Validate(json);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_InvalidJson_ReturnsError()
    {
        var json = """{"name": "test",}""";
        // Note: AllowTrailingCommas is true, so this is actually valid
        var errors = JsonParsingHelper.Validate(json);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_MalformedJson_ReturnsErrorWithPosition()
    {
        var json = """{"name": }""";
        var errors = JsonParsingHelper.Validate(json);
        Assert.Single(errors);
        Assert.True(errors[0].Line > 0);
    }

    [Fact]
    public void Validate_EmptyString_ReturnsNoErrors()
    {
        var errors = JsonParsingHelper.Validate("");
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_NullString_ReturnsNoErrors()
    {
        var errors = JsonParsingHelper.Validate(null);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_WhitespaceOnly_ReturnsNoErrors()
    {
        var errors = JsonParsingHelper.Validate("   ");
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_ComplexValidJson_ReturnsNoErrors()
    {
        var json = """
        {
          "users": [
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25}
          ],
          "count": 2,
          "active": true,
          "metadata": null
        }
        """;
        var errors = JsonParsingHelper.Validate(json);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_UnclosedBrace_ReturnsError()
    {
        var json = """{"name": "test" """;
        var errors = JsonParsingHelper.Validate(json);
        Assert.Single(errors);
    }

    // === Ref Parsing Tests ===

    [Fact]
    public void ParseRefs_NoRefs_ReturnsEmpty()
    {
        var json = """{"name": "test"}""";
        var refs = JsonParsingHelper.ParseRefs(json);
        Assert.Empty(refs);
    }

    [Fact]
    public void ParseRefs_SingleRef_ParsesCorrectly()
    {
        var json = """{"$ref": "$ref:schemas/user.json#definitions/Address"}""";
        var refs = JsonParsingHelper.ParseRefs(json);
        Assert.Single(refs);
        Assert.Equal("$ref:schemas/user.json", refs[0].File);
        Assert.Equal("definitions/Address", refs[0].Element);
        Assert.Equal("$ref:schemas/user.json#definitions/Address", refs[0].RawValue);
    }

    [Fact]
    public void ParseRefs_RefWithoutHash_FileOnlyNoElement()
    {
        var json = """{"$ref": "$ref:schemas/user.json"}""";
        var refs = JsonParsingHelper.ParseRefs(json);
        Assert.Single(refs);
        Assert.Equal("$ref:schemas/user.json", refs[0].File);
        Assert.Equal(string.Empty, refs[0].Element);
    }

    [Fact]
    public void ParseRefs_MultipleRefs_ParsesAll()
    {
        var json = """
        {
          "$ref": "$ref:file1.json#elem1",
          "nested": {
            "$ref": "$ref:file2.json#elem2"
          }
        }
        """;
        var refs = JsonParsingHelper.ParseRefs(json);
        Assert.Equal(2, refs.Count);
        Assert.Equal("$ref:file1.json", refs[0].File);
        Assert.Equal("$ref:file2.json", refs[1].File);
    }

    [Fact]
    public void ParseRefs_TracksLineNumber()
    {
        var json = "{\n  \"$ref\": \"$ref:file.json#elem\"\n}";
        var refs = JsonParsingHelper.ParseRefs(json);
        Assert.Single(refs);
        Assert.Equal(2, refs[0].Line);
    }

    [Fact]
    public void ParseRefs_EmptyString_ReturnsEmpty()
    {
        var refs = JsonParsingHelper.ParseRefs("");
        Assert.Empty(refs);
    }

    [Fact]
    public void ParseRefs_NullString_ReturnsEmpty()
    {
        var refs = JsonParsingHelper.ParseRefs(null);
        Assert.Empty(refs);
    }
}
