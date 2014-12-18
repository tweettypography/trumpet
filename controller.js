var config = require('config');
var crypto = require('crypto');
var _ = require('underscore');

var packageJson = require('./package.json');
var userModel = require('./data/user.js');

var staticBase = config.endpoints.defaultStaticBase + (config.endpoints.versionedDir ? packageJson.version + '/' : '');

function getConfig(req, options) {
	var browserConfig = JSON.stringify({
		rest: config.endpoints.rest,
		version: packageJson.version
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

module.exports.logout = function(req, res) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');

	req.session.destroy();

	if (!isAjaxRequest) {
		res.redirect('/login');
	} else {
		res.status(200).send('OK');
	}
};

module.exports.login = function(req, res) {
	var state = hash(req.sessionID);
	var options = {
		authorizeURL: req.spotifyApi.createAuthorizeURL(config.auth.spotify.scopes, state)
	};
	
	res.render('login', getConfig(req, options));
};

module.exports.feed = function(req, res, next) {
	var options = {
		data: {}
	};
	
	userModel.getFeed(req.spotifyApi, req.session.user.id)
		.then(function(user) {
			options.data.user = user;
			res.render('index', getConfig(req, options));
		}, function(err) {
			next(err);
		});
};

module.exports.index = function(req, res) {
	res.render('index', getConfig(req));
};

module.exports.auth.spotify = function(req, res, next) {
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
			.then(function(user) {
				var redirectPath = req.session.redirectPath || '/';
				delete req.session.redirectPath;
				
				req.session.email = user.email;
				req.session.user = _.pick(user, 'display_name', 'external_urls', 'images', 'id');
				
				res.redirect(redirectPath);
			})
			.catch(function(err) {
				next(err);
			});
	} else {
		res.redirect('/login');
	}
};

module.exports.rest.feed = function(req, res) {
	userModel.getFeed(req.spotifyApi, req.session.user.id)
		.then(function(user) {
			res.json(_.defaults(user, req.session.user));
		}, function(err) {
			console.error('Failed to get feed for:', req.session.user.id, err);
			res.status(500).send('Internal Server Error');
		});
};