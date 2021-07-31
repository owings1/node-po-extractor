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
const {castToArray, isFunction} = require('./util')

/**
 * Extends every sorter with `asc` and `desc` properties. The `asc` property
 * is a reference to the original sorter. The `desc` property calls `asc` with
 * inverted arguments.
 */
function _extendSorters(sorters) {
    sorters.filter(isFunction).forEach(sorter => {
        sorter.asc = sorter
        sorter.desc = function (a, b) {
            return sorter.call(this, b, a)
        }
    })
}

/**
 * Basic sorters
 */
const Sort = {}

/**
 * @param {string}
 * @param {string}
 * @return {integer}
 */
Sort.lc = function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase())
}

/**
 * @param {number}
 * @param {number}
 * @return {integer}
 */
Sort.num = function (a, b) {
    return a - b || 0
}

/**
 * @param {string}
 * @param {string}
 * @return {integer}
 */
Sort.ref = function (a, b) {
    const [afile, aline] = a.split(':')
    const [bfile, bline] = b.split(':')
    return (
        Sort.lc(afile, bfile) ||
        Sort.num(parseInt(aline), parseInt(bline))
    )
}

/**
 * Object/Array sorters.
 */

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
Sort.keyLc = function (a, b) {
    return Sort.lc(a.key, b.key)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
Sort.loc = function (a, b) {
    return (
        Sort.lc(String(a.file), String(b.file)) ||
        Sort.lc(String(a.filename), String(b.filename)) ||
        Sort.num(a.start.line, b.start.line) ||
        Sort.num(a.start.column, b.start.column)
    )
}

/**
 * @param {array|string}
 * @param {array|string}
 * @return {integer}
 */
Sort.refs = function (a, b) {
    a = castToArray(a)
    b = castToArray(b)
    if (!a.length || !b.length) {
        if (a.length) {
            return -1
        }
        if (b.length) {
            return 1
        }
        return 0
    }
    let i
    for (i = 0; i < a.length; ++i) {
        if (i > b.length) {
            return 1
        }
        const cmp = Sort.ref(a[i], b[i])
        if (cmp) {
            return cmp
        }
    }
    if (j < b.length) {
        return -1
    }
    return 0
}

_extendSorters(Object.values(Sort))

/**
 * Tranlation sorters
 */
Sort.tran = {}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
Sort.tran.msgid = function (a, b) {
    return Sort.lc(a.msgid, b.msgid)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
Sort.tran.file = function (a, b) {
    const aref = (a.comments || {}).reference
    const bref = (b.comments || {}).reference
    if (aref && bref) {
        const arefs = aref.split('\n').map(it => it.split(' ')).flat()
        const brefs = bref.split('\n').map(it => it.split(' ')).flat()
        return Sort.refs(arefs, brefs)
    }
    if (aref) {
        return -1
    }
    if (bref) {
        return 1
    }
    return Sort.lc(a.msgid, b.msgid)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
Sort.tran.source = function (a, b) {
    const asrc = this.sourceOrderHash[a.msgid]
    const bsrc = this.sourceOrderHash[b.msgid]
    if (asrc == null || bsrc == null) {
        if (asrc != null) {
            return -1
        }
        if (bsrc != null) {
            return 1
        }
        return Sort.lc(a.msgid, b.msgid)
    }
    return asrc - bsrc
}

_extendSorters(Object.values(Sort.tran))

module.exports = Sort