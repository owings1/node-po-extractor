const {Extractor, Merger} = require('../..')

const opts = {
    baseDir: __dirname,
}

const extractor = new Extractor(opts)
const merger = new Merger(opts)

const hr = '\n------------------\n'
const stripHeaders = str => str.split('\n\n').slice(1).join('\n\n')

let msgs
let res

console.log(hr, 'Without comments', hr)
extractor.opts.comments.extract = false
extractor.opts.comments.keyRegex = null
extractor.clear().addFile('code.js')
msgs = extractor.getMessages()
//msgs.forEach(msg => {console.log(msg)})
res = merger.getMergePoResult('messages.po', msgs)
console.log(stripHeaders(res.content.toString('utf-8')))


console.log(hr, 'With comments', hr)
extractor.opts.comments.extract = true
extractor.opts.comments.keyRegex = /i18n-extract (.+)/
extractor.clear().addFile('code.js')
msgs = extractor.getMessages()
//msgs.forEach(msg => {console.log(msg)})
res = merger.getMergePoResult('messages.po', msgs)
console.log(stripHeaders(res.content.toString('utf-8')))
