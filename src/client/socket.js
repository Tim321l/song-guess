import { io } from 'socket.io-client';

const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;

    // Fallback for development or if env var is missing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }

    // If we're on a .pages.dev domain and env var is missing, we might be in trouble
    // But let's log it to help the user
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
    const token = localStorage.getItem('songGuessToken');
    if (token) {
        socket.auth = { token };
    }

    socket.on('ping_latency', (startTime) => {
        socket.emit('pong_latency', startTime);
    });
}
