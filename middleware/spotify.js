var config = require('config');
var SpotifyWebApi = require('spotify-web-api-node');
var _ = require('underscore');

var spotifyConfig = (function () {
	var spotifyConfig = _.clone(config.auth.spotify);
	
	if (!config.isLocal) {
		spotifyConfig.clientId = process.env.clientId;
		spotifyConfig.clientSecret = process.env.clientSecret;
	}
	
	return spotifyConfig;
})();

module.exports = function spotifyMiddleware(req, res, next) {
	req.spotifyApi = new SpotifyWebApi(spotifyConfig);
	next();
};