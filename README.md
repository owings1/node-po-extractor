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

- Support mutliple markers, e.g. `'__'` and `'i18n'`.
- Generate extracted comments.
- Generate file reference comments with advanced options.
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
merger.mergePo('locale/fr/messages.po', messages)
```

## Options

### Common options

These options are common to both the `Extractor` and `Merger`.

- **baseDir** `string` default `'.'`: The base directory for resolving file paths.
    This also determines how to relativize paths in reference comments. If you are running
    as a build script, for example with `npm run ...`, this is typically not needed.

- **context** `boolean` default `''`: The message context, `''` is the default context.

- **gitCheck** `boolean` default `true`: Whether to check for uncommitted changes in git before
    writing to a file. Note that this will not check files that are ignored by a `.gitignore` file.
    If you are not writing to a git repository, or you do not have git installed, you must set this
    to `false`.

- **dryRun** `boolean` default: `false`: Do everything but write files.

- **verbose** `integer` default `0`: Set a value from `1` to `3` to enable more logging.

- **logger** `object` default [`new Logger`][logger]: You can use this to
    supply a custom logger. It must have the methods: `error`, `warn`, `info`, `log`, and `debug`,
    which accept arbitrary arguments `(...args)` of any type. The default logger uses `console` methods.

- **logging** `object`: Options to pass to the constructor of the default logger. If you supply a
    custom logger, these are ignored. Available keys:

    - **logLevel** `string|integer` default `2`: The logLevel. A number from 0-4, or a string
    ('info', 'warn', 'error', 'debug'). The environment variables `LOG_LEVEL`, `LOGLEVEL`, and
    `DEBUG` are also checked.

    - **prefix** `function`: A custom function to provide the prefix. See [logger.js][logger].

    - **chalks** `object`: An object with chalk styes. See [logger.js][logger].

### Extractor options

- **encoding** `string` default `'utf-8'`: The default encoding to use when reading source files.
    Can be overridden for individual files.

- **marker** `string|array` default `['i18n', '__']`: The symbol(s) for the i18n translate method
    to extract messages from source.

- **argPos** `integer` default `0`: The argument position of the message.

- **members** `boolean` default `false`: Whether to include member calls, e.g. `obj.i18n()`.

- **parser** `string|object` default `'flow'`: The babel parser to use, 'typescript' or 'flow'.
    Alternatively this can be an object, in which case it will be passed directly to the babel
    `transform` method.

- **comments** `object`: Options for parsing and extracting comments. Available keys:

    - **extract** `boolean` default `true`: Extract comments from the preceeding line to include
    in the po file. See [this page for more details][po-ref].

    - **keyRegex** `string|RegExp` default `/i18n-extract (.+)/`: Regex to extract additional
    keys from comments.

    - **ignoreRegex** `string|RegExp` default `/i18n-ignore-line/`: Regex to tell the extractor
    to ignore the following line.

### Merger options

- **replace** `boolean` default `false`: Whether to remove translations from the po file that
    are not found in the extracted messages. The default is to keep the messages.

- **sort** `string|function` default: `'source'`: How to sort the translations in the po file.
    The default is to keep the same order as the source po file, and to sort new translations by `msgid`.
    Other built-in options are `'msgid'`, and `'file'`. Alternatively, you can supply a custom sorting function.
    See below for details.

- **references** `object`: Options for generating reference comments. See [this page for more details][po-ref].
    Available keys:

    - **enabled** `boolean` default `true`: Whether to add line reference comments.

    - **max** `integer` default `-1`: Max references to store per translation. A negative value means no limit.

    - **perFile** `integer` default `-1`: Max references per file for a single translation.

    - **perLine** `integer` default `-1`: Max references per comment line.

    - **lineLength** `integer` default `-1`: Length at which to start a new comment line. If a single
    reference exceeds this value, it will still be added.

-------------

## Events

### Merger Events

- **added**: When a new message is found. Receives parameters:
    - **tran** `object` The new translation object being added to the po.
    - **message** `object` The message object extracted from source.

- **found**: When a translation exists for a message. Receives parameters:
    - **tran** `object` The existing translation object.
    - **message** `object` The message object.

- **changed**: When an existing translation has been modified. Currently the only
    case for this is when comments are being updated. Receives parameters:
    - **tran** `object` The existing translation object.
    - **message** `object` The message object.
    - **changes** `array` An array of change info objects

- **missing**: When no message was extracted for a translation that exists in the
    po file. Receives parameters:
    - **tran** `object` The translation object.

- **beforeSave**: Before a file is written. Receives parameters:
    - **file** `string` The file being written.
    - **content** `buffer` The buffer being written.

-------------

## Sorting

Documentation forthcoming.

-------------

## API

[See doc/api.md][api]

-------------

## Dependencies

- [@babel/core](https://www.npmjs.com/package/@babel/core)
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
(MIT License). See fiile [NOTICE.md](NOTICE.md) for Third-party notices.

## Reading

- [GNU gettext PO reference][po-ref]
- [Pology PO Format reference][pology]

[api]: doc/api.md
[i18n-extract]: https://www.npmjs.com/package/i18n-extract
[logger]: src/logger.js
[po-ref]: https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html
[pology]: http://pology.nedohodnik.net/doc/user/en_US/ch-poformat.html