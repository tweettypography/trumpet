var config = require('config');
var when = require('when');
var _ = require('underscore');

var mongo = require('./mongo');

var userSchema = mongo.Schema({
	_id: {
		type: String,
		index: { unique: true }
	},
	following: [{
		type: String,
		ref: 'User'
	}],
	autoInit: Boolean
});

function pickProperties(playlist) {
	return _.pick(playlist, 'id', 'name', 'owner', 'external_urls');
}

function populateFeed(spotifyApi, following, callback) {
	var promises = _.map(following, function(userId) {
		return spotifyApi.getUserPlaylists(userId, {limit: 40}).catch(function (err) {
			console.error('Failed to get playlists for:', userId, err);
		});
	});
	
	when.reduce(promises, function(memo, playlists) {
			return memo.concat(_.map(playlists && playlists.items, pickProperties));
		}, [])
		.then(function (feed) {
			callback(null, feed);
		})
		.catch(callback);
}

function initFeed(spotifyApi, userId, callback) {
	spotifyApi.getUserPlaylists(userId, {limit: 40})
		.then(function(playlists) {
			playlists = playlists.items || [];
			
			var following = _.reduce(playlists, function(memo, playlist) {
				if (playlist.owner.id !== 'spotify'
					&& playlist.owner.id !== userId
					&& memo.length < 10
					&& !_.contains(memo, playlist.owner.id)) {
					memo.push(playlist.owner.id);
				}
				
				return memo;
			}, []);
			
			var autoInit = following.length > 0;
			
			return userModel.findOneAndUpdate({_id: userId}, {_id: userId, following: following, autoInit: autoInit}, {upsert: true}).exec();
		})
		.then(function(user) {
			populateFeed(spotifyApi, user.following, callback);
		})
		.catch(callback);
}

userSchema.statics.getFeed = function(spotifyApi, userId, callback) {
	userModel.findOne({
			_id: userId
		})
		.exec()
		.then(function(user) {
			if (!user || user.following.length < 1) {
				initFeed(spotifyApi, userId, callback);
			} else {
				populateFeed(spotifyApi, user.following, callback);
			}
		}, callback);
};

var userModel = mongo.model('User', userSchema);
module.exports = userModel;