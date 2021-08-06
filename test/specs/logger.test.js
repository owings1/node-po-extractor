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
const {expect} = require('chai')
const {ger, merge, MockOutput, stripAnsi, update} = require('../helpers/util')

/*
describe('Logger', () => {

    const Logger = require('../../src/logger')

    beforeEach(function () {
        const stdout = this.stdout = new MockOutput
        const stderr = this.stderr = new MockOutput
        this.opts = {stdout, stderr}
        this.create = function (opts) {
            return new Logger(merge(this.opts, opts))
        }
    })

    it('should warn to stderr only', function () {
        this.create().warn('broomstick')
        expect(this.stderr.raw).to.contain('broomstick')
        expect(this.stdout.raw).to.not.contain('broomstick')
    })

    it('should error to stderr only', function () {
        this.create().error('handle')
        expect(this.stderr.raw).to.contain('handle')
        expect(this.stdout.raw).to.not.contain('handle')
    })

    describe('options', () => {

        it('should accept custom stdout', function () {
            const stdout = new MockOutput
            const opts = {stdout}
            const logger = this.create(opts)
            expect(logger.stdout).to.equal(stdout)
        })

        it('should accept custom stderr', function () {
            const stderr = new MockOutput
            const opts = {stderr}
            const logger = this.create(opts)
            expect(logger.stderr).to.equal(stderr)
        })

        it('should fail on stderr without events', function () {
            const stderr = {write: () => {}, end: () => {}}
            const err = ger(() => this.create({stderr}))
            expect(err.isArgumentError).to.equal(true)
        })
        it('should not use prefix when prefix=null', function () {
            this.create({prefix: null}).info('x')
            expect(this.stdout.raw.trim()).to.equal('x')
        })

        it('should use custom prefix string', function () {
            this.create({prefix: 'ABC'}).info('x')
            expect(this.stdout.plain.trim()).to.equal('ABC x')
        })

        it('should use custom prefix function', function () {
            this.opts.prefix = function (level) {
                return `cool it is ${level}`
            }
            this.create().warn('sandwich')
            expect(this.stderr.plain.trim()).to.equal('cool it is warn sandwich')
        })

        it('should use custom format function', function () {
            this.opts.format = function(args) {
                args[0] += 6
                return  args.join('__')
            }
            this.create({prefix: null}).info(12, 'xyz')
            expect(this.stdout.raw.trim()).to.equal('18__xyz')
        })

        it('should bind logger in custom format function', function () {
            const exp = Symbol()
            this.opts.format = function (args) {
                this[exp] = exp
                return ''
            }
            const logger = this.create()
            logger.info()
            expect(logger[exp]).to.equal(exp)
        })

        it('should bind logger in custom prefix function', function () {
            const exp = Symbol()
            this.opts.prefix = function (level) {
                this[exp] = exp
                return 'x'
            }
            const logger = this.create()
            logger.info()
            expect(logger[exp]).to.equal(exp)
            expect(this.stdout.raw[0]).to.equal('x')
        })

        it('should not format with color when colors=false', function () {
            const output = this.create({colors: false}).format({a: 1})
            expect(output).to.equal(stripAnsi(output))
        })

        it('should format with color when colors=true', function () {
            const output = this.create({colors: true}).format(1)
            // chalk.yellow
            expect(output).to.equal('\x1B[33m1\x1B[39m')
        })

        it('should not log with color when colors=false', function () {
            this.opts.prefix = function (level) {
                return this.chalk.red('abc')
            }
            this.create({colors: false}).info(1)
            expect(this.stdout.raw.trim()).to.equal('abc 1')
        })

        it('should not log with color when colors set after constructor', function () {
            this.opts.format = function (args) {
                return this.chalk.red('abc')
            }
            const logger = this.create({colors: true, prefix: null})
            logger.opts.colors = false
            logger.info('')
            expect(this.stdout.raw.trim()).to.equal('abc')
        })

        it('should log with color when colors set after constructor', function () {
            const exp = '\x1B[31mabc\x1B[39m'
            this.opts.prelog = function (level, args) {
                return this.chalks.default.red('abc')
            }
            const logger = this.create({colors: false, prefix: null})
            logger.opts.colors = true
            logger.info()
            expect(this.stdout.raw.trim()).to.equal(exp)
        })
    })
})
*/