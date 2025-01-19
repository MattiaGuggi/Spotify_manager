let searchForm, loginButton, input, playBtn, searches;
let isPaused = false, currentTrack = null, interval = null, currentTime = 0;
let tracks = [];

function displayPlaylists(data) {
    const user = data.user;
    const pfp = data.pfp;
    const playlists = data.playlists;
    
    tracks = data.tracks;
    let gallery = document.querySelector('.gallery');
    let top = document.querySelector('.user');
    let img = document.createElement('img');
    let p = document.createElement('p');
    let login = document.querySelector('.login');

    login.style.display = 'none';
    img.src = pfp;
    img.classList.add('pfp');
    p.innerText = user;
    p.classList.add('username');
    top.appendChild(img);
    top.appendChild(p);

    playlists.forEach(playlist => {
        let card = document.createElement('div');
        let title = document.createElement('p');
        let image = document.createElement('img');
        card.classList.add('card');
        title.innerText = playlist.name;
        image.src = playlist.images[0].url;
        card.appendChild(title);
        card.appendChild(image);
        gallery.appendChild(card);

        card.addEventListener('click', () => {
            let loadingText = document.createElement('p');

            loadingText.innerText = 'Loading playlist...';
            loadingText.classList.add('loading-test');
            document.body.appendChild(loadingText);
            fetch(`/playlist/${playlist.id}`)
            .then(response => response.json())
            .then(data => {
                // Display playlist and tracks on the same page
                displayPlaylistTracks(data.playlist, data.tracks);
            })
            .catch(error => console.error('Error fetching playlist tracks:', error));
        });
    });
}

function displayPlaylistTracks(playlist, tracks) {
    let playlistContainer = document.querySelector('.playlist-container');
    let gallery = document.querySelector('.gallery');
    let backButton = document.createElement('button');

    playlistContainer.innerHTML = ''; // Clear previous content
    gallery.style.display = 'none';
    playlistContainer.style.display = 'block';
    backButton.innerText = 'Back';
    backButton.classList.add('back-btn');
    playlistContainer.appendChild(backButton);

    // Add event listener for the back button
    backButton.addEventListener('click', () => {
        playlistContainer.style.display = 'none';
        gallery.style.display = 'flex';  // Show the playlists again
    });

    // Display playlist name and image
    let title = document.createElement('h2');
    let img = document.createElement('img');
    let container = document.createElement('div');
    title.innerText = playlist.name;
    title.classList.add('title');
    img.src = playlist.images[0].url;
    img.classList.add('playlist-cover');
    container.classList.add('group');
    playlistContainer.appendChild(img);
    playlistContainer.appendChild(title);

    // Display tracks
    tracks.forEach((track, index) => {
        let durationMs = track.duration || 0;
        let durationMin = Math.floor(durationMs / 60000);
        let durationSec = Math.floor((durationMs % 60000) / 1000);

        let trackDiv = document.createElement('div');
        let trackDetails = document.createElement('div');
        let song = document.createElement('p');
        let artist = document.createElement('p');
        let duration = document.createElement('p');

        if (index == 0) trackDiv.classList.add('first');

        trackDiv.classList.add('track');
        trackDetails.classList.add('track-details');
        duration.classList.add('duration');

        song.style.fontSize = '20px';
        artist.style.fontSize = '10px';
        duration.style.fontSize = '17px';

        song.innerText = `${track.name}`;
        artist.innerText = `${track.artist}`;
        duration.innerText = `${durationMin}:${durationSec < 10 ? '0' : ''}${durationSec}`;

        trackDetails.appendChild(song);
        trackDetails.appendChild(artist);
        trackDiv.appendChild(trackDetails);
        trackDiv.appendChild(duration);
        container.appendChild(trackDiv);

        trackDiv.addEventListener('click', () => {
            document.querySelectorAll('.playing').forEach(item => {
                item.classList.remove('playing');
            });
            song.classList.add('playing');
            artist.classList.add('playing');
            duration.classList.add('playing');
            submitTrack(track);
            document.querySelector('source').src = track.external_uri;
        });
    });
    playlistContainer.appendChild(container);
}

