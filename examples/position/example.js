// examples/position
const {Extractor, Merger} = require('../..')

const hr = '\n------------------\n'

function stripHeaders(str) {
    return str.split('\n\n').slice(1).join('\n\n')
}

function runCase(title, opts) {
    console.log(hr, title, hr, 'opts:', opts, hr)
    const baseDir = __dirname
    opts = {baseDir, ...opts}
    const msgs = new Extractor(opts).extract('code.js')
    const res = new Merger(opts).getMergePoResult('messages.po', msgs)
    const text = res.content.toString('utf-8')
    console.log(stripHeaders(text))
}

runCase('Default')

runCase('Position 1', {argPos: 1})

runCase('Position -1', {argPos: -1})