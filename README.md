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

Construct:

```javascript
const Extractor = require('po-extractor')
const opts = {}
const extractor = new Extractor(opts)
```

Extract and merge:

```javascript
const messages = extractor.extract('locale/en/messages.po', 'src/**/*.js')
extractor.mergePo('locale/en/messages.po', messages)
```

## Options

### Base options

-------------

#### `context` (*string*)

**Default**: `''`

The message context, `''` is the default context.

-------------

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

#### `baseDir` (*string*)

**Default**: `'.'`

The base directory for resolving file paths. This also determines how to
relativize paths in reference comments. If you are running as a build
script, for example with `npm run ...`, this is typically not needed.

-------------

#### `gitCheck` (*boolean|string*)

**Default**: `true`

Whether to check for uncommitted or untracked changes in git before
writing to a file. Note that this will not check files that are ignored by
a `.gitignore` file. If set to the string `'trackedOnly'`, it only consider
a file if it is already tracked in git.

If you are not writing to a git repository, or you do not have git
installed, you must set this to `false`.

-------------

### Reference options

An example of a reference comment is:

```
#: src/app.js:302
msgid "Unknown system error"
msgstr "Error desconegut del sistema"
```

See [this page for more details](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html).

Reference options are passed in a `references` section, like this:

```javascript
const opts = {
  references: {
    enabled: true,
    //...
  }
}
```

-------------

#### `references.enabled` (*boolean*)

**Default**: `true`

Whether to add line reference comments.

-------------

#### `references.max` (*integer*)

**Default**: `-1`

Max references to store per translation. A negative value means no limit.

-------------

#### `references.perFile` (*integer*)

**Default**: `-1`

Max references per file for a single translation.

-------------

#### `references.perLine` (*integer*)

**Default**: `-1`

 Max references per comment line.

-------------

#### `references.lineLength` (*integer*)

**Default**: `120`

Length at which to start a new comment line. If a single reference exceeds
this value, it will still be added.

-------------

### Logging options

-------------

#### `verbosity` (*integer*)

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

You can set other options passed to the default logger in the `logging`
section, like this:

```javascript
const opts = {

  logging: {

    // The logLevel. A number from 0-4, or a string ('info', 'warn', etc.).
    // The environment variable `LOG_LEVEL` is also checked.
    logLevel: 2,

    // Custom prefix function. See src/logger.js for more details.
    prefix: function(level) {},

    // Set custom chalk methods for styling. See src/logger.js for more details.
    chalks: {},
  }
}
```

-------------

### Events

- `added` - When a new message is found. Receieves arguments:
  - `tran`: The new translation object being added to the po.
  - `message:` The message object extracted from source.

- `found` - When a translation exists for a message. Receives:
  - `tran`: The existing translation object.
  - `message`: The message object.

- `changed` - When an existing translation has been modified. Currently the
  only case for this is when comments are being updated. Receieves:
  - `tran`: The existing translation object.
  - `message`: The message object.
  - `changes`: An array of change info objects

- `missing` - When no message was extracted for a translation that exists in
  the po file. Receives:
  - `tran`: The translation object.

- `beforeSave` - Before a file is written. Receives:
  - `file`: The file being written.
  - `content`: The buffer being written.

-------------

### Sorting

Forthcoming...

-------------

## API

-------------

### `extract(globs)`

Extract messages from source files.

See: https://github.com/oliviertassinari/i18n-extract

```javascript
/**
 * @param {array} File globs
 * @return {array} Extracted message objects
 *
 * @throws {ArgumentError}
 */
```

-------------

### `mergePo(file, messages)`

Update a po file with the extracted messages.

```javascript
/**
 * @param {string} The po file
 * @param {array} The messages
 * @return {object} The merge info result
 *
 * @throws {ArgumentError}
 * @throws {GitExecFailedError}
 * @throws {GitCheckError}
 * @emits `beforeSave`
 */
```

-------------

### `mergePoTo(sourceFile, destFile, messages)`

Update a po file with the extracted messages.

```javascript
/**
 * @param {string} The source po file
 * @param {string} The destination file
 * @param {array} The messages
 * @return {object} The merge info result
 * 
 * @throws {ArgumentError}
 * @throws {GitExecFailedError}
 * @throws {GitCheckError}
 * @emits `beforeSave`
 */
```

-------------

### `getMergePoResult(sourceFile, messages)`

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
- [gettext-parser](https://www.npmjs.com/package/gettext-parser)
- [glob](https://www.npmjs.com/package/glob)
- [i18n-extract](https://www.npmjs.com/package/i18n-extract)


## License

***MIT License***

See [LICENSE.txt](LICENSE.txt)