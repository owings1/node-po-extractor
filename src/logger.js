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
const chalk = require('chalk')

const {
    castToArray,
    getOrCallBound,
    isPlainObject,
    mergeDefault,
    parseStack,
} = require('./util')

const LevelNums = {
    error : 0,
    warn  : 1,
    info  : 2,
    log   : 3,
    debug : 4,
}

const LevelNames = [
    'error',
    'warn',
    'info',
    'log',
    'debug',
]

const Defaults = {}

/**
 * The object to delegate writing to, default is the node console. This object
 * must be able to process arbitrary arguments of any type.
 */
Defaults.console = console

/**
 * The default log level. If the `DEBUG` environment variable is set, then the
 * default is debug (4). Then the environment variables `LOG_LEVEL` and `LOGLEVEL`
 * are checked. Otherwise the default is info (2).
 */
Defaults.logLevel = getLevelNumber(
    process.env.DEBUG
        ? 'debug'
        : (
            process.env.LOG_LEVEL ||
            process.env.LOGLEVEL ||
            'info'
        )
)

/**
 * The chalk color styles to use.
 */
Defaults.chalks = {
    brace: chalk.grey,
    error: {
        prefix  : chalk.red,
        string  : chalk.hex('#884444'),
        file    : chalk.yellow,
        name    : chalk.bgRedBright.bold.black,
        message : chalk.bold.hex('#884444'),
        stack   : chalk.grey,
    },
    warn: {
        prefix : chalk.yellow,
        string : chalk,
        file   : chalk.yellow,
    },
    info: {
        prefix : chalk.grey,
        string : chalk,
        file   : chalk.cyan,
    },
    log: {
        prefix : chalk.grey,
        string : chalk,
        file   : chalk.cyan,
    },
    debug: {
        prefix : chalk.blue,
        string : chalk,
    },
}

/**
 * Log prefix function.
 *
 * @param {string} The log level, error, warn, info, log, or debug.
 * @return {string|array} The formatted prefix message(s)
 */
Defaults.prefix = function (level) {
    const {chalks} = this
    if (level == 'info') {
        return chalks[level].prefix('\u276f')
    }
    return [
        chalks.brace('['),
        chalks[level].prefix(level.toUpperCase()),
        chalks.brace(']'),
    ].join('')
}

/**
 * Logging format function.
 *
 * @param {string} The log level, error, warn, info, log, or debug.
 * @param {array} The arguments, any type.
 * @return {string|array} The formatted message(s)
 */
Defaults.format = function (level, args) {
    const chlk = this.chalks[level]
    let hasError = false
    return args.map(arg => {
        if (typeof arg == 'string') {
            return chlk.string(arg)
        }
        if (arg instanceof Error) {
            hasError = true
            return this.formatError(arg, args.some(arg => arg && arg.throwing))
        }
        if (isPlainObject(arg)) {
            const entries = Object.entries(arg)
            if (entries.length == 1) {
                const [key, value] = entries[0]
                if (key == 'throwing' && hasError) {
                    return null
                }
                if (key in chlk && typeof value == 'string') {
                    return chlk.string(`${key}: ` + chlk[key](value))
                }
            }
        }
        return arg
    }).filter(arg => arg != null)
}

class Logger {

    constructor(opts) {
        this.opts = mergeDefault(Defaults, opts)
        LevelNames.forEach(name =>
            this[name] = this.level.bind(this, name)
        )
    }

    level(level, ...args) {
        level = getLevelNumber(level)
        if (level > this.logLevel) {
            return
        }
        const levelName = LevelNames[level]
        const {opts} = this
        const prefix = castToArray(getOrCallBound(opts.prefix, this, levelName))
        this.console[levelName](...prefix, ...opts.format.call(this, levelName, args))
    }

    get chalks() {
        return this.opts.chalks
    }

    get console() {
        return this.opts.console
    }

    set console(cons) {
        this.opts.console = cons
    }

    get logLevel() {
        return getLevelNumber(this.opts.logLevel)
    }

    set logLevel(n) {
        this.opts.logLevel = getLevelNumber(n)
    }

    formatError(err, isSkipStack = false) {
        const chlk = this.chalks.error
        const {stack, rawMessage} = parseStack(err)
        const name = err.name || err.constructor.name
        const lines = []
        lines.push(
            [chlk.name(name), chlk.message(rawMessage)].join(': ')
        )
        if (!isSkipStack) {
            lines.push(chlk.stack(stack))
        }
        return lines.join('\n')
    }
}

function getLevelNumber(value) {
    if (typeof value === 'string') {
        value = value.toLowerCase()
    }
    if (value in LevelNums) {
        return LevelNums[value]
    }
    if (value in LevelNames) {
        return +value
    }
    if (value < 0) {
        return -1
    }
    return Defaults.logLevel
}

module.exports = Logger