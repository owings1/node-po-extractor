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
const utilh = require('console-utils-h')
const {Logger, merge: mergePlain} = utilh
const {arrayHash} = util.arrays
const {cat, stripAnsi} = utilh.strings
const {revalue} = utilh.objects
const chalk = require('chalk')

const Defaults = {
    // For toString() on a buffer.
    encoding : 'utf-8',
    headers  : true,
    // 'before', 'after'/true
    warnings : false,
    indent   : +process.env.PRETTY_INDENT || 0,
    beginTag : process.env.PRETTY_BEGINTAG,
    endTag   : process.env.PRETTY_ENDTAG,
    dash     : process.env.PRETTY_DASH || '\u2501',
}

Defaults.chalks = {
    hr: chalk.grey,
    warn: {
        prefix : chalk.keyword('pink'),
        line   : chalk.grey,
        num    : chalk.cyan,
        colon  : chalk,
        paren  : chalk.grey,
        msg    : chalk.italic.keyword('orange'),
    },
}

Defaults.chalks.po = {
    preamble: chalk.italic.grey,
    header: {
        quote  : chalk,
        name   : chalk.red,
        colon  : chalk,
        value  : chalk.cyan,
        break  : chalk.grey,
    },
    comment: {
        prefix  : chalk.grey,
        default : chalk.grey,
        ref     : chalk.yellow,
        flag    : chalk.blue,
    },
    message: {
        attr  : chalk.hex('#884444'),
        brace : chalk.grey,
        index : chalk.hex('#884444'),
        quote : chalk.grey,
        value : chalk.green,
    },
    unknown: chalk.bgMagenta.white.bold,
}

const Q = '"'
const BraceRegex = /^\[(0|[1-9]+[0-9]*)\]$/
const QuoteRegex = /^(.*?[^\\])"/

function forceEnv(opts, env) {
    const values = {}
    if ('PRETTY_FORCE_BEGINTAG' in env) {
        values.beginTag = env.PRETTY_FORCE_BEGINTAG
    }
    if ('PRETTY_FORCE_ENDTAG' in env) {
        values.endTag = env.PRETTY_FORCE_ENDTAG
    }
    if ('PRETTY_FORCE_INDENT' in env) {
        values.indent = +env.PRETTY_FORCE_INDENT
    }
    if ('PRETTY_FORCE_HRFIXED' in env) {
        values.hrFixed = env.PRETTY_FORCE_HRFIXED
    }
    if ('PRETTY_FORCE_DASH' in env) {
        values.dash = env.PRETTY_FORCE_DASH
    }
    Object.defineProperties(opts, revalue(values, value => ({
        get() { return value }
    })))
}

class Pretty {

    constructor(opts) {
        this.opts = mergePlain(Defaults, opts)
        forceEnv(this.opts, process.env)
        this.logger = new Logger(this.opts.logging)
    }

    get chalks() {
        return this.opts.chalks
    }

    po(content) {

        if (Buffer.isBuffer(content)) {
            content = content.toString(this.opts.encoding)
        }

        const state = {
            input: {
                text  : content,
                lines : content.split('\n'),
            },
            output: {lines: [], warns: []},
        }

        this._poInit(state)

        state.input.lines.forEach((raw, i) => {
            const n = i + 1

            const trimmed = raw.trim()
            const endws = raw.substring(trimmed.length)
            const isq = raw[0] === Q
            const iscmt = raw[0] === '#'
            const warns = []
            const w = (...msgs) => warns.push(sp(msgs))
            const props = {raw, trimmed, endws, isq, iscmt, warns, w}
            state.line = {}
            Object.defineProperties(state.line, revalue(props, value => ({
                get() { return value }
            })))

            const linef = this._poLine(state)
            if (linef !== null) {
                state.output.lines.push(linef)
            }

            warns.forEach(msg => {
                state.output.warns.push(this._warnf(msg, n))
            })
        })

        return this._render(state)
    }

    hr(len = 40, isIndent = false) {
        const {opts} = this
        if (!Number.isInteger(len)) {
            len = 40
        }
        let indent = 0
        if (isIndent) {
            if (Number.isFinite(isIndent) && isIndent > 0) {
                indent = isIndent
            } else {
                indent = +opts.indent || 0
            }
        }
        let max
        try {
            max = process.stdout.columns
        } catch (err) {
            this.logger.warn('Failed to get process.stdout.columns', err)
        }
        if (!Number.isInteger(max)) {
            max = 80
        }
        max -= indent
        if (len < 0) {
            len += max
        }
        len = Math.min(len, max)
        if (len < 1) {
            return ''
        }
        let hrf
        if (opts.hrFixed) {
            hrf = opts.hrFixed
        } else {
            hrf = this.chalks.hr(chars(len, opts.dash))
        }
        return cat(chars(indent), hrf)
    }

