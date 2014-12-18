var config = require('config');
var when = require('when');
var _ = require('underscore');

var mongo = require('./mongo');

var userSchema = mongo.Schema({
	id: {
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
function pickPlaylistProperties(playlist) {
	return _.pick(playlist, 'id', 'name', 'owner', 'external_urls');
}

// Pull a list of potential users to follow from playlists we are already subscribed to
function usersFromPlaylists(playlists, currentUserId) {
	return _.reduce(playlists, function(memo, playlist) {
		if (playlist.owner.id !== 'spotify' // Trying to pull playlists owned by Spotify causes errors
			&& playlist.owner.id !== currentUserId // We don't want our own playlists!
			&& memo.length < 12 // Let's not follow more than 12 people on the initial seed
			&& !_.contains(memo, playlist.owner.id)) { // Make sure the list is unique
			memo.push(playlist.owner.id);
		}
		
		return memo;
	}, []);
}

function populateFeed(spotifyApi, user) {
	var promises = _.map(user.following, function(userId) {
		return spotifyApi.getUserPlaylists(userId, {limit: 42}).catch(function (err) {
			// We're to log this error but we may want to consider dropping the user in the future
			console.error('Failed to get playlists for:', userId, err);
		});
	});
	
	// Reset the user's feed as we are about to refill it
	user.feed = {
		data: []
	};
	
	// Run all the promises in parallel and return them all in one big array
	return when.reduce(promises, function(memo, playlists) {
			memo.feed.data = memo.feed.data.concat(_.map(playlists && playlists.items, pickPlaylistProperties));
			
			return memo;
		}, user);
}

function initFeed(spotifyApi, userId) {	
	return spotifyApi.getUserPlaylists(userId, {limit: 42})
		.then(function(playlists) {
			playlists = (playlists && playlists.items) || [];
			
			// Extract the list of users (someday we need to start pulling the Display Names)
			var following = usersFromPlaylists(playlists, userId);
			
			// If we actually found some people to follow we want to flag the fact that they were automatically added
			var autoInit = following.length > 0;
			
			return userModel.findOneAndUpdate({id: userId}, {id: userId, following: following, autoInit: autoInit}, {upsert: true}).exec();
		})
		.then(function(user) {
			return populateFeed(spotifyApi, user);
		});
}

userSchema.statics.getFeed = function(spotifyApi, userId) {
	// We save details of the user's feed in Mongo
	return userModel.findOne({
			id: userId
		})
		.exec()
		.then(function(user) {
			if (user && user.feed && user.feed.expires > Date.now() && user.feed.data && user.feed.data.length > 0) {
				return user;
			}
			
			var promise;
			
			if (!user || user.following.length < 1) {
				promise = initFeed(spotifyApi, userId);
			} else {
				promise = populateFeed(spotifyApi, user);
			}
			
			return promise
					.then(function(user) {
						user.feed.expires = Date.now() + 600000;
		
						user.save(function(err) {
							if (err) {
								console.error(err);
							}
						});
						
						return user;
					});
		});
};

var userModel = mongo.model('User', userSchema);
module.exports = userModel;