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
import {ger} from '../helpers/util.js'

import * as Util from '../../src/util.js'

describe('Util', () => {


    describe('#checkArg', () => {

        const {checkArg} = Util

        describe('array', () => {

            it('should pass for array', function () {
                checkArg([], 'arg', 'array')
            })

            it('should fail for string', function () {
                const err = ger(() => checkArg('', 'arg', 'array'))
                expect(err.name).to.equal('TypeError')
            })

            it('should fail for object', function () {
                const err = ger(() => checkArg({}, 'arg', 'array'))
                expect(err.name).to.equal('TypeError')
            })

        })

        describe('callback', () => {

            it('should pass for return true', function () {
                checkArg(null, 'arg', () => true)
            })

            it('should fail for return false', function () {
                const err = ger(() => checkArg(null, 'arg', () => false))
                expect(err.name).to.equal('ArgumentError')
            })

            it('should fail for return string and have message', function () {
                const err = ger(() => checkArg(null, 'arg', () => 'test-message'))
                expect(err.name).to.equal('ArgumentError')
                expect(err.message).to.contain('test-message')
            })

            it('should fail for return Error and throw same', function () {
                const exp = new Error
                const err = ger(() => checkArg(null, 'arg', () => exp))
                expect(err).to.equal(exp)
            })
        })

        describe('string|array', () => {

            it('should pass for string', function () {
                checkArg('', 'arg', 'string|array')
            })

            it('should pass for array', function () {
                checkArg([], 'arg', 'string|array')
            })

            it('should fail for null', function () {
                const err = ger(() => checkArg(null, 'arg', 'string|array'))
                expect(err.name).to.equal('TypeError')
            })
        })
    })
})