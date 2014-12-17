var config = require('config');
var crypto = require('crypto');
var _ = require('underscore');

var mongo = require('./data/mongo');
var packageJson = require('./package.json');

var staticBase = config.endpoints.defaultStaticBase + (config.endpoints.versionedDir ? packageJson.version + '/' : '');

function getConfig(req, options) {
	var browserConfig = JSON.stringify({
		rest: config.endpoints.rest,
		version: packageJson.version,
		user: req.session.user
	});
	
	if (options && options.data) {
		options.data = JSON.stringify(options.data);
	}

	return _.extend({
			browser: browserConfig,
			title: packageJson.name,
			description: packageJson.description,
			htmlClasses: '',
			staticBase: staticBase
		}, options);
}

function hash(data) {
	return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
	auth: {},
	rest: {}
};

module.exports.logout = function logout(req, res) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');

	req.session.destroy();

	if (!isAjaxRequest) {
		res.redirect('/login');
	} else {
		res.status(200).send('OK');
	}
};

module.exports.login = function login(req, res) {
	var state = hash(req.sessionID);
	var options = {
		authorizeURL: req.spotifyApi.createAuthorizeURL(config.auth.spotify.scopes, state)
	};
	
	res.render('login', getConfig(req, options));
};

module.exports.feed = function feed(req, res) {
	var options = {
		data: {}
	};
	
	res.render('index', getConfig(req, options));
};

module.exports.index = function index(req, res) {
	res.render('index', getConfig(req));
};

module.exports.auth.spotify = function authSpotify(req, res, next) {
	var state = hash(req.sessionID);
	
	if (req.query.code && req.query.state === state) {
		req.spotifyApi.authorizationCodeGrant(req.query.code)
			.then(function(data) {
				req.session.spotify = {
					accessToken: data['access_token'],
					expires: Date.now() + (data['expires_in'] * 1000),
					refreshToken: data['refresh_token']
				};
				
				req.spotifyApi.setAccessToken(req.session.spotify.accessToken);
				req.spotifyApi.setRefreshToken(req.session.spotify.refreshToken);
				
				return req.spotifyApi.getMe();
			})
			.then(function(data) {
				var redirectPath = req.session.redirectPath || '/';
				delete req.session.redirectPath;
				
				req.session.user = data;
				
				res.redirect(redirectPath);
			})
			.catch(function(err) {
				next(err);
			});
	} else {
		res.redirect('/login');
	}
};