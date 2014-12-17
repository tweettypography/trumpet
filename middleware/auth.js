var authMiddleware = function authMiddleware(req, res, next) {
	var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');
	
	if (req.session && req.session.accessToken) {
		// Eventually we'd want to refresh the token here as needed
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