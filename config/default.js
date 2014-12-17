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
			redirectUri: 'http://localhost:3000/auth/spotify'
		}
	},
	session: {
		ttl: 21600
	},
	redis: {
		host: '127.0.0.1',
		port: 6379
	}
};