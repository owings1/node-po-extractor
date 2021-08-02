# node-po-extractor

Utility for extracting i18n messages and merging them with gettext-po files.

## Project status

> NB: This project is in the very early stages of development. Please feel free
> to experiment with it, but do not use it for production purposes.

I wrote this as I am setting up i18n in a couple projects. There are a lot of
utilities out there that do similar things, but I could not seem to get any of
them to work the way I needed. So 

I am putting this here in case anyone else finds some of it useful.
I am in the process of writing tests, and I will be making breaking changes.

If you have any comments or suggestions, please drop me a line, or file an issue.

## Features

- Generate file reference comments. Advanced comment options.
- Two merge modes, `patch` (default), which does not remove messages missing
  from the extraction, or `replace` which does.
- Do not overwrite files with uncommitted git changes.
- Built-in sorting options, allow custom sorting function.
- Events for modifiying messages before the are merged.
- Configurable logging, or supply a custom logger.

## Usage

Install:

```bash
npm install --save-dev owings1/node-po-extractor
```

Import:

```javascript
const {Extractor, Merger} = require('po-extractor')
```

Extract and merge:

```javascript
const opts = {}
const extractor = new Extractor(opts)
const merger = new Merger(opts)
const messages = extractor.extract('src/**/*.js')
merger.mergePo('locale/en/messages.po', messages)
```

## Options

### Common options

#### `baseDir` (*string*)

**Default**: `'.'`

The base directory for resolving file paths. This also determines how to
relativize paths in reference comments. If you are running as a build
script, for example with `npm run ...`, this is typically not needed.

-------------

#### `context` (*string*)

**Default**: `''`

The message context, `''` is the default context.

-------------

#### `gitCheck` (*boolean*)

**Default**: `true`

Whether to check for uncommitted changes in git before
writing to a file. Note that this will not check files that are ignored by
a `.gitignore` file.

If you are not writing to a git repository, or you do not have git
installed, you must set this to `false`.

-------------

#### `verbose` (*integer*)

**Default**: `0`

Set a value from `1` to `3` to enable more logging.

-------------

#### `logger` (*object*)

**Default**: internal [`Logger`](src/logger.js) instance.

You can use this to supply a custom logger. It must have the methods: `error`,
`warn`, `info`, `log`, and `debug`, which accept arbitrary arguments
`(...args)` of any type. The default logger uses `console` methods.

-------------

#### `logging` (*object*)

- **logLevel** (*string|integer*): The logLevel. A number from 0-4, or a string ('info', 'warn',
    'error', 'debug'). The environment variables `LOG_LEVEL`, `LOGLEVEL`, and `DEBUG` are also checked.

- **prefix** (**function**): A custom function to provide the prefix. See [logger.js](src/logger.js).

- **chalks** (**object**): An object with chalk styes. See [logger.js](src/logger.js).

### Extractor options

#### `marker` (*string|array*)

**Default**: `['i18n', '__']`

The symbol(s) for the i18n translate method to extract messages from source.

-------------

#### `encoding` (*string*)

**Default**: `'utf-8'`
The default encoding to use when reading source files. Can be overridden for
individual files.

-------------

#### `parsing` (*object*)

- **parser** (*string* default 'flow'): The babel parser to use, 'typescript' or 'flow'.

-------------

### Merger options

#### `replace` (*boolean*)

**Default**: `false`

Whether to remove translations from the po file that are not found in the
extracted messages. The default is to keep the messages.

-------------

#### `sort` (*string|function*)

**Default**: `'source'`

How to sort the translations in the po file. The default is to keep the
same order as the source po file, and to sort new translations by `msgid`.
Other built-in options are `'msgid'`, and `'file'`. Alternatively, you can
supply a custom sorting function. See below for details.

-------------

#### `dryRun` (*boolean*)

**Default**: `false`

Do everything but write files.

-------------

#### `refererences` (*object*)

Options for generating reference comments. These options are passed in like this:

**Defaults**:

```javascript
const opts = {
  references: {
    enabled: true,
    max: -1,
    perFile: -1,
    perLine: -1,
    lineLength: 120,
  }
}
```

- `enabled` (*boolean*) Whether to add line reference comments.
- `max` (*integer*) Max references to store per translation. A negative value means no limit.
- `perFile` (*integer*) Max references per file for a single translation.
- `perLine` (*integer*) Max references per comment line.
- `lineLength` (*integer*) Length at which to start a new comment line. If a single reference exceeds this value, it will still be added.

An example of a reference comment is:

```
 #: src/app.js:302
 msgid "Unknown system error"
 msgstr "Error desconegut del sistema"
```

See [this page for more details](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html).


-------------

### Merger Events

- `added` - When a new message is found. Receieves arguments:
    - `tran`: The new translation object being added to the po.
    - `message:` The message object extracted from source.

- `found` - When a translation exists for a message. Receives:
    - `tran`: The existing translation object.
    - `message`: The message object.

