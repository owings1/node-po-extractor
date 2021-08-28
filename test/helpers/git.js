const chproc = require('child_process')
const fs = require('fs')
const fse = require('fs-extra')
const path = {resolve} = require('path')

class GitError extends Error {

    constructor(...args) {
        super(...args)
        this.name = this.constructor.name
    }
}

module.exports = function create(cwd, opts) {

    function self(...args) {
        const result = chproc.spawnSync('git', args, self.sopts)
        if (result.error) {
            throw result.error
        }
        let {status, stdout, stderr} = result
        stdout = stdout ? stdout.toString('utf-8') : ''
        stderr = stderr ? stderr.toString('utf-8') : ''
        self.result = result
        self.stdout = stdout
        self.stderr = stderr
        if (self.opts.log) {
            if (stdout) {
                console.log(stdout)
            }
            if (stderr) {
                console.error(stderr)
            }
        }
        if (status !== 0) {
            if (self.opts.throws) {
                const err = new GitError(`git failed with status: ${status}`)
                err.stderr = stderr
                throw err
            }
            if (!self.opts.silent && !self.opts.log) {
                console.error('stderr:\n' + stderr)
            }
        }
        return self
    }

    Object.defineProperties(self, {
        git: {
            value: self
        },
        opts: {
            value: {
                throws : true,
                silent : false,
                log    : false,
                sopts  : {},
                ...opts,
            },
        },
        cwd: {
            get: () => self.opts.cwd,
            set: dir => {
                self.opts.cwd = dir
                self.sopts.cwd = dir
            },
        },
        sopts: {
            get: () => self.opts.sopts,
        }
    })

    
    self.resolve = function(file) {
        return resolve(self.cwd, file)
    }

    self.write = function(file, content = '') {
        file = self.resolve(file)
        fse.ensureDirSync(path.dirname(file))
        fs.writeFileSync(file, content)
        return self
    }

    self.initDefault = function () {
        return self.write('.gitignore', '/output')
            .write('output/.empty')
            .init()
            .config('user.name', '@quale/dev-i18n.test')
            .config('user.email', 'nobody@nowhere.example')
            .add('.')
            .commit('-m', 'initial')
    }

    Commands.forEach(cmd => {
        Object.defineProperty(self, cmd, {
            value: self.bind(self, cmd)
        })
    })

    self.cwd = cwd

    return self
}

const Commands = [
    'add',
    'apply',
    'branch',
    'catfile',
    'checkout',
    'clean',
    'clone',
    'commit',
    'config',
    'describe',
    'diff',
    'fetch',
    'init',
    'log',
    'lsfiles',
    'lsremote',
    'lstree',
    'merge',
    'mv',
    'prune',
    'pull',
    'push',
    'rebase',
    'reflog',
    'remote',
    'reset',
    'restore',
    'revlist',
    'revparse',
    'revert',
    'rm',
    'show',
    'stash',
    'status',
    'submodule',
    'tag',
]