    _render(state) {
        const {lines, warns} = state.output
        const {opts} = this
        const indent = +opts.indent || 0
        const tab = chars(Number.isFinite(indent) ? indent : 0)
        const bodies = lines.map(line => cat(tab, line))
        const heads = []
        const foots = []
        if (opts.endTag) {
            foots.push(opts.endTag)
        }
        if (opts.warnings && warns.length) {
            const width = Math.max(...warns.map(msg => stripAnsi(msg).length))
            const hr = this.hr(width, true)
            const arr = opts.warnings === 'before' ? heads : foots
            if (arr === foots) {
                arr.push('')
                arr.push(hr)
            }
            warns.forEach(msgf => arr.push(cat(tab, msgf)))
            if (arr === heads) {
                arr.push(hr)
                arr.push('')
            }
        }
        if (opts.beginTag) {
            heads.push(opts.beginTag)
        }
        return [heads, bodies, foots].flat().join('\n')
    }

    _warnf(msg, n) {
        const ch = this.chalks.warn
        let warnf = ch.prefix('Warning')
        if (n != null) {
            warnf += cat(' ', ch.paren('('), ch.line('line:'), ch.num(n), ch.paren(')'))
        }
        warnf += sp(ch.colon(':'), ch.msg(msg))
        return warnf
    }

    _poInit(state) {
        const {text} = state.input
        state.pretodo = ['msgid ""', 'msgstr ""']

        // Do some pre-checks on the first 5 non-blank lines (trimmed):
        //  - Do we have the prefix blank msgid/msgstr?
        //  - Do we have any headers?
        const checkLines = text.trim().split('\n').slice(0, 5).map(trim)
        state.hasPreamble = checkLines.slice(0, 2).some(
            line => state.pretodo.includes(line)
        )
        state.hasHeader = checkLines.some(line => (
            line[0] === Q && last(line) === Q && count(line, ': ') === 1
        ))
        if (state.hasPreamble) {
            state.section = 'preamble'
        } else if (state.hasHeader) {
            state.section = 'headers'
        } else {
            state.section = 'body'
        }
    }

    _poLine(state) {
        const {line, line: {w}} = state
        if (state.section === 'preamble') {
            if (state.pretodo.indexOf(line.trimmed) > -1) {
                return this._poPreamble(state)
            }
            if (line.isq) {
                if (state.hasHeader) {
                    state.section = 'headers'
                } else {
                    state.section = 'body'
                }
            }
        }
        if (!line.trimmed) {
            state.section = 'body'
            return line.raw
        }
        if (state.section === 'headers') {
            // header section
            return this._poHeader(state)
        }
        if (state.section !== 'body') {
            // section undetermined
            if (!state.hasWarnedSection) {
                w('Indeterminate section')
                state.hasWarnedSection = true
            }
            return line.raw
        }
        state.hasWarnedSection = false
        if (line.iscmt) {
            // comment
            return this._poComment(state)
        }
        if (line.isq) {
            // quoted line
            return this._poQuoted(state)
        }
        // attr/value
        return this._poAttr(state)
    }

    _poPreamble(state) {
        const {raw, trimmed, w} = state.line
        const {opts} = this
        const chlk = this.chalks.po

        // check for state change
        const pi = state.pretodo.indexOf(trimmed)
        if (pi > -1) {
            state.pretodo.splice(pi, 1)
        }
        if (!state.pretodo.length) {
            state.section = state.hasHeader ? 'headers' : body
        }

        if (!trimmed) {
            return raw
        }
        if (pi < 0) {
            w('Unrecognized preamble line')
            return chlk.unknown(raw)
        }
        if (!opts.headers) {
            return null
        }
        return chlk.preamble(raw)
    }

    _poHeader(state) {
        const {raw, trimmed, isq, endws, w} = state.line
        const {opts} = this
        const chlk = this.chalks.po
        const ch = chlk.header

        // Check for state change.
        if (!trimmed) {
            // Blank line means end of headers.
            state.section = 'body'
            return opts.headers ? raw : null
        }

        if (!isq) {
            w(' No quote char, or non-quote char at start of line')
            return chlk.unknown(raw)
        }
        const qi = qidx(raw.substring(1))
        if (qi < 0) {
            w('No close quote')
            return chlk.unknown(raw)
        }
        if (qi !== trimmed.length - 2) {
            w('Non-whitespace character after close quote')
            return chlk.unknown(raw)
        }
        const parts = raw.substring(1, qi + 1).split(': ')
        if (parts.length === 1) {
            w('No colon in header')
            return chlk.unknown(raw)
        }
        if (parts.length !== 2) {
            w('Too many colons in header')
            return chlk.unknown(raw)
        }
        if (!opts.headers) {
            return null
        }
        const [nstr, vstr] = parts

        let vf
        if (endsWith(vstr, '\\n')) {
            vf = cat(ch.value(vstr.substring(0, vstr.length - 2)), ch.break('\\n'))
        } else {
            vf = ch.value(vstr)
        }
        const qf = ch.quote(Q)
        return cat(
            qf, ch.name(nstr), sp(ch.colon(':'), vf), qf, endws
        )
    }

