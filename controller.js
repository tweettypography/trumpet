var config = require('config');
var crypto = require('crypto');
var _ = require('underscore');

var packageJson = require('./package.json');
var userModel = require('./data/user.js');

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

module.exports.logout = function(req, res) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');

	req.session.destroy();

	if (isAjaxRequest) {
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
	
	userModel.getFeed(req.spotifyApi, req.session.user.id, function(err, feed) {
		if (err) {
			next(err);
		} else {
			options.data.feed = feed;
			res.render('index', getConfig(req, options));
		}
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

module.exports.rest.feed = function(req, res) {	
	userModel.getFeed(req.spotifyApi, req.session.user.id, function(err, feed) {
		if (err) {
			console.error('Failed to get feed for:', req.session.user.id, err);
			res.status(500).send('Internal Server Error')
		} else {
			res.json(feed);
		}
	});
};