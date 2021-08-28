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
const {types: {castToArray, isFunction}} = require('@quale/core')

/**
 * Extends every sorter with `asc` and `desc` properties. The `asc` property
 * is a reference to the original sorter. The `desc` property calls `asc` with
 * inverted arguments.
 */
function _extendsortersers(sorters) {
    sorters.filter(isFunction).forEach(sorter => {
        sorter.asc = sorter
        sorter.desc = function (a, b) {
            return sorter.call(this, b, a)
        }
        Object.defineProperty(sorter.desc, 'name', {
            value: sorter.asc.name + 'Desc',
        })
    })
}

/**
 * Basic sorters
 */
const sorters = {}

/**
 * @param {string}
 * @param {string}
 * @return {integer}
 */
sorters.lc = function sortLc(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase())
}

/**
 * @param {number}
 * @param {number}
 * @return {integer}
 */
sorters.num = function sortNum(a, b) {
    return a - b || 0
}

/**
 * @param {string}
 * @param {string}
 * @return {integer}
 */
sorters.ref = function sortRef(a, b) {
    const [afile, aline] = a.split(':')
    const [bfile, bline] = b.split(':')
    return (
        sorters.lc(afile, bfile) ||
        sorters.num(parseInt(aline), parseInt(bline))
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
sorters.keyLc = function sortByKey(a, b) {
    return sorters.lc(a.key, b.key)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
sorters.loc = function sortLocs(a, b) {
    return (
        sorters.lc(String(a.file), String(b.file)) ||
        sorters.lc(String(a.filename), String(b.filename)) ||
        sorters.num(a.start.line, b.start.line) ||
        sorters.num(a.start.column, b.start.column)
    )
}

/**
 * @param {array|string}
 * @param {array|string}
 * @return {integer}
 */
sorters.refs = function sortRefs(a, b) {
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
        const cmp = sorters.ref(a[i], b[i])
        if (cmp) {
            return cmp
        }
    }
    if (j < b.length) {
        return -1
    }
    return 0
}

_extendsortersers(Object.values(sorters))

/**
 * Tranlation sorters
 */
sorters.tran = {}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
sorters.tran.msgid = function sortByMsgid(a, b) {
    return sorters.lc(a.msgid, b.msgid)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
sorters.tran.file = function sortByFile(a, b) {
    const aref = (a.comments || {}).reference
    const bref = (b.comments || {}).reference
    if (aref && bref) {
        const arefs = aref.split('\n').map(it => it.split(' ')).flat()
        const brefs = bref.split('\n').map(it => it.split(' ')).flat()
        return sorters.refs(arefs, brefs)
    }
    if (aref) {
        return -1
    }
    if (bref) {
        return 1
    }
    return sorters.lc(a.msgid, b.msgid)
}

/**
 * @param {object}
 * @param {object}
 * @return {integer}
 */
sorters.tran.source = function sortInSourceOrder(a, b) {
    const asrc = this.sourceOrderHash[a.msgid]
    const bsrc = this.sourceOrderHash[b.msgid]
    if (asrc == null || bsrc == null) {
        if (asrc != null) {
            return -1
        }
        if (bsrc != null) {
            return 1
        }
        return sorters.lc(a.msgid, b.msgid)
    }
    return asrc - bsrc
}

_extendsortersers(Object.values(sorters.tran))

module.exports = sorters