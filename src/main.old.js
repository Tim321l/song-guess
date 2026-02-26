import './style.css';
import { io } from 'socket.io-client';

const socket = io(); // Connects to the same host, which is proxied by Vite

socket.on('ping_latency', (startTime) => {
  socket.emit('pong_latency', startTime);
});

let state = {
  name: '',
  roomId: '',
  icon: '👤',
  isHost: false,
  players: [],
  myId: '',
  hasGuessed: false,
  timerInterval: null,
  favorites: [],
  currentFavUrl: null,
  spotifyToken: null,
  roomLang: null,
  roomMode: null,
  selectedCommunityGenre: 'All',
  isPaused: false
};

const SPOTIFY_CLIENT_ID = '7117e3b9d124443babd303cccb7';
// Spotify redirect URI based dynamically on current protocol and domain
const REDIRECT_URI = window.location.origin + '/';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // User needs this for Phase 13

console.log("Spotify Redirect URI:", REDIRECT_URI);

// --- Icon Rendering Helper ---
function renderIcon(icon) {
  if (!icon) return '👤';
  if (icon.startsWith('data:image')) {
    return `<img src="${icon}" class="profile-icon-img" alt="icon">`;
  }
  return `<span>${icon}</span>`;
}

// Elements
const screens = {
  auth: document.getElementById('auth-screen'),
  start: document.getElementById('start-screen'),
  lobby: document.getElementById('lobby-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen'),
  leaderboard: document.getElementById('leaderboard-screen'),
  settings: document.getElementById('settings-screen'),
  favorites: document.getElementById('favorites-screen'),
  community: document.getElementById('community-screen'),
  'forgot-password': document.getElementById('forgot-password-screen')
};

let audioPlayer = new Audio();
const savedVolume = localStorage.getItem('guessSongVolume') || 1.0;
audioPlayer.volume = parseFloat(savedVolume);

const mainVolumeSlider = document.getElementById('volume-slider');
const gameVolumeSlider = document.getElementById('game-volume-slider');
const volumeLabel = document.getElementById('volume-label');

if (mainVolumeSlider && gameVolumeSlider && volumeLabel) {
  mainVolumeSlider.value = savedVolume;
  gameVolumeSlider.value = savedVolume;
  volumeLabel.innerText = `(${Math.round(savedVolume * 100)}%)`;
}

let audioAutoplayAllowed = false;

// --- Auth Logic ---
function handleLoginSuccess(res, username, password) {
  state.name = res.username;
  state.icon = res.icon || '👤';
  state.favorites = res.favorites || [];
  document.getElementById('display-username').innerHTML = `<span style="margin-right:5px;">${renderIcon(state.icon)}</span> ${state.name}`;

  // Save for auto-login
  if (username && password) {
    localStorage.setItem('songGuessAuth', JSON.stringify({ username, password }));
  }

  // Also update the UI icon selector to match their current icon
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.innerText === state.icon) btn.classList.add('active');
  });
  document.getElementById('selected-icon').value = state.icon;
  if (res.email) {
    state.email = res.email;
    const settingsEmail = document.getElementById('settings-email');
    if (settingsEmail) settingsEmail.value = res.email;
  }

  switchScreen('start');
}

// Google Login Handler
window.handleGoogleLogin = (response) => {
  const data = JSON.parse(atob(response.credential.split('.')[1]));
  console.log("Google Login User:", data);
  const username = data.email;
  const googleId = data.sub;

  socket.emit('googleLogin', { username, googleId, email: data.email, name: data.name, icon: data.picture }, (res) => {
    if (res.success) {
      handleLoginSuccess(res, username, null); // Password is null for Google
    } else {
      alert(res.message);
    }
  });
};

document.getElementById('forgot-password-link').onclick = (e) => {
  e.preventDefault();
  switchScreen('forgot-password');
};

document.getElementById('back-to-login-btn').onclick = () => {
  switchScreen('auth');
};

document.getElementById('send-recovery-btn').onclick = () => {
  const email = document.getElementById('recovery-email').value.trim();
  if (!email) return alert("Please enter your email");

  socket.emit('forgotPassword', { email }, (res) => {
    if (res.success) {
      alert("Recover Request Sent! Please contact the admin for your new password.");
      switchScreen('auth');
    } else {
      alert(res.message);
    }
  });
};

document.getElementById('login-btn').onclick = () => {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  if (!username || !password) return alert("Please enter username and password");
  socket.emit('login', { username, password }, (res) => {
    if (res.success) {
      handleLoginSuccess(res, username, password);
    } else {
      document.getElementById('auth-message').innerText = res.message;
    }
  });
};

document.getElementById('register-btn').onclick = () => {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const policyChecked = document.getElementById('auth-policy-check').checked;

  if (!username || !password) return alert("Please enter username and password");
  if (!policyChecked) {
    const lang = localStorage.getItem('sgLang') || 'EN';
    const msg = lang === 'ZH' ? '請先閱讀並同意私隱政策。' : 'Please read and agree to the Privacy Policy first.';
    return alert(msg);
  }

  socket.emit('register', { username, password }, (res) => {
    document.getElementById('auth-message').innerText = res.message;
    if (res.success) {
      document.getElementById('auth-message').style.color = '#2ecc71';
      // Auto-login after register
      handleLoginSuccess(res, username, password);
    } else {
      document.getElementById('auth-message').style.color = '#ff4757';
    }
  });
};

// --- Leaderboard Logic ---
function renderLeaderboard() {
  const category = document.getElementById('lb-category-select').value;
  const mode = document.getElementById('lb-mode-select').value;

  socket.emit('getLeaderboard', { category, mode }, (leaderboard) => {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    if (leaderboard.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:#a8b0cc; padding:20px;">No records yet!</div>';
    } else {
      leaderboard.forEach((user, index) => {
        const div = document.createElement('div');
        div.className = 'player-score-inline';
        div.style.justifyContent = 'space-between';
        div.style.background = user.username === state.name ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)';
        div.style.border = user.username === state.name ? '1px solid #00f2fe' : 'none';

        div.innerHTML = `<span><strong>#${index + 1}</strong> <span style="margin-right:5px;">${renderIcon(user.icon)}</span> ${user.username}</span> <span>${user.score} pts</span>`;
        list.appendChild(div);
      });
    }
  });
}

document.getElementById('show-leaderboard-btn').onclick = () => {
  renderLeaderboard();
  switchScreen('leaderboard');
};

document.getElementById('lb-category-select').onchange = renderLeaderboard;
document.getElementById('lb-mode-select').onchange = renderLeaderboard;

document.getElementById('back-to-start-btn').onclick = () => {
  switchScreen('start');
};

// --- Favorites Logic ---
document.getElementById('show-favorites-btn').onclick = () => {
  renderFavorites();
  switchScreen('favorites');
};

document.getElementById('back-from-fav-btn').onclick = () => {
  stopAllAudio();
  switchScreen('start');
};

function renderFavorites() {
  const list = document.getElementById('favorites-list');
  list.innerHTML = '';
  document.getElementById('favorites-subtitle').innerText = `${state.favorites.length} Songs saved`;

  if (state.favorites.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#a8b0cc; padding:20px;">No favorites saved yet.</div>';
    return;
  }

  state.favorites.forEach(song => {
    const div = document.createElement('div');
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.padding = '15px';
    div.style.borderRadius = '10px';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.gap = '10px';

    div.innerHTML = `
      <div><strong>${song.title}</strong><br><span style="font-size:0.9em;color:#a8b0cc;">${song.artist}</span></div>
      <div style="display:flex; gap:10px; justify-content:space-between; align-items:center;">
        <button class="action-btn fav-play-btn" style="padding:5px 15px; font-size:0.9em;" onclick="playFavoritePreview('${song.audioUrl}', this)">▶️ Play</button>
        ${song.appleUrl ? `<a href="${song.appleUrl}&at=1000l1234" target="_blank" style="color:#fa243c; text-decoration:none; font-size:0.9em; font-weight:bold;">🎵 Apple Music</a>` : ''}
        <button class="action-btn" style="padding:5px 15px; font-size:0.9em; background:rgba(255,71,87,0.1); color:#ff4757; border-color:#ff4757;" onclick="removeFavoriteLocal(${song.id})">❌</button>
      </div>
    `;
    list.appendChild(div);
  });
}

window.playFavoritePreview = (url, btnElement) => {
  // If clicking the same song that is already playing, stop it
  if (state.currentFavUrl === url && !audioPlayer.paused) {
    stopAllAudio();
    return;
  }

  // Stop any other audio first
  stopAllAudio();

  state.currentFavUrl = url;
  audioPlayer.src = url;
  if (btnElement) btnElement.innerHTML = '⏸️ Pause';

  const playPromise = audioPlayer.play();
  if (playPromise !== undefined) {
    playPromise.catch(e => console.log(e));
  }

  audioAutoplayAllowed = true;

  audioPlayer.onended = () => {
    stopAllAudio();
  };
};

