## @quale/dev-i18n API

### `extractor.extract(globs, encoding = null)`

Extract messages from source files. This is equivalent to:

```javascript
extractor.addFiles(globs, encoding).getMessages()
```

**Parameters**:

- **globs** `array|string` File path(s) or glob(s).
- **encoding** `string` Optional file encoding. Default is `opts.encoding`.

**Returns**: `array` Extracted message objects.

**Throws**: `ArgumentError`, `TypeError`

### `extractor.addFile(file, encoding = null)`

Extract messges from a single file and add them to the index.

**Parameters**:

- **file** `string` File path.
- **encoding** `string` Optional file encoding. Default is `opts.encoding`.

**Returns**: `self`

**Throws**: `TypeError`

### `extractor.addFiles(globs, encoding = null)`

Extract messges from files and add them to the index.

**Parameters**:

- **globs** `array|string` File path(s) or glob(s).
- **encoding** `string` Optional file encoding. Default is `opts.encoding`.

**Returns**: `self`

**Throws**: `ArgumentError`, `TypeError`

### `extractor.getMessages()`

Get all extracted messages.

**Returns**: `array` Extracted message objects.

### `extractor.clear()`

Clear all messages.

**Returns**: `self`

-------------

### `merger.mergePo(file, messages)`

Update a po file with the extracted messages.

**Parameters**:

- **file** `string` The po file path.
- **messages** `array` The extracted messages.

**Returns**: `object` The merge info result.

**Emits**: **beforeSave**

**Throws**: `GitCheckError`, `TypeError`

### `mergePos(globs, messages)`

Update po files with the extracted messages.

**Parameters**:

- **file** `array|string` Po file path(s)/glob(s).
- **messages** `array` The extracted messages.

**Returns**: `array` The merge info results.

**Emits**: **beforeSave**

**Throws**: `ArgumentError`, `GitCheckError`, `TypeError`

### `merger.mergePoTo(sourceFile, destFile, messages)`

Update a po file with the extracted messages.

**Parameters**:

- **sourceFile** `string` The source po file.
- **destFile** `string` The destination po file.
- **messages** `array` The extracted messages.

**Returns**: `object` The merge info result.

**Emits**: **beforeSave**

**Throws**: `GitCheckError`, `TypeError`

### `merger.mergePosTo(sourceGlobs, destDir, messages)`

Update a po files with the extracted messages.

**Parameters**:

- **sourceGlobs** `string` Po file path(s)/glob(s).
- **destDir** `string` The destination directory.
- **messages** `array` The extracted messages.

**Returns**: `array` The merge info results.

**Emits**: **beforeSave**

**Throws**: `ArgumentError`, `GitCheckError`, `TypeError`

### `merger.getMergePoResult(sourceFile, messages)`

Get the result object for merging a po file. The result object is of the form:

```javascript
{
  content: Buffer,
  po: {headers: {}, translations: {}},
  sourceContent: Buffer,
  sourcePo: {headers: {}, translations: {}},
  isChange: Boolean,
  track: {
    added: {...translations},
    found: {...translations},
    changed: {...translations},
    missing: {...translations},
  },
  counts: {
    added: integer,
    found: integer,
    changed: integer,
    missing: integer,
  }
}
```

**Parameters**:

- **sourceFile** `string` The po file path.
- **messages** `array` The extracted messages.

**Returns**: `object` The merge info result object.

**Throws**: `TypeError`
