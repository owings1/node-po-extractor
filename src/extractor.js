/**
 * node-po-extractor
 *
 * Copyright (C) 2021 Doug Owings
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * * Contains code copied, repackaged, and modified from i18n-extract
 *
 * - https://www.npmjs.com/package/i18n-extract
 * - https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 *
 * Methods getKeys(), extractFromCode(), and getBabelOpts()
 *
 * The 18n-extract license is as follows:
 * --------------------------------
 *
 * MIT License
 *
 * Copyright (c) 2015 Olivier Tassinari
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Dependency requires
const {
    objects : {lget, lset, valueHash},
    types   : {castToArray, isFunction, typeOf},
} = require('utils-h')
const globby          = require('globby')
const {transformSync} = require('@babel/core')
const traverse        = require('@babel/traverse').default

// Node requires
const fs   = require('fs')
const path = require('path')

// Package requires
const Base  = require('./base.js')
const Index = require('./index.js')
const Sort  = require('./sorters.js')
const {ArgumentError} = require('./errors.js')
const {
    arrayUnique,
    checkArg,
    resolveSafe,
} = require('./util.js')

// Default options.
const Defaults = {
    context  : '',
    encoding : 'utf-8',
    marker   : ['i18n', '__'],
    argPos   : 0,
    members  : false,
    comments : {
        extract     : true,
        fchars      : '_.*',
        keyRegex    : /i18n-extract (.+)/,
        ignoreRegex : /i18n-ignore-line/,
    },
    parser   : 'flow',
    logging: {
        styles: {
            info: {
                prefix: 'cyan',
            },
        },
    },
}

class Extractor extends Base {

    /**
     * @constructor
     *
     * @throws {ArgumentError}
     *
     * @param {object} (optional) The options
     */
    constructor(opts) {
        super(Defaults, opts)
        this.opts.comments = getCommentOpts(this.opts)
        // Fail fast.
        getBabelOpts(this.opts)
        this.idx = new Index
    }

   /**
    * Extract messages from source files and return the message objects. This
    * is equivalent to calling `this.addFiles().getMessages()`.
    *
    * @throws {ArgumentError}
    * @throws {TypeError}
    *
    * @param {array|string} File path(s)/glob(s)
    * @param {string} (optional) File encoding, default is `opts.encoding`
    * @return {array} Extracted message objects
    */
    extract(globs, encoding = null) {
        return this.addFiles(globs, encoding).getMessages()
    }

    /**
     * Extract messages from source files and add them to the index.
     *
     * @throws {ArgumentError}
     * @throws {TypeError}
     *
     * @param {array|string} File path(s)/glob(s)
     * @param {string} (optional) File encoding, default is `opts.encoding`
     * @return {self}
     */
    addFiles(globs, encoding = null) {
        const files = this.glob(globs)
        this.logger.info('Extracting from', files.length, 'files')
        let count = 0
        files.forEach(file => {
            count += addFile.call(this, file, encoding).length
        })
        this.logger.info('Extracted', count, 'key instances')
        return this
    }

    /**
     * Extract messges from a file and add them to the index.
     *
     * @throws {TypeError}
     *
     * @param {string} The file
     * @param {string} (optional) File encoding, default is `opts.encoding`
     * @return {self}
     */
    addFile(file, encoding = null) {
        checkArg(file, 'file', 'string')
        const rel = this.relPath(file)
        this.logger.info('Extracting from', {file: rel})
        const count = addFile.call(this, file, encoding).length
        this.logger.info('Extracted', count, 'key instances')
        return this
    }

    /**
     * Get all extracted messages.
     *
     * @return {array} The collated messages
     */
    getMessages() {
        const {context} = this.opts
        return this.idx.keys(context).map(key => ({
            key,
            context,
            refs     : this.idx.refs(context, key),
            comments : this.idx.comments(context, key),
        }))
    }

    /**
     * Clear all messages.
     *
     * @return {self}
     */
    clear() {
        this.idx.clear()
        return this
    }
}

/**
 * @private
 * @param {string}
 * @param {string}
 * @return {array}
 */
function addFile(file, encoding = null) {
    checkArg(file, 'file', 'string')
    encoding = encoding || this.opts.encoding
    const content = this.readFile(file).toString(encoding)
    return addFileContent.call(this, file, content)
}

/**
 * @private
 * @param {string}
 * @param {string}
 * @return {array}
 */