function stopAllAudio() {
  audioPlayer.pause();
  state.currentFavUrl = null;
  document.querySelectorAll('.fav-play-btn').forEach(b => b.innerHTML = '▶️ Play');
  const visualizer = document.getElementById('visualizer');
  if (visualizer) visualizer.classList.remove('playing');
}

window.removeFavoriteLocal = (songId) => {
  const song = state.favorites.find(s => s.id === songId);
  if (!song) return;
  socket.emit('toggleFavorite', { username: state.name, song: song }, (res) => {
    if (res.success) {
      state.favorites = res.favorites;
      renderFavorites();
    }
  });
};

// --- Settings Logic ---
document.getElementById('show-settings-btn').onclick = () => {
  switchScreen('settings');
};

document.getElementById('cancel-settings-btn').onclick = () => {
  switchScreen('start');
  document.getElementById('settings-message').innerText = '';
};

// Volume Sliders
function updateVolume(vol) {
  audioPlayer.volume = vol;
  localStorage.setItem('guessSongVolume', vol);
  mainVolumeSlider.value = vol;
  gameVolumeSlider.value = vol;
  volumeLabel.innerText = `(${Math.round(vol * 100)}%)`;
}

mainVolumeSlider.oninput = (e) => updateVolume(parseFloat(e.target.value));
gameVolumeSlider.oninput = (e) => updateVolume(parseFloat(e.target.value));

// Icon Selection
document.querySelectorAll('.icon-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('selected-icon').value = btn.innerText;
  };
});

// Photo Upload Logic
const iconUploadInput = document.getElementById('icon-upload-input');
const uploadBtn = document.getElementById('upload-icon-btn');

if (uploadBtn) {
  uploadBtn.onclick = () => iconUploadInput.click();
}

if (iconUploadInput) {
  iconUploadInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', 0.8);

        // Update selection UI
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('selected-icon').value = dataUrl;

        if (uploadBtn) {
          uploadBtn.innerHTML = `<img src="${dataUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; object-fit:cover;"> Photo Selected`;
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
}

// Save Settings
document.getElementById('save-settings-btn').onclick = () => {
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const icon = document.getElementById('selected-icon').value;
  const email = document.getElementById('settings-email').value.trim();

  socket.emit('updateSettings', {
    username: state.name,
    oldPassword,
    newPassword,
    icon,
    email
  }, (res) => {
    const msgEl = document.getElementById('settings-message');
    msgEl.innerText = res.message;
    if (res.success) {
      msgEl.style.color = '#2ecc71';
      state.icon = icon;
      document.getElementById('display-username').innerHTML = `<span style="margin-right:5px;">${renderIcon(state.icon)}</span> ${state.name}`;
      document.getElementById('old-password').value = '';
      document.getElementById('new-password').value = '';
      setTimeout(() => {
        switchScreen('start');
        msgEl.innerText = '';
      }, 1500);
    } else {
      msgEl.style.color = '#ff4757';
    }
  });
};

// --- Spotify Integration Logic ---

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

async function connectSpotify() {
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

async function handleSpotifyRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error') || new URLSearchParams(window.location.hash.substring(1)).get('error');

  // Fallback for old implicit grant if they magically got a token in the hash
  const hash = window.location.hash.substring(1);
  const oldToken = new URLSearchParams(hash).get('access_token');

  if (oldToken) {
    state.spotifyToken = oldToken;
    window.location.hash = ''; // Clear hash
    switchScreen('start');
    document.getElementById('create-room-form').classList.remove('hidden');
    fetchSpotifyPlaylists();
    return;
  }

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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      const textRaw = await response.text();
      let data;
      try {
        data = JSON.parse(textRaw);
      } catch (e) {
        alert("Raw Spotify Token Response was not JSON: " + textRaw.substring(0, 100));
        return;
      }

      if (data.access_token) {
        state.spotifyToken = data.access_token;
        window.history.replaceState({}, document.title, window.location.pathname); // Clear URL
        switchScreen('start');
        document.getElementById('create-room-form').classList.remove('hidden');
        fetchSpotifyPlaylists();
      } else {
        console.error("Spotify Auth Token Error:", data);
        alert("Spotify Token Error: " + JSON.stringify(data));
      }
    } catch (e) {
      console.error("Spotify Fetch Error:", e);
      alert("Spotify Fetch Error: " + e.message);
    }
  } else if (error) {
    alert("Spotify Auth Error: " + error);
    console.error("Spotify Auth Error:", error);
  }
}

