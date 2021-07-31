const {expect} = require('chai')
describe('Sort', () => {

    const Sort = require('../../src/sorters')

    describe('#num', () => {
        it('should return -1 for (1, 2)', function () {
            const res = Sort.num(1, 2)
            expect(res).to.equal(-1)
        })
    })
    
})