function addFileContent(file, content) {
    const {context} = this.opts
    const rel = this.relPath(file)
    this.verbose(1, {file: rel})
    const msgs = extractFromCode(content, this.opts, this.logger)
    msgs.forEach(msg => {
        const {key} = msg
        const ref = [rel, msg.loc.start.line].join(':')
        const cmt = msg.comment || null
        this.verbose(3, {key, ref, cmt})
        this.idx.add(context, key, ref, cmt)
    })
    this.verbose(msgs.length ? 1 : 2, msgs.length, 'keys', {file: rel})
    return msgs
}

/**
 * Format an extracted comment string.
 *
 * @param {string} The comment
 * @param {object} The options
 * @return {string|null} The formatted string
 */
function formatComment(str, opts) {
    if (str.trim().length === 0) {
        return null
    }
    const rawLines = str.replace(/\r\n/g, '\n').split('\n')
    if (rawLines.length === 1) {
        return rawLines[0].trim()
    }
    // Multi-line comment. Trim lines and check for formatting indicator.
    const {fchars} = opts.comments
    const isFormatted = Boolean(fchars) && fchars.includes(str[0])
    return rawLines.map((line, i) => {
        if (isFormatted && i === 0) {
            line = line.substr(1)
        }
        line = line.trim()
        if (isFormatted && line[0] === '*') {
            line = line.substr(1).trim()
        }
        return line
    }).join('\n').trim() || null
}

/**
 * Adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 *
 * @param {string} The code
 * @param {object} The options
 * @param {Logger} The logger
 * @return {array} Extracted message objects {key, loc}
 */
function extractFromCode(content, opts, log) {
    const markers = arrayUnique(castToArray(opts.marker))
    const markersHash = valueHash(markers, null)
    const commentKeyRegex = opts.comments.keyRegex
        ? new RegExp(opts.comments.keyRegex)
        : null
    const commentIngoreRegex = opts.comments.ignoreRegex
        ? new RegExp(opts.comments.ignoreRegex)
        : null
    const keyFilter = isFunction(opts.filter)
        ? key => Boolean(key) && opts.filter.call(this, key)
        : Boolean
    const keys = []
    const ignoredLineHash = Object.create(null)
    const cidx = new CommentIndex
    const makeComment = keyLine => {
        const cmts = cidx.forKeyAt(keyLine)
        cidx.remove(cmts)
        return cmts.map(it => formatComment(it.value, opts))
            .join('\n').trim() || null
    }
    const {ast} = transformSync(content, getBabelOpts(opts))
    if (opts.comments.extract) {
        cidx.add(ast.comments)
    }        
    ast.comments.forEach(comment => {
        const {loc} = comment
        const lineStart = loc.start.line
        // Look for keys in the comments.
        const keyMatch = commentKeyRegex
            ? commentKeyRegex.exec(comment.value)
            : null
        if (keyMatch) {
            const msg = {
                key: keyMatch[1].trim(),
                loc: loc,
            }
            // Extract comments, excluding this one.
            cidx.remove(comment)
            msg.comment = makeComment(lineStart)
            keys.push(msg)
        }
        // Check for ignored lines
        const ignoreMatch = commentIngoreRegex
            ? commentIngoreRegex.exec(comment.value)
            : null
        if (ignoreMatch) {
            ignoredLineHash[lineStart] = true
            cidx.remove(comment)
        }
    })
    // Look for keys in the source code.
    traverse(ast, {
        CallExpression: path => {
            const {node} = path
            const {loc, callee: {name, type, property}} = node
            const shouldIgnore = Boolean(
                // Skip ignored lines
                loc && ignoredLineHash[loc.end.line]
            )
            const shouldExtract = !shouldIgnore && Boolean(
                // Match marker
                (
                    type === 'Identifier' &&
                    markersHash[name]
                ) ||
                // Include members if enabled
                (
                    opts.members &&
                    type === 'MemberExpression' &&
                    markersHash[property.name]
                )
                //||markers.some(marker => path.get('callee').matchesPattern(marker))
            )
            if (!shouldExtract) {
                return
            }
            const aidx = opts.argPos < 0
                ? node.arguments.length + opts.argPos
                : opts.argPos
            const arg = node.arguments[aidx]
            if (!arg) {
                log.warn('No argument found at position', opts.argPos, loc)
                return
            }
            getKeys(arg, log).filter(keyFilter).forEach(key => {
                const msg = {key, loc}
                // Extract comments.
                msg.comment = makeComment(loc.start.line)
                keys.push(msg)
            })
        },
    })
    return keys
}

