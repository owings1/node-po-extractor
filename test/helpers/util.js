class GetErrorError extends Error {
    constructor(...args) {
        super(...args)
        this.name = this.constructor.name
    }
}

function getError(cb) {
    try {
        cb()
    } catch (err) {
        return err
    }
    throw new GetErrorError('No error thrown')
}

const Util = require('../../src/util')
module.exports = {
    ger: getError,
    getError,
    merge : Util.mergePlain,
}