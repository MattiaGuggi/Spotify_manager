// Load environment variables from the .env file.
require('dotenv').config();

// Import the necessary modules.
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const { createSpotifyApi, setTokens, getUserInfo, getUserPlaylists, refreshAccessToken, getUserPlaylistsSongs,
    getPlayingState, getCurrentSong, getTrackLyrics, getPlaylistById, getTracksFromPlaylist } = require('./spotifyService');

const spotifyApi = createSpotifyApi(); // Create a new Spotify API instance

// Serve static files from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

let allUserTracks = [];

// Route handler for the login endpoint.
app.get('/login', (req, res) => {
    // Define the scopes for authorization; these are the permissions we ask from the user.
    const scopes = [
        'user-library-read',
        'playlist-read-private',
        'user-read-playback-state',
        'user-read-currently-playing',
        'user-modify-playback-state',
        'user-read-email',
        'user-read-private'
    ];

    // Redirect the client to Spotify's authorization page with the defined scopes.
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

// Route handler for the callback endpoint after the user has logged in.
app.get('/callback', async (req, res) => {
    const error = req.query.error;
    const code = req.query.code;

    if (error) {
        console.log(`Callback Error: ${error}`);
        return res.send(`Callback Error: ${error}`);
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];
        const expiresIn = data.body['expires_in'];

        // Set tokens and initialize Spotify API instance
        setTokens(spotifyApi, accessToken, refreshToken);

        console.log('Access token: ' + accessToken);
        console.log('Refresh token: ' + refreshToken);

        // Get and log user info and playlists
        await getUserInfo(spotifyApi);

        // Retrieve and store all user tracks
        allUserTracks = await getUserPlaylistsSongs(spotifyApi);

        // Refresh the access token periodically before it expires
        setInterval(async () => {
            await refreshAccessToken(spotifyApi);
        }, expiresIn / 2 * 1000);

        console.log('Login successful!');

        res.redirect('/');
    } catch (error) {
        console.error('Error getting Tokens:', error);
        res.send('Error getting tokens');
    }
});

// Route handler for the search endpoint.
app.get('/search', async (req, res) => {
    const { q } = req.query;
    let searchResults;

    if (!allUserTracks || allUserTracks.length === 0) {
        return console.log('No tracks available for search.');
    }

    allUserTracks.forEach(track => {
        if (track.name === q) {
            searchResults = track;
            return;
        }
    });

    if (searchResults) {
        const trackUri = searchResults.uri;
        try {
            await spotifyApi.play({ uris: [trackUri] });
            const lyrics = await getTrackLyrics(searchResults.name, searchResults.artist);

            res.json({
                lyrics: lyrics
            });
        } catch (error) {
            console.error('Play Error:', error);
            res.status(500).send('Error occurred during playback');
        }
    }
    else
        console.log('No tracks found in the playlists.');
});

// Route handler to get the user playlists
app.get('/api/playlists', async (req, res) => {
    try {
        const user = await getUserInfo(spotifyApi);
        const playlists = await getUserPlaylists(spotifyApi);
        const allTracks = await getUserPlaylistsSongs(spotifyApi);

        // Combine variables in JSON object and send all as an object
        res.json({
            user: user.display_name,
            pfp: user.images && user.images.length > 0 ? user.images[0].url : 'default-pfp-url',
            playlists: playlists,
            tracks: allTracks
        });
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).send('Error fetching playlists');
    }
});

// Route handler to play/pause tracks
app.get('/pause', async (req, res) => {
    try {
        const state  = await getPlayingState(spotifyApi);

        if (state.is_playing) {
            await spotifyApi.pause();
        }
        else {
            const song = await getCurrentSong(spotifyApi);

            if (song && song.uri) {
                const time = state.progress_ms;
                await spotifyApi.play({ uris: [song.uri] });
                await new Promise(resolve => setTimeout(resolve, 100)); // Could be omitted but resuming is a little smoother
                await spotifyApi.seek(time);
            }
            else
                console.log('No song available to play');
        }
    } catch (err) {
        console.error('Error toggling playback state:', err);
        res.status(500).send('Error stopping track');
    }
});

app.get('/playlist/:id', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const playlist = await getPlaylistById(spotifyApi, playlistId);
        const playlistTracks = await getTracksFromPlaylist(spotifyApi, playlistId);
        
        res.json({
            playlist: playlist,
            tracks: playlistTracks
        });
    } catch (err) {
        console.error('Error fetching playlist:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
