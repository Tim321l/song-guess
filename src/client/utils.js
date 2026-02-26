import { screens } from './elements.js';
import { socket } from './socket.js';
import { state } from './state.js';
import { stopAllAudio } from './audio.js';

export function renderIcon(icon) {
    if (!icon) return '👤';
    if (icon.startsWith('data:image') || icon.startsWith('http')) {
        return `<img src="${icon}" class="profile-icon-img" alt="icon">`;
    }
    return icon;
}

export function switchScreen(target) {
    // STOP all audio when switching screens (fixes song leaking when leaving favorites/game)
    stopAllAudio();

    Object.values(screens).forEach(s => {
        if (s) {
            s.classList.remove('active');
            s.classList.add('hidden');
        }
    });

    if (screens[target]) {
        screens[target].classList.remove('hidden');
        screens[target].classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export function leaveRoom() {
    socket.emit('leaveRoom');
    state.roomId = '';
    state.isHost = false;
    state.players = [];
    state.roomMode = '';
    state.roomLang = '';
    // stopAllAudio is already in switchScreen now, but keeping it here for safety
    stopAllAudio();
    switchScreen('start');
}