function findMatch(word, tracks) {
    return tracks.filter(track => track.name.toLowerCase().startsWith(word.toLowerCase()));
}

function displayMatches(matches) {
    searches.innerHTML = "";
    matches.forEach((match, index) => {
        if (index > 10)
            return;
        let p = document.createElement('p');
        p.classList.add('songs');
        p.innerText = match.name;
        searches.appendChild(p);

        p.addEventListener('click', () => {
            searches.innerHTML = "";
            submitTrack(match);
        });
    });

    if (input.value === "") {
        searches.innerHTML = "";
    }
}

function addSong(track) {
    let title = document.querySelector('.track-title');
    let artist = document.querySelector('.track-artist');
    let img = document.querySelector('.track-img');
    title.innerText = track.name;
    artist.innerText = track.artist;
    img.src = track.image;
}

function displayLyrics(lyricsText) {
    let lyricsContainer = document.querySelector('.lyrics');
    let final = lyricsText.split('\n').map(line => line.trim())

    lyricsContainer.innerText = final;
}

function submitTrack(track) {
    let query = track.name;
    let i = document.querySelector('i');
    currentTime = 0;
    currentTrack = track;
    isPaused = false;
    clearInterval(interval);
    addSong(track);
    updateBar(track);
    
    if (i.classList.contains('fa-play-circle'))
        i.classList.replace('fa-play-circle', 'fa-pause-circle');
    
    fetch(`/search?q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
        displayLyrics(data.lyrics);
    })
    .catch(error => console.error('Error fetching track data:', error));

    searches.innerHTML = "";
    input.value = '';
}

function updateBar(track) {
    let currentTimeElement = document.querySelector('.current-time');
    let totalTimeElement = document.querySelector('.total-time');
    let progressBar = document.querySelector('.progress-bar');

    let durationMs = track.duration || 0;
    let durationMin = Math.floor(durationMs / 60000);
    let durationSec = Math.floor((durationMs % 60000) / 1000);
    let totalTime = `${durationMin}:${durationSec < 10 ? '0' : ''}${durationSec}`;

    totalTimeElement.innerText = totalTime;
    clearInterval(interval);

    // Set an interval to update the current time and progress bar every second
    interval = setInterval(() => {
        if (currentTime * 1000 >= durationMs)
            clearInterval(interval);
        else {
            currentTime += 1;

            let currentMin = Math.floor(currentTime / 60);
            let currentSec = currentTime % 60;
            currentTimeElement.innerText = `${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec}`;

            progressBar.value = (currentTime / (durationMs / 1000)) * 100;
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    playBtn = document.querySelector('.togglePlay');
    searches = document.querySelector('.searches');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            let i = document.querySelector('i');
            if (i.classList.contains('fa-pause-circle')) {
                i.classList.replace('fa-pause-circle', 'fa-play-circle');
                clearInterval(interval);
                isPaused = true;
            }
            else {
                i.classList.replace('fa-play-circle', 'fa-pause-circle');
                isPaused = false;
                updateBar(currentTrack);
            }
            window.location.href = '/pause';
        });
    }

    loginButton = document.querySelector('.login');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            let loadingText = document.createElement('p');

            loadingText.innerText = 'Loading all playlists...';
            loadingText.classList.add('loading-test');
            document.body.appendChild(loadingText);
            loginButton.style.display = 'none';
            window.location.href = '/login';
        });
    }

    input = document.querySelector('.input');
    if (input) {
        input.addEventListener('input', () => {
            let query = input.value;
            let matches = findMatch(query, tracks);

            displayMatches(matches);
        });
    }

    searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            let query = searchForm.querySelector('input[name="q"]').value;
            let matches = findMatch(query, tracks);

            if (matches.length > 0) {
                submitTrack(matches[0]); // Play the first match
            }
        });
    }
});

fetch('/api/playlists')
.then(response => response.json())
.then(data => {
    displayPlaylists(data);
})
.catch(error => console.error('Error fetching playlists:', error));