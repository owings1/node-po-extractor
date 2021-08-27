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
const {
    merging : {merge},
    types   : {castToArray, typeOf},
    Logger,
} = require('utils-h')
const globby = require('globby')

// Node requires
const {EventEmitter} = require('events')
const fs = require('fs')
const path = require('path')

// Package requires
const {checkArg} = require('./util.js')

// Default options
const Defaults = {
    baseDir  : '.',
    dryRun   : false,
    verbose  : 0,
    logging  : {},
}

class Base extends EventEmitter {

    constructor(...opts) {
        super()
        this.opts = merge(Defaults, ...opts)
        this.logger = new Logger(this.opts.logging)
        this.logLevel = this.opts.logging.logLevel
    }

    /**
     * Read a file.
     *
     * @throws {TypeError}
     *
     * @param {string} The file path
     * @return {buffer} The file content
     */
    readFile(file) {
        checkArg(file, 'file', 'string')
        return fs.readFileSync(this.resolve(file))
    }

    glob(globs) {
        globs = castToArray(globs).map(glob => this.resolve(glob))
        return globby.sync(globs)
    }

    relPath(file) {
        const {baseDir} = this.opts
        if (baseDir) {
            return path.relative(baseDir, this.resolve(file))
        }
        return file
    }

    resolve(file) {
        const {baseDir} = this.opts
        if (baseDir) {
            return path.resolve(baseDir, file)
        }
        return path.resolve(file)
    }

    /**
     * Logs a message according to verbose setting.
     *
     * @throws {TypeError}
     *
     * @param {integer} The verbose level of the message
     * @param {...any} The message(s)
     * @return {undefined}
     */
    verbose(vlevel, ...args) {
        checkArg(vlevel, 'vlevel', 'number')
        if (vlevel > this.opts.verbose && vlevel + 2 > this.logLevel) {
            return
        }
        this.logger.info(...args)
    }

    /**
     *
     */
    get logLevel() {
        return this.logger.logLevel
    }

    /**
     *
     */
    set logLevel(level) {
        this.logger.logLevel = level
        this.opts.logging.logLevel = this.logger.logLevel
    }

    static checkGlobArg(value) {
        checkArg(value, 'globs', 'string|array')
        return Boolean(value.length) || 'Argument (globs) cannot be empty'
    }
}

module.exports = Base