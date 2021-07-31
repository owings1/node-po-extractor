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
 * Contains code copied and modified from mochajs
 *
 * - https://mochajs.org/
 * - https://github.com/mochajs/mocha/blob/e044ef02/lib/reporters/base.js
 *
 * The mochajs license is as follows:
 * ----------------------------------
 *
 * (The MIT License)
 * 
 * Copyright (c) 2011-2021 OpenJS Foundation and contributors, https://openjsf.org
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const child_process = require('child_process')
const path = require('path')

const {ArgumentError} = require('./errors')

class Util {

    static arrayHash(...args) {
        return Object.fromEntries(
            args.map(Object.values).flat().map(value =>
                [value, true]
            )
        )
    }

    static buffersEqual(a, b) {
        if (Util.isFunction(a.equals)) {
            return a.equals(b)
        }
        if (Util.isFunction(a.compare)) {
            return a.compare(b) == 0
        }
        const len = a.length
        if (len != b.length) {
            return false
        }
        for (let i = 0; i < len; ++i) {
            if (a.readUInt8(i) !== b.readUInt8(i)) {
                return false
            }
        }
        return true
    }

    static castToArray(val) {
        if (Array.isArray(val)) {
            return val
        }
        const arr = []
        if (val != null) {
            arr.push(val)
        }
        return arr
    }

    // arg, name, type
    static checkArg(...args) {
        while (args.length) {
            const [arg, name, exp] = args.splice(0, 3)
            let argType = typeof arg
            if (arg === null) {
                argType = 'null'
            } else if (Array.isArray(arg)) {
                argType = 'array'
            } else if (Buffer.isBuffer(arg)) {
                argType = 'buffer'
            }
            let ret
            if (Util.isFunction(exp)) {
                ret = exp(arg, argType)
                if (ret === true) {
                    continue
                }
                if (ret instanceof Error) {
                    throw ret
                }
                ret = ret || `Invalid argument (${name}): ${arg}.`
            } else if (argType == exp) {
                continue
            }
            throw new ArgumentError(
                ret || `Argument (${name}) must be type ${exp}, got '${argType}'.`
            )
        }
        return Util
    }

    static checkMax(value, max) {
        if (!Number.isFinite(max) || max < 0) {
            return false
        }
        return value > max
    }

    static exec(cmd, args, opts) {
        args = args || []
        opts = opts || {}
        opts = {...opts, env: {...process.env, ...opts.env}}
        const result = child_process.spawnSync(cmd, args, opts)
        if (result.error) {
            throw result.error
        }
        return result
    }

    static getOrCall(thing, ...args) {
        return Util.isFunction(thing) ? thing(...args) : thing
    }

    static isFunction(arg) {
        return typeof arg == 'function'
    }

    static isGitDirty(file) {
        const basename = path.basename(file)
        const cmd = 'git'
        const args = ['diff-index', 'HEAD', '--', basename]
        const opts = {cwd: path.dirname(file), env: {FORCE_COLOR: '0'}}
        const result = Util.exec(cmd, args, opts)
        if (result.status != 0) {
            return result
        }
        const output = result.stdout.toString('utf-8')
        const files = output.trim().split('\n')
            .map(line => line.split('\t')[1])
            .filter(Boolean)
        console.log({files})
        return files.some(file => file.includes(basename))
    }

    static isGitUntracked(file) {
        const basename = path.basename(file)
        const cmd = 'git'
        const args = ['ls-files', '--other', '--exclude-standard', '--', basename]
        const opts = {cwd: path.dirname(file), env: {FORCE_COLOR: '0'}}
        const result = Util.exec(cmd, args, opts)
        if (result.status != 0) {
            return result
        }
        const output = result.stdout.toString('utf-8')
        const files = output.trim().split('\n').filter(Boolean)
        return files.some(file => file.includes(basename))
    }

    static locHash(loc) {
        const {start = {}, end = {}} = loc || {}
        return [start.line, start.column, end.line, end.column].join('/')
    }

    static locToObject(loc) {
        const {start = {}, end = {}} = loc || {}
        return {...loc, start: {...start}, end: {...end}}
    }

    /**
     * Adapted from:
     *
     *   https://github.com/mochajs/mocha/blob/e044ef02/lib/reporters/base.js#L223
     *
     * Get normalized message and stack info for an error.
     *
     * @param {Error} The error to parse
     * @return {object} Strings {stack, message, rawMessage}
     */
    static parseStack(err) {

        // Normalize raw error message.
        const rawMessage = Util.rawErrorMessage(err)

        let message = ''
        let stack = err.stack || rawMessage

        if (rawMessage) {
            // Check if the stack contains the rawMessage.
            const rawStart = stack.indexOf(rawMessage)
            if (rawStart > -1) {
                // Add everything from the start of the stack until the end
                // of the the raw message to errMessage, which will
                // typically include the error name at the beginning.
                const rawEnd = rawStart + rawMessage.length
                message += stack.slice(0, rawEnd)
                // Remove everything up to the raw message, and the following
                // newline character from the stack.
                stack = stack.slice(rawEnd + 1)
            }
        }

        return {stack, message, rawMessage}
    }

    /**
     * Adapted from:
     *
     *   https://github.com/mochajs/mocha/blob/e044ef02/lib/reporters/base.js#L245
     *
     * Normalize raw error message.
     *
     * @param {Error} The error to examine
     * @return {string} The normalized message
     */
    static rawErrorMessage(err) {
        let raw = ''
        if (typeof err.inspect == 'function') {
            raw += err.inspect()
        } else if (err.message && typeof err.message.toString == 'function') {
            raw += err.message
        }
        return raw
    }

    static relPath(baseDir, file) {
        if (baseDir) {
            return path.relative(baseDir, file)
        }
        return file
    }

    static resolveSafe(dir, ...args) {
        if (dir) {
            return path.resolve(dir, ...args)
        }
        return path.resolve(...args)
    }

    static revalue(obj, cb) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value], i) =>
                [key, cb(value, i)]
            )
        )
    }
}

module.exports = Util