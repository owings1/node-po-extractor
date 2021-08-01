const {EventEmitter} = require('events')
const fs = require('fs')

const {checkArg, resolveSafe} = require('./util')
const Logger = require('./logger')
// Default options.
const Defaults = {
    baseDir    : '.',
    context    : '',
    verbosity  : 0,
    logger     : null,
    logging    : {},
}


class Base extends EventEmitter {

    constructor(opts) {
        super()
        opts = opts || {}
        this.opts = {...Defaults, ...opts}
        this.opts.logging = {...Defaults.logging, ...opts.logging}
        if (!this.logger) {
            this.logger = new Logger(this.opts.logging)
        }
        this.logLevel = this.opts.logging.logLevel
    }

   /**
    * Read a file.
    *
    * @throws {ArgumentError}
    *
    * @param {string} The file path
    * @return {buffer} The file content
    */
   readFile(file) {
       checkArg(file, 'file', 'string')
       file = resolveSafe(this.opts.baseDir, file)
       return fs.readFileSync(file)
   }

   /**
    * Logs a message according to verbosity setting.
    *
    * @throws {ArgumentError}
    *
    * @param {integer} The verbosity level of the message
    * @param {...any} The message(s)
    * @return {undefined}
    */
   verbose(vlevel, ...args) {
       checkArg(vlevel, 'vlevel', 'number')
       if (vlevel > this.opts.verbosity && vlevel + 2 > this.logLevel) {
           return
       }
       this.logger.info(...args)
   }

   /**
    *
    */
   get logger() {
       return this.opts.logger
   }

   /**
    *
    */
   set logger(logger) {
       this.opts.logger = logger
       if ('logLevel' in logger) {
           logger.logLevel = this.opts.logging.logLevel
       }
   }

   /**
    *
    */
   get logLevel() {
       if ('logLevel' in this.logger) {
           return this.logger.logLevel
       }
       return this.opts.logging.logLevel
   }

   /**
    *
    */
   set logLevel(level) {
       if ('logLevel' in this.logger) {
           this.logger.logLevel = level
           this.opts.logging.logLevel = this.logger.logLevel
       } else {
           this.opts.logging.logLevel = this.logger.logLevel
       }
   }
}

module.exports = Base