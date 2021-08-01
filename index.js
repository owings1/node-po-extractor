module.exports = {
    get Extractor() { return require('./src/extractor') },
    get Logger()    { return require('./src/logger') },
    get Merger()    { return require('./src/merger') },
}