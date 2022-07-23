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
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PropsFile = path.resolve(__dirname, 'static/errors.map.json')
const Props = JSON.parse(fs.readFileSync(PropsFile))

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

export class ArgumentError        extends BaseError {}
export class DuplicateKeyError    extends BaseError {}
export class ExecError            extends BaseError {}
export class GitCheckError        extends BaseError {}
export class MessageConflictError extends BaseError {}
export class MissingContextError  extends BaseError {}
export class ScriptError          extends BaseError {}

export class ExecExitError       extends GitCheckError {}
export class ExecResultError     extends GitCheckError {}
export class UnsavedChangesError extends GitCheckError {}

ExecExitError.isExecError = true
ExecResultError.isExecError = true
