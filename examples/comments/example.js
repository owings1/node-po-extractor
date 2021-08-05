// examples/comments
const {Extractor, Merger, Pretty} = require('../..')

const {relative, resolve} = require('path')
const baseDir = __dirname
const thisFile = relative(resolve(baseDir, '../..'), __filename)
const pretty = new Pretty()
const hr = pretty.hr(77)
const {log} = console

function example(title, opts) {
    log(hr)
    log('File    :', thisFile)
    log('Example :', title)
    log('Options :', opts)
    log(hr)
    opts = {baseDir, ...opts}
    const msgs = new Extractor(opts).extract('code.js')
    const res = new Merger(opts).getMergePoResult('messages.po', msgs)
    log(hr)
    log(pretty.po(res.content))
    log()
}

example('Without comments', {
    comments: {
        extract: false,
        keyRegex: null,
        ignoreRegex: null,
    },
})

example('With comments', {
    comments: {
        extract: true,
        keyRegex: /i18n-extract (.+)/,
        ignoreRegex: /i18n-ignore-line/,
    },
})