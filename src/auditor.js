// Dependency requires
const {
    merging : {merge},
    objects : {lget, lset, rekey, revalue},
    types   : {castToArray, isFunction, isObject},
} = require('utils-h')
const fse   = require('fs-extra')
const globby = require('globby')
const parser = require('gettext-parser').po

// Node requires
const fs   = require('fs')
const path = require('path')

// Package requires
const Base = require('./base.js')
const {checkArg} = require('./util.js')
const {MissingContextError} = require('./errors.js')

// Default options.
const Defaults = {
    logging: {
        styles: {
            info: {
                prefix: 'orange',
            },
            keywords: {
                msgid: {
                    default: 'green',
                },
            },
        },
    },
}

class Auditor extends Base {

    constructor(opts) {
        super(Defaults, opts)
    }

    getResults(globs) {
        const {logger} = this
        const files = this.glob(globs)
        if (files.length) {
            logger.info('Processing', files.length, 'files')
        } else {
            logger.warn('No files found')
        }
        return files.map(file => this.getResult(file))
    }

    getResult(file) {
        checkArg(file, 'file', 'string')
        const {logger} = this
        const {charset, context} = this.opts
        const rel = this.relPath(file)
        logger.info('Reading', {file: rel})
        const content = this.readFile(file)
        const po = parser.parse(content, charset)
        if (!po.translations[context]) {
            throw new MissingContextError(
                `Context '${context}' missing from po file ${rel}`
            )
        }
        const trans = Object.values(po.translations[context])
        const buckets = revalue(filters, () => [])
        const fentries = Object.entries(filters)
        trans.forEach(tran => {
            fentries.forEach(([key, filter]) => {
                if (filter(tran)) {
                    buckets[key].push(tran)
                }
            })
        })
        logger.info('Totals', revalue(buckets, bucket => bucket.length))
        return {file: rel, ...buckets}
    }

    logResults(results) {
        results = castToArray(results)
        const [allFull, hasUntrans] = arrayBisect(results, result =>
            result.untranslated.length
        )
        allFull.forEach(result => {
            const {file} = result
            log.info({file}, 'has no missing translations')
        })
        hasUntrans.sort((a, b) => b.untranslated.length - a.untranslated.length)
        hasUntrans.forEach(result => {
            const {file, untranslated} = result
            log.info({file}, 'has', untranslated.length, 'untranslated messages')
            untranslated.forEach(tran => {
                const {msgid} = tran
                log.print('   ', {msgid})
            })
        })
    }

    logResult(result) {
        return this.logResults(result)
    }
}

const filters = {
    untranslated: function ({msgid, msgstr}) {
        return msgid.length && !msgstr.some(str => str.length)
    },
}

function arrayBisect(arr, filter) {
    const result = [[], []]
    arr.forEach(value => {
        result[Number(Boolean(filter(value)))].push(value)
    })
    return result
}

function main(argv) {
    const usage = `Usage: node auditor.js [files,...]`
    const fs = require('fs')
    const auditor = {logger: log} = new Auditor({
        logging: {
            //inspect: {depth: 4},
        }
    })
    if (!argv.length) {
        log.print(usage)
        return 0
    }
    try {
        run()
        return 0
    } catch (err) {
        log.error(err)
    }
    return 1
    function run() {
        const files = argv
        const results = auditor.getResults(files)
        auditor.logResults(results)
    }
}

if (require.main === module) {
    process.exit(main(process.argv.slice(2)))
}