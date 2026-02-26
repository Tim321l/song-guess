import { io } from 'socket.io-client';

// Use environment variable VITE_BACKEND_URL for production, otherwise fallback to current origin
const backendUrl = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);
export const socket = io(backendUrl);

export function initSocket() {
    const token = localStorage.getItem('songGuessToken');
    if (token) {
        socket.auth = { token };
    }

    socket.on('ping_latency', (startTime) => {
        socket.emit('pong_latency', startTime);
    });
}
