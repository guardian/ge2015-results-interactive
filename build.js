module.exports = function(prod) {
    var jspm = require('jspm');
    var builder = new jspm.Builder();
    return builder.buildSFX('main.js', 'build/main.js', {
        minify: !!prod,
        mangle: !!prod,
        sfxFormat: 'amd'
    }).then(function(err) { console.log('done'); }).catch(function(err) { console.log(err); })
}
