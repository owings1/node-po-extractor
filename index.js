module.exports = {
    get Extractor() { return require('./src/extractor.js') },
    get Merger()    { return require('./src/merger.js') },
    get Pretty()    { return require('./src/pretty.js') },
}