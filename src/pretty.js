const chalk = require('chalk')
const {arrayHash, mergePlain} = require('./util')

const Defaults = {
    // For toString() on a buffer.
    encoding : 'utf-8',
    header   : true,
    indent   : 0,
    chalks   : {},
}

Defaults.chalks.po = {
    header: {
        before : chalk.grey,
        quote  : chalk.white,
        name   : chalk.red,
        colon  : chalk.white,
        value  : chalk.cyan,
    },
    comment: {
        prefix  : chalk.grey,
        default : chalk.grey,
        ref     : chalk.yellow,
        flag    : chalk.blue,
    },
    message: {
        attr  : chalk.keyword('orange'),
        brace : chalk.grey,
        index : chalk.hex('#884444'),
        quote : chalk.grey,
        value : chalk.green,
    },
    unknown: chalk.bgMagenta.white.bold,
}

const Q = '"'
const BraceRegex = /^\[(0|[1-9]+[0-9]*)\]$/

const ContentBeginLine = process.env.PRETTY_SCRIPT_BEGIN || null
const ContentEndLine   = process.env.PRETTY_SCRIPT_END || null
const SkipIndent       = Boolean(process.env.PRETTY_SCRIPT_NOINDENT)

function quoteIdx(str) {
    if (str[0] === Q) {
        return 0
    }
    const match = str.match(/^(.*?[^\\])"/)
    const idx = match ? match[1].length : -1
    return idx
}

class Pretty {

    constructor(opts) {
        this.opts = mergePlain(Defaults, opts)
    }

    get chalks() {
        return this.opts.chalks
    }

    po(content) {

        const chlk = this.chalks.po
        const {opts} = this

        if (Buffer.isBuffer(content)) {
            content = content.toString(opts.encoding)
        }

        let stage = 'preHeaders'

        let preTodo = ['msgid ""', 'msgstr ""']

        const lines = content.split('\n').map(raw => {

            const trimmed = raw.trim()
            const endws = raw.substring(trimmed.length)

            if (stage == 'preHeaders') {
                if (raw[0] === Q) {
                    stage = 'headers'
                } else {    
                    if (preTodo.includes(trimmed)) {
                        preTodo = preTodo.filter(it => it !== trimmed)
                        if (!preTodo.length) {
                            stage = 'headers'
                        }
                        if (opts.headers) {
                            return chlk.header.before(raw)
                        }
                        return null
                    }
                }
            }

            if (stage === 'headers') {
                // Parse headers
                if (trimmed === '') {
                    // Blank line means end of headers.
                    stage = 'body'
                    return opts.headers ? raw : null
                }
                if (!opts.headers) {
                    return null
                }
                if (raw[0] !== Q) {
                    return chlk.unknown(raw)
                }
                const qi = quoteIdx(raw.substring(1))
                if (qi < 0 || qi !== trimmed.length - 2) {
                    return chlk.unknown(raw)
                }
                const parts = raw.substring(1, qi + 1).split(': ')
                if (parts.length !== 2) {
                    return chlk.unknown(raw)
                }
                const ch = chlk.header
                return [
                    ch.quote(Q),
                    ch.name(parts[0]),
                    ch.colon(':') + ' ',
                    ch.value(parts[1]),
                    ch.quote(Q),
                    endws,
                ].join('')
            }

            if (stage !== 'body' || trimmed === '') {
                return raw
            }

            const ch = chlk.message

            if (raw[0] === '#') {
                // A comment.
                return this._poComment(raw)
            }

            if (raw[0] === Q) {
                // A quoted string "..." on a line.
                const qi = quoteIdx(raw.substring(1))
                if (qi < 0 || qi !== trimmed.length - 2) {
                    return chlk.unknown(raw)
                }
                return [
                    ch.quote(Q),
                    ch.value(raw.substring(1, qi + 1)),
                    ch.quote(Q),
                    endws,
                ].join('')
            }

            // attr "value"

            // Message attr
            const attr = PoAttrs.find(attr => raw.indexOf(attr) === 0)
            const si = raw.indexOf(' ')
            if (!attr || si < 0) {
                // Unknown attr, or no space.
                return raw
            }
            // Format the attr string.
            let attrf
            const astr = raw.substring(0, si)
            if (astr === attr) {
                // Just the attr name.
                attrf = ch.attr(astr)
            } else if (attr === 'msgstr') {
                // Check for brace [] expression.
                const match = astr.substring(attr.length)
                    .match(BraceRegex)
                if (match) {
                    attrf = [
                        ch.attr(attr),
                        ch.brace('['),
                        ch.index(match[1]),
                        ch.brace(']'),
                    ].join('')
                }
            }
            if (!attrf) {
                return raw
            }

            // Message attr string value
            const vraw = raw.substring(si + 1)
            const qi1 = quoteIdx(vraw)
            if (qi1 < 0) {
                return [attrf, vraw].join(' ')
            }
            // Is there a non-space char between the attr and the first quote?
            const bwws = vraw.substring(0, qi1) + ' '
            if (bwws.trim() !== '') {
                return [attrf, chlk.unknown(vraw)].join(' ')
            }
            const qi2 = quoteIdx(vraw.substring(qi1 + 1))
            if (qi2 < 0) {
                return [attrf, chlk.unknown(vraw)].join(' ')
            }
            return [
                attrf,
                bwws,
                ch.quote(Q),
                ch.value(vraw.substring(qi1 + 1, qi2 + 1)),
                ch.quote(Q),
                endws,
            ].join('')

        }).filter(line => line !== null)

        const indent = SkipIndent ? 0 : +opts.indent || 0

        const beginTag = ContentBeginLine ? ContentBeginLine + '\n' : ''
        const endTag   = ContentEndLine   ? '\n' + ContentEndLine   : ''
        const body = lines.map(line => {
            return ''.padEnd(indent, ' ') + line
        }).join('\n')
        return beginTag + body + endTag
    }

    _poComment(raw) {
        const chlk = this.chalks.po.comment
        const typeHash = {':': 'ref', ',': 'flag'}
        const type = typeHash[raw[1]] || 'default'
        if (type === 'default') {
            return chlk.default(raw)
        }
        let line = chlk.prefix(raw.substring(0, 2))
        const craw = raw.substring(2)
        if (type === 'ref') {
            // Reference
            craw.split(' ').forEach((ref, i) => {
                if (i > 0) {
                    line += chlk.default(' ')
                }
                const parts = ref.split(':')
                if (parts[0] && parts[1]) {
                    line += chlk.ref(
                        [parts.shift(), parts.shift()].join(':')
                    )
                    // Add any remaining parts
                    line += chlk.default(parts.join(':'))
                    return
                }
                line += chlk.default(ref)
            })
            return line
        }
        // Flag
        craw.split(',').forEach((flag, i) => {
            if (i > 0) {
                line += chlk.default(',')
            }
            flag.split(' ').forEach((part, j) => {
                if (j > 0) {
                    line += chlk.default(' ')
                }
                if (PoFlagHash[part]) {
                    line += chlk.flag(part)
                    return
                }
                line += chlk.default(part)
            })
        })
        return line
    }
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