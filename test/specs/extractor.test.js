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
const {expect} = require('chai')
const path = require('path')
const {resolve} = path
const {ger, merge} = require('../helpers/util')

describe('Extractor', () => {

    const Extractor = require('../../src/extractor')

    beforeEach(function () {
        this.opts = {
            baseDir: resolve(__dirname, '../fixtures/default'),
            logging: {logLevel: 1},
        }
        this.create = function (opts) {
            return new Extractor(merge(this.opts, opts))
        }
    })

    describe('comments', () => {

        it('should parse 6 messages with defaults', function () {
            const opts = {}
            const msgs = this.create(opts)
                .extract('src/comments.js')
            expect(msgs).to.have.length(6)
        })

        it('should parse 4 messages with comments.keyRegex=null', function () {
            const opts = {
                comments: {keyRegex: null},
            }
            const msgs = this.create(opts)
                .addFile('src/comments.js')
                .getMessages()
            expect(msgs).to.have.length(4)
        })

        it('should parse 10 messages with comments.ignoreRegex=null', function () {
            const opts = {
                comments: {ignoreRegex: null},
            }
            const msgs = this.create(opts)
                .addFile('src/comments.js')
                .getMessages()
            expect(msgs).to.have.length(10)
        })

        it("should include 'Comment for Message 1 above' with comments.extract=true", function () {
            const opts = {
                comments: {extract: true},
            }
            const msgs = this.create(opts)
                .addFiles('src/comments.js')
                .getMessages()
            const msg = msgs.find(msg => msg.key == 'Message 1')
            expect(msg.comments.join('\n')).to.contain('Comment for Message 1 above')
        })

        it('should have empty comments for all messages with comments.extract=false', function () {
            const opts = {
                comments: {extract: false},
            }
            const msgs = this.create(opts)
                .extract('src/comments.js')
            msgs.forEach(msg => {
                expect(msg.comments).to.have.length(0)
            })
        })
    })

    describe('members', () => {

        it('should parse 3 messages with members=true', function () {
            const opts = {members: true}
            const msgs = this.create(opts)
                .extract('src/members.js')
            expect(msgs).to.have.length(3)
        })

        it('should parse 1 message with members=false', function () {
            const opts = {members: false}
            const msgs = this.create(opts)
                .addFiles('src/members.js')
                .getMessages()
            expect(msgs).to.have.length(1)
        })
    })

    describe('position', () => {

        it("should parse 'String at Position 0' with argPos=0", function () {
            const opts = {argPos: 0}
            const msgs = this.create(opts)
                .extract('src/position.js')
            expect(msgs).to.have.length(1)
            expect(msgs[0].key).to.equal('String at Position 0')
        })

        it("should parse 'String at Position 1' with argPos=1", function () {
            const opts = {argPos: 1}
            const msgs = this.create(opts)
                .addFile('src/position.js')
                .getMessages()
            expect(msgs).to.have.length(1)
            expect(msgs[0].key).to.equal('String at Position 1')
        })

        it("should parse 'String at Position 2' with argPos=-1", function () {
            const opts = {argPos: -1}
            const msgs = this.create(opts)
                .addFiles('src/position.js')
                .getMessages()
            expect(msgs).to.have.length(1)
            expect(msgs[0].key).to.equal('String at Position 2')
        })
    })

    describe('expressions', () => {

        it('should parse messages from expressions', function () {
            const opts = {logging: {logLevel: 0}}
            const msgs = this.create(opts)
                .extract('src/expressions.js')
            const exp = [
                'm1', 'm2', 'm3', 'm4',
                'm5', 'm6', 'm7', 'm8',
                'k0.*', 'k0.*.k1', '*.k1', '*'
            ]
            const expNot = [
                'mNot',
            ]
            const keys = msgs.map(msg => msg.key)
            exp.forEach(value => {
                expect(keys).to.contain(value)
            })
            expNot.forEach(value => {
                expect(keys).to.not.contain(value)
            })
        })
    })

    describe('ArgumentErrors', () => {

        it('addFiles missing globs', function () {
            const err = ger(() => this.create().addFiles())
            expect(err.name).to.equal('ArgumentError')
        })

        it('unknown parser in constructor', function () {
            const err = ger(() => this.create({parser: 'foo'}))
            expect(err.name).to.equal('ArgumentError')
        })

        it('null parser in constructor', function () {
            const err = ger(() => this.create({parser: null}))
            expect(err.name).to.equal('ArgumentError')
        })
    })

    describe('options', () => {

        it('should accept true for comments', function () {
            const extractor = this.create({comments: true})
            expect(extractor.opts.comments.extract).to.equal(true)
        })

        it('should accept false for comments', function () {
            const extractor = this.create({comments: false})
            expect(Boolean(extractor.opts.comments.extract)).to.equal(false)
        })

        it('should accept object for parser', function () {
            const parser = new Extractor()._getBabelOpts()
            this.create({parser})
        })

        it('should set logLevel from opts.logging.logLevel', function () {
            const opts = {logging: {logLevel: -1}}
            const extractor = this.create(opts)
            expect(extractor.logLevel).to.equal(-1)
        })

        describe('custom logger', () => {

            it('should allow a specific instance of Logger and keep reference', function () {
                const {logger} = this.create()
                const extractor = this.create({logger})
                expect(extractor.logger).to.equal(logger)
            })

            it('should allow a plain object as custom logger and keep reference', function () {
                const noop = () => {}
                const logger = {
                    info: noop,
                    debug: noop,
                    warn: noop,
                    error: noop,
                    snark: noop,
                    log: noop
                }
                this.opts.logger = logger
                const e1 = this.create()
                expect(e1.logger).to.equal(logger)
                delete this.opts.logger
                const e2 = this.create({logger})
                expect(e2.logger).to.equal(logger)
            })
        })
    })

    describe('#clear', () => {

        it('should clear messages', function () {
            const extractor = this.create()
            let msgs = extractor.addFile('src/single.js')
                .getMessages()
            expect(msgs).to.have.length(1)
            extractor.clear()
            msgs = extractor.getMessages()
            expect(msgs).to.have.length(0)
        })
    })
})