import { state } from './state.js';
import { switchScreen } from './utils.js';

const SPOTIFY_CLIENT_ID = '7117e3b9d124443babd303cccb7';
const REDIRECT_URI = window.location.origin + '/';

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues).map(x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function connectSpotify() {
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('spotify_code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const scopes = 'playlist-read-private playlist-read-collaborative';
    const args = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: REDIRECT_URI,
        state: generateRandomString(16),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${args.toString()}&show_dialog=true`;
}

export async function handleSpotifyRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
        let codeVerifier = localStorage.getItem('spotify_code_verifier');
        try {
            const body = new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier
            });

            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });

            const data = await response.json();
            if (data.access_token) {
                state.spotifyToken = data.access_token;
                window.history.replaceState({}, document.title, window.location.pathname);
                fetchSpotifyPlaylists();
            }
        } catch (e) {
            console.error("Spotify Auth Error", e);
        }
    }
}

export async function fetchSpotifyPlaylists() {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${state.spotifyToken}` }
        });
        const data = await res.json();
        if (data.items) {
            const select = document.getElementById('spotify-playlist-select');
            if (!select) return;
            select.innerHTML = '<option value="">-- Select Playlist --</option>';
            data.items.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl.id;
                opt.innerText = pl.name + ` (${pl.tracks.total} songs)`;
                select.appendChild(opt);
            });
            document.getElementById('spotify-playlist-picker-container')?.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Spotify fetch error", e);
    }
}
