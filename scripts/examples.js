const chproc = require('child_process')
const fs = require('fs')
const globby = require('globby')
const path = require('path')
const {basename, dirname, relative, resolve} = path
const {gitFileStatus} = require('../src/util')
const {Logger} = require('..')

const Script = 'example.js'
const Readme = 'README.md'

const ExamplesDir = resolve(__dirname, '../examples')
const TemplateFile = resolve(__dirname, 'res/example-template.md')

const logger = new Logger

function main() {
    const template = readTemplate()
    const examples = listNames()

    logger.info('Processing', examples.length, 'examples')

    logger.info('Checking clean file status')
    checkGit(examples)
    logger.info('Git check passed')

    const outputs = {}

    examples.forEach(example => {
        logger.info('Running', {example})
        outputs[example] = runExample(example)
    })

    examples.forEach(example => {
        const file = resolve(ExamplesDir, example, Readme)
        const content = buildReadme(template, example, outputs[example])
        logger.info('Writing', relative(ExamplesDir, file))
        fs.writeFileSync(file, content)
    })

    logger.info('Done')    
}

function listNames() {
    return globby.sync(ExamplesDir + '/*/' + Script)
        .map(file => basename(dirname(file)))
}

function readTemplate() {
    return fs.readFileSync(TemplateFile, 'utf-8')
}

function buildReadme(template, name, output) {
    const pre = output.split('\n').map(line => '    ' + line).join('\n')
    return template.replace('{name}', name).replace('{output}', pre)
}

function checkGit(examples) {
    const dirty = examples.map(example => {
        const file = resolve(ExamplesDir, example, Readme)
        const {fileStatus} = gitFileStatus(file)
        return [path.relative(ExamplesDir, file), fileStatus]
    }).filter(([file, status]) =>
        !['clean', 'staged'].includes(status)
    )
    if (dirty.length) {
        dirty.forEach(([file, status]) => {
            logger.error('Dirty path:', {file}, {status})
        })
        throw new Error('Git check failed')
    }
}

function runExample(name) {
    const script = resolve(ExamplesDir, name, Script)
    const args = [script]
    const opts = {maxBuffer: 1024 * 10} // 10K max
    const result = chproc.spawnSync(process.execPath, args, opts)
    if (result.error) {
        throw result.error
    }
    if (result.status != 0) {
        logger.error('stderr:\n' + result.stderr.toString('utf-8'))
        throw new Error(`Exit code ${result.status}`)
    }
    return result.stdout.toString('utf-8')
}

if (require.main === module) {
    main()
}