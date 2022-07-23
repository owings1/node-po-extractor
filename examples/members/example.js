// examples/members
import {Extractor, Merger, Pretty} from '../../index.js'

import {relative, resolve, dirname} from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const baseDir = __dirname

const thisFile = relative(resolve(baseDir, '../..'), __filename)
const pretty = new Pretty()
const hr = pretty.hr(64)
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

example('Without members', {members: false})

example('With members', {members: true})