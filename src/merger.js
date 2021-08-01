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

// Dependency requires
const chalk = require('chalk')
const parser = require('gettext-parser').po

// Node requires
const fs = require('fs')

// Package requires
const Base = require('./base')
const Sort = require('./sorters')
const {
    buffersEqual,
    castToArray,
    checkArg,
    checkMax,
    isFunction,
    isGitDirty,
    isGitUntracked,
    lget,
    lset,
    relPath,
    resolveSafe,
    revalue,
} = require('./util')

const {
    DuplicateKeyError,
    GitCheckError,
    GitExecFailedError,
    MissingContextError,
} = require('./errors')

// Default options.
const Defaults = {
    dryRun     : false,
    replace    : false,
    gitCheck   : true,
    sort       : 'source',
    forceSave  : false,
    references: {
        enabled    : true,
        max        : -1,
        perFile    : -1,
        perLine    : -1,
        lineLength : 120,
    },
    logging: {
        chalks: {
            info: {
                prefix: chalk.magenta,
            },
        },
    },
}

class Merger extends Base {

    /**
     * @constructor
     *
     * @throws {ArgumentError}
     *
     * @param {object} (optional) The options
     */
    constructor(opts) {
        super(Defaults, opts)
        this._checkSortOption(this.sort)
    }

    /**
     * Update a po file with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {GitExecFailedError}
     * @throws {GitCheckError}
     *
     * @emits `beforeSave`
     *
     * @param {string} The po file
     * @param {array} The messages
     * @return {object} The merge info result
     */
    mergePo(file, messages) {
        checkArg(
            file     , 'file'     , 'string',
            messages , 'messages' , 'array',
        )
        this._checkGitDirty(file)
        const {baseDir, forceSave} = this.opts
        const rel = relPath(baseDir, file)
        const result = this.getMergePoResult(file, messages)
        const {content, isChange, sourceContent} = result
        if (isChange || forceSave || !buffersEqual(content, sourceContent)) {
            this.emit('beforeSave', file, content)
            this.logger.info('Writing', {file: rel})
            this.writeFile(file, content)
        } else {
            this.logger.info('No changes to write', {file: rel})
        }
        return result
    }

    /**
     * Update a po file with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {GitExecFailedError}
     * @throws {GitCheckError}
     *
     * @emits `beforeSave`
     *
     * @param {string} The source po file
     * @param {string} The destination file
     * @param {array} The messages
     * @return {object} The merge info result
     */
    mergePoTo(sourceFile, destFile, messages) {
        checkArg(
            sourceFile , 'sourceFile' , 'string',
            destFile   , 'destFile'   , 'string',
            messages   , 'messages'   , 'array',
        )
        this._checkGitDirty(destFile)
        const rel = relPath(this.opts.baseDir, destFile)
        const result = this.getMergePoResult(sourceFile, messages)
        const {content} = result
        this.emit('beforeSave', destFile, content)
        this.logger.info('Writing', {file: rel})
        this.writeFile(destFile, content)
        return result
    }

    /**
     * Get the result object for merging a po file.
     *
     * @throws {ArgumentError}
     *
     * @param {string} The source po file
     * @param {array} The messages
     * @return {object} The merge info result
     */
    getMergePoResult(sourceFile, messages) {
        checkArg(
            sourceFile , 'sourceFile' , 'string',
            messages   , 'messages'   , 'array',
        )
        const {baseDir, charset, replace} = this.opts
        const method = replace ? 'replace' : 'patch'
        this.logger.info('Reading', {file: relPath(baseDir, sourceFile)})
        const sourceContent = this.readFile(sourceFile)
        const sourcePo = parser.parse(sourceContent, charset)
        const {pos, ...result} = this._mergePoResult(sourcePo, messages)
        const po = pos[method]
        const content = parser.compile(po)
        return {content, po, sourceContent, sourcePo, ...result}
    }

    /**
     * Write to a file.
     *
     * @throws {ArgumentError}
     * @throws {GitExecFailedError}
     * @throws {GitCheckError}
     *
     * @param {string} The file path
     * @param {buffer} The content to write
     * @return {undefined}
     */
    writeFile(file, content) {
        checkArg(
            file    , 'file'    , 'string',
            content , 'content' , 'buffer',
        )
        const {baseDir} = this.opts
        file = resolveSafe(baseDir, file)
        this._checkGitDirty(file)
        if (this.opts.dryRun) {
            this.logger.warn('Dry run only, not writing', {file: relPath(baseDir, file)})
        } else {
            fs.writeFileSync(file, content)
        }
    }