/**
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 *
 * @param {Node} Babel node (See @babel/parser/lib/index.js)
 * @param {Logger} The logger
 * @return {array} Extracted message objects {key, loc}
 */
function getKeys(node, log) {

    if (node.type === 'StringLiteral') {
        return [node.value]
    }

    if (node.type === 'BinaryExpression' && node.operator === '+') {
        const left = getKeys(node.left, log)
        const right = getKeys(node.right, log)
        if (left.length > 1 || right.length > 1) {
            // TODO
            log.warn( 
                'Unsupported multiple keys for binary expression, keys skipped.'
            )
        }
        return [left[0] + right[0]]
    }

    if (node.type === 'TemplateLiteral') {
        return [node.quasis.map(quasi => quasi.value.cooked).join('*')]
    }

    if (node.type === 'ConditionalExpression') {
        return [...getKeys(node.consequent, log), ...getKeys(node.alternate, log)]
    }

    if (node.type === 'LogicalExpression') {
        switch (node.operator) {
            case '&&':
                return [...getKeys(node.right, log)]
            case '||':
                return [...getKeys(node.left, log), ...getKeys(node.right, log)]
            default:
                log.warn(
                    `Unsupported logicalExpression operator: ${node.operator}`
                )
                return [null]
        }
    }

    if (NoInformationTypes[node.type]) {
        return ['*'] // We can't extract anything.
    }

    log.warn(`Unsupported node: ${node.type}`)

    return [null]
}

/**
 * @param {object}
 * @return {object}
 */
function getCommentOpts(opts) {
    const {comments} = opts
    if (comments === true) {
        return {...Defaults.comments}
    }
    if (typeOf(comments) !== 'object') {
        return {}
    }
    return comments
}

/**
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 *
 * Get the babel options.
 *
 * @throws {ArgumentError}
 * @throws {TypeErrpr}
 *
 * @param {object}
 * @return {object}
 */
function getBabelOpts(opts) {
    const {parser} = opts
    const type = typeOf(parser)
    if (type === 'object') {
        return parser
    }
    if (type === 'string') {
        if (!Parsers[parser]) {
            throw new ArgumentError(`Unknown parser: '${parser}'`)
        }
        return Parsers[parser].babel
    }
    throw new ArgumentError(`Option 'parser' must be an object or string, got '${type}'`)
}

class CommentIndex {

    constructor() {
        this.idx = {}
    }

    add(comments) {
        castToArray(comments).forEach(comment => {
            const {loc} = comment
            const {line} = loc.end
            const hash = hashLoc(loc)
            lset(this.idx, [line, hash], comment)
        })
    }

    remove(comments) {
        castToArray(comments).forEach(comment => {
            const {loc} = comment
            const {line} = loc.end
            const hash = hashLoc(loc)
            if (this.idx[line]) {
                delete this.idx[line][hash]
                if (!Object.keys(this.idx[line]).length) {
                    delete this.idx[line]
                }
            }
        })
    }

    forKeyAt(keyLine) {
        const cmts = []
        // Check the line above and the current line.
        for (let i = -1; i < 1; ++i) {
            const line = keyLine + i
            if (this.idx[line]) {
                Object.values(this.idx[line]).forEach(comment => {
                    cmts.push(comment)
                })
            }
        }
        return cmts
    }
}

function hashLoc(loc) {
    const {start, end} = loc
    return [start.line, start.column, end.line, end.column].join('/')
}

/**
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
const AllPlugins = [
    // Enable all the plugins
    'jsx',
    'asyncFunctions',
    'classConstructorCall',
    'doExpressions',
    'trailingFunctionCommas',
    'objectRestSpread',
    'decoratorsLegacy',
    'classProperties',
    'exportExtensions',
    'exponentiationOperator',
    'asyncGenerators',
    'functionBind',
    'functionSent',
    'dynamicImport',
    'optionalChaining',
]

/**
 * Adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
function makeParserOpts(type) {
    return {
        ast: true,
        parserOpts: {
            sourceType: 'module',
            plugins: [type, ...AllPlugins],
        },
    }
}

const Parsers = {
    flow: {
        babel: makeParserOpts('flow')
    },
    typescript: {
        babel: makeParserOpts('typescript')
    },
}

/**
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
const NoInformationTypes = valueHash([
    'CallExpression',
    'Identifier',
    'MemberExpression',
])

module.exports = Extractor