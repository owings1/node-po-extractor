
const {ScriptError} = require('../../src/errors')

const {isFunction} = require('../../src/util')
const {Logger} = require('console-utils-h')

class BaseScript {

    constructor(isMain, argv) {
        this.name = this.constructor.name
        this.logger = new Logger
        this.isMain = isMain || require.main === module
        argv = argv || []
        this.cmd = argv[0] || 'help'
        const {opts, args} = this.parse(argv.slice(1))
        this.opts = opts
        this.args = args
    }

    run() {
        this.setup()
        const {logger, cmd} = this
        let err
        const method = ['cmd', cmd || ''].join('_')
        try {
            if (typeof this[method] == 'function') {
                this[method]()
                return
            }
            switch (cmd) {
                case 'help':
                    this.help()
                    break
                default:
                    logger.error('Unknown cmd:', cmd)
                    this.help()
                    return this.exit(1)
            }
        } catch (e) {
            err = e
        } finally {
            this.teardown(err)
            this.exit(err)
        }
    }

    help() {
        this.logger.info('Usage: script <cmd>')
    }

    exit(code = 0) {
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
        let flags
        if (isFunction(this.constructor.flags)) {
            flags = this.constructor.flags()
        } else if (this.constructor.Flags) {
            flags = this.constructor.Flags
        } else {
            flags = {}
        }
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

    setup() {
        
    }

    teardown(err = null) {
        
    }
}

module.exports = BaseScript