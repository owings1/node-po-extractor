const {
    Logger,
    objects: {revalue, update},
    strings: {stringWidth},
    types  : {isFunction},
} = require('utils-h')

const path = {basename} = require('path')
const {ScriptError} = require('../../src/errors.js')

const SyArgv = Symbol('argv')
const CmdPfx = 'cmd_'

module.exports = class BaseScript {

    constructor(isMain, argv) {
        this.name = this.constructor.name
        this.logger = new Logger
        this.isMain = isMain
        this[SyArgv] = argv.slice()
    }

    setup() {}

    teardown(err = null) {}

    run() {
        const {logger} = this
        const argv = this[SyArgv]
        const cmd = argv[2] || 'help'
        if (cmd === 'help') {
            logger.print(help.call(this))
            return exit.call(this, 0)
        }
        const method = CmdPfx + cmd
        if (!isFunction(this[method])) {
            logger.print(help.call(this))
            logger.error('Unknown command:', cmd)
            return exit.call(this, 1)
        }
        this.cmd = cmd
        update(this, this.parse(argv.slice(3)))
        this.setup()
        let err
        try {
            this[method]()
        } catch (e) {
            err = e
        } finally {
            this.teardown(err)
            exit.call(this, err)
        }
    }

    parse(raw) {
        raw = raw.slice(0)
        const checkOpt = (...strs) => {
            if (raw.some(it => strs.includes(it))) {
                raw = raw.filter(it => !strs.includes(it))
                return true
            }
            return false
        }
        const opts = {}
        const flags = getFlags.call(this)
        Object.entries(flags).forEach(([opt, arr]) => {
            opts[opt] = checkOpt(...arr)
        })
        let args
        let idx = raw.indexOf('--')
        if (idx > -1) {
            args = raw.slice(idx + 1)
        } else {
            args = raw.filter(arg => arg[0] != '-')
        }
        return {opts, args}
    }
}

function exit(code = 0) {
    if (this.isMain) {
        if (code instanceof Error) {
            this.logger.error(code)
            code = 2
        }
        process.exit(code)
        return
    }
    if (code instanceof Error) {
        throw code
    }
    if (code !== 0) {
        throw new ScriptError(`${this.name} script exit code ${code}`)
    }
}

function help() {
    const script = basename(this[SyArgv][1])
    const cmds = getCmds.call(this)
    const flags = revalue(getFlags.call(this), it => it.join(', '))
    const flagWidth = Math.max(...Object.values(flags).map(stringWidth))
    const optWidth = Math.max(...Object.keys(flags).map(stringWidth))
    const flagstrs = Object.entries(flags).map(([opt, flagstr]) => {
        return [flagstr.padEnd(flagWidth, ' '), `set ${opt} option`].join('   ')
    }).flat()
    const lines = [
        'Usage:',
        `    ${script} <command> [options]`,
        '',
        'Available commands:',
        '    ' + cmds.join(', '),
        '',
        'Flags:',
        ...flagstrs.map(line => '    ' + line),
    ]
    return lines.join('\n')
}

function getFlags() {
    return isFunction(this.constructor.flags) ? this.constructor.flags() : {}
}

function getCmds() {
    return Object.getOwnPropertyNames(this.constructor.prototype)
        .filter(
            name => name.indexOf(CmdPfx) ===  0 && isFunction(this[name])
        ).map(
            name => name.substr(CmdPfx.length)
        )
}