async function fetchSpotifyPlaylists() {
  const status = document.getElementById('spotify-status');
  if (status) status.innerText = 'Fetching playlists...';

  try {
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${state.spotifyToken}` }
    });
    const textRaw = await res.text();
    let data;
    try {
      data = JSON.parse(textRaw);
    } catch (e) {
      alert("Raw Spotify Response was not JSON: " + textRaw.substring(0, 100));
      return;
    }

    if (data.items) {
      const select = document.getElementById('spotify-playlist-select');
      select.innerHTML = '<option value="">-- Select Playlist --</option>';
      data.items.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.innerText = pl.name + ` (${pl.tracks.total} songs)`;
        select.appendChild(opt);
      });
      document.getElementById('spotify-playlist-picker-container').classList.remove('hidden');

      // Update Settings badge
      const badge = document.getElementById('spotify-settings-badge');
      if (badge) { badge.innerText = '✅ Connected'; badge.style.color = '#1DB954'; }

      // Update Connect button text in Settings
      const connectBtn = document.getElementById('spotify-connect-btn');
      if (connectBtn) connectBtn.innerText = '🔄 Reconnect Spotify';

      // Update the Create Room status indicator
      const roomStatus = document.getElementById('spotify-room-status');
      if (roomStatus) { roomStatus.innerText = '✅ Spotify connected — pick a playlist below!'; roomStatus.style.color = '#1DB954'; }

      if (status) status.innerText = 'Connected to Spotify!';
    } else {
      alert("Spotify Playlist Fetch Error: " + JSON.stringify(data));
      if (status) status.innerText = 'Error: ' + JSON.stringify(data);
    }
  } catch (e) {
    alert("Spotify Playlist Fetch Exception: " + e.message);
    if (status) status.innerText = 'Error fetching playlists. ' + e.message;
  }
}

document.getElementById('spotify-connect-btn').onclick = () => {
  if (SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID') {
    alert("Please provide your Spotify Client ID in main.js first!");
    return;
  }
  connectSpotify();
};

document.getElementById('spotify-playlist-select').onchange = async (e) => {
  const playlistId = e.target.value;
  if (!playlistId) return;

  const status = document.getElementById('spotify-status');
  status.innerText = 'Loading tracks and finding previews...';

  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { 'Authorization': `Bearer ${state.spotifyToken}` }
    });
    const data = await res.json();
    const tracks = data.items.map(i => i.track).filter(t => t);

    // We will search iTunes for previews for these tracks in real-time when the game starts?
    // Or now to show how many we found. Let's do a few now to verify.
    status.innerText = `Loaded ${tracks.length} tracks. Preparing game...`;

    // Store tracks in state to be converted on room create
    state.tempSpotifyTracks = tracks;
    state.selectedPlaylistName = select.options[select.selectedIndex].text;
  } catch (e) {
    status.innerText = 'Error loading tracks.';
  }
};

async function searchItunesClient(track) {
  try {
    const query = `${track.artists[0].name} ${track.name}`;
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
    const data = await res.json();
    const result = data.results[0];
    if (result && result.previewUrl) {
      return {
        title: result.trackName,
        artist: result.artistName,
        audioUrl: result.previewUrl,
        appleUrl: result.trackViewUrl,
        year: new Date(result.releaseDate).getFullYear()
      };
    }
  } catch (e) { }
  return null;
}

// Handle redirect on load
handleSpotifyRedirect();

// --- Room Logic ---
document.getElementById('show-create-btn').onclick = () => {
  socket.emit('getCategories', (categories) => {
    const select = document.getElementById('lang-select');
    // Keep "All" as the first option
    select.innerHTML = '<option value="all">Mixed / All Categories</option>';

    categories.forEach(cat => {
      const t = TRANSLATIONS[currentLang] || TRANSLATIONS.EN;
      // Use translation key if it exists
      let labelKey = 'cat-' + cat.replace('songs', '').toLowerCase();
      let label = t[labelKey] || cat.replace('songs', '') + ' Hits';

      if (cat.startsWith('spotify:')) {
        label = cat.replace('spotify:', '') + ' (Spotify)';
      }

      // const countMatch = cat.match(/\d+/); // Placeholder if we had counts
      const option = document.createElement('option');
      option.value = cat;
      option.innerText = label;
      select.appendChild(option);
    });

    // Also inject user's own/liked community playlists
    if (communityPlaylists && communityPlaylists.length > 0) {
      const myPls = communityPlaylists.filter(p => p.owner === state.name || (p.likes && p.likes.includes(state.name)));
      if (myPls.length > 0) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = "🎵 My Community Playlists";
        myPls.forEach(pl => {
          const opt = document.createElement('option');
          opt.value = `community:${pl.id}`;
          opt.innerText = `${pl.name} (${pl.songs ? pl.songs.length : 0} songs)`;
          optGroup.appendChild(opt);
        });
        select.appendChild(optGroup);
      }
    }
  });
  document.getElementById('create-room-form').classList.remove('hidden');
  document.getElementById('join-room-form').classList.add('hidden');
};

document.getElementById('mode-select').onchange = (e) => {
  if (e.target.value === 'elimination') {
    document.getElementById('rounds-group').classList.add('hidden');
    document.getElementById('hearts-group').classList.remove('hidden');
  } else {
    document.getElementById('rounds-group').classList.remove('hidden');
    document.getElementById('hearts-group').classList.add('hidden');
  }
};

document.getElementById('show-join-btn').onclick = () => {
  document.getElementById('join-room-form').classList.remove('hidden');
  document.getElementById('create-room-form').classList.add('hidden');
};

document.getElementById('create-btn').onclick = async () => {
  const name = state.name || 'Player';
  const icon = state.icon || '👤';
  const mode = document.getElementById('mode-select').value;
  const rounds = parseInt(document.getElementById('rounds-select').value);
  const hearts = parseInt(document.getElementById('hearts-select').value);
  const diff = parseInt(document.getElementById('diff-select').value);
  const lang = document.getElementById('lang-select').value;

  let customSongs = [];
  const status = document.getElementById('spotify-status');

  // If a Spotify playlist is selected, convert it now
  const spotifyPlaylistId = document.getElementById('spotify-playlist-select').value;
  if (spotifyPlaylistId && state.tempSpotifyTracks) {
    const createBtn = document.getElementById('create-btn');
    const originalText = createBtn.innerText;
    createBtn.disabled = true;
    createBtn.innerText = 'Converting Spotify...';
    status.innerText = 'Searching iTunes for audio previews...';

    // Search iTunes for each track (limit to top 100 for performance)
    const tracksToProcess = state.tempSpotifyTracks.slice(0, 100);
    const results = [];

    // Process in batches to avoid overwhelming the browser/API
    for (let i = 0; i < tracksToProcess.length; i++) {
      status.innerText = `Converting: ${i + 1}/${tracksToProcess.length}`;
      const found = await searchItunesClient(tracksToProcess[i]);
      if (found) {
        found.id = results.length + 1; // Assign ID for game
        results.push(found);
      }
    }

    if (results.length < 5) {
      alert("Found too few playable songs in this playlist (iTunes previews not available for most). Try another playlist.");
      createBtn.disabled = false;
      createBtn.innerText = originalText;
      return;
    }

    customSongs = results;
    createBtn.disabled = false;
    createBtn.innerText = originalText;
    status.innerText = `Ready with ${results.length} playable songs!`;
  }

  socket.emit('createRoom', {
    name, icon, mode, rounds, hearts, diff,
    lang: spotifyPlaylistId ? 'spotify' : lang,
    customSongs
  }, (res) => {
    if (res.success) {
      state.roomId = res.roomId;
      state.isHost = res.host;
      state.players = res.players;
      state.roomLang = res.lang;
      state.roomMode = res.mode;
      updateLobby();
      switchScreen('lobby');
    }
  });
};

document.getElementById('join-btn').onclick = () => {
  const name = state.name || 'Player';
  const icon = state.icon || '👤';
  const roomId = document.getElementById('room-code-input').value;
  socket.emit('joinRoom', { roomId, name, icon }, (res) => {
    if (res.success) {
      state.roomId = res.roomId;
      state.isHost = res.host;
      state.players = res.players;
      state.roomLang = res.lang;
      state.roomMode = res.mode;
      updateLobby();
      switchScreen('lobby');
    } else {
      alert(res.message);
    }
  });
};

document.getElementById('lobby-start-btn').onclick = () => {
  socket.emit('startGame', state.roomId);
};

document.getElementById('force-start-btn').onclick = () => socket.emit('startGame', state.roomId);
document.getElementById('pause-btn').onclick = () => socket.emit('togglePause', state.roomId);
document.getElementById('overlay-resume-btn').onclick = () => socket.emit('togglePause', state.roomId);

document.getElementById('ready-btn').onclick = () => {
  audioAutoplayAllowed = true;
  audioPlayer.src = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  audioPlayer.play().then(() => { }).catch(e => console.error(e));

  // Disable button and indicate waiting
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.innerText = "Waiting for other players to ready up...";
  readyBtn.style.opacity = '0.7';
  readyBtn.style.pointerEvents = 'none';

  socket.emit('playerReady', state.roomId);
};

socket.on('roomUpdate', (res) => {
  state.players = res.players;
  if (res.isPaused !== undefined) {
    state.isPaused = res.isPaused;
    if (state.isPaused) {
      document.getElementById('pause-overlay').classList.remove('hidden');
    } else {
      document.getElementById('pause-overlay').classList.add('hidden');
    }
  }
  updateLobby();
  if (document.getElementById('game-screen').classList.contains('active')) {
    updateScores();
  }
});

function updateLobby() {
  document.getElementById('lobby-room-code').innerText = state.roomId;
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  state.players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'player-item';
    div.style.color = 'var(--text-main)';
    div.innerHTML = `<span style="margin-right: 10px;">${renderIcon(p.icon)}</span> ${p.name}`;
    list.appendChild(div);
  });
  if (state.isHost) {
    document.getElementById('lobby-start-btn').classList.remove('hidden');
  }
}

function updateScores() {
  const container = document.getElementById('scores-display');
  if (!container) return;
  container.innerHTML = '';

  state.players.slice().sort((a, b) => b.score - a.score).forEach(p => {
    const d = document.createElement('div');
    d.style.color = 'var(--text-main)';

    let text = `<span style="margin-right: 5px;">${renderIcon(p.icon)}</span> <strong>${p.name}:</strong> ${p.score}`;

    // Add Hearts or Skull if in elimination mode
    if (p.hearts !== undefined) {
      if (p.eliminated) {
        text += ` <span style="color: #ff4757; font-size: 0.8em; margin-left: 10px;">💀 Eliminated</span>`;
      } else {
        text += ` <span style="font-size: 0.8em; margin-left: 10px;">❤️ x${p.hearts}</span>`;
      }
    }

    d.innerHTML = text;
    d.className = "player-score-inline";
    if (p.id === socket.id) {
      d.style.boxShadow = '0 0 10px rgba(126, 213, 111, 0.5)';
      d.style.border = '1px solid #7ed56f';
    }
    container.appendChild(d);
  });
}

socket.on('gameStarting', () => {
  switchScreen('game');
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.classList.remove('hidden');
  readyBtn.innerText = "Click Here to Ready & Enable Audio";
  readyBtn.style.opacity = '1';
  readyBtn.style.pointerEvents = 'auto';
  document.getElementById('options-grid').classList.add('hidden'); // Hide options initially

  // Show Ready Status
  document.getElementById('ready-status-container').classList.remove('hidden');
  const forceBtn = document.getElementById('force-start-btn');
  if (state.isHost) {
    forceBtn.classList.remove('hidden');
    forceBtn.onclick = () => {
      audioAutoplayAllowed = true;
      audioPlayer.src = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      audioPlayer.play().then(() => { }).catch(e => console.error(e));
      socket.emit('forceStartGame', state.roomId);
    };
  } else {
    forceBtn.classList.add('hidden');
  }

  // Show host controls early for pausing during ready phase
  if (state.isHost) {
    document.getElementById('host-controls').classList.remove('hidden');
  }
});

socket.on('gameStarted', () => {
  document.getElementById('ready-btn').classList.add('hidden');
  document.getElementById('ready-status-container').classList.add('hidden');
  document.getElementById('options-grid').classList.remove('hidden');

  // Show host controls if I am the host
  if (state.isHost) {
    document.getElementById('host-controls').classList.remove('hidden');
  }
});

socket.on('gamePaused', () => {
  state.isPaused = true;
  document.getElementById('pause-overlay').classList.remove('hidden');
  if (state.isHost) {
    document.getElementById('pause-btn-text').setAttribute('data-i18n', 'resume-btn');
    document.getElementById('pause-btn-icon').innerText = '▶️';
    document.getElementById('overlay-resume-btn').classList.remove('hidden');
    if (window.applyLanguage) applyLanguage(currentLang);
  }
  // Pause audio
  const audio = document.getElementById('audio-player');
  if (audio) audio.pause();

  // Pause CSS animation for progress bar
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.animationPlayState = 'paused';
});

socket.on('gameResumed', () => {
  state.isPaused = false;
  document.getElementById('pause-overlay').classList.add('hidden');
  if (state.isHost) {
    document.getElementById('pause-btn-text').setAttribute('data-i18n', 'pause-btn');
    document.getElementById('pause-btn-icon').innerText = '⏸️';
    document.getElementById('overlay-resume-btn').classList.add('hidden');
    if (window.applyLanguage) applyLanguage(currentLang);
  }
  // Resume audio
  const audio = document.getElementById('audio-player');
  if (audio) audio.play().catch(e => console.warn("Auto-play blocked on resume", e));

  // Resume CSS animation
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.animationPlayState = 'running';
});

socket.on('roomReset', (res) => {
  state.players = res.players;
  // Reset ready status on buttons
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.innerText = "Click Here to Ready & Enable Audio";
  readyBtn.style.opacity = '1';
  readyBtn.style.pointerEvents = 'auto';

  // Hide host controls and overlay
  document.getElementById('host-controls').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');

  updateLobby();
  switchScreen('lobby');
});

socket.on('readyStatusUpdate', (readyPlayers) => {
  const list = document.getElementById('ready-players-list');
  if (!list) return;
  list.innerHTML = '';
  state.players.forEach(p => {
    const isReady = readyPlayers.includes(p.id);
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.padding = '8px 12px';
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.borderRadius = '5px';

    const iconSpan = `<span style="margin-right:8px;">${renderIcon(p.icon)}</span>`;
    const statusSpan = isReady ?
      `<span style="color: #2ecc71;">✅ Ready</span>` :
      `<span style="color: #a8b0cc;">🕒 Waiting...</span>`;

    div.innerHTML = `<div>${iconSpan}${p.name}</div>${statusSpan}`;
    list.appendChild(div);
  });
});

socket.on('newTurn', (data) => {
  stopAllAudio();
  state.hasGuessed = false;
  updateScores();

  // Hide promote container for new turn
  document.getElementById('promote-container').classList.add('hidden');
  document.getElementById('promote-container').innerHTML = '';
  document.getElementById('lyrics-display-container').classList.add('hidden');

  document.getElementById('round-display').innerText = `${data.round} / ${data.totalRounds}`;
  const selfPlayer = state.players.find(p => p.id === socket.id);
  const isEliminated = selfPlayer && selfPlayer.eliminated;

  if (isEliminated) {
    document.getElementById('turn-message').innerText = '💀 You are eliminated! Spectating...';
    document.getElementById('turn-message').style.color = '#ff4757';
  } else if (data.mode === 'lyrics-fallback') {
    document.getElementById('turn-message').innerText = '⚠️ Lyrics not found! Bonus Audio Round!';
    document.getElementById('turn-message').className = 'highlight';
    document.getElementById('turn-message').style.color = '#f1c40f'; // Yellow warning
  } else {
    document.getElementById('turn-message').innerText = 'Listen and guess!';
    document.getElementById('turn-message').className = 'highlight';
    document.getElementById('turn-message').style.color = '';
  }

  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';

  if (data.mode === 'next') {
    // --- "What's Next?" Mode UI ---
    document.getElementById('turn-message').innerText = '🎵 Listen to the clip, then pick the continuation!';

    let snippetAudio = new Audio();
    let snippetPlaying = false;

    data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.id = opt.id;
      btn.innerHTML = `<div class="option-song">▶️ Snippet ${i + 1}</div>`;
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';

      // Preview on hover (once unlocked)
      btn.addEventListener('mouseenter', () => {
        if (btn.disabled || state.hasGuessed) return;
        snippetAudio.pause();
        snippetAudio.src = opt.audioUrl;
        snippetAudio.currentTime = 10; // Start 10 seconds in (the "E" part)
        snippetAudio.play().catch(e => { });
        snippetPlaying = true;
      });
      btn.addEventListener('mouseleave', () => {
        if (snippetPlaying) {
          snippetAudio.pause();
          snippetPlaying = false;
        }
      });

      btn.onclick = () => {
        if (state.hasGuessed || btn.disabled) return;
        snippetAudio.pause();
        state.hasGuessed = true;
        document.querySelectorAll('.option-btn').forEach(b => {
          b.style.opacity = '0.5';
          b.style.cursor = 'not-allowed';
        });
        btn.style.opacity = '1';
        btn.classList.add('picked');
        document.getElementById('turn-message').innerText = 'Answer locked! Waiting for others...';
        socket.emit('guess', { roomId: state.roomId, songId: opt.id });
      };

      grid.appendChild(btn);
    });
  } else if (data.mode === 'lyrics') {
    // --- Lyrics Mode UI ---
    document.getElementById('turn-message').innerText = '🎵 Read the lyrics and guess the next line!';
    const lyricsContainer = document.getElementById('lyrics-display-container');
    const lyricsText = document.getElementById('lyrics-text');
    lyricsContainer.classList.remove('hidden');
    lyricsText.innerHTML = data.lyricsPrompt.join('<br>');

    data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn lyrics-option';
      btn.dataset.id = opt.id;
      btn.innerHTML = `<div class="option-song" style="font-size: 0.9em; white-space: normal;">${opt.title}</div>`;
      btn.onclick = () => {
        if (state.hasGuessed || btn.disabled) return;
        state.hasGuessed = true;
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => {
          b.style.opacity = '0.5';
          b.style.cursor = 'not-allowed';
        });
        btn.style.opacity = '1';
        btn.classList.add('picked');
        document.getElementById('turn-message').innerText = 'Answer locked! Waiting for timer or other players...';
        socket.emit('guess', { roomId: state.roomId, songId: opt.id });
      };

      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';

      if (isEliminated) {
        btn.style.opacity = '0.2';
      }
      grid.appendChild(btn);
    });
  } else {
    // --- Standard / Elimination Mode UI ---
    data.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.id = opt.id;
      btn.innerHTML = `<div class="option-song">${opt.title} - ${opt.artist}</div>`;
      btn.onclick = () => {
        if (state.hasGuessed || btn.disabled) return;
        state.hasGuessed = true;
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => {
          b.style.opacity = '0.5';
          b.style.cursor = 'not-allowed';
        });
        btn.style.opacity = '1';
        btn.classList.add('picked');
        document.getElementById('turn-message').innerText = 'Answer locked! Waiting for timer or other players...';
        socket.emit('guess', { roomId: state.roomId, songId: opt.id });
      };

      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';

      if (isEliminated) {
        btn.style.opacity = '0.2';
      }

      grid.appendChild(btn);
    });
  }

  if (audioAutoplayAllowed && data.audioUrl) {
    audioPlayer.src = data.audioUrl;
    audioPlayer.load();
    audioPlayer.play().catch(e => console.log(e));
    document.getElementById('visualizer').classList.add('playing');
  }

  // Timer visually uses the total Guess Time (Audio duration + 5 seconds buffer)
  let initialTimeLeft = data.totalGuessTimeMs / 1000;
  if (initialTimeLeft < 10) {
    document.getElementById('time-left').innerText = `0:0${initialTimeLeft}`;
  } else {
    document.getElementById('time-left').innerText = `0:${initialTimeLeft}`;
  }

  const fill = document.getElementById('progress-fill');
  fill.style.width = `100%`;

  let timeLeft = data.totalGuessTimeMs / 1000;
  let audioTimeLeft = data.durationMs / 1000;
  const totalTime = timeLeft;

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (state.isPaused) return;
    timeLeft -= 0.1;
    audioTimeLeft -= 0.1;

    // Stop the audio only when the specific difficulty duration is up
    if (audioTimeLeft <= 0 && audioAutoplayAllowed && !audioPlayer.paused) {
      audioPlayer.pause();
      document.getElementById('visualizer').classList.remove('playing');

      if (data.mode === 'next') {
        document.getElementById('turn-message').innerText = '🎶 Hover over a snippet to preview, then click to lock in!';
      } else {
        document.getElementById('turn-message').innerText = 'Audio stopped! You have 5 seconds to answer!';
      }

      // Unlock all un-picked buttons to allow guessing (only if alive)
      if (!state.hasGuessed && !isEliminated) {
        document.querySelectorAll('.option-btn').forEach(b => {
          b.disabled = false;
          b.style.opacity = '1';
          b.style.cursor = 'pointer';
        });
      }
    }

    // Overall Guess Timer
    if (timeLeft <= 0) {
      timeLeft = 0;
      clearInterval(state.timerInterval);
    }

    let displaySecs = Math.ceil(timeLeft);
    if (displaySecs < 10) {
      document.getElementById('time-left').innerText = `0:0${displaySecs}`;
    } else {
      document.getElementById('time-left').innerText = `0:${displaySecs}`;
    }

    fill.style.width = `${(timeLeft / totalTime) * 100}%`;
  }, 100);
});

socket.on('turnResult', (res) => {
  audioPlayer.pause();
  document.getElementById('visualizer').classList.remove('playing');
  clearInterval(state.timerInterval);

  state.players = res.players;
  updateScores();

  state.hasGuessed = true;

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    // Clear any previous tags dynamically
    const existingTags = btn.querySelector('.guess-tags');
    if (existingTags) existingTags.remove();

    const isCorrect = String(btn.dataset.id) === String(res.correctSong.id);
    if (isCorrect) {
      btn.classList.add('correct');
      btn.style.opacity = '1';
    } else {
      btn.classList.add('wrong');
      btn.style.opacity = '0.5';
    }
  });

  // Append icons for everyone who guessed
  res.players.forEach(p => {
    const pResult = res.results[p.id];
    if (pResult && pResult.songIdPicked !== undefined && pResult.songIdPicked !== null) {
      const pickedBtn = Array.from(buttons).find(b => String(b.dataset.id) === String(pResult.songIdPicked));
      if (pickedBtn) {
        let tagContainer = pickedBtn.querySelector('.guess-tags');
        if (!tagContainer) {
          tagContainer = document.createElement('div');
          tagContainer.className = 'guess-tags';
          tagContainer.style.display = 'flex';
          tagContainer.style.flexWrap = 'wrap';
          tagContainer.style.gap = '5px';
          tagContainer.style.justifyContent = 'center';
          tagContainer.style.marginTop = '10px';
          pickedBtn.appendChild(tagContainer);
        }
        const playerTag = document.createElement('span');
        playerTag.style.background = 'rgba(255,255,255,0.2)';
        playerTag.style.padding = '2px 8px';
        playerTag.style.borderRadius = '10px';
        playerTag.style.fontSize = '0.9em';
        playerTag.style.display = 'flex';
        playerTag.style.alignItems = 'center';
        playerTag.style.gap = '5px';
        playerTag.innerHTML = `${renderIcon(p.icon)} ${p.name}`;
        tagContainer.appendChild(playerTag);
      }
    }
  });

  // Find my result
  const myResult = res.results[socket.id];
  if (myResult && myResult.isCorrect) {
    document.getElementById('turn-message').innerText = `Correct! +10 Points!`;
    document.getElementById('turn-message').style.color = '#2ecc71';
  } else if (myResult && !myResult.isCorrect) {
    document.getElementById('turn-message').innerText = `Wrong!`;
    document.getElementById('turn-message').style.color = '#ff4757';
  } else {
    document.getElementById('turn-message').innerText = `Time's up!`;
    document.getElementById('turn-message').style.color = '#fff';
  }

  // Revert color back after timeout so it doesn't stay green/red for the next round
  setTimeout(() => {
    document.getElementById('turn-message').style.color = '';
  }, 3500);

  // Payoff for lyrics mode
  if (!document.getElementById('lyrics-display-container').classList.contains('hidden')) {
    if (res.correctSong && res.correctSong.audioUrl) {
      document.getElementById('turn-message').innerText += ' 🎶 (Revealing Song)';
      if (audioAutoplayAllowed) {
        audioPlayer.src = res.correctSong.audioUrl;
        audioPlayer.load();
        audioPlayer.play().catch(e => console.log(e));
        document.getElementById('visualizer').classList.add('playing');
      }
    }
  }

  // Show Promote/Favorite Links
  if (res.correctSong) {
    const promoteContainer = document.getElementById('promote-container');
    promoteContainer.classList.remove('hidden');

    window.currentTurnSong = res.correctSong;
    const isFav = state.favorites.some(s => s.id === res.correctSong.id);
    const favText = isFav ? '❤️ Saved' : '⭐ Save to Favorites';
    const favColor = isFav ? '#ff4757' : '#f1c40f';

    promoteContainer.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; align-items: center;">
        <button id="turn-fav-btn" class="action-btn" style="background: rgba(255,255,255,0.1); color: ${favColor}; border-color: ${favColor}; font-size: 0.9em; padding: 10px 20px; outline: none;" onclick="toggleFavoriteCurrent()">
          ${favText}
        </button>
        ${res.appleUrl ? `
        <a href="${res.appleUrl}&at=1000l1234" target="_blank" style="display: inline-block; background: #fa243c; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 15px rgba(250, 36, 60, 0.4); animation: pulse 2s infinite;">
          🎵 Apple Music
        </a>` : ''}
      </div>
      <div style="font-size: 0.8em; color: rgba(255,255,255,0.5);">Support the developer!</div>
    `;
  }
});

window.toggleFavoriteCurrent = () => {
  if (!window.currentTurnSong || !state.name) return;
  socket.emit('toggleFavorite', { username: state.name, song: window.currentTurnSong }, (resp) => {
    if (resp.success) {
      state.favorites = resp.favorites;
      const isFav = state.favorites.some(s => s.id === window.currentTurnSong.id);
      const btn = document.getElementById('turn-fav-btn');
      if (btn) {
        btn.innerText = isFav ? '❤️ Saved' : '⭐ Save to Favorites';
        btn.style.color = isFav ? '#ff4757' : '#f1c40f';
        btn.style.borderColor = isFav ? '#ff4757' : '#f1c40f';
      }
    }
  });
};

socket.on('gameOver', (res) => {
  state.players = res.players;
  const ranking = document.getElementById('final-ranking');
  ranking.innerHTML = '';
  const sorted = res.players.slice().sort((a, b) => b.score - a.score);

  const myPlayer = sorted.find(p => p.id === socket.id);
  const isWinner = sorted[0].id === socket.id;

  sorted.forEach((p, i) => {
    const d = document.createElement('div');
    const recordBadge = p.newRecord ? '<span style="background: #f1c40f; color: #000; font-size: 0.7em; padding: 2px 6px; border-radius: 10px; margin-left:10px; font-weight:bold;">NEW RECORD!</span>' : '';
    d.innerHTML = `<h3>#${i + 1} ${p.name} - ${p.score} pts ${recordBadge}</h3>`;
    d.className = 'final-score-card mt-3';
    d.style.width = '100%';
    ranking.appendChild(d);
  });

  // Hide host controls
  document.getElementById('host-controls').classList.add('hidden');

  // Play result sound
  if (myPlayer?.newRecord) playResultSound('record');
  else if (isWinner) playResultSound('victory');
  else playResultSound('defeat');

  // Show "Play Again" button if host
  const playAgainBtn = document.getElementById('play-again-btn');
  if (state.isHost) {
    playAgainBtn.classList.remove('hidden');
    playAgainBtn.onclick = () => socket.emit('requestPlayAgain', state.roomId);
  } else {
    playAgainBtn.classList.add('hidden');
  }

  // Show Global Ranking for this Category
  const globalContainer = document.getElementById('global-ranking-container');
  const globalList = document.getElementById('global-ranking-list');
  const catModeText = document.getElementById('res-cat-mode-text');

  if (state.roomLang && state.roomMode && state.roomLang !== 'all') {
    globalContainer.classList.remove('hidden');
    catModeText.innerText = `${state.roomLang} (${state.roomMode})`;

    socket.emit('getLeaderboard', { category: state.roomLang, mode: state.roomMode }, (lb) => {
      globalList.innerHTML = '';
      if (lb.length === 0) {
        globalList.innerHTML = '<div style="text-align: center; color: #666;">No records yet! Be the first!</div>';
      } else {
        lb.forEach((entry, idx) => {
          const div = document.createElement('div');
          div.className = 'leaderboard-item';
          div.style.padding = '10px';
          div.style.background = entry.username === state.name ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)';
          div.style.border = entry.username === state.name ? '1px solid #00f2fe' : 'none';
          div.style.display = 'flex';
          div.style.justifyContent = 'space-between';
          div.innerHTML = `
            <span>#${idx + 1} ${renderIcon(entry.icon)} ${entry.username}</span>
            <span style="font-weight: bold; color: #00f2fe;">${entry.score} pts</span>
          `;
          globalList.appendChild(div);
        });
      }
    });
  } else {
    globalContainer.classList.add('hidden');
  }

  switchScreen('result');
});

