import './style.css';
import { socket, initSocket } from './client/socket.js';
import { state } from './client/state.js';
import { initAuthHandlers, handleLoginSuccess } from './client/auth.js';
import { initLobbyHandlers } from './client/lobby.js';
import { initGameplayHandlers } from './client/gameplay.js';
import { initSocialHandlers } from './client/social.js';
import { initSettingsHandlers } from './client/settings.js';
import { initTeamHandlers } from './client/teams.js';
import { switchScreen } from './client/utils.js';
import { applyLanguage } from './client/i18n.js';
import { handleSpotifyRedirect } from './client/spotify.js';
import { audioPlayer } from './client/audio.js';

// --- Initialization ---
initSocket();
socket.on('connect', () => {
    state.myId = socket.id;
});
initAuthHandlers();
initLobbyHandlers();
initGameplayHandlers();
initSocialHandlers();
initSettingsHandlers();
initTeamHandlers();
handleSpotifyRedirect();

// --- Global UI Logic ---
const currentLang = localStorage.getItem('sgLang') || 'EN';
applyLanguage(currentLang);

const savedTheme = localStorage.getItem('sgTheme') || 'midnight';
applyTheme(savedTheme);

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle-btn');

    if (theme === 'sun') {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #dde8f8, #eef2ff, #d6d8ff)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.6)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--text-main', '#1a1a2e');
        document.documentElement.style.setProperty('--text-muted', '#5c667e');
        document.documentElement.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.8)');
        document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.8)');
        document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 0, 0, 0.05)');
        if (btn) btn.innerText = '☀️';
    } else if (theme === 'ocean') {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #1cb5e0, #000046)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.1)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.2)');
        document.documentElement.style.setProperty('--text-main', '#ffffff');
        document.documentElement.style.setProperty('--text-muted', '#89f7fe');
        if (btn) btn.innerText = '🌊';
    } else if (theme === 'forest') {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #11998e, #38ef7d)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.08)');
        document.documentElement.style.setProperty('--text-main', '#ffffff');
        if (btn) btn.innerText = '🌲';
    } else { // midnight (default)
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)');
        document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.05)');
        document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
        document.documentElement.style.setProperty('--text-main', '#ffffff');
        document.documentElement.style.setProperty('--text-muted', '#a0a0b0');
        document.documentElement.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.2)');
        document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.05)');
        document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 242, 254, 0.15)');
        if (btn) btn.innerText = '🌙';
    }
}

// Language Toggle
const langBtn = document.getElementById('lang-toggle-btn');
if (langBtn) {
    langBtn.onclick = () => {
        const lang = localStorage.getItem('sgLang') === 'ZH' ? 'EN' : 'ZH';
        localStorage.setItem('sgLang', lang);
        langBtn.innerText = `🌐 ${lang}`;
        applyLanguage(lang);
    };
    langBtn.innerText = `🌐 ${localStorage.getItem('sgLang') || 'EN'}`;
}

// Theme Toggle
const themeBtn = document.getElementById('theme-toggle-btn');
if (themeBtn) {
    themeBtn.onclick = () => {
        const themes = ['midnight', 'sun', 'ocean', 'forest'];
        let current = document.documentElement.getAttribute('data-theme') || 'midnight';
        let idx = themes.indexOf(current);
        idx = (idx + 1) % themes.length;
        const newTheme = themes[idx];
        applyTheme(newTheme);
        localStorage.setItem('sgTheme', newTheme);
    };
}

// Volume Sync
const mainVol = document.getElementById('volume-slider');
const gameVol = document.getElementById('game-volume-slider');
const globalVol = document.getElementById('global-volume-slider');
const volLabel = document.getElementById('volume-label');
const volIcon = document.getElementById('vol-icon');

