import { state } from './state.js';

export const audioPlayer = new Audio();
const savedVolume = localStorage.getItem('guessSongVolume') || 1.0;
audioPlayer.volume = parseFloat(savedVolume);

export function stopAllAudio() {
    audioPlayer.pause();
    state.currentFavUrl = null;
    document.querySelectorAll('.fav-play-btn').forEach(b => b.innerHTML = '▶️ Play');
    const visualizer = document.getElementById('visualizer');
    if (visualizer) visualizer.classList.remove('playing');
}
