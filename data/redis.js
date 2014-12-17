var config = require('config');
var redis = require('redis');
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
    
module.exports = getInstance();