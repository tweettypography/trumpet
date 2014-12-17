var config = require('config');
var spotify = require('spotify-web-api-node');

var packageJson = require('./package.json');

var staticBase = config.endpoints.defaultStaticBase + (config.endpoints.versionedDir ? packageJson.version + '/' : '');

var getConfig = function (req) {
	var browserConfig = {
		rest: config.endpoints.rest,
		version: packageJson.version
	};

	return {
			browser: JSON.stringify(browserConfig),
			title: packageJson.name,
			description: packageJson.description,
			htmlClasses: '',
			staticBase: staticBase
		};
};

module.exports = {
	auth: {}
};

module.exports.logout = function logout(req, res) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');

	// Clean up!

	if (!isAjaxRequest) {
		res.redirect('/login');
	} else {
		res.status(200).send('OK');
	}
};

module.exports.login = function login(req, res) {
	res.render('login', getConfig(req));
};

module.exports.index = function index(req, res) {
	res.render('index', getConfig(req));
};

module.exports.auth.spotify = function authSpotify(req, res) {
	if (req.query.code) {
		// Do the login
	} else {
		res.redirect('/');
	}
};