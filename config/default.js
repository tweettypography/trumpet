module.exports = {
	developmentMode: false,
	isLocal: true,
	endpoints: {
		rest: '/rest/',
		uiBaseDir: '/public-optimized/',
		versionedDir: true,
		defaultStaticBase: '/'
	},
	auth: {
		spotify: {
			scopes: ['playlist-read-private', 'playlist-modify-public', 'playlist-modify-private', 'user-read-email'],
			redirectUri: 'http://localhost:3000/auth/spotify'
		}
	},
	session: {
		ttl: 21600
	},
	redis: {
		host: '127.0.0.1',
		port: 6379
	},
	mongo: {
		host: '127.0.0.1',
		db: 'TrumpetMusic',
		port: 27017
	}
};