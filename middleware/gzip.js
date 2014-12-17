var packageJson = require('../package.json');
var config = require('config');

// Serve up an already-gzipped file when appropriate
// We only want to apply this to css, js, and html files in the versioned directory
var versionedStaticFiles = new RegExp('(' + packageJson.version.replace('.', '\\.') + ').*(\\.|\\/)(css|js|map|html|eot|svg|ttf|woff)([?].*)?$', 'i');
var gzipMiddleware = function gzipMiddleware(req, res, next) {
	if (config.endpoints.versionedDir && req.url.match(versionedStaticFiles)) {
		res.header('Access-Control-Allow-Origin', '*');
		res.set('Content-Encoding', 'gzip');
	}

	next();
};

module.exports = gzipMiddleware;