document.getElementById('restart-btn').onclick = () => {
  switchScreen('start');
};

function switchScreen(screenName) {
  if (screenName !== 'game' && screenName !== 'favorites') {
    stopAllAudio();
  }

  Object.values(screens).forEach(s => {
    if (s) {
      s.classList.remove('active');
      s.classList.add('hidden');
    }
  });

  if (screens[screenName]) {
    screens[screenName].classList.remove('hidden');
    screens[screenName].classList.add('active');
  }
}
document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('songGuessAuth');
  switchScreen('auth');
  state.name = '';
  state.favorites = [];
};

// --- Check Auto Login ---
const savedAuth = localStorage.getItem('songGuessAuth');
if (savedAuth) {
  try {
    const { username, password } = JSON.parse(savedAuth);
    socket.emit('login', { username, password }, (res) => {
      if (res.success) {
        handleLoginSuccess(res, username, password);
      } else {
        localStorage.removeItem('songGuessAuth');
      }
    });
  } catch (e) {
    localStorage.removeItem('songGuessAuth');
  }
}
// --- Security & Anti-Cheat ---
// (Now handled centrally in public/security.js)

// Basic DevTools Detection
setInterval(() => {
  const threshold = 160;
  const isDevToolsOpen = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
  if (isDevToolsOpen) {
    // If they open it, just refresh or blank out? 
    // Let's just alert once for now, or just keep blocking
    console.log("Please close Developer Tools to continue playing.");
  }
}, 1000);

