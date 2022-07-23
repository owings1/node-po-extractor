/**
 * @quale/dev-i18n
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
import {expect} from 'chai'
import {merge} from '@quale/term/merging.js'
import {ger, Git} from '../helpers/util.js'

import fs from 'fs'
import fse from 'fs-extra'
import path from 'path'
import tmp from 'tmp'

import Merger from '../../src/merger.js'

const {resolve} = path
import {fileURLToPath} from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Merger', () => {

    before(function () {
        this._tmpDir = tmp.dirSync().name
        this.dirs = [this._tmpDir]
        this.baseDir = resolve(this._tmpDir, 'merger')
        fse.removeSync(this.baseDir)
        fse.ensureDirSync(this.baseDir)
        const fixtureDir = resolve(__dirname, '../fixtures/default')
        fse.copySync(fixtureDir, this.baseDir)
        this.git = Git(this.baseDir).initDefault()
        this.opts = {
            baseDir: this.baseDir,
            logging: {logLevel: 1},
        }
        this.create = function (opts) {
            opts = merge(this.opts,  opts)
            return new Merger(opts)
        }
        this.read = function (file) {
            return fs.readFileSync(resolve(this.baseDir, file), 'utf-8')
        }
    })

    after(function () {
        this.dirs.forEach(dir => fse.removeSync(dir))
    })

    beforeEach(function () {

    })

    describe('#getMergePoResult', () => {

        it('should merge single message to blank po', function () {
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1'],},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/blank.po', msgs)
            const trans = translations['']
            expect(trans).to.have.key('m1')
        })

        it('should include ref comment', function () {
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1'],},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/blank.po', msgs)
            const trans = translations['']
            expect(trans.m1.comments.reference).to.contain('file1.js:1')
        })

        it('should include extracted comment', function () {
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1'], comments: ['test-comment']},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/blank.po', msgs)
            const trans = translations['']
            expect(trans.m1.comments.extracted).to.contain('test-comment')
        })

        it('should add ref comment and keep existing translation', function () {
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1'],},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/en.po', msgs)
            const trans = translations['']
            expect(trans.m1.comments.reference).to.contain('file1.js:1')
            expect(trans.m1.msgstr).to.deep.equal(['m1t'])
        })

        it('should replace extracted comment', function () {
            const msgs = [
                {context: '', key: 'm2', refs: ['file1.js:2'], comments: ['new-comment']},
            ]
            const {po: {translations}, sourcePo} = this.create()
                .getMergePoResult('locale/en.po', msgs)
            const trans = translations['']
            const strans = sourcePo.translations['']
            expect(trans.m2.comments.extracted).to.contain('new-comment').and
                .to.not.contain('extracted-existing')
            expect(strans.m2.comments.extracted).to.contain('extracted-existing')
        })

        it('should remove extracted comments from missing translation', function () {
            this.opts.replace = false
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1']},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/missing1.po', msgs)
            const trans = translations['']
            const keys = Object.keys(trans)
            expect(keys).to.include.members(['m1', 'missing1'])
            expect(trans.missing1.comments).to.not.have.property('extracted')
        })

        it('should remove references from missing translation', function () {
            this.opts.replace = false
            const msgs = [
                {context: '', key: 'm1', refs: ['file1.js:1']},
            ]
            const {po: {translations}} = this.create()
                .getMergePoResult('locale/missing1.po', msgs)
            const trans = translations['']
            const keys = Object.keys(trans)
            expect(keys).to.include.members(['m1', 'missing2'])
            expect(trans.missing2.comments).to.not.have.property('reference')
        })
    })

    describe('merge', () => {

        beforeEach(function() {
            this._i = this._i || 0
            this.outDir = resolve(this.baseDir, 'output', String(++this._i))
            fse.ensureDirSync(this.outDir)
            fse.copySync(resolve(this.baseDir, 'locale'), this.outDir)
        })

        describe('#mergePoTo', () => {

            it('should merge single message to blank po', function () {
                const msgs = [
                    {context: '', key: 'm1', refs: ['file1.js:1'],},
                ]
                const destFile = resolve(this.outDir, 'msgs.po')
                const {po: {translations}} = this.create()
                    .mergePoTo('locale/blank.po', destFile, msgs)
                const trans = translations['']
                expect(trans).to.have.key('m1')
                expect(fs.existsSync(destFile)).to.equal(true)
            })
        })

        describe('#mergePo', () => {

            it('should merge single message to blank po', function () {
                const msgs = [
                    {context: '', key: 'm1', refs: ['file1.js:1'],},
                ]
                const file = resolve(this.outDir, 'blank.po')
                const {po: {translations}} = this.create()
                    .mergePo(file, msgs)
                const content = this.read(file)
                const trans = translations['']
                expect(trans).to.have.key('m1')
                expect(content).to.contain('msgid "m1"')
            })

            it('should throw GitCheckError when po file is modified', function () {
                const file = 'locale/en.po'
                this.git.write(file, this.read(file) + '\n')
                const merger = this.create()
                merger.logLevel = -1
                const err = ger(() => merger.mergePo(file, []))
                expect(err.isGitCheckError).to.equal(true)
            })
        })

        describe('#mergePos', () => {

            it('should merge single message to en,fr pos', function () {
                const msgs = [
                    {context: '', key: 'm-new', refs: ['file-9.js:100'],},
                ]
                const files = ['en.po', 'fr.po'].map(it => resolve(this.outDir, it))
                const results = this.create().mergePos(files, msgs)
                expect(results).to.have.length(2)
                const pos = results.map(result => result.po)
                const transes = pos.map(po => po.translations[''])
                const contents = files.map(file => this.read(file))
                expect(transes[0]).to.contain.key('m-new')
                expect(transes[1]).to.contain.key('m-new')
                expect(pos[0].headers.Language).to.equal('en')
                expect(pos[1].headers.Language).to.equal('fr')
                expect(contents[0]).to.contain('msgid "m-new"')
                expect(contents[1]).to.contain('msgid "m-new"')
            })
        })

        describe('#mergePosTo', () => {

            it('should merge single message to en,fr pos', function () {
                const msgs = [
                    {context: '', key: 'm-new', refs: ['file-9.js:100'],},
                ]
                const sourceFiles = ['en.po', 'fr.po'].map(it => resolve(this.outDir, it))
                const destDir = resolve(this.outDir, 'new')
                const results = this.create().mergePosTo(sourceFiles, destDir, msgs)
                const destFiles = results.map(result => result.file)
                const contents = destFiles.map(file => this.read(file))
                expect(destFiles[0]).to.contain('/new/').and
                    .to.contain('/en.po')
                expect(destFiles[1]).to.contain('/new/').and
                    .to.contain('/fr.po')
                expect(contents[0]).to.contain('en')
                expect(contents[1]).to.contain('fr')
                expect(contents[0]).to.contain('msgid "m-new"')
                expect(contents[1]).to.contain('msgid "m-new"')
            })
        })
    })

    describe('options', () => {

        it('should set logLevel from opts.logging.logLevel', function () {
            this.opts.logging.logLevel = -1
            const merger = this.create()
            expect(merger.logLevel).to.equal(-1)
        })

        it('should accept sort=msgid', function () {
            this.create({sort: 'msgid'})
        })

        it('should throw for sort=toString', function () {
            this.opts.sort = 'toString'
            const err = ger(() => this.create())
            expect(err.isArgumentError).to.equal(true)
        })
    })
})