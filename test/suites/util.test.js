const {expect} = require('chai')
describe('Util', () => {

    const Util = require('../../src/util')

    describe('#isFunction', () => {
        it('should return true for function', function () {
            const res = Util.isFunction(() => {})
            expect(res).to.equal(true)
        })
    })
})