function syncVolume(v) {
    audioPlayer.volume = v;
    if (mainVol) mainVol.value = v;
    if (gameVol) gameVol.value = v;
    if (globalVol) globalVol.value = v;
    if (volLabel) volLabel.innerText = `(${Math.round(v * 100)}%)`;

    if (volIcon) {
        if (v === 0) volIcon.innerText = '🔇';
        else if (v < 0.5) volIcon.innerText = '🔉';
        else volIcon.innerText = '🔊';
    }
    localStorage.setItem('guessSongVolume', v);
}

if (mainVol) mainVol.oninput = (e) => syncVolume(parseFloat(e.target.value));
if (gameVol) gameVol.oninput = (e) => syncVolume(parseFloat(e.target.value));
if (globalVol) globalVol.oninput = (e) => syncVolume(parseFloat(e.target.value));

// Init volume
const savedVol = localStorage.getItem('guessSongVolume') || 1;
syncVolume(parseFloat(savedVol));

// Auto-Login
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const savedToken = localStorage.getItem('songGuessToken') || getCookie('songGuessToken');
const savedAuth = localStorage.getItem('songGuessAuth');

if (savedToken) {
    socket.emit('loginWithToken', { token: savedToken }, (res) => {
        if (res.success) {
            handleLoginSuccess(res, res.username, null);
        } else {
            localStorage.removeItem('songGuessToken');
            tryAutoLoginWithAuth();
        }
    });
} else {
    tryAutoLoginWithAuth();
}

function tryAutoLoginWithAuth() {
    if (savedAuth) {
        try {
            const { username, password } = JSON.parse(savedAuth);
            socket.emit('login', { username, password }, (res) => {
                if (res.success) {
                    handleLoginSuccess(res, username, password);
                } else {
                    localStorage.removeItem('songGuessAuth');
                    switchScreen('auth');
                }
            });
        } catch (e) {
            switchScreen('auth');
        }
    } else {
        switchScreen('auth');
    }
}

// Global Event Listeners
document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('songGuessAuth');
    localStorage.removeItem('songGuessToken');
    document.cookie = "songGuessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    socket.auth = {};
    state.name = '';
    state.username = '';
    state.favorites = [];
    state.teamId = null;
    switchScreen('auth');
};

document.getElementById('show-settings-btn').onclick = () => {
    const emailInput = document.getElementById('settings-email');
    const displayNameInput = document.getElementById('settings-display-name');
    if (emailInput) emailInput.value = state.email || '';
    if (displayNameInput) displayNameInput.value = state.name || '';
    switchScreen('settings');
};

document.getElementById('back-to-start-btn').onclick = () => switchScreen('start');
document.getElementById('back-from-fav-btn').onclick = () => switchScreen('start');
document.getElementById('restart-btn').onclick = () => switchScreen('start');

// Game mode toggle — show/hide Hearts vs Rounds
const modeSelect = document.getElementById('mode-select');
const heartsGroup = document.getElementById('hearts-group');
const roundsGroup = document.getElementById('rounds-group');
function updateModeUI() {
    const mode = modeSelect.value;
    if (mode === 'elimination') {
        heartsGroup.classList.remove('hidden');
        roundsGroup.classList.add('hidden');
    } else {
        heartsGroup.classList.add('hidden');
        roundsGroup.classList.remove('hidden');
    }
}
if (modeSelect) {
    modeSelect.addEventListener('change', updateModeUI);
    updateModeUI(); // run once on page load in case mode is pre-selected
}

// Ready System
const readyBtn = document.getElementById('ready-btn');
if (readyBtn) {
    readyBtn.onclick = () => {
        readyBtn.classList.add('hidden');
        state.audioAutoplayAllowed = true; // Unlock audio on ready click
        socket.emit('playerReady', state.roomId); // Must be plain string, not object
    };
}

// Global interaction to allow audio (important for browsers)
window.onclick = () => {
    state.audioAutoplayAllowed = true;
};

// Handle Kick from Server
socket.on('kick', (reason) => {
    alert(reason);
    location.reload();
});

console.log("Song Guess Modular Client Initialized.");
