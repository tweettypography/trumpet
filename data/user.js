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
	autoInit: Boolean,
	feed: {}
});

// Cut down on the respose size by extracting only the necessary playlist properties
function pickProperties(playlist) {
	return _.pick(playlist, 'id', 'name', 'owner', 'external_urls');
}

function populateFeed(spotifyApi, following, callback) {
	var promises = _.map(following, function(userId) {
		return spotifyApi.getUserPlaylists(userId, {limit: 42}).catch(function (err) {
			// We're to log this error but we may want to consider dropping the user in the future
			console.error('Failed to get playlists for:', userId, err);
		});
	});
	
	// Run all the promises in parallel and return them all in one big array
	when.reduce(promises, function(memo, playlists) {
			return memo.concat(_.map(playlists && playlists.items, pickProperties));
		}, [])
		.then(function (feed) {
			callback(null, feed);
		})
		.catch(callback);
}

function initFeed(spotifyApi, userId, callback) {
	spotifyApi.getUserPlaylists(userId, {limit: 42})
		.then(function(playlists) {
			playlists = (playlists && playlists.items) || [];
			
			// Pull a list of potential users to follow from playlists we are already subscribed to
			var following = _.reduce(playlists, function(memo, playlist) {
				if (playlist.owner.id !== 'spotify' // Trying to pull playlists owned by Spotify causes errors
					&& playlist.owner.id !== userId // We don't want our own playlists!
					&& memo.length < 12 // Let's not follow more than 12 people on the initial seed
					&& !_.contains(memo, playlist.owner.id)) { // Make sure the list is unique
					memo.push(playlist.owner.id);
				}
				
				return memo;
			}, []);
			
			// If we actually found some people to follow we want to flag the fact that they were automatically added
			var autoInit = following.length > 0;
			
			return userModel.findOneAndUpdate({_id: userId}, {_id: userId, following: following, autoInit: autoInit}, {upsert: true}).exec();
		})
		.then(function(user) {
			populateFeed(spotifyApi, user.following, callback);
		})
		.catch(callback);
}

userSchema.statics.getFeed = function(spotifyApi, userId, callback) {
	// We save details of the user's feed in Mongo
	userModel.findOne({
			_id: userId
		})
		.exec()
		.then(function(user) {
			// TO-DO: This section is super ugly. Clean it up
			try {
				if (!user || user.following.length < 1) {
					initFeed(spotifyApi, userId, callback);
				} else {
					if (user.feed && user.feed.expires > Date.now()) {
						callback(null, user.feed.data);
					} else {
						populateFeed(spotifyApi, user.following, function (err, data) {
							if (!err && data) {
								user.feed = {
									expires: Date.now() + 600000,
									data: data
								};
								
								user.save(function(err) {
									if (err) {
										console.error(err);
									}
								});
							}
							
							callback(err, data);
						});
					}
				}
			} catch (ex) {
				callback(ex, null);
			}
		}, callback);
};

var userModel = mongo.model('User', userSchema);
module.exports = userModel;