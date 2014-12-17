// Rename this to local.js and add your clientid / clientsecret / session secret

module.exports = {
	isLocal: true,
	auth: {
		spotify: {
			clientId: '',
			clientSecret: '',
			redirectUri: 'http://localhost:3000/auth/spotify'
		}
	},
	session: {
		secret: ''
	}
}