const stream = require('stream')
const {stripAnsi} = require('../../src/util')
class MockOutput extends stream.Writable {

    constructor(...args) {
        super(...args)
        this.raw = ''
    }

    write(chunk) { this.raw += chunk }

    end() {}

    get lines() { return this.raw.split('\n') }

    get plain() { return stripAnsi(this.raw) }
}

module.exports = {MockOutput}