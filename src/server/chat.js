import { getClientIp } from './utils.js';
import { rooms } from './rooms.js';

const chatRateLimits = {}; // IP -> timestamp

export function registerChatHandlers(io, socket, activeUsers) {
    socket.on('sendMessage', ({ message, scope }, callback) => {
        if (!socket.username) return callback({ success: false, message: 'Not authenticated.' });
        if (!message || typeof message !== 'string' || message.trim().length === 0) return;

        const ip = getClientIp(socket);
        const now = Date.now();

        // Basic spam protection (max 1 message per 1.5 seconds)
        if (chatRateLimits[ip] && now - chatRateLimits[ip] < 1500) {
            return callback({ success: false, message: 'Wait before sending another message.' });
        }
        chatRateLimits[ip] = now;

        const chatMsg = {
            sender: activeUsers[socket.username]?.displayName || socket.username,
            username: socket.username,
            message: message.substring(0, 200), // Max 200 chars
            timestamp: now,
            scope: scope // 'global' or 'room'
        };

        if (scope === 'global') {
            io.emit('chatMessage', chatMsg);
            callback({ success: true });
        } else if (scope === 'room') {
            const roomId = Object.keys(rooms).find(id => rooms[id].players.some(p => p.username === socket.username));
            if (roomId) {
                io.to(roomId).emit('chatMessage', chatMsg);
                callback({ success: true });
            } else {
                callback({ success: false, message: 'You are not in a room.' });
            }
        }
    });
}
