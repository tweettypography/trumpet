var config = require('config');
var hbs = require('hbs');
var http = require('http');
var errorHandler = require('errorhandler');
var express = require('express');
var spotify = require('spotify-web-api-node');

var packageJson = require('./package.json');
var sessionMiddleware = require('./middleware/session');
var gzipMiddleware = require('./middleware/gzip');

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

	// We serve the static files (they should really live behind a CDN)
	app.use(express.static(__dirname + config.endpoints.uiBaseDir, {
		maxAge: !config.developmentMode && 31556926000
	}));

	// These run after the static files are served and before the routes
	app.disable('etag');
	app.use(sessionMiddleware);

	app.route('/logout')
		.all(function logout(req, res) {
			var isAjaxRequest = (req.get('X-Requested-With') === 'XMLHttpRequest');

			// Clean up!

			if (!isAjaxRequest) {
				res.redirect('/');
			} else {
				res.status(200).send('OK');
			}
		});

	// The auth page
	app.route('/auth/spotify')
		.get(function index(req, res) {
			if (req.query.code) {
				// Do the login
			} else {
				res.redirect('/');
			}
		});

	// The index page
	app.route(/^\/?([^\/]+)?/)
		.get(function index(req, res) {
			if (req.session && req.session.accessToken) {
				res.render('index', getConfig(req));
			} else {
				res.render('login', getConfig(req));
			}
		});

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
	console.log(packageJson.name + ' is listening on port', app.get('port'));
});

process.on('SIGINT', function() {
	server.close();
	process.exit();
});