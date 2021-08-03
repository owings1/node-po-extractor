// examples/position
const {Extractor, Merger, Pretty} = require('../..')

const hr = '\n------------------\n'
const pretty = new Pretty({headers: false, indent: 2})

function runCase(title, opts) {
    console.log(hr, title, hr, 'opts:', opts, hr)
    const baseDir = __dirname
    opts = {baseDir, ...opts}
    const msgs = new Extractor(opts).extract('code.js')
    const res = new Merger(opts).getMergePoResult('messages.po', msgs)
    console.log()
    console.log(pretty.po(res.content))
    console.log()
}

runCase('Default')

runCase('Position 1', {argPos: 1})

runCase('Position -1', {argPos: -1})