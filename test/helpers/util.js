
import git from './git.js'
import {MockOutput} from './io.js'

class BaseError extends Error {
    constructor(...args) {
        super(...args)
        this.name = this.constructor.name
    }
}
class GetErrorError extends BaseError {}

export function ger(cb) {
    try {
        cb()
    } catch (err) {
        return err
    }
    throw new GetErrorError('No error thrown')
}
export {
    ger as getError,
    git,
    git as Git,
    MockOutput,
}

