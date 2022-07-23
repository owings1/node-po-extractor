#!/usr/bin/env node
import {lget, lset} from '@quale/core/objects.js'
import {ucfirst} from '@quale/core/strings.js'
import {sum as sumArray} from '@quale/core/arrays.js'

import path from 'path'
import Vm from 'vm'
import fs from 'fs'
import fse from 'fs-extra'
import {expect} from 'chai'

import Base from './util/base.js'
import Diffs from './util/diffs.js'
import * as Errors from '../src/errors.js'

import { fileURLToPath } from 'url'
import process from 'process'

const {dirname, relative, resolve} = path

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


const BaseDir = resolve(__dirname, '..')
const OutFile = resolve(BaseDir, 'src/static/errors.map.json')

class ErrorsScript extends Base {

    static flags() {
        return {
            verbose : ['-v', '--verbose'],
            print   : ['-p', '--print'],
            dryrun  : ['-t', '--test', '--dryrun'],
        }
    }

    cmd_info() {
        const {logger, opts} = this
        const result = this.buildResult()
        if (opts.verbose) {
            this.logResultDetail(result)
        }
        this.logResultSummary(result)
        logger.info('Checking current file')
        const rel = relative(BaseDir, OutFile)
        if (!fs.existsSync(OutFile)) {
            logger.wan('Current file does not exist', {file: rel})
            return
        }
        logger.info('Loading', {file: rel})
        const actual = JSON.parse(fs.readFileSync(OutFile))
        const expected = this.getDataToWrite(result)
        logger.info('Comparing')
        const diff = this.getDataDiff(actual, expected)
        if (diff) {
            logger.info('Difference detected:\n' + diff)
        } else {
            logger.info('No difference detected')
        }
    }

    cmd_build() {
        const {logger, opts} = this
        logger.info('Building result')
        const result = this.buildResult()
        this.logSummary(result)
        logger.info('Generating file content')
        const content = this.buildFileContent(result)
        logger.info('Testing file content')
        this.testFileContent(content, result)
        logger.info('OK')
        logger.info('Saving')
        if (opts.dryrun) {
            logger.warn('Not writing file in dryrun mode')
        } else {
            this.writeFile(OutFile, content)
        }
        logger.info('Done')
    }

    logResultSummary(result) {
        const {logger} = this
        logger.info('Classes:', Object.keys(Errors).length)
        Object.entries(result).forEach(([name, map]) => {
            logger.info(ucfirst(name), 'sum:', sumAccess(map))
        })
    }

    logResultDetail(result) {
        const {logger} = this
        Object.entries(result).forEach(([name, map]) => {
            logger.info('\n\n' + ucfirst(name), '\n')
            this.logMap(map)
        })
    }

    writeFile(file, content) {
        const {logger} = this
        logger.info('Writing to', {file: relative(BaseDir, file)})
        fse.ensureDirSync(dirname(file))
        fs.writeFileSync(file, content)
    }

    logMap(map) {
        const {logger} = this
        Object.entries(flatterMap(map)).forEach(([key, values]) => {
            logger.info(`${key}:\n`, values, '\n')
        })
    }

    getDataToWrite(result) {
        return {index: result.index, reverse: result.reverse}
    }

    buildFileContent(result) {
        result = this.getDataToWrite(result)
        const json = JSON.stringify(result, null, 2)
        const body = 'module.exports = ' + json.replace(/"/g, '')
        const header = [
            '/* Generated on ' + new Date().toISOString() + ' */',
        ].join('\n')
        return [header, body].join('\n')
    }

    testFileContent(content, expected) {
        const {logger} = this
        const mock = {}
        const context = Vm.createContext({module: mock})
        const script = new Vm.Script(content)
        script.runInContext(context)
        const actual = mock.exports
        try {
            expect(actual).to.deep.equal(expected)
        } catch (err) {
            const diff = this.getDataDiff(actual, expected)
            logger.info('Diff:\n' + diff)
            throw err
        }
    }

    getDataDiff(actual, expected) {
        try {
            expect(actual).to.deep.equal(expected)
        } catch (err) {
            const acstr = JSON.stringify(actual, null, 2)
            const exstr = JSON.stringify(expected, null, 2)
            return Diffs.unified(acstr, exstr)
        }
        return null
    }

    buildResult() {
        // Own properties of classes
        const props = {}
        // Born into it by class
        const inherits = {}
        // Took manual effort to get there
        const promotions = {}
        // Combined inherits + promotions
        const access = {}
        // Track the populus
        const populus = {}
        // Track which promotions actually made a difference.
        const surplus = {}
        // Map inheritance and extract properties
        Object.values(Errors).forEach(Root => {
            const root = Root.name
            populus[root] = true
            for (let Class = Root; Class && Class.name; Class = Object.getPrototypeOf(Class)) {
                populus[Class.name] = true
                lset(access, [root, Class.name], true)
                if (Class !== Root) {
                    lset(inherits, [root, Class.name], true)
                }
                // Properties assigned directly on the class.
                Object.getOwnPropertyNames(Class).forEach(prop => {
                    if (isIsProp(prop, Class[prop])) {
                        lset(props, [Class.name, prop], true)
                    }
                })
            }
        })
        // Check the properties for ad-hoc relationships
        evk(props, (owner, prop) => {
            // String the 'is' off the front.
            const relation = prop.substring(2)
            if (populus[relation]) {
                // Prop signifies a relation to another error class
                // like isExecError, not just isFunToThrow, so make
                // an ad-hoc relation.
                lset(promotions, [owner, relation], true)
                lset(access, [owner, relation], true)
            }
        })
        // Keep filling in the access relation until it is fully transitive.
        // Since the maps are not that deep, this will probably only take one pass.
        let thisCount = sumAccess(access)
        let lastCount 
        do {
            lastCount = thisCount
            abck(access, (a, b, c) => {
                // Track the effect this had for information.
                if (!lget(access, [a, c])) {
                    lset(surplus, [a, c], true)
                }
                lset(access, [a, c], true)
            })
            thisCount = sumAccess(access)
        } while (thisCount > lastCount)
        // Build final property index and reverse index.
        const index = {}
        const reverse = {}
        evk(access, (name, related) => {
            const pname = 'is' + related
            lset(index, [name, pname], true)
            lset(reverse, [pname, name], true)
            Object.keys(props[related] || {}).forEach(prop => {
                lset(index, [name, prop], true)
                lset(reverse, [prop, name], true)
            })
        })
        return {index, reverse, access, inherits, promotions, props, surplus}
    }
}

function flatterMap(map) {
    return Object.fromEntries(
        Object.keys(map).sort().map(key => {
            return [key, Object.keys(map[key]).sort()]
        })
    )
}

function isIsProp(prop, value) {
    return prop.length > 2 && prop.indexOf('is') === 0 && value === true
}

function sumAccess(access) {
    return sumArray(
        Object.values(access).map(Object.keys).map(it => it.length)
    )
}

function evk(m, cb) {
    Object.entries(m).forEach(([k, mv]) => {
        Object.keys(mv).forEach(v => {
            cb(k, v)
        })
    })
}

// transitive loop
function abck(m, cb) {
    Object.keys(m).forEach(a => {
        Object.keys(m[a] || {}).forEach(b => {
            Object.keys(m[b] || {}).forEach(c => {
                cb(a, b, c)
            })
        })
    })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    new ErrorsScript(true, process.argv).run()
}
