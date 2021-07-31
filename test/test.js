require('globby').sync(__dirname + '/suites/*.test.js').forEach(file => {
    require(file)
})