// Handle Kick from Server (Duplicate IP)
socket.on('kick', (reason) => {
  alert(reason);
  document.body.innerHTML = `
    <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; font-family: sans-serif; background: #0f0c29; color: white;">
      <h1 style="font-size: 5rem;">🚫</h1>
      <h2>Access Denied</h2>
      <p>${reason}</p>
      <button onclick="location.reload()" class="action-btn" style="margin-top:20px; border:1px solid #00f2fe; color:#00f2fe;">Try Reconnecting</button>
    </div>
  `;
});

// =============================================
// === Global Settings Bar Logic ===
// =============================================

// --- Complete Language Translation Engine ---
const TRANSLATIONS = {
  EN: {
    // Auth screen
    'app-title-html': 'Song <span class="highlight">Guess</span> Online',
    'auth-subtitle': 'Login to save your scores!',
    'username-label': 'Username',
    'username-placeholder': 'Enter username',
    'password-label': 'Password',
    'password-placeholder': 'Enter password',
    'login-btn': 'Login',
    'register-btn': 'Register',
    'forgot-password-link': 'Forgot Password?',
    'policy-accept-part1': 'I have read and agree to the',
    // Reset password screen
    'reset-title': 'Reset Password',
    'reset-subtitle': 'Enter your email or username to request a reset.',
    'recovery-label': 'Email or Username',
    'recovery-placeholder': 'Enter your email or username',
    'send-recovery-btn': 'Send Request',
    'back-to-login-btn': 'Back to Login',
    // Start screen
    'start-subtitle': 'Join the room with your friends!',
    'welcome-text': 'Welcome back, ',
    'show-create-btn': 'Create Room',
    'show-join-btn': 'Join Room',
    'show-leaderboard-btn': '🏆 Leaderboard',
    'show-settings-btn': '⚙️ Settings',
    'show-favorites-btn': '⭐ My Favorites',
    'logout-btn': '🚪 Logout',
    // Create room form
    'music-category-label': 'Music Category',
    'cat-all': 'Mixed / All Categories',
    'spotify-connect-btn': 'Connect your Spotify',
    'pick-playlist-label': 'Pick a playlist:',
    'difficulty-label': 'Difficulty',
    'diff-easy': 'Easy (10 seconds)',
    'diff-medium': 'Medium (5 seconds)',
    'diff-hard': 'Hard (1 second)',
    'game-mode-label': 'Game Mode',
    'mode-standard': 'Standard (Fixed Rounds)',
    'mode-elimination': 'Elimination (Survival)',
    'mode-next': "What's Next? (ABCD -> E)",
    'rounds-label': 'Rounds',
    'rounds-5': '5 Rounds',
    'rounds-10': '10 Rounds',
    'rounds-20': '20 Rounds',
    'rounds-30': '30 Rounds',
    'hearts-label': 'Starting Hearts ❤️',
    'hearts-1': '1 Heart (Sudden Death)',
    'hearts-3': '3 Hearts',
    'hearts-5': '5 Hearts',
    'create-btn': 'Create',
    'room-code-label': 'Room Code',
    'room-code-placeholder': 'e.g. A1B2',
    'join-btn': 'Join',
    // Settings screen
    'settings-title': '⚙️ Settings',
    'profile-icon-label': 'Profile Icon / Emoji',
    'upload-photo-btn': '📷 Upload Photo',
    'email-label': 'Email (for Password Recovery)',
    'email-placeholder': 'Enter your email',
    'volume-label-text': 'Game Volume',
    'change-password-heading': 'Change Password',
    'current-pw-placeholder': 'Current Password',
    'new-pw-placeholder': 'New Password (Optional)',
    'save-settings-btn': 'Save Changes',
    'cancel-settings-btn': 'Back to Menu',
    // Lobby screen
    'lobby-subtitle': 'Waiting for players...',
    'start-game-btn': 'Start Game',
    'game-volume-label': 'Volume',
    'pause-btn': 'Pause',
    'resume-btn': 'Resume',
    'game-paused-title': 'Game Paused',
    'waiting-for-host': 'Waiting for host to resume...',
    // Result screen
    'results-title': 'Final Results!',
    'back-to-main-btn': 'Back to Main',
    // Leaderboard screen
    'leaderboard-title': '🏆 Global Leaderboard',
    'back-to-menu-btn': 'Back to Menu',
    'play-again-btn': 'Play Again',
    // Favorites screen
    'favorites-title': '⭐ My Favorites',
    'favorites-subtitle': "Songs you've saved",
    'lb-cat-all': 'Total Scores',
    'lb-mode-standard': 'Standard',
    'lb-mode-elimination': 'Elimination',
    'lb-mode-next': "Whast's Next?",
    'lb-mode-lyrics': 'Lyrics Mode',
    'lb-res-global': 'Global Ranking for',
    'lb-no-records': 'No records yet! Be the first!',
    'cat-en': 'English Hits',
    'cat-cn': 'Chinese Hits',
    'cat-jp': 'Japanese Hits',
    'cat-fr': 'French Hits',
    'cat-th': 'Thailand Hits',
    'cat-in': 'India Hits',
    'cat-hk': 'Hong Kong Hits',
    'cat-kr': 'Korean Hits',
    'cat-es': 'Spanish Hits',
    'cat-child': 'Child / Disney Songs',
  },
  ZH: {
    // Auth screen
    'app-title-html': '估歌仔 <span class="highlight">Online</span>',
    'auth-subtitle': '登入以保存你的分數！',
    'username-label': '用戶名',
    'username-placeholder': '輸入用戶名',
    'password-label': '密碼',
    'password-placeholder': '輸入密碼',
    'login-btn': '登入',
    'register-btn': '注冊',
    'forgot-password-link': '忘記密碼？',
    'policy-accept-part1': '我已閱讀並同意',
    // Reset password screen
    'reset-title': '重設密碼',
    'reset-subtitle': '輸入你的電郵或用戶名以重設密碼。',
    'recovery-label': '電郵或用戶名',
    'recovery-placeholder': '輸入電郵或用戶名',
    'send-recovery-btn': '提交請求',
    'back-to-login-btn': '返回登入',
    // Start screen
    'start-subtitle': '和朋友一起玩！',
    'welcome-text': '歡迎回來，',
    'show-create-btn': '創建房間',
    'show-join-btn': '加入房間',
    'show-leaderboard-btn': '🏆 排行榜',
    'show-settings-btn': '⚙️ 設定',
    'show-favorites-btn': '⭐ 我的收藏',
    'logout-btn': '🚪 登出',
    // Create room form
    'music-category-label': '音樂分類',
    'cat-all': '混合 / 全部分類',
    'cat-en': '英文流行樂',
    'cat-cn': '國語流行樂',
    'cat-jp': '日文流行樂',
    'cat-fr': '法文流行樂',
    'cat-th': '泰國流行樂',
    'cat-in': '印度流行樂',
    'cat-hk': '粵語流行樂',
    'cat-kr': '韓文流行樂',
    'cat-es': '西班牙文流行樂',
    'cat-child': '兒童 / 迪士尼歌曲',
    'spotify-connect-btn': '連結你的 Spotify',
    'pick-playlist-label': '選擇播放清單：',
    'difficulty-label': '難度',
    'diff-easy': '簡單（10秒）',
    'diff-medium': '中等（5秒）',
    'diff-hard': '困難（1秒）',
    'game-mode-label': '遊戲模式',
    'mode-standard': '標準（固定回合）',
    'mode-elimination': '淘汰（生存模式）',
    'mode-next': '下一句是什麼？（ABCD -> E）',
    'rounds-label': '回合數',
    'rounds-5': '5 回合',
    'rounds-10': '10 回合',
    'rounds-20': '20 回合',
    'rounds-30': '30 回合',
    'hearts-label': '初始生命 ❤️',
    'hearts-1': '1 顆（突然死亡）',
    'hearts-3': '3 顆',
    'hearts-5': '5 顆',
    'create-btn': '創建',
    'room-code-label': '房間代碼',
    'room-code-placeholder': '例如 A1B2',
    'join-btn': '加入',
    // Settings screen
    'settings-title': '⚙️ 設定',
    'profile-icon-label': '個人圖標 / 表情',
    'upload-photo-btn': '📷 上傳照片',
    'email-label': '電郵（用於找回密碼）',
    'email-placeholder': '輸入你的電郵',
    'volume-label-text': '遊戲音量',
    'change-password-heading': '更改密碼',
    'current-pw-placeholder': '現有密碼',
    'new-pw-placeholder': '新密碼（選填）',
    'save-settings-btn': '儲存更改',
    'cancel-settings-btn': '返回主菜單',
    // Lobby screen
    'lobby-subtitle': '等待玩家加入...',
    'start-game-btn': '開始遊戲',
    'game-volume-label': '音量',
    'pause-btn': '暫停',
    'resume-btn': '繼續',
    'game-paused-title': '遊戲已暫停',
    'waiting-for-host': '等待主持人繼續...',
    // Result screen
    'results-title': '最終結果！',
    'back-to-main-btn': '返回主頁',
    // Leaderboard screen
    'leaderboard-title': '🏆 全球排行榜',
    'back-to-menu-btn': '回主菜單',
    'play-again-btn': '再玩一次',
    // Favorites screen
    'favorites-title': '⭐ 我的收藏',
    'favorites-subtitle': '你收藏的歌曲',
    'lb-cat-all': '總分排行榜',
    'lb-mode-standard': '標準模式',
    'lb-mode-elimination': '淘汰模式',
    'lb-mode-next': '下一句是什麼？',
    'lb-mode-lyrics': '歌詞模式',
    'lb-res-global': '全球排行榜：',
    'lb-no-records': '暫無紀錄，快來挑戰吧！',
  }
};

