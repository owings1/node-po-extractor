/**
 * @quale/dev-i18n
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
import {castToArray} from '@quale/core/types.js'
import Logger from '@quale/term/logger.js'
import {merge} from '@quale/term/merging.js'
import globby from 'globby'

import {EventEmitter} from 'events'
import fs from 'fs'
import path from 'path'

import {checkArg} from './util.js'

// Default options
const Defaults = {
    context : '',
    baseDir : '.',
    verbose : 0,
    logging : {},
}

export default class Base extends EventEmitter {

    /**
     * @throws {TypeError}
     *
     * @param {...object} opts The options, merged, in order.
     */
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
     * @param {String} file The file path
     * @return {Buffer} The file content
     */
    readFile(file) {
        checkArg(file, 'file', 'string')
        return fs.readFileSync(this.resolve(file))
    }

    /**
     * Search for files matching the globs.
     *
     * @throws {ArgumentError}
     * @throws {TypeError}
     *
     * @param {String|String[]} globs The globs
     * @return {String[]} The matching files
     */
    glob(globs) {
        checkArg(
            globs, 'globs', 'string|array',
            globs, 'globs', value => (
                Boolean(value.length) || 'Argument (globs) cannot be empty'
            )
        )
        globs = castToArray(globs).map(glob => this.resolve(glob))
        return globby.sync(globs)
    }

    /**
     * Get the path relative to the baseDir, if set.
     *
     * @param {String} file
     * @return {String}
     */
    relPath(file) {
        const {baseDir} = this.opts
        if (baseDir) {
            return path.relative(baseDir, this.resolve(file))
        }
        return file
    }

    /**
     * Resolve a path to the baseDir, if set.
     *
     * @param {String} file
     * @return {String}
     */
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
     * @param {Number} vlevel The verbose level of the message
     * @param {...*} args The message(s)
     */
    verbose(vlevel, ...args) {
        checkArg(vlevel, 'vlevel', 'number')
        if (vlevel > this.opts.verbose && vlevel + 2 > this.logLevel) {
            return
        }
        this.logger.info(...args)
    }

    /**
     * @type {Number}
     */
    get logLevel() {
        return this.logger.logLevel
    }

    set logLevel(level) {
        this.logger.logLevel = level
        this.opts.logging.logLevel = this.logger.logLevel
    }
}
