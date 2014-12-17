var config = require('config');
var hbs = require('hbs');
var http = require('http');
var errorHandler = require('errorhandler');
var express = require('express');

var controller = require('./controller');
var authMiddleware = require('./middleware/auth');
var gzipMiddleware = require('./middleware/gzip');
var sessionMiddleware = require('./middleware/session');
var packageJson = require('./package.json');

// Run init just once to get the server up and running
var initApp = function initApp() {
	var app = express();

	// Webfonts need mime types, too!
	express.static.mime.define({
		'application/x-font-woff': ['woff']
	});
	express.static.mime.define({
		'application/x-font-ttf': ['ttf']
	});
	express.static.mime.define({
		'application/vnd.ms-fontobject': ['eot']
	});
	express.static.mime.define({
		'font/opentype': ['otf']
	});
	express.static.mime.define({
		'image/svg+xml': ['svg']
	});

	// All of this runs before the static files are served
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'hbs');
	app.set('trust proxy', 1);
	app.set('query parser', true);
	app.use(gzipMiddleware);

	// We serve the static files here but a CDN should sit between them and the user
	app.use(express.static(__dirname + config.endpoints.uiBaseDir, {
		maxAge: !config.developmentMode && 31556926000
	}));

	// These run after the static files are served and before the routes
	app.disable('etag');
	app.use(sessionMiddleware);

	// Destroy the sesion and redirect to the login page
	app.route('/logout')
		.all(controller.logout);
		
	// The login page
	app.route('/login')
		.get(controller.login);

	// The auth callback
	app.route('/auth/spotify')
		.get(controller.auth.spotify);

	// The index page
	app.route('/')
		.all(authMiddleware.allUsers)
		.get(controller.index);
		
	// The search page
	app.route('/search')
		.all(authMiddleware.allUsers)
		.get(controller.index);
		
	// The user details page
	app.route('/user/:id')
		.all(authMiddleware.allUsers)
		.get(controller.index);
		
	// The playlist details page
	app.route('/playlist/:id')
		.all(authMiddleware.allUsers)
		.get(controller.index);

	// Display errors when we are in development mode
	app.use(errorHandler({
		dumpExceptions: !!config.developmentMode,
		showStack: !!config.developmentMode
	}));

	return app;
};

// Kickoff the initial app setup
var app = module.exports = initApp();

var server = http.createServer(app);

server.listen(app.get('port'), function() {
	console.log(packageJson.name, 'is listening on port', app.get('port'));
});

// Handle cleanup here as needed
process.on('SIGINT', function() {
	server.close();
	process.exit();
});