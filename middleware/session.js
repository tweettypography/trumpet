var config = require('config');
var session = require('express-session');
var redis = require('redis');
var redisStore = require('connect-redis')(session);
var url = require('url');

var redisConfig = {};
var instance = null;
var redisconf;

function getInstance() {
    if (instance === null) {
        if (process.env.VCAP_SERVICES) {
            redisconf = JSON.parse(process.env.VCAP_SERVICES);
            redisconf = (redisconf['redis-2.6'] || redisconf['redis-2.4'] || redisconf['redis'])[0];
            redisConfig.host = redisconf.credentials.host;
            redisConfig.port = redisconf.credentials.port;
            redisConfig.pass = redisconf.credentials.password;
        } else if (process.env.REDISTOGO_URL) {
            redisconf = url.parse(process.env.REDISTOGO_URL);
            redisConfig.host = redisconf.hostname;
            redisConfig.port = redisconf.port;
            redisConfig.pass = redisconf.auth.split(":")[1];
        } else {
	        redisConfig = config.redis;
        }

        instance = redis.createClient(redisConfig.port, redisConfig.host);

        if (redisConfig.pass) {
            instance.auth(redisConfig.pass);
        }

        instance.on("error", function (err) {
            console.error("Redis error", err);
        });
    }
    return instance;
}
    
var redisClient = getInstance();

var sessionStore = session({store: new redisStore({ client: redisClient, ttl: config.session.ttl }), proxy: true, resave: true, saveUninitialized: true, secret: config.session.secret, cookie: { path: '/', httpOnly: true, secure: false, maxAge: null, expires: false }});

// We're using redis for our session store (and elsewhere throughout the app)
var sessionMiddleware = function sessionMiddleware(req, res, next) {
	// Don't cache routes that use session information
	res.header('Cache-Control', 'private, no-cache, must-revalidate');
	res.header('Pragma', 'no-cache');
	res.header('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
	res.header('X-Frame-Options', 'SAMEORIGIN');
	
	try {
		sessionStore(req, res, next);
	} catch (ex) {
		console.error('Exception', ex);
		res.send(500, 'Internal Server Error');
	}
};

module.exports = sessionMiddleware;