import { io } from 'socket.io-client';

const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;

    // Fallback for development or if env var is missing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }

    // If we're on a .pages.dev domain and env var is missing, use the known Render URL
    if (window.location.hostname.endsWith('.pages.dev')) {
        console.log('[Socket] Production environment detected. Using Render backend.');
        return 'https://song-guess-api.onrender.com';
    }

    console.warn('[Socket] VITE_BACKEND_URL is not defined. Falling back to current origin.');
    return window.location.origin;
};

const backendUrl = getBackendUrl();
console.log(`[Socket] Connecting to: ${backendUrl}`);
export const socket = io(backendUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling']
});

export function initSocket() {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');

    const updateStatus = (type) => {
        if (!statusText || !statusDot) return;
        if (type === 'connected') {
            statusText.textContent = 'Server Connected';
            statusText.style.color = '#2ecc71';
            statusDot.style.background = '#2ecc71';
            // Hide after success
            setTimeout(() => {
                const msg = document.getElementById('connection-status-msg');
                if (msg) msg.style.opacity = '0';
            }, 2000);
        } else if (type === 'connecting') {
            statusText.textContent = 'Connecting to server... (Render wake-up)';
            statusText.style.color = '#f1c40f';
            statusDot.style.background = '#f1c40f';
        } else {
            statusText.textContent = 'Server Offline / Retrying...';
            statusText.style.color = '#ff4757';
            statusDot.style.background = '#ff4757';
        }
    };

    socket.on('connect', () => {
        console.log('[Socket] Connected to backend.');
        updateStatus('connected');
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection Error:', error);
        updateStatus('error');
    });

    socket.on('disconnect', () => {
        console.warn('[Socket] Disconnected.');
        updateStatus('error');
    });

    const token = localStorage.getItem('songGuessToken');
    if (token) {
        socket.auth = { token };
    }

    socket.on('ping_latency', (startTime) => {
        socket.emit('pong_latency', startTime);
    });

    // Initial check
    if (socket.connected) updateStatus('connected');
}
