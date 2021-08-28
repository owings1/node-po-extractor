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
const Props = require('./static/errors.map.js')

function addProps(err) {
    const name = err.name || err.constructor.name
    const props = Props.index[name]
    if (!props) {
        return
    }
    Object.entries(props).forEach(([prop, value]) => {
        err[prop] = value
    })
}

class BaseError extends Error {
    constructor(message, ...args) {
        if (Array.isArray(message)) {
            message = message.join(' ')
        }
        super(message, ...args)
        this.name = this.constructor.name
        addProps(this)
    }
}

class ArgumentError        extends BaseError {}
class DuplicateKeyError    extends BaseError {}
class ExecError            extends BaseError {}
class GitCheckError        extends BaseError {}
class MessageConflictError extends BaseError {}
class MissingContextError  extends BaseError {}
class ScriptError          extends BaseError {}

class ExecExitError       extends GitCheckError {}
class ExecResultError     extends GitCheckError {}
class UnsavedChangesError extends GitCheckError {}

ExecExitError.isExecError = true
ExecResultError.isExecError = true

module.exports = {
    ArgumentError,
    DuplicateKeyError,
    ExecError,
    ExecExitError,
    ExecResultError,
    GitCheckError,
    MessageConflictError,
    MissingContextError,
    ScriptError,
    UnsavedChangesError,
}