let currentLang = localStorage.getItem('sgLang') || 'EN';

// --- Result Sound Effects Generator ---
function playResultSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const vol = parseFloat(localStorage.getItem('guessSongVolume') || 1);
  gain.gain.setValueAtTime(0.1 * vol, now);

  if (type === 'victory') {
    // Upward arpeggio
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  } else if (type === 'record') {
    // Celebration chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.0);
  } else {
    // Low defeat tone
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('sgLang', lang);
  const t = TRANSLATIONS[lang];

  // Update language button label
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) langBtn.innerText = `🌐 ${lang === 'EN' ? 'EN' : '中文'}`;

  // Apply all [data-i18n] elements (innerText)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.innerText = t[key];
  });

  // Apply all [data-i18n-placeholder] elements (placeholder)
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // Special: app title uses innerHTML (contains <span>)
  const titleHtml = t['app-title-html'];
  document.querySelectorAll('[data-i18n="app-title"]').forEach(el => {
    if (titleHtml) el.innerHTML = titleHtml;
  });

  // Auth screen title & subtitle (not tagged on auth screen yet)
  const authTitle = document.querySelector('#auth-screen h1');
  const authSubtitle = document.querySelector('#auth-screen .subtitle');
  if (authTitle && titleHtml) authTitle.innerHTML = titleHtml;
  if (authSubtitle && t['auth-subtitle']) authSubtitle.innerText = t['auth-subtitle'];
}