    /**
     * Returns a new object with keys sorted.
     *
     * @throws {ArgumentError}
     *
     * @param {object} The tranlations
     * @param {object} The source order hash from the original po file
     * @return {object} A new object with key insert order
     */
    sortedTranslations(translations, sourceOrderHash) {
        checkArg(
            translations    , 'translations'    , 'object',
            sourceOrderHash , 'sourceOrderHash' , 'object',
        )
        const sorter = this._getSorter(sourceOrderHash)
        const values = Object.values(translations).sort(sorter)
        return Object.fromEntries(values.map(tran => [tran.msgid, tran]))
    }

    /**
     * Inspired by:
     *
     *    https://github.com/oliviertassinari/i18n-extract/blob/9110ba513/src/mergeMessagesWithPO.js
     *
     * @private
     *
     * @throws {ArgumentError}
     * @throws {DuplicateKeyError}
     * @throws {MissingContextError}
     *
     * @emits `added`
     * @emits `found`
     * @emits `changed`
     * @emits `missing`
     *
     * @param {object}
     * @param {object}
     * @return {object}
     */
    _mergePoResult(po, messages) {

        checkArg(
            po       , 'po'       , 'object',
            messages , 'messages' , 'array',
        ).checkArg(
            po.translations , 'po.translations' , 'object',
            po.headers      , 'po.headers'      , 'object',
        )

        const {context} = this.opts

        if (!po.translations[context]) {
            throw new MissingContextError(
                `Context ${JSON.stringify(context)} missing from po.`
            )
        }

        const isReferences = this.opts.references.enabled

        this.verbose(2, 'mergePoResult', {context, isReferences})

        const track = {
            added   : {},
            found   : {},
            changed : {},
            missing : {},
        }

        const data = {
            patch   : {},
            replace : {},
        }

        const source = po.translations[context]

        this.logger.info('Processing po', {
            context,
            language     : po.headers.language || 'unknown',
            translations : Object.keys(source).length - ('' in source),
        })

        messages.forEach(message => {

            const msgid = message.key

            this.logger.debug({msgid})

            if (msgid in data.patch) {
                throw new DuplicateKeyError(
                    `Duplicate msgid: '${msgid}'. Collate the messages first.`
                )
            }

            const found = source[msgid]
            const tran = {msgid, msgstr: [''], ...found}
            const changes = []
            const info = {message, tran}

            this.verbose(2, {msgid, isFound: Boolean(found)})

            data.patch[msgid] = tran
            data.replace[msgid] = tran

            if (isReferences) {
                // Add file location reference comment.
                const references = castToArray(message.references)
                this.verbose(3, {references})
                if (references.length) {
                    const change = this._addReference(references, tran)
                    if (found && change) {
                        changes.push(change)
                    }
                } else {
                    this.logger.warn(
                        `Missing location reference for '${msgid}'`
                    )
                }
            }

            if (found) {
                // Message exists in source po.
                track.found[msgid] = info
                this.verbose(2, 'found', {msgid})
                this.emit('found', tran, message)
                if (changes.length) {
                    // Message was changed (comments).
                    track.changed[msgid] = info
                    info.changes = changes
                    this.verbose(2, 'changes', changes)
                    this.emit('changed', tran, message, changes)
                }
            } else {
                // Message does not exist in source po.
                track.added[msgid] = info
                if (context) {
                    tran.msgctxt = context
                }
                this.verbose(1, 'added', {msgid})
                this.emit('added', tran, message)
            }
        })

        Object.values(source).forEach(tran => {
            const {msgid} = tran
            if (msgid && !data.patch[msgid]) {
                this.verbose(1, 'missing', {msgid})
                track.missing[msgid] = {tran}
                data.patch[msgid] = tran
                this.emit('missing', tran)
            }
        })

        const counts = revalue(track, type => Object.values(type).length)
        const isChange = Boolean(counts.added + counts.missing + counts.changed)

        const sourceOrderHash = revalue(source, (tran, i) => i)
        const pos = revalue(data, trans => {
            const copy = {...po, translations: {...po.translations}}
            trans = this.sortedTranslations(trans, sourceOrderHash)
            copy.translations[context] = trans
            return copy
        })

        this.logger.info('Totals', counts)
        this.verbose(2, 'mergePoResult', {isChange})

        return {track, counts, isChange, pos}
    }

    /**
     * @private
     *
     * @param {array}
     * @param {object}
     * @return {object|boolean}
     */
    _addReference(references, tran) {
        if (!tran.comments) {
            tran.comments = {}
        }
        const reference = this._buildReference(references)
        let change = false
        if (tran.comments.reference != reference) {
            change = {
                'comments.reference': {
                    old: tran.comments.reference,
                    new: reference,
                }
            }
            tran.comments.reference = reference
        }
        return change
    }

