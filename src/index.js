/**
 * node-po-extractor
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
const {lget, lset} = require('./util')
const Sort = require('./sorters')
const {MessageConflictError} = require('./errors')

/**
 * Index extracted messages.
 */
class  Index  {

    /**
     * @constructor
     */
    constructor() {
        this.idx = {}
    }

    /**
     * Add a token to the index.
     *
     * @throws {MessageConflictError} When a different non-empty comment already
     *         exists for the context/key/reference combination.
     * @param {string} The message context (msgctxt)
     * @param {string} The message key (msgid)
     * @param {string} The reference (path/to/file:line)
     * @param {string} The extracted comment
     * @return {self}
     */
    add(ctx, key, ref, cmt) {
        const chk = lget(this.idx, [ctx, key, ref, 'cmt'])
        if (chk && chk != cmt) {
            throw new MessageConflictError(
                `message: '${key}' ref: '${ref}' cmt_stored: '${chk}' cmt_new: '${cmt}'`
            )
        }
        lset(this.idx, [ctx, key, ref, 'cmt'], cmt)
        return this
    }

    /**
     * List all contexts.
     *
     * @return {array} The contexts
     */
    contexts() {
        return Object.keys(this.idx)
    }

    /**
     * List all keys (msgid) for a context.
     *
     * @param {string}
     * @return {array} The contexts
     */
    keys(ctx) {
        return Object.keys(this.idx[ctx] || {})
    }

    /**
     * List all references (path/to/file:line) for a message, ordered
     * file, line.
     *
     * @param {string}
     * @param {string}
     * @return {array} The references
     */
    refs(ctx, key) {
        return Object.keys(this.idx[ctx][key]).sort(Sort.ref)
    }

    /**
     * List all comments (path/to/file:line) for a message, ordered
     * their reference (file, line).
     *
     * @param {string}
     * @param {string}
     * @return {array} The comments
     */
    comments(ctx, key) {
        return this.refs(ctx, key).map(ref => this.comment(ctx, key, ref)).filter(Boolean)
    }

    /**
     * Get the extracted comment for a message reference.
     *
     * @param {string}
     * @param {string}
     * @param {string}
     * @return {string}
     */
    comment(ctx, key, ref) {
        return this.idx[ctx][key][ref].cmt
    }
}

module.exports = Index