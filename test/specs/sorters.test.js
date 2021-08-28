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
const {expect} = require('chai')

describe('Sort', () => {

    const Sort = require('../../src/sorters')

    describe('#num', () => {
        it('should return -1 for (1, 2)', function () {
            const res = Sort.num(1, 2)
            expect(res).to.equal(-1)
        })
    })

    describe('#refs', () => {
        it('should sort file:1, file:2', function () {
            const refs = ['file:2', 'file:1']
            refs.sort(Sort.refs)
            expect(refs[0]).to.equal('file:1')
            expect(refs[1]).to.equal('file:2')
        })

        it('should sort non-empty first', function () {
            const refs = [null, 'file:1']
            refs.sort(Sort.refs)
            expect(refs[0]).to.equal('file:1')
            expect(refs[1]).to.equal(null)
            refs.sort(Sort.refs)
            expect(refs[0]).to.equal('file:1')
            expect(refs[1]).to.equal(null)
        })
        it('should sort non-empty first', function () {
            const refs = [[], ['file:1']]
            refs.sort(Sort.refs)
            expect(refs[0]).to.deep.equal(['file:1'])
            refs.sort(Sort.refs)
            expect(refs[0]).to.deep.equal(['file:1'])
        })
        it('should sort empties', function () {
            const refs = [null, null]
            refs.sort(Sort.refs)
            expect(refs[0]).to.equal(null)
            expect(refs[1]).to.equal(null)
        })
    })
})