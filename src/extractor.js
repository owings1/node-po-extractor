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

// Dependency requires
const chalk = require('chalk')
const globby = require('globby')
const I18nExtract = require('i18n-extract')

// Node requires
const fs   = require('fs')
const path = require('path')

// Package requires
const Base = require('./base')
const Sort = require('./sorters')
const {
    castToArray,
    checkArg,
    //isFunction,
    lget,
    lset,
    locHash,
    locToObject,
    relPath,
    resolveSafe,
} = require('./util')
//const {} = require('./errors')


// Default options.
const Defaults = {
    marker: '__',
    logging: {
        chalks: {
            info: {
                prefix: chalk.green,
            },
        },
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
    }

   /**
    * Extract messages from source files.
    *
    * See: https://github.com/oliviertassinari/i18n-extract
    *
    * @throws {ArgumentError}
    *
    * @param {array} File globs
    * @return {array} Extracted message objects
    */
    extract(globs) {
        const {opts} = this
        globs = castToArray(globs).map(glob => resolveSafe(opts.baseDir, glob))
        checkArg(globs, 'globs', it => (
            Boolean(it.length) || 'Argument (globs) cannot be empty'
        ))
        const files = globby.sync(globs)
        this.logger.info(
            'Extracting messages from', files.length, 'files'
        )
        const extracted = I18nExtract.extractFromFiles(files, opts)
        extracted.forEach(message => this._extendExtracted(message))
        return this._collate(extracted)
    }

    /**
     * @private
     *
     * @param {object}
     * @return {undefined}
     */
    _extendExtracted(message) {
        if (message.file) {
            message.file = relPath(this.opts.baseDir, message.file)
            this._ensureReference(message)
        }
    }

    /**
     * @private
     *
     * @param {object}
     * @return {boolean}
     */
    _ensureReference(message) {
        if (message.reference) {
            return true
        }
        if (!message.file || !message.loc || !message.loc.start) {
            return false
        }
        message.reference = [message.file, message.loc.start.line].join(':')
        return true
    }

    /**
     * @private
     *
     * @param {array}
     * @return {array}
     */
    _collate(messages) {
        const index = this._index(messages)
        const collated = Object.values(index)
        collated.forEach(message => {
            const {files, locs, refs} = message
            if (files) {
                message.files = Object.keys(files).sort(Sort.lc)
                delete message.file
            }
            if (refs) {
                message.references = Object.keys(refs).sort(Sort.ref)
                delete message.reference
            }
            if (locs) {
                message.locs = Object.values(locs)
                    .map(Object.values).flat().sort(Sort.loc)
                delete message.loc
            }
        })
        return collated
    }

    /**
     * @private
     *
     * @param {array}
     * @return {object}
     */
    _index(messages) {
        const index = {}
        messages.forEach(message => {
            const {key} = message
            if (!index[key]) {
                index[key] = {...message, files: {}, locs: {}, refs: {}}
            }
            const indexed = index[key]
            if (message.file) {
                indexed.files[message.file] = true
            }
            if (this._ensureReference(message)) {
                indexed.refs[message.reference] = true
                const {file} = message
                if (!indexed.locs[file]) {
                    indexed.locs[file] = {}
                }
                const loc = locToObject(message.loc)
                loc.file = file
                if (!loc.filename) {
                    loc.filename = file
                }
                indexed.locs[file][locHash(loc)] = loc
            }
        })
        return index
    }
}

module.exports = Extractor