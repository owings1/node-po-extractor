const {Extractor, Merger} = require('../..')

const baseDir = __dirname
const merger = new Merger({baseDir})

const hr = '\n------------------\n'
const stripHeaders = str => str.split('\n\n').slice(1).join('\n\n')

let extractor, msgs, res, text

console.log(hr, 'Without comments', hr)
extractor = new Extractor({
    baseDir,
    comments: {
        extract: false,
        keyRegex: null,
    },
})
extractor.addFile('code.js')
msgs = extractor.getMessages()
res = merger.getMergePoResult('messages.po', msgs)
text = res.content.toString('utf-8')
console.log(stripHeaders(text))

console.log(hr, 'With comments', hr)
extractor = new Extractor({
    baseDir,
    comments: {
        extract: true,
        keyRegex: /i18n-extract (.+)/,
    },
})
extractor.addFile('code.js')
msgs = extractor.getMessages()
res = merger.getMergePoResult('messages.po', msgs)
text = res.content.toString('utf-8')
console.log(stripHeaders(text))