document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
  applyLanguage(currentLang === 'EN' ? 'ZH' : 'EN');
});

// Apply saved language on load
applyLanguage(currentLang);

// --- Dark / Light Mode Toggle ---
let darkMode = localStorage.getItem('sgDarkMode') !== 'false'; // default dark

function applyTheme(isDark) {
  darkMode = isDark;
  localStorage.setItem('sgDarkMode', isDark);
  const btn = document.getElementById('theme-toggle-btn');

  if (isDark) {
    document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)');
    document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.05)');
    document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    document.documentElement.style.setProperty('--text-main', '#ffffff');
    document.documentElement.style.setProperty('--text-muted', '#a0a0b0');
    document.documentElement.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.2)');
    document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.05)');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 242, 254, 0.15)');
    document.getElementById('global-settings-bar').style.background = 'rgba(20, 20, 35, 0.75)';
    if (btn) btn.innerText = '🌙';
  } else {
    document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #dde8f8, #eef2ff, #d6d8ff)');
    document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.6)');
    document.documentElement.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
    document.documentElement.style.setProperty('--text-main', '#1a1a2e');
    document.documentElement.style.setProperty('--text-muted', '#5c667e');
    document.documentElement.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.8)');
    document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.8)');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 0, 0, 0.05)');
    document.getElementById('global-settings-bar').style.background = 'rgba(220, 225, 255, 0.85)';
    if (btn) btn.innerText = '☀️';
  }
}

document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
  applyTheme(!darkMode);
});

// Apply saved theme on load
applyTheme(darkMode);

// --- Global Volume Slider ---
const globalVolSlider = document.getElementById('global-volume-slider');
const savedVol = localStorage.getItem('guessSongVolume') || 1;
globalVolSlider.value = savedVol;

globalVolSlider.addEventListener('input', () => {
  const vol = parseFloat(globalVolSlider.value);
  audioPlayer.volume = vol;
  localStorage.setItem('guessSongVolume', vol);

  const volIcon = document.getElementById('vol-icon');
  if (vol === 0) volIcon.innerText = '🔇';
  else if (vol < 0.5) volIcon.innerText = '🔉';
  else volIcon.innerText = '🔊';

  // Also sync existing volume sliders if present
  const mainSlider = document.getElementById('volume-slider');
  const gameSlider = document.getElementById('game-volume-slider');
  const label = document.getElementById('volume-label');
  if (mainSlider) mainSlider.value = vol;
  if (gameSlider) gameSlider.value = vol;
  if (label) label.innerText = `(${Math.round(vol * 100)}%)`;
});

// =============================================
// === Community Playlists Logic ===
// =============================================

let communityPlaylists = [];
let plModalTracks = [];
let plEditId = null;

document.getElementById('show-community-btn')?.addEventListener('click', () => {
  switchScreen('community');
  refreshCommunityPlaylists();
});

document.getElementById('back-to-menu-community-btn')?.addEventListener('click', () => {
  switchScreen('start');
});

document.getElementById('refresh-community-btn')?.addEventListener('click', () => {
  refreshCommunityPlaylists();
});

document.getElementById('community-search-input')?.addEventListener('input', renderCommunityPlaylists);

function refreshCommunityPlaylists() {
  socket.emit('getCommunityPlaylists', (playlists) => {
    communityPlaylists = playlists;
    renderCommunityPlaylists();
    renderCommunityGenres();
  });
}

function renderCommunityGenres() {
  const container = document.getElementById('community-genre-filters');
  if (!container) return;
  // Get unique genres
  const genres = ['All', ...new Set(communityPlaylists.map(p => p.genre))];
  container.innerHTML = '';

  if (!state.selectedCommunityGenre) state.selectedCommunityGenre = 'All';

  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = `action-btn ${state.selectedCommunityGenre === g ? 'active' : ''}`;
    btn.style.padding = '6px 14px';
    btn.style.fontSize = '0.85em';
    btn.style.borderRadius = '20px';
    btn.style.whiteSpace = 'nowrap';
    btn.style.backgroundColor = state.selectedCommunityGenre === g ? 'rgba(155, 89, 182, 0.4)' : 'rgba(255, 255, 255, 0.05)';
    btn.style.borderColor = state.selectedCommunityGenre === g ? '#9b59b6' : 'rgba(255,255,255,0.2)';
    btn.innerText = g;
    btn.onclick = () => {
      state.selectedCommunityGenre = g;
      renderCommunityGenres();
      renderCommunityPlaylists();
    };
    container.appendChild(btn);
  });
}

