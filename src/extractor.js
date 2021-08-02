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
 * - https://mochajs.org/
 * - https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 *
 * Methods _getKeys() and _extractFromCode()
 * Function getBabelOpts()
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
const chalk           = require('chalk')
const globby          = require('globby')
const {transformSync} = require('@babel/core')
const traverse        = require('@babel/traverse').default

// Node requires
const fs   = require('fs')
const path = require('path')

// Package requires
const Base  = require('./base')
const Index = require('./index')
const Sort  = require('./sorters')
const {
    arrayHash,
    arrayUnique,
    castToArray,
    checkArg,
    lget,
    lset,
    locHash,
    locToObject,
    relPath,
    resolveSafe,
} = require('./util')

const {ArgumentError} = require('./errors')

// Default options.
const Defaults = {
    context  : '',
    encoding : 'utf-8',
    marker   : ['i18n', '__'],
    logging: {
        chalks: {
            info: {
                prefix: chalk.green,
            },
        },
    },
    parsing  : {
        parser              : null,
        babelOptions        : null,
        keyLoc              : 0,
        commentRegExp       : /i18n-extract (.+)/,
        commentIgnoreRegExp : /i18n-extract-disable-line/,
    },
}

class Extractor extends Base {

    /**
     * @constructor
     *
     * @param {object} (optional) The options
     */
    constructor(opts) {
        super(Defaults, opts)
        this.opts.marker = arrayUnique(castToArray(this.opts.marker))
        this.idx = new Index
    }

   /**
    * Extract messages from source files and return the message objects. This
    * is equivalent to calling `this.addFiles().getMessages()`.
    *
    * @throws {ArgumentError}
    *
    * @param {array|string} File path(s)/glob(s)
    * @param {string} (optional) File encoding, default is `opts.encoding`
    * @return {array} Extracted message objects
    */
    extract(globs, encoding = null) {
        return this.addFiles(globs, encoding).getMessages()
    }

    /**
     * Extract messges from a file and add them to the index.
     *
     * @throws {ArgumentError}
     *
     * @param {string} The file
     * @param {string} (optional) File encoding, default is `opts.encoding`
     * @return {self}
     */
    addFile(file, encoding = null) {
        checkArg(file, 'file', 'string')
        encoding = encoding || this.opts.encoding
        const content = this.readFile(file).toString(encoding)
        this._addFileContent(file, content)
        return this
    }