- `changed` - When an existing translation has been modified. Currently the only case for this is when comments are being updated. Receieves:
    - `tran`: The existing translation object.
    - `message`: The message object.
    - `changes`: An array of change info objects

- `missing` - When no message was extracted for a translation that exists in the po file. Receives:
    - `tran`: The translation object.

- `beforeSave` - Before a file is written. Receives:
    - `file`: The file being written.
    - `content`: The buffer being written.

-------------

### Sorting

Documentation forthcoming.

-------------

## API

### `extractor.extract(globs, encoding = null)`

Extract messages from source files.

```javascript
/**
 * @param {array} File globs
 * @param {string} (optional) File encoding, default is opts.encoding
 * @return {array} Extracted message objects
 *
 * @throws {ArgumentError}
 */
```

-------------

### `extractor.addFile(file, encoding = null)`

Extract messges from a file and add them to the index.

```javascript
/**
 * @param {string} The file
 * @param {string} (optional) File encoding, default is opts.encoding
 * @return {self}
 *
 * @throws {ArgumentError}
 */
```

-------------

### `extractor.getMessages()`

Get all extracted messages.

```javascript
/**
 * @return {array} The message objects
 */
```

-------------

### `extractor.addFiles(globs, encoding = null)`

Extract messges from files and add them to the index.

```javascript
/**
 * @param {array} File globs
 * @param {string} (optional) File encoding, default is opts.encoding
 * @return {self}
 *
 * @throws {ArgumentError}
 */
```

-------------

### `merger.mergePo(file, messages)`

Update a po file with the extracted messages.

```javascript
/**
 * @param {string} The po file
 * @param {array} The messages
 * @return {object} The merge info result
 *
 * @throws {ArgumentError}
 * @throws {ExecExitError}
 * @throws {ExecResultError}
 * @throws {UnsavedChangesError}
 * @emits `beforeSave`
 */
```

-------------

### `mergePos(globs, messages)`

Update po files with the extracted messages.


```javascript
/**
 * @param {array|string} Po file path(s)/glob(s)
 * @param {array} The messages
 * @return {array} The merge info results
 *
 * @throws {ArgumentError}
 * @throws {ExecExitError}
 * @throws {ExecResultError}
 * @throws {UnsavedChangesError}
 * @emits `beforeSave`
 */
```

-------------

### `merger.mergePoTo(sourceFile, destFile, messages)`

Update a po file with the extracted messages.

```javascript
/**
 * @param {string} The source po file
 * @param {string} The destination file
 * @param {array} The messages
 * @return {object} The merge info result
 * 
 * @throws {ArgumentError}
 * @throws {ExecExitError}
 * @throws {ExecResultError}
 * @throws {UnsavedChangesError}
 * @emits `beforeSave`
 */
```

-------------


### `merger.mergePosTo(sourceGlob, destDir, messages)`

Update a po files with the extracted messages.

```javascript
/**
 * @param {array|string} Po file path(s)/glob(s)
 * @param {string} The destination directory
 * @param {array} The messages
 * @return {object} The merge info result
 * 
 * @throws {ArgumentError}
 * @throws {ExecExitError}
 * @throws {ExecResultError}
 * @throws {UnsavedChangesError}
 * @emits `beforeSave`
 */
```

-------------

### `merger.getMergePoResult(sourceFile, messages)`

Get the result object for merging a po file.

```javascript
/**
 * @param {string} The source po file
 * @param {array} The messages
 * @return {object} The merge info result
 *
 * @throws {ArgumentError}
 */
```

The result object is of the form:

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

-------------

## Dependencies

- [@babel/core](https://www.npmjs.com/package/@babel/core)
- [@babel/plugin-proposal-class-properties](https://www.npmjs.com/package/@babel/plugin-proposal-class-properties)
- [@babel/plugin-proposal-decorators](https://www.npmjs.com/package/@babel/plugin-proposal-decorators)
- [@babel/plugin-syntax-dynamic-import](https://www.npmjs.com/package/@babel/plugin-syntax-dynamic-impor)
- [@babel/register](https://www.npmjs.com/package/@babel/register)
- [@babel/traverse](https://www.npmjs.com/package/@babel/traverse)
- [chalk](https://www.npmjs.com/package/chalk)
- [deepmerge](https://www.npmjs.com/package/deepmerge)
- [gettext-parser](https://www.npmjs.com/package/gettext-parser)
- [fs-extra](https://www.npmjs.com/package/fs-extra)
- [globby](https://www.npmjs.com/package/globby)


## License

***MIT License***

See file [LICENSE.txt](LICENSE.txt).

## Notice

Some core functionality is from [i18n-extract by Olivier Tassinari][i18n-extract]
(MIT License). See fiile [NOTICE.md][NOTICE.md] for Third-party notices.

[i18n-extract]: (https://www.npmjs.com/package/i18n-extract)