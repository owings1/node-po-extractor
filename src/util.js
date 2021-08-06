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
 * Methods parseStack() and rawErrorMessage()
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
/**
 * Contains code copied directly and repacked (with minor style adjustment)
 * from is-plain-object
 *
 * - https://www.npmjs.com/package/is-plain-object
 * - https://github.com/jonschlinkert/is-plain-object/blob/0a47f0f6/is-plain-object.js
 *
 * Methods isObject() and isPlainObject()
 *
 * The is-plain-object license is as follows:
 * ----------------------------------
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
/**
 * Contains code (AnsiRegex) copied from ansi-regex:
 *
 *  - https://github.com/chalk/ansi-regex/blob/c1b5e45f/index.js
 *  - https://www.npmjs.com/package/ansi-regex
 *
 * MIT License
 * 
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const chalk     = require('chalk')
const chalkPipe = require('chalk-pipe')
const deepmerge = require('deepmerge')

const child_process = require('child_process')
const path = require('path')
const {EventEmitter} = require('events')

const {
    ArgumentError,
    ExecExitError,
    ExecResultError,
} = require('./errors')

class Util {

    static arrayHash(...args) {
        return Object.fromEntries(
            args.map(Object.values).flat().map(value =>
                [value, true]
            )
        )
    }

    static arrayUnique(...arrs) {
        return Object.keys(Util.arrayHash(...arrs))
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

    static cat(...args) {
        return args.flat().join('')
    }

    static ChangeProxy(source, opts) {
        const {checkArg, isObject} = Util
        checkArg(
            source, 'source', 'object',
            opts  , 'opts'  , 'object',
        ).checkArg(
            opts.transform  , 'transform', 'function',
            opts.filter     , 'filter'   , 'null|function',
        )
        const enumerable = Boolean(opts.enumerable)
        const {filter, transform} = opts

        function build(source, opts) {
            const ingress = {}, target = {}
            Object.keys(source).forEach(key => {
                const prop = {enumerable}
                if (isObject(source[key])) {
                    const next = build(source[key], opts)
                    Object.defineProperty(target, key, {value: next.target})
                    prop.get = () => next.ingress
                    prop.set = object => {
                        if (!isObject(object)) {
                            return
                        }
                        Object.keys(object).forEach(key =>
                            next.ingress[key] = object[key]
                        )
                    }
                } else {
                    target[key] = transform(source[key])
                    prop.get = () => source[key]
                    prop.set = value => {
                        if (filter && !filter(value)) {
                            return
                        }
                        source[key] = value
                        target[key] = transform(value)
                    }
                }
                Object.defineProperty(ingress, key, prop)
            })
            return {ingress, target}
        }
        return build(source, opts)
    }

    // arg, name, type, ...
    static checkArg(...args) {
        while (args.length) {
            const [arg, name, exp] = args.splice(0, 3)
            const argType = Util.typeOf(arg)
            let ret
            if (Util.isFunction(exp)) {
                ret = exp(arg, argType)
                if (ret === true) {
                    continue
                }
                if (ret instanceof Error) {
                    throw ret
                }
                ret = `Invalid argument (${name}):` + (ret || arg)
            } else if (exp.split('|').includes(argType)) {
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

    static createMerger(opts) {
        const {arrayHash, checkArg, isPlainObject} = Util
        opts = {
            name: null,
            argFilter: Boolean,
            ignoreKeys: null,
            customMerge: null,
            isMergeableObject: isPlainObject,
            ...opts
        }
        if (opts.ignoreKeys && opts.customMerge) {
            throw new ArgumentError(`Cannot specify both ignoreKeys and customMerge`)
        }
        checkArg(
            opts.argFilter,         'argFilter',         'function|null',
            opts.ignoreKeys,        'ignoreKeys',        'array|null',
            opts.isMergeableObject, 'isMergeableObject', 'function|null',
            opts.customMerge,       'customMerge',       'function|null',
            opts.name,              'name',              'string|null',
        )

        function chooseb(a, b) {
            return b
        }
        function noFilter() {
            return true
        }
        const filter = opts.argFilter || noFilter

        const merger = function customMerger(...args) {
            return deepmerge.all(args.filter(filter), opts)
        }

        const {ignoreKeys} = opts
        if (ignoreKeys) {
            const keyHash = arrayHash(ignoreKeys)
            opts.customMerge = function checkKeyChooseb(key) {
                if (keyHash[key]) {
                    return chooseb
                }
            }
            Object.defineProperty(merger, 'getIgnoreKeysHashCopy', {
                value: function keyHashView () {
                    return arrayHash(ignoreKeys)
                }
            })
        } else if (opts.customMerge) {
            Object.defineProperties(merger, {
                isCustomMerge: {
                    value: true,
                },
                customMergeProxy: {
                    value: function customMergeProxy(key) {
                        return opts.customMerge(key)
                    },
                },
                customMergeName: {
                    value: opts.customMerge.name,
                },
            })
        }

        if (opts.name) {
            Object.defineProperty(merger, 'name', {value: opts.name})
        }

        return merger
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

    static getOrCallBound(thing, ...args) {
        return Util.isFunction(thing) ? thing.call(...args) : thing
    }

    static gitFileStatus(file) {
        const basename = path.basename(file)
        const cmd = 'git'
        const args = ['status', '--porcelain=v1', '--', basename]
        const opts = {cwd: path.dirname(file)}
        let result
        try {
            result = Util.exec(cmd, args, opts)
        } catch (error) {
            const err = new ExecResultError(
                error.message || `Failed to execute git command`,
                error,
            )
            err.code = error.code
            throw err
        }
        if (result.status != 0) {
            const err = new ExecExitError(
                `Git exited with status code ${result.status}`
            )
            const {status, signal, pid, stderr} = result
            Util.update(err, {
                status,
                signal,
                pid,
                stderr: stderr.toString('utf-8'),
            })
            throw err
        }
        const output = result.stdout.toString('utf-8')
        const lines = output.split('\n')
        let fileStatus = 'clean'
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i]
            const attr = line.substring(0, 2)
            if (!line.toLowerCase().includes(basename.toLowerCase())) {
                continue
            }
            if (attr.includes('?')) {
                fileStatus = 'untracked'
            } else if (attr == 'M ') {
                fileStatus = 'staged'
            } else if (attr == 'A ') {
                fileStatus = 'added'
            } else {
                // default catch-all
                fileStatus = 'modified'
            }
            break
        }
        return {fileStatus, result}
    }

    static isFunction(arg) {
        return typeof arg === 'function'
    }

    /**
     * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
     *
     * Copyright (c) 2014-2017, Jon Schlinkert.
     * Released under the MIT License.
     */
    static isObject(o) {
         return Object.prototype.toString.call(o) === '[object Object]'
     }

    /**
     * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
     *
     * Copyright (c) 2014-2017, Jon Schlinkert.
     * Released under the MIT License.
     */
    static isPlainObject(o) {
        let ctor
        let prot
        if (Util.isObject(o) === false) {
            return false
        }
        // If has modified constructor
        ctor = o.constructor
        if (ctor === undefined) {
            return true
        }
        // If has modified prototype
        prot = ctor.prototype
        if (Util.isObject(prot) === false) {
            return false
        }
        // If constructor does not have an Object-specific method
        if (prot.hasOwnProperty('isPrototypeOf') === false) {
            return false
        }
        // Most likely a plain Object
        return true
    }

    static isReadableStream(arg) {
        return arg instanceof EventEmitter && Util.isFunction(arg.read)
    }

    static isStream(arg) {
        return Util.isReadableStream(arg) || Util.isWriteableStream(arg)
    }

    static isString(arg) {
        return typeof arg === 'string'
    }

    static isWritableStream(arg) {
        return Util.isWriteableStream(arg)
    }

    static isWriteableStream(arg) {
        return (
            arg instanceof EventEmitter &&
            Util.isFunction(arg.write) &&
            Util.isFunction(arg.end)
        )
    }

    static lget(obj, keyPath) {
        if (!keyPath) {
            return
        }
        const parts = Array.isArray(keyPath)
            ? keyPath
            : String(keyPath).split('.')
        let base = obj
        for (let i = 0; i < parts.length; ++i) {
            if (!Util.isObject(base)) {
                return
            }
            base = base[parts[i]]
        }
        return base
    }

    static lset(obj, keyPath, value) {
        Util.checkArg(obj, 'obj', 'object')
        if (!keyPath) {
            return
        }
        const parts = Array.isArray(keyPath)
            ? keyPath
            : String(keyPath).split('.')
        let base = obj
        for (let i = 0; i < parts.length - 1; ++i) {
            const key = parts[i]
            if (!base[key] || typeof base[key] != 'object') {
                base[key] = {}
            }
            base = base[key]
        }
        base[parts[parts.length - 1]] = value
        return obj
    }

    static mergePlain(...args) {
        return Util.mergeDefault(...args)
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
        if (Util.isFunction(err.inspect)) {
            raw += err.inspect()
        } else if (err.message && Util.isFunction(err.message.toString)) {
            raw += err.message
        }
        return raw
    }

    static rekey(obj, cb) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value], i) =>
                [cb(key, i), value]
            )
        )
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

    static stripAnsi(str) {
        return str.replace(AnsiRegex, '')
    }

    static stylesToChalks(styles, chalk) {
        if (!Util.isObject(styles)) {
            return chalkPipe(styles, chalk)
        }
        return Util.revalue(styles, value => Util.stylesToChalks(value, chalk))
    }

    /**
     * Sum all numbers in the array.
     *
     * @throws {TypeError}
     *
     * @param {array} The input array
     * @return {integer} The result sum
     */
    static sumArray(arr) {
        return arr.reduce((acc, cur) => acc + cur, 0)
    }

    static typeOf(arg) {
        if (arg === null) {
            return 'null'
        }
        if (Array.isArray(arg)) {
            return 'array'
        }
        if (Buffer.isBuffer(arg)) {
            return 'buffer'
        }
        if (Util.isStream(arg)) {
            return 'stream'
        }
        if (Util.isObject(arg)) {
            return 'object'
        }
        return typeof arg
    }

    /**
     * Capitalize the first letter of a string.
     *
     * @throws {TypeError}
     * @param {string} The input string
     * @return {string} The result string
     */
    static ucfirst(str) {
        if (str == null || !str.length) {
            return str
        }
        return str.substring(0, 1).toUpperCase() + str.substring(1)
    }

    /**
     * Update an object with new values.
     *
     * @param {object} The target object to update
     * @param {object} The source object with the new values
     * @return {object} The target object
     */
    static update(target, source) {
        target = target || {}
        source = source || {}
        Object.entries(source).forEach(([key, value]) => {
            target[key] = value
        })
        return target
    }
}

Object.defineProperties(Util, {
    mergeDefault: {
        value: Util.createMerger({
            name       :'MergeDefault',
            ignoreKeys : ['logger'],
        }),
    }
})

// From: https://github.com/chalk/ansi-regex/blob/c1b5e45f/index.js
const AnsiRegex = new RegExp([
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
].join('|'), 'g')

module.exports = Util