    _poComment(state) {
        const {raw, w} = state.line
        const ch = this.chalks.po.comment

        const type = ({':': 'ref', ',': 'flag'})[raw[1]]
        if (!type) {
            return ch.default(raw)
        }

        let linef = ch.prefix(raw.substring(0, 2))
        const craw = raw.substring(2)
        if (type === 'ref') {
            // Reference
            craw.split(' ').forEach((ref, i) => {
                if (i > 0) {
                    linef += ch.default(' ')
                }
                const parts = ref.split(':')
                if (parts[0] && parts[1]) {
                    linef += ch.ref(
                        [parts.shift(), parts.shift()].join(':')
                    )
                    // Add any remaining parts
                    linef += ch.default(parts.join(':'))
                    return
                }
                linef += ch.default(ref)
            })
            return linef
        }

        // Flag
        craw.split(',').forEach((flag, i) => {
            if (i > 0) {
                linef += ch.default(',')
            }
            flag.split(' ').forEach((part, j) => {
                if (j > 0) {
                    linef += ch.default(' ')
                }
                if (PoFlagHash[part]) {
                    linef += ch.flag(part)
                    return
                }
                linef += ch.default(part)
            })
        })
        return linef
    }

    _poQuoted(state) {
        const {raw, trimmed, endws, w} = state.line
        const chlk = this.chalks.po
        const ch = chlk.message

        // A quoted string "..." on a line.
        const qi = qidx(raw.substring(1))
        if (qi < 0) {
            w('No close quote')
            return chlk.unknown(raw)
        }
        if (qi !== trimmed.length - 2) {
            w('Non-whitespace character after close quote')
            return chlk.unknown(raw)
        }
        const vstr = raw.substring(1, qi + 1)

        const qf = ch.quote(Q)
        return cat(qf, ch.value(vstr), qf, endws)
    }

    _poAttr(state) {
        const {raw, trimmed, endws, w} = state.line
        const chlk = this.chalks.po
        const ch = chlk.message

        // Message attr
        const attr = PoAttrs.find(attr => raw.indexOf(attr) === 0)
        if (!attr) {
            w(`Unrecognized attribute: ${attr}`)
            return raw
        }
        const si = raw.indexOf(' ')
        if (si < 0) {
            // Nothing after attr name.
            w(`Invalid attribute line format`)
            return raw
        }

        // Format the attr string.
        const astr = raw.substring(0, si)
        let attrf = ''
        if (astr === attr) {
            // Just the attr name.
            attrf = ch.attr(attr)
        } else if (attr === 'msgstr') {
            // Check for brace [] expression.
            const match = astr.substring(attr.length).match(BraceRegex)
            if (match) {
                const nstr = match[1]
                attrf += cat(ch.attr(attr), ch.brace('['))
                attrf += cat(ch.index(nstr), ch.brace(']'))
            }
        }
        if (!attrf) {
            w('Failed to parse attribute name')
            return raw
        }

        // Message attr string value
        const vraw = raw.substring(si + 1)
        const qi1 = qidx(vraw)
        if (qi1 < 0) {
            w('No quote after attribute')
            return sp(attrf, vraw)
        }
        const midws = vraw.substring(0, qi1) + ' '
        if (midws.trim()) {
            w('Non-whitespace character following attribute name')
            return sp(attrf, chlk.unknown(vraw))
        }
        const qi2 = qidx(vraw.substring(qi1 + 1))
        if (qi2 < 0) {
            w('No close quote')
            return sp(attrf, chlk.unknown(vraw))
        }
        const vstr = vraw.substring(qi1 + 1, qi2 + 1)

        const qf = ch.quote(Q)
        return cat(attrf, midws, qf, ch.value(vstr), qf, endws)
    }
}

function qidx(str) {
    if (str[0] === Q) {
        return 0
    }
    const match = str.match(QuoteRegex)
    return match ? match[1].length : -1
}

function sp(...args) {
    return args.flat().join(' ')
}

function last(str, n = 1) {
    return str[str.length - n] || ''
}

function count(str, srch) {
    return str.split(srch).length - 1
}

function endsWith(str, srch) {
    return str.length - str.lastIndexOf(srch) === srch.length
}

function trim(str) {
    return str.trim()
}

function chars(n, chr = ' ') {
    return ''.padEnd(n, chr)
}

const PoFlagHash = arrayHash([
    'fuzzy',
    [
        'awk-format',
        'boost-format',
        'c-format',
        'csharp-format',
        'elisp-format',
        'gcc-internal-format',
        'gfc-internal-format',
        'java-format',
        'java-printf-format',
        'javascript-format',
        'kde-format',
        'librep-format',
        'lisp-format',
        'lua-format',
        'objc-format',
        'object-pascal-format',
        'perl-brace-format',
        'perl-format',
        'php-format',
        'python-brace-format',
        'python-format',
        'qt-format',
        'qt-plural-format',
        'ruby-format',
        'scheme-format',
        'sh-format',
        'smalltalk-format',
        'tcl-format',
        'ycp-format',
    ].map(flag => [flag, 'no-' + flag]).flat(),
].flat())

const PoAttrs = [
    'msgctxt',
    'msgid_plural', // longer string must go first.
    'msgid',
    'msgstr',
]

module.exports = Pretty