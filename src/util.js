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
const deepmerge = require('deepmerge')

const child_process = require('child_process')
const path = require('path')

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
                ret = ret || `Invalid argument (${name}): ${arg}.`
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
            result = {error}
        }
        if (result.error) {
            const err = new ExecResultError(
                result.error.message || `Failed to execute git command`,
                result.error,
            )
            err.code = result.error.code
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
        return typeof arg == 'function'
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
        ctor = o.constructor;
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

    static lget(obj, keyPath) {
        if (!keyPath) {
            return
        }
        const parts = Array.isArray(keyPath)
            ? keyPath
            : String(keyPath).split('.')
        let base = obj
        for (let i = 0; i < parts.length; ++i) {
            if (base == null || typeof base != 'object') {
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

    static locHash(loc) {
        const {start = {}, end = {}} = loc || {}
        return [start.line, start.column, end.line, end.column].join('/')
    }

    static locToObject(loc) {
        const {start = {}, end = {}} = loc || {}
        return {...loc, start: {...start}, end: {...end}}
    }

    static mergePlain(...args) {
        return deepmerge.all(
            [...args].map(arg => Util.isObject(arg) ? arg : {}),
            {isMergeableObject: Util.isPlainObject},
        )
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
        if (Util.isObject(arg)) {
            return 'object'
        }
        return typeof arg
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

module.exports = Util