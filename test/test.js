
const globby = require('globby')
const path = require('path')

globby.sync(__dirname + '/suites/*.test.js').forEach(file => {
    require(file)
})