var config = require('config')
var mongoose = require('mongoose')

var mongoConfig = {};
var instance = null;
var mongoconf;

function getInstance() {
	if (instance === null) {
		if (process.env.VCAP_SERVICES) {
			mongoconf = JSON.parse(process.env.VCAP_SERVICES);
			mongoconf = (mongoconf['mongodb'])[0];
			mongoConfig.host = mongoconf.credentials.host;
			mongoConfig.db = mongoconf.credentials.db;
			mongoConfig.port = mongoconf.credentials.port;
			mongoConfig.credentials = {
				user: mongoconf.credentials.username,
				pass: mongoconf.credentials.password
			};
		} else if (process.env.MONGOHQ_URL) {
			mongoConfig.host = process.env.MONGOHQ_URL;
		} else {
			mongoConfig = config.mongo;
		}

		instance = mongoose.connect(mongoConfig.host, mongoConfig.db, mongoConfig.port, mongoConfig.credentials, function (err, res) {
			if (err) {
				instance = null;
				console.error("Mongoose error", err);
			}
		});
	}
	return mongoose;
};

module.exports = getInstance();