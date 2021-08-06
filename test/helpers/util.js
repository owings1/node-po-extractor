class BaseError extends Error {
    constructor(...args) {
        super(...args)
        this.name = this.constructor.name
    }
}
class GetErrorError extends BaseError {}

function getError(cb) {
    try {
        cb()
    } catch (err) {
        return err
    }
    throw new GetErrorError('No error thrown')
}

const Git = require('./git')
const {MockOutput} = require('./io')
const Util = require('../../src/util')

module.exports = {
    ger: getError,
    getError,
    Git,
    git : Git,
    merge : Util.mergeDefault,
    MockOutput,
    stripAnsi: Util.stripAnsi,
    update: Util.update
}