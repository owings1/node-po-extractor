module.exports = {
    get Extractor() { return require('./src/extractor') },
    get Merger()    { return require('./src/merger') },
    get Pretty()    { return require('./src/pretty') },
}