    /**
     * @private
     *
     * @param {array}
     * @return {array}
     */
    _buildReference(references) {
        const opts = this.opts.references
        const counts = {}
        const built = []
        for (let i = 0; i < references.length; ++i) {
            if (checkMax(built.length, opts.max)) {
                break
            }
            const ref = references[i]
            const [file, line] = ref.split(':')
            if (!counts[file]) {
                counts[file] = 0
            }
            counts[file] += 1
            if (checkMax(counts[file], opts.perFile)) {
                continue
            }
            built.push(ref)
        }
        return this._buildReferenceLines(built)
    }

    /**
     * @private
     *
     * @param {array}
     * @return {array}
     */
    _buildReferenceLines(built) {
        const opts = this.opts.references
        const lines = []
        let line = ''
        for (let i = 0, count = 0; i < built.length; ++i, ++count) {
            const ref = built[i]
            const isMax = Boolean(
                checkMax(count + 1, opts.perLine) ||
                (
                    count > 0 &&
                    checkMax(line.length + ref.length + 1, opts.lineLength)
                )
            )
            if (isMax) {
                lines.push(line)
                line = ''
                count = 0
            }
            line += (count > 0 ? ' ' : '') + ref
        }
        if (line) {
            lines.push(line)
        }
        return lines.join('\n')
    }

    /**
     * @private
     *
     * @throws {ArgumentError}
     *
     * @param {any}
     * @return {undefined}
     */
    _checkSortOption(value) {
        checkArg(
            value, 'opts.sort', it => (
                it == null || isFunction(it) || Boolean(Sort.tran[it])
            )
        )
    }

    /**
     * @private
     *
     * @throws {ArgumentError}
     *
     * @param {object}
     * @return {function}
     */
    _getSorter(sourceOrderHash) {
        const {sort} = this.opts
        this._checkSortOption(sort)
        const that = {sourceOrderHash}
        if (isFunction(sort)) {
            this.verbose(2, 'sorting by custom function')
            return sort.bind(that)
        }
        this.verbose(2, `sorting by ${sort}`)
        return Sort.tran[sort].bind(that)
    }

    /**
     * @private
     *
     * @throws {GitExecFailedError}
     * @throws {GitCheckError}
     *
     * @param {string} The file path
     * @return {undefined}
     */
    _checkGitDirty(file) {
        const {logger} = this
        const {baseDir, gitCheck} = this.opts
        this.verbose(1, 'gitCheck', {gitCheck})
        if (!gitCheck) {
            return
        }
        file = resolveSafe(baseDir, file)
        const trackedOpt = 'trackedOnly'
        const fmsg = {
            pre: 'Git execution failed with',
            dis: 'Use option {gitCheck: false} to disable this check',
        }
        let isTracked = true
        let fixval = false
        let result
        try {
            result = isGitDirty(file)
            //console.log({result})
            if (result === false) {
                if (gitCheck != trackedOpt) {
                    result = isGitUntracked(file)
                    if (result === false) {
                        return
                    }
                    isTracked = false
                    fixval = trackedOpt
                } else {
                    return
                }
            }
        } catch (err) {
            const {code} = err
            logger.debug(err)
            logger.error(err.message, {code, path: err.path})
            const emsg = `${fmsg.pre} code ${code}. ${fmsg.dis}.`
            throw new GitExecFailedError(emsg, err)
        }
        if (typeof result == 'object') {
            for (const buf of [result.stdout, result.stderr]) {
                try {
                    const str = buf.toString('utf-8').trim()
                    if (str) {
                        logger.error(str)
                    }
                } catch (err) {
                    logger.debug(err)
                    logger.error(err.name, err.message)
                }
            }
            const emsg = `${fmsg.pre} exit code ${result.status}. ${fmsg.dis}.`
            throw new GitExecFailedError(emsg)
        }
        const rel    = relPath(baseDir, file)
        const word   = isTracked ? 'Dirty' : 'Untracked'
        const phrase = isTracked ? 'abandon the changes': 'delete the file'
        const err    = new GitCheckError(`${word} path detected at ${rel}.`)
        const elogs = [
            [err, {throwing: true}],
            ['Changes to', {file: rel}, 'have not been committed.'],
            [`Commit, stash, or ${phrase} and retry.`],
            ['Use option', {gitCheck: fixval}, 'to ignore this check.'],
        ]
        elogs.forEach(args => logger.error(...args))
        throw err
    }
}

module.exports = Merger