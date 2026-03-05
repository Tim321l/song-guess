import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('getCategories', (categories) => {
        console.log('Categories from server:', categories);
        process.exit(0);
    });
});

socket.on('connect_error', (err) => {
    console.log('Connect error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('Timeout waiting for categories');
    process.exit(1);
}, 5000);
