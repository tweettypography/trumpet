var authMiddleware = function authMiddleware(req, res, next) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');
	
	if (req.session && req.session.spotify && req.session.spotify.expires > Date.now()) {
		// Eventually we'd want to refresh the token here as needed
		req.spotifyApi.setAccessToken(req.session.spotify.accessToken);
		req.spotifyApi.setRefreshToken(req.session.spotify.refreshToken);
		
		next();
	} else if (!isAjaxRequest) {
		req.session.redirectPath = req.path;
		res.redirect('/login');
	} else {
		res.send(401, 'Unauthorized');
	}
};

module.exports = {};

module.exports.allUsers = authMiddleware;