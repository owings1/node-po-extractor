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
const fs    = require('fs')
const fse   = require('fs-extra')
const globby = require('globby')
const parser = require('gettext-parser').po
const path   = require('path')

// Package requires
const Base = require('./base')
const Sort = require('./sorters')
const {
    buffersEqual,
    castToArray,
    checkArg,
    checkMax,
    isFunction,
    isObject,
    lget,
    lset,
    mergePlain,
    rekey,
    relPath,
    resolveSafe,
    revalue,
} = require('./util')
const {
    DuplicateKeyError,
    MissingContextError
} = require('./errors')

// Default options.
const Defaults = {
    context    : '',
    replace    : false,
    sort       : 'source',
    forceSave  : false,
    references: {
        enabled    : true,
        max        : -1,
        perFile    : -1,
        perLine    : -1,
        lineLength : -1,
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
        if (this.opts.references === true) {
            this.opts.references = {...Defaults.references}
        } else if (!isObject(this.opts.references)) {
            this.opts.references = {}
        }
        this._checkSortOption(this.sort)
    }

    /**
     * Update a po file with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {ExecExitError}
     * @throws {ExecResultError}
     * @throws {UnsavedChangesError}
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
        const {forceSave} = this.opts
        const rel = this.relPath(file)
        this._checkGitDirty(file)
        const result = this.getMergePoResult(file, messages)
        result.file = rel
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
     * Update po files with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {ExecExitError}
     * @throws {ExecResultError}
     * @throws {UnsavedChangesError}
     *
     * @emits `beforeSave`
     *
     * @param {array|string} Po file path(s)/glob(s)
     * @param {array} The messages
     * @return {array} The merge info results
     */
    mergePos(globs, messages) {
        checkArg(
            globs    , 'globs'    , Base.checkGlobArg,
            messages , 'messages' , 'array',
        )
        const files = this.glob(globs)
        files.forEach(file => this._checkGitDirty(file))
        if (files.length) {
            this.logger.info('Updating', files.length, 'po files')
        } else {
            this.logger.warn('No po files found')
        }
        return files.map(file => this.mergePo(file, messages))
    }

    /**
     * Update a po file with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {ExecExitError}
     * @throws {ExecResultError}
     * @throws {UnsavedChangesError}
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
        const rel = this.relPath(destFile)
        const result = this.getMergePoResult(sourceFile, messages)
        result.file = rel
        result.sourceFile = this.relPath(sourceFile)
        const {content} = result
        this.emit('beforeSave', destFile, content)
        this.logger.info('Writing', {file: rel})
        this.writeFile(destFile, content)
        return result
    }

    /**
     * Update a po files with the extracted messages.
     *
     * @throws {ArgumentError}
     * @throws {ExecExitError}
     * @throws {ExecResultError}
     * @throws {UnsavedChangesError}
     *
     * @emits `beforeSave`
     *
     * @param {array|string} Po file path(s)/glob(s)
     * @param {string} The destination directory
     * @param {array} The messages
     * @return {array} The merge info results
     */
    mergePosTo(sourceGlob, destDir, messages) {
        checkArg(
            sourceGlob , 'sourceGlob' , Base.checkGlobArg,
            destDir    , 'destDir'    , 'string',
            messages   , 'messages'   , 'array',
        )
        const {baseDir} = this.opts
        destDir = this.resolve(destDir)
        const sourceFiles = this.glob(sourceGlob)
        const destFiles = sourceFiles.map(file => {
            const relBase = this.relPath(file)
            const parts = relBase.split(path.sep)
            const relShort = parts.length > 1
                ? parts.slice(1).join(path.sep)
                : parts.join(path.sep)
            return path.resolve(destDir, relShort)
        })
        if (sourceFiles.length) {
            this.logger.info('Creating', sourceFiles.length, 'new po files')
        } else {
            this.logger.warn('No po files found')
        }
        destFiles.forEach(file => {
            fse.ensureDirSync(path.dirname(file))
            if (fs.existsSync(file)) {
                this._checkGitDirty(file)
            }
        })
        return sourceFiles.map((sourceFile, i) =>
            this.mergePoTo(sourceFile, destFiles[i], messages)
        )
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
        const rel = this.relPath(sourceFile)
        const method = replace ? 'replace' : 'patch'
        this.logger.info('Reading', {file: rel})
        const sourceContent = this.readFile(sourceFile)
        const sourcePo = parser.parse(sourceContent, charset)
        const {pos, ...result} = this._mergePoResult(sourcePo, messages)
        const po = pos[method]
        const content = parser.compile(po)
        return {content, po, sourceContent, sourcePo, ...result}
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
                `Context '${context}' missing from po.`
            )
        }

        const isRefs = this.opts.references.enabled
        const source = po.translations[context]
        const headersLc = rekey(po.headers, key => key.toLowerCase())

        this.logger.info('Processing po', {
            context,
            language     : headersLc.language || 'unknown',
            translations : Object.keys(source).length - ('' in source),
        })

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

        messages.forEach(message => {

            const msgid = message.key

            this.logger.debug({msgid})

            if (msgid in data.patch) {
                throw new DuplicateKeyError(
                    `Duplicate msgid: '${msgid}'. Collate the messages first.`
                )
            }

            const found = source[msgid]
            const tran = mergePlain({msgid, msgstr: ['']}, found)
            const changes = []
            const info = {message, tran}

            this.verbose(2, {msgid, isFound: Boolean(found)})

            data.patch[msgid] = tran
            data.replace[msgid] = tran

            if (isRefs) {
                // Add file location reference comment.
                const refs = castToArray(message.refs)
                this.verbose(3, {refs})
                if (refs.length) {
                    const refsChange = this._addReference(refs, tran)
                    if (found && refsChange) {
                        changes.push(refsChange)
                    }
                } else {
                    this.logger.warn(
                        `Missing location reference for '${msgid}'`
                    )
                }
            }

            // Add extracted comments.
            const cmts = castToArray(message.comments)
            if (cmts.length) {
                const cmtsChange = this._addExtractedComment(cmts, tran)
                if (found && cmtsChange) {
                    changes.push(cmtsChange)
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

    _addExtractedComment(cmts, tran) {
        if (!tran.comments) {
            tran.comments = {}
        }
        const extracted = cmts.join('\n')
        let change = false
        if (tran.comments.extracted != extracted) {
            change = {
                'comments.extracted': {
                    old: tran.comments.extracted,
                    new: extracted,
                }
            }
            tran.comments.extracted = extracted
        }
        return change
    }

    /**
     * @private
     *
     * @param {array}
     * @param {object}
     * @return {object|boolean}
     */
    _addReference(refs, tran) {
        if (!tran.comments) {
            tran.comments = {}
        }
        const reference = this._buildReference(refs)
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
    _buildReference(refs) {
        const opts = this.opts.references
        const counts = {}
        const built = []
        for (let i = 0; i < refs.length; ++i) {
            if (checkMax(built.length, opts.max)) {
                break
            }
            const ref = refs[i]
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
        return this._buildReferenceLines(built).join('\n')
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
        return lines
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
}

module.exports = Merger