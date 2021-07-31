const {expect} = require('chai')
describe('Errors', () => {

    const Errors = require('../../src/errors')

    describe('ArgumentError', () => {
        const {ArgumentError} = Errors
        it('should construct', function () {
            new ArgumentError
        })
    })
    
})