function renderCommunityPlaylists() {
  const container = document.getElementById('community-playlists-list');
  if (!container) return;
  container.innerHTML = '';

  const searchVal = (document.getElementById('community-search-input')?.value || '').toLowerCase();

  const filtered = communityPlaylists.filter(p => {
    if (state.selectedCommunityGenre && state.selectedCommunityGenre !== 'All' && p.genre !== state.selectedCommunityGenre) return false;
    if (searchVal) {
      return p.name.toLowerCase().includes(searchVal) || p.owner.toLowerCase().includes(searchVal);
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #a8b0cc; margin-top: 20px;">No playlists found. Create one!</div>`;
    return;
  }

  // Sort by newly created
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  filtered.forEach(pl => {
    const isLiked = pl.likes && pl.likes.includes(state.name);
    const likeCount = pl.likes ? pl.likes.length : 0;

    const card = document.createElement('div');
    card.className = 'community-playlist-card';
    card.innerHTML = `
      <div class="community-playlist-card-header">
        <div>
          <h3 class="community-playlist-card-title">${pl.name}</h3>
          <p class="community-playlist-card-meta">by <strong style="color: var(--primary-accent);">${pl.owner}</strong> • ${pl.songs ? pl.songs.length : 0} songs</p>
        </div>
        <span class="genre-chip">${pl.genre}</span>
      </div>
      <div class="community-playlist-card-actions">
        <button class="action-btn use-pl-btn" style="flex: 2; justify-content: center; background: rgba(46, 204, 113, 0.2); border-color: #2ecc71; color: #2ecc71;" data-id="${pl.id}">▶ Use Playlist</button>
        <button class="action-btn like-pl-btn" style="flex: 1; justify-content: center; background: ${isLiked ? 'rgba(255, 71, 87, 0.2)' : 'transparent'}; border-color: ${isLiked ? '#ff4757' : 'rgba(255,255,255,0.2)'}; color: ${isLiked ? '#ff4757' : '#fff'}; margin-left:10px;" data-id="${pl.id}">${isLiked ? '❤️' : '🤍'} ${likeCount}</button>
      </div>
    `;

    // Add edit/delete if owner
    if (pl.owner === state.name) {
      const adminMods = document.createElement('div');
      adminMods.style.display = 'flex';
      adminMods.style.gap = '10px';
      adminMods.style.marginTop = '5px';
      adminMods.innerHTML = `
        <button class="action-btn edit-pl-btn" style="flex: 1; justify-content: center; padding: 5px; font-size: 0.8em; border-color: rgba(255,255,255,0.2);" data-id="${pl.id}">✏️ Edit</button>
        <button class="action-btn del-pl-btn" style="flex: 1; justify-content: center; padding: 5px; font-size: 0.8em; background: rgba(255, 71, 87, 0.1); border-color: #ff4757; color: #ff4757;" data-id="${pl.id}">🗑 Delete</button>
      `;
      card.appendChild(adminMods);
    }

    container.appendChild(card);
  });

  // Attach button events
  document.querySelectorAll('.use-pl-btn').forEach(btn => {
    btn.onclick = () => {
      const plId = btn.getAttribute('data-id');
      const pl = communityPlaylists.find(p => p.id === plId);
      if (pl) {
        // Switch to create room and inject this playlist into the dropdown
        switchScreen('start');
        document.getElementById('create-room-form').classList.remove('hidden');
        document.getElementById('join-room-form').classList.add('hidden');

        const select = document.getElementById('lang-select');
        // Check if option exists, otherwise create it
        let opt = select.querySelector(`option[value="community:${plId}"]`);
        if (!opt) {
          opt = document.createElement('option');
          opt.value = `community:${plId}`;
          select.appendChild(opt);
        }
        opt.innerText = `🎵 ${pl.name} (${pl.songs.length} songs)`;
        select.value = `community:${plId}`;
      }
    };
  });

  document.querySelectorAll('.like-pl-btn').forEach(btn => {
    btn.onclick = () => {
      const plId = btn.getAttribute('data-id');
      socket.emit('likePlaylist', { id: plId, username: state.name }, (res) => {
        if (res.success) {
          refreshCommunityPlaylists(); // Brute force refresh is okay here
        } else {
          alert(res.message);
        }
      });
    };
  });

  document.querySelectorAll('.del-pl-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Are you sure you want to delete this playlist?')) {
        const plId = btn.getAttribute('data-id');
        socket.emit('deletePlaylist', { id: plId, username: state.name }, (res) => {
          if (res.success) refreshCommunityPlaylists();
          else alert(res.message);
        });
      }
    };
  });

  document.querySelectorAll('.edit-pl-btn').forEach(btn => {
    btn.onclick = () => {
      const plId = btn.getAttribute('data-id');
      const pl = communityPlaylists.find(p => p.id === plId);
      if (pl) {
        plEditId = pl.id;
        document.getElementById('pl-modal-name').value = pl.name;
        document.getElementById('pl-modal-genre').value = pl.genre;
        plModalTracks = [...(pl.songs || [])];
        openPlaylistModal();
      }
    };
  });
}

socket.on('communityPlaylistsUpdated', (playlists) => {
  communityPlaylists = playlists;
  if (document.getElementById('community-screen').classList.contains('active')) {
    renderCommunityPlaylists();
    renderCommunityGenres();
  }
});

// --- Playlist Modal Logic ---
document.getElementById('create-playlist-btn')?.addEventListener('click', () => {
  if (!state.name) { alert("You must login to create a playlist!"); return; }
  plEditId = null;
  document.getElementById('pl-modal-name').value = '';
  document.getElementById('pl-modal-genre').value = 'English';
  document.getElementById('pl-modal-search').value = '';
  document.getElementById('pl-modal-search-results').innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 0.85em;">Search for a song...</div>';
  plModalTracks = [];
  openPlaylistModal();
});

document.getElementById('pl-modal-cancel-btn')?.addEventListener('click', () => {
  document.getElementById('playlist-modal').classList.add('hidden');
});

function openPlaylistModal() {
  document.getElementById('playlist-modal').classList.remove('hidden');
  renderModalTracks();
}

document.getElementById('pl-modal-search-btn')?.addEventListener('click', () => {
  const term = document.getElementById('pl-modal-search').value.trim();
  if (!term) return;
  const resultsContainer = document.getElementById('pl-modal-search-results');
  resultsContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 0.85em;">Searching...</div>';

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=15&country=hk`;
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const results = data.results.filter(song => song.previewUrl).map(song => ({
        id: song.trackId,
        title: song.trackName,
        artist: song.artistName,
        audioUrl: song.previewUrl,
        appleUrl: song.trackViewUrl,
        year: new Date(song.releaseDate).getFullYear() || 2024
      }));

      if (results.length > 0) {
        resultsContainer.innerHTML = '';
        results.forEach(song => {
          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'space-between';
          div.style.padding = '8px';
          div.style.background = 'rgba(255,255,255,0.05)';
          div.style.borderRadius = '5px';

          div.innerHTML = `
          <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
            <div style="font-weight: bold; font-size: 0.9em; text-overflow: ellipsis; overflow: hidden;">${song.title}</div>
            <div style="font-size: 0.8em; color: #a8b0cc; text-overflow: ellipsis; overflow: hidden;">${song.artist} • ${song.year}</div>
          </div>
          <div style="display: flex; gap: 5px; align-items: center;">
            <button class="action-btn play-preview-btn" style="padding: 4px 8px; font-size: 0.8em; border-color: #00f2fe; color: #00f2fe;" data-url="${song.audioUrl}">▶️</button>
            <button class="action-btn add-btn" style="padding: 4px 10px; font-size: 0.8em;">+ Add</button>
          </div>
        `;

          div.querySelector('.play-preview-btn').onclick = (e) => {
            const btn = e.target;
            if (state.currentFavUrl === song.audioUrl && !audioPlayer.paused) {
              stopAllAudio();
              btn.innerText = '▶️';
            } else {
              document.querySelectorAll('.play-preview-btn').forEach(b => b.innerText = '▶️');
              stopAllAudio();
              state.currentFavUrl = song.audioUrl;
              audioPlayer.src = song.audioUrl;
              audioPlayer.play().catch(e => console.log(e));
              btn.innerText = '⏸️';
            }
          };

          div.querySelector('.add-btn').onclick = () => {
            if (!plModalTracks.find(t => t.id === song.id)) {
              plModalTracks.push(song);
              renderModalTracks();
            }
          };
          resultsContainer.appendChild(div);
        });
      } else {
        resultsContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 0.85em;">No results found.</div>';
      }
    })
    .catch(e => {
      console.error('iTunes Search Error:', e);
      resultsContainer.innerHTML = '<div style="color: #ff4757; text-align: center; padding: 10px; font-size: 0.85em;">Error searching.</div>';
    });
});

function renderModalTracks() {
  const container = document.getElementById('pl-modal-tracks');
  document.getElementById('pl-modal-count').innerText = plModalTracks.length;
  container.innerHTML = '';

  if (plModalTracks.length === 0) {
    container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px; font-size: 0.85em;">No songs added yet.</div>';
    return;
  }

  plModalTracks.forEach((song, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.style.padding = '6px 10px';
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.borderRadius = '5px';
    div.innerHTML = `
      <div style="flex: 1; font-size: 0.85em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
        <strong>${song.title}</strong> - <span style="color: #a8b0cc;">${song.artist}</span>
      </div>
      <button class="action-btn rm-btn" style="padding: 3px 8px; font-size: 0.8em; background: rgba(255, 71, 87, 0.2); border-color: #ff4757; color: #ff4757; margin-left: 10px;">✗</button>
    `;
    div.querySelector('.rm-btn').onclick = () => {
      plModalTracks.splice(idx, 1);
      renderModalTracks();
    };
    container.appendChild(div);
  });
}

document.getElementById('pl-modal-save-btn')?.addEventListener('click', () => {
  const name = document.getElementById('pl-modal-name').value.trim();
  const genre = document.getElementById('pl-modal-genre').value;

  if (!name) { alert("Please enter a playlist name."); return; }
  if (plModalTracks.length < 10) { alert("Please add at least 10 songs to create a playlist by the community standard!"); return; }

  const payload = {
    id: plEditId, // will be null for new
    owner: state.name,
    name,
    genre,
    songs: plModalTracks
  };

  const btn = document.getElementById('pl-modal-save-btn');
  btn.innerText = 'Saving...';
  btn.disabled = true;

  socket.emit('savePlaylist', payload, (res) => {
    btn.innerText = '🚀 Publish Playlist';
    btn.disabled = false;

    if (res.success) {
      document.getElementById('playlist-modal').classList.add('hidden');
      refreshCommunityPlaylists();
    } else {
      alert(res.message);
    }
  });
});

