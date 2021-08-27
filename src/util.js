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
const {
    objects : {update, valueHash},
    types   : {isFunction, typeOf},
} = require('utils-h')

const child_process = require('child_process')
const path = require('path')
const {EventEmitter} = require('events')

const {ArgumentError, ExecExitError, ExecResultError} = require('./errors.js')

class Util {

    static arrayUnique(arr) {
        return Object.keys(valueHash(arr))
    }

    // arg, name, type, ...
    static checkArg(...args) {
        while (args.length) {
            const [arg, name, exp] = args.splice(0, 3)
            const argType = typeOf(arg)
            if (isFunction(exp)) {
                const ret = exp(arg, argType)
                if (ret === true) {
                    continue
                }
                if (ret instanceof Error) {
                    throw ret
                }
                throw new ArgumentError(`Invalid argument (${name}):` + (ret || arg))
            }
            const types = exp.split('|')
            if (types.includes(argType)) {
                continue
            }
            throw new TypeError(
                `Argument (${name}) must be type ${types.join(' or ')}, got '${argType}'.`
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
        if (result.status !== 0) {
            const err = new ExecExitError(
                `Git exited with status code ${result.status}`
            )
            const {status, signal, pid} = result
            const stderr = result.stderr.toString('utf-8')
            update(err, {status, signal, pid, stderr})
            throw err
        }
        const lines = result.stdout.toString('utf-8').split('\n')
        let fileStatus = 'clean'
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i]
            const attr = line.substring(0, 2)
            if (!line.toLowerCase().includes(basename.toLowerCase())) {
                continue
            }
            if (attr.includes('?')) {
                fileStatus = 'untracked'
            } else if (attr === 'M ') {
                fileStatus = 'staged'
            } else if (attr === 'A ') {
                fileStatus = 'added'
            } else {
                // default catch-all
                fileStatus = 'modified'
            }
            break
        }
        return {fileStatus, result}
    }
}

module.exports = Util