    /**
     * Extract messages from source files and add them to the index.
     *
     * @throws {ArgumentError}
     *
     * @param {array|string} File path(s)/glob(s)
     * @param {string} (optional) File encoding, default is `opts.encoding`
     * @return {self}
     */
    addFiles(globs, encoding = null) {
        const {opts} = this
        const {baseDir, context} = this.opts
        globs = castToArray(globs).map(glob => resolveSafe(baseDir, glob))
        checkArg(globs, 'globs', it => (
            Boolean(it.length) || 'Argument (globs) cannot be empty'
        ))
        const files = globby.sync(globs)
        this.logger.info('Extracting from', files.length, 'files')
        files.forEach(file => this.addFile(file, encoding))
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
     * @private
     *
     * @param {string}
     * @param {string}
     * @return {undefined}
     */
    _addFileContent(file, content) {
        const {baseDir, context, marker} = this.opts
        const rel = relPath(baseDir, file)
        this.verbose(1, {file: rel})
        const msgs = this._extractFromCode(content)
        msgs.forEach(msg => {
            const {key} = msg
            const ref = [rel, msg.loc.start.line].join(':')
            const cmt = null
            this.verbose(3, {key, ref, cmt})
            this.idx.add(context, key, ref, cmt)
        })
        this.verbose(msgs.length ? 1 : 2, msgs.length, 'keys', {file: rel})
    }

    /**
     * Copied and adapted from:
     *
     *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
     *
     * @private
     * @param {string} The code
     * @return {array} Extracted message objects {key, loc}
     */
    _extractFromCode(content) {

        const markers = castToArray(this.opts.marker)
        const markersHash = arrayHash(markers)
        
        const {
            keyLoc,
            commentRegExp,
            commentIgnoreRegExp,
        } = this.opts.parsing

        const {ast} = transformSync(content, this._getBableOpts())

        const keys = []
        const ignoredLines = []

        // Look for keys in the comments.
        ast.comments.forEach(comment => {
            let match = commentRegExp.exec(comment.value)
            if (match) {
                keys.push({
                    key: match[1].trim(),
                    loc: comment.loc,
                })
            }

            // Check for ignored lines
            match = commentIgnoreRegExp.exec(comment.value)
            if (match) {
                ignoredLines.push(comment.loc.start.line)
            }
        })

        // Look for keys in the source code.
        traverse(ast, {

            CallExpression: (path) => {

                const {node} = path

                if (node.loc) {
                    if (ignoredLines.includes(node.loc.end.line)) {
                        // Skip ignored lines
                        return
                    }
                }

                const {callee: {name, type}} = node

                const shouldProcess = Boolean(
                    (type === 'Identifier' && markersHash[name]) ||
                    markers.some(marker => path.get('callee').matchesPattern(marker))
                )
                if (!shouldProcess) {
                    return
                }
                //console.log(node)
                const nodeArg = keyLoc < 0
                    ? node.arguments[node.arguments.length + keyLoc]
                    : node.arguments[keyLoc]

                this._getKeys(nodeArg).filter(Boolean).forEach(key => {
                    keys.push({
                        key,
                        loc: node.loc,
                    })
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
     * @private
     * @param {Node} Babel node (See @babel/parser/lib/index.js)
     * @return {array} Extracted message objects {key, loc}
     */
    _getKeys(node) {

        if (node.type === 'StringLiteral') {
            return [node.value]
        }

        if (node.type === 'BinaryExpression' && node.operator === '+') {
            const left = this._getKeys(node.left)
            const right = this._getKeys(node.right)
            if (left.length > 1 || right.length > 1) {
                this.logger.warn('Unsupported multiple keys for binary expression, keys skipped.'); // TODO
            }
            return [left[0] + right[0]]
        }

        if (node.type === 'TemplateLiteral') {
            return [node.quasis.map(quasi => quasi.value.cooked).join('*')]
        }

        if (node.type === 'ConditionalExpression') {
            return [...this._getKeys(node.consequent), ...this._getKeys(node.alternate)]
        }

        if (node.type === 'LogicalExpression') {
            switch (node.operator) {
                case '&&':
                    return [...this._getKeys(node.right)]
                case '||':
                    return [...this._getKeys(node.left), ...this._getKeys(node.right)]
                default:
                    this.logger.warn(`Unsupported logicalExpression operator: ${node.operator}`)
                    return [null]
            }
        }

        if (noInformationTypes.includes(node.type)) {
            return ['*'] // We can't extract anything.
        }

        this.logger.warn(`Unsupported node: ${node.type}`)

        return [null]
    }

    /**
     * Get the babel options.
     *
     * @return {object}
     */
    _getBableOpts() {
        const {parser, babelOptions} = this.opts.parsing
        return getBabelOpts(parser, babelOptions)
    }
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
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
const Parsers = {
    flow: {
        opts: {
            sourceType: 'module',
            plugins: ['flow', ...AllPlugins],
        }
    },
    typescript: {
        opts: {
            sourceType: 'module',
            plugins: ['typescript', ...AllPlugins],
        },
    },
    get default() { return Parsers.flow },
}

/**
 * Copied from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
const noInformationTypes = [
    'CallExpression',
    'Identifier',
    'MemberExpression',
]

/**
 * Copied and adapted from:
 *
 *   https://github.com/oliviertassinari/i18n-extract/blob/9110ba51/src/extractFromCode.js
 */
function getBabelOpts(parser, babelOptions) {

    if (babelOptions && parser) {
        throw new ArgumentError("Can't specify both parser and Babel options!")
    }

    if (babelOptions) {
        return babelOptions
    }

    parser = parser || 'default'

    if (!Parsers[parser]) {
        const keystr = Object.keys(Parsers).join(', ')
        throw new ArgumentError(`Parser must be one of: ${keystr}`)
    }

    return {ast: true, parserOpts: Parsers[parser].opts}
}

module.exports = Extractor