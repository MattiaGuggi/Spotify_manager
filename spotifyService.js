const SpotifyWebApi = require('spotify-web-api-node');
const { getLyrics } = require('genius-lyrics-api');

// Function to create a new Spotify API instance
const createSpotifyApi = () => new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URL
});

// Function to set access token and refresh token
const setTokens = (spotifyApi, accessToken, refreshToken) => {
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);
};

// Function to refresh access token
const refreshAccessToken = async (spotifyApi) => {
    try {
        const data = await spotifyApi.refreshAccessToken();
        const accessTokenRefreshed = data.body['access_token'];
        spotifyApi.setAccessToken(accessTokenRefreshed);
        return accessTokenRefreshed;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
};

// Function to get user information
const getUserInfo = async (spotifyApi) => {
    try {
        const data = await spotifyApi.getMe();

        return data.body;
    } catch (error) {
        console.error('Error getting user info:', error);
        throw error;
    }
};

// Function to get user playlists and all tracks from those playlists
const getUserPlaylists = async (spotifyApi) => {
    try {
        const data = await spotifyApi.getUserPlaylists();
        return data.body.items;
    } catch (error) {
        console.error('Error getting user playlists:', error);
        throw error;
    }
};

// Function to get all songs of all user's playlists
const getUserPlaylistsSongs = async (spotifyApi) => {
    try {
        const data = await spotifyApi.getUserPlaylists();
        let allTracks = [];

        // Get tracks from all playlists
        for (let index=0 ; index<data.body.items.length ; index++) {
            const tracks = await getAllTracks(spotifyApi, index);

            tracks.forEach(track => {
                let existingTrack = allTracks.find(t => t.uri === track.uri);

                if (existingTrack) {
                    if (!existingTrack.playlist.includes(track.playlist)) {
                        existingTrack.playlist.push(track.playlist);
                    }
                }
                else {
                    allTracks.push({
                        ...track,
                        playlist: [track.playlist]
                    });
                }
            });
        }

        // Get liked songs
        const likedSongs = await getLikedSongs(spotifyApi);

        likedSongs.forEach(track => {
            let existingTrack = allTracks.find(t => t.uri === track.uri);

            if (existingTrack) {
                if (!existingTrack.playlist.includes('Liked Songs')) {
                    existingTrack.playlist.push('Liked Songs');
                }
            } else {
                allTracks.push({
                    ...track,
                    playlist: ['Liked Songs']
                });
            }
        });

        return allTracks;
    } catch (error) {
        console.error('Error getting user playlists and liked songs:', error);
        throw error;
    }
};

// Function to get all tracks from a single playlist
const getAllTracks = async (spotifyApi, index) => {
    try {
        const playlist = await spotifyApi.getUserPlaylists();
        const playlistId = playlist.body.items[index].id;
        const playlistName = playlist.body.items[index].name;
        let allTracks = [];
        let offset = 0;
        const limit = 100; // Maximum number of tracks per request
        let data;

        do {
            data = await spotifyApi.getPlaylistTracks(playlistId, {
                offset: offset,
                limit: limit,
            });

            const tracks = data.body.items.map(item => ({
                name: item.track.name,
                uri: item.track.uri,
                playlist: playlistName,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                image: item.track.album.images[0]?.url,
                duration: item.track.duration_ms,
                external_uri: item.track.preview_url
            }));

            allTracks = allTracks.concat(tracks);
            offset += limit;
        } while (data.body.items.length === limit); // Continue if the number of tracks is equal to the limit

        return allTracks;
    } catch (error) {
        console.error('Error getting tracks:', error);
        throw error;
    }
};

// Function to see if a track is playing
const getPlayingState = async (spotifyApi) => {
    try {
        const data = await spotifyApi.getMyCurrentPlaybackState();
        
        return data.body;
    } catch (error) {
        console.error('Error getting playing state:', error);
        throw error;
    }
}

// Function to get current track
const getCurrentSong = async (spotifyApi) => {
    try {
        const data = await spotifyApi.getMyCurrentPlayingTrack();

        return data.body.item;
    } catch (error) {
        console.error('Error occuring while getting current track:', error);
        throw error;
    }
};

// Function to get liked songs
const getLikedSongs = async (spotifyApi) => {
    try {
        let likedTracks = [];
        let offset = 0;
        const limit = 50;

        let data;
        do {
            data = await spotifyApi.getMySavedTracks({ limit, offset });
            const tracks = data.body.items.map(item => ({
                name: item.track.name,
                uri: item.track.uri,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                duration: item.track.duration_ms
            }));
            likedTracks = likedTracks.concat(tracks);
            offset += limit;
        } while (data.body.items.length === limit);

        return likedTracks;
    } catch (error) {
        console.error('Error getting liked songs:', error);
        throw error;
    }
};

const getTrackLyrics = async (title, artist) => {
    const options = {
        apiKey: process.env.GENIUS_KEY,
        title: title,
        artist: artist,
        optimizeQuery: true
    };

    try {
        const lyrics = await getLyrics(options);

        if (lyrics)
            return lyrics;
        else
            return 'No Lyrics Found';
    } catch (error) {
        console.error('Error: ', error);
        return 'Error fetching lyrics';
    }
};

const getPlaylistById = async (spotifyApi, playlistId) => {
    const data = await spotifyApi.getPlaylist(playlistId);

    return data.body;
};

const getTracksFromPlaylist = async (spotifyApi, playlistId) => {
    try {
        let allTracks = [];
        let offset = 0;
        const limit = 100; // Maximum number of tracks per request
        let data;

        do {
            data = await spotifyApi.getPlaylistTracks(playlistId, {
                offset: offset,
                limit: limit,
            });

            const tracks = data.body.items.map(item => ({
                name: item.track.name,
                artist: item.track.artists.map(artist => artist.name).join(', '),
                duration: item.track.duration_ms
            }));
            allTracks = allTracks.concat(tracks);
            offset += limit;
        } while (data.body.items.length === limit); // Continue if the number of tracks is equal to the limit

        return allTracks;
    } catch (error) {
        console.error('Error getting tracks from a playlist:', error);
        throw error;
    }
};

// Export functions for use in other modules
module.exports = {
    createSpotifyApi,
    setTokens,
    getUserInfo,
    getUserPlaylists,
    refreshAccessToken,
    getUserPlaylistsSongs,
    getPlayingState,
    getCurrentSong,
    getTrackLyrics,
    getPlaylistById,
    getTracksFromPlaylist
};