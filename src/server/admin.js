import { loadUsers, saveUsers, loadRecoveryRequests, saveRecoveryRequests } from './db.js';
import { rooms } from './rooms.js';
import os from 'os';
import { readFileSync, existsSync, statSync, utimesSync } from 'fs';

// ─── Audit Log (in-memory, last 200 entries) ─────────────────────────────────
const auditLog = [];
export function logAudit(action, detail = '') {
    auditLog.unshift({ ts: Date.now(), action, detail });
    if (auditLog.length > 200) auditLog.pop();
}

// ─── Metrics History (for charts, stored in 1-min buckets) ───────────────────
const metricsHistory = [];  // [{ ts, onlineUsers, activeRooms, roomsCreated }]
let roomsCreatedThisMinute = 0;
export function recordRoomCreated() { roomsCreatedThisMinute++; }

// Sample metrics every minute
setInterval(() => {
    metricsHistory.push({
        ts: Date.now(),
        onlineUsers: Object.keys(global._activeUsers || {}).length,
        activeRooms: Object.keys(rooms).length,
        roomsCreated: roomsCreatedThisMinute
    });
    roomsCreatedThisMinute = 0;
    if (metricsHistory.length > 60) metricsHistory.shift(); // keep 1 hour
}, 60_000);

// ─── System Health ─────────────────────────────────────────────────────────────
function getSystemHealth(serverStartTime) {
    const mem = process.memoryUsage();
    const cpuLoad = os.loadavg()[0]; // 1-min average
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    let dbStatus = 'OK';
    let dbSize = 0;
    try {
        if (existsSync('./users.json')) {
            dbSize = statSync('./users.json').size;
        }
    } catch { dbStatus = 'Error'; }

    return {
        uptimeSecs: Math.floor((Date.now() - serverStartTime) / 1000),
        cpuLoad: cpuLoad.toFixed(2),
        memUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
        memTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
        sysMemUsedMB: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        sysMemTotalMB: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        dbStatus,
        dbSizeKB: (dbSize / 1024).toFixed(1),
        nodeVersion: process.version,
        platform: os.platform()
    };
}

export function registerAdminHandlers(io, socket, activeUsers, ADMIN_SECRET, serverStartTime) {
    // Share activeUsers globally for metrics sampling
    global._activeUsers = activeUsers;

    socket.on('getAdminData', async (secret, callback) => {
        try {
            if (!secret || secret.trim() !== ADMIN_SECRET) {
                logAudit('UNAUTHORIZED_ACCESS', `Socket ${socket.id} tried admin with wrong secret`);
                return callback({ success: false, message: 'Unauthorized' });
            }

            const usersData = await loadUsers();
            const stats = {
                uptime: Math.floor((Date.now() - serverStartTime) / 1000),
                totalUsers: Object.keys(usersData).length,
                activeRooms: Object.keys(rooms).length,
                connectedSockets: io.engine.clientsCount,
                activeSessions: Object.keys(activeUsers).length
            };

            const allUsers = Object.keys(usersData).map(name => ({
                username: name,
                email: usersData[name].email || '',
                totalScore: usersData[name].totalScore || 0,
                banned: usersData[name].banned || false
            }));

            const roomDetails = Object.keys(rooms).map(rid => ({
                id: rid,
                playerCount: rooms[rid].players.length,
                round: rooms[rid].currentRound || 0,
                mode: rooms[rid].mode,
                state: rooms[rid].state,
                lastActivity: rooms[rid].lastActivity,
                players: rooms[rid].players.map(p => p.name)
            }));

            const recoveryRequests = await loadRecoveryRequests();

            const activeUsersInfo = Object.keys(activeUsers).map(uname => {
                const session = activeUsers[uname];
                return {
                    username: uname,
                    ip: session.ip,
                    latency: session.latency || 0,
                    loginTime: session.loginTime,
                    lastAction: session.lastAction || null
                };
            });

            const health = getSystemHealth(serverStartTime);
            const peakConcurrent = metricsHistory.reduce((max, m) => Math.max(max, m.onlineUsers), stats.activeSessions);

            callback({
                success: true, stats, roomDetails,
                activeUsers: activeUsersInfo, recoveryRequests, allUsers,
                health, metricsHistory, peakConcurrent,
                auditLog: auditLog.slice(0, 50)
            });
        } catch (error) {
            console.error('[ADMIN] Error:', error);
            callback({ success: false, message: 'Internal Server Error: ' + error.message });
        }
    });

    socket.on('getAuditLog', (secret, callback) => {
        if (secret !== ADMIN_SECRET) return callback({ success: false });
        callback({ success: true, log: auditLog });
    });

    socket.on('adminAction', async ({ secret, action, target }, callback) => {
        if (secret !== ADMIN_SECRET) return callback({ success: false, message: 'Unauthorized' });

        if (action === 'kickUser') {
            const username = target;
            const session = activeUsers[username];
            if (session) {
                io.to(session.socketId).emit('kick', 'You have been removed by an administrator.');
                const targetSocket = io.sockets.sockets.get(session.socketId);
                if (targetSocket) targetSocket.disconnect();
                delete activeUsers[username];
                logAudit('KICK_USER', `Kicked user: ${username}`);
                io.emit('adminNotification', { type: 'kick', message: `🚫 User ${username} was kicked` });
                return callback({ success: true, message: `User ${username} kicked.` });
            }
            return callback({ success: false, message: 'User not currently online.' });
        }

        if (action === 'clearRoom') {
            if (rooms[target]) {
                delete rooms[target];
                logAudit('CLEAR_ROOM', `Cleared room: ${target}`);
                io.emit('adminNotification', { type: 'room', message: `🗑️ Room ${target} cleared` });
                return callback({ success: true, message: `Room ${target} cleared.` });
            }
        }

        if (action === 'setNewPassword') {
            const { username, newPassword } = target;
            const users = await loadUsers();
            if (users[username]) {
                users[username].password = newPassword;
                await saveUsers(users);
                const requests = await loadRecoveryRequests();
                if (requests[username]) { delete requests[username]; await saveRecoveryRequests(requests); }
                logAudit('RESET_PASSWORD', `Password reset for: ${username}`);
                return callback({ success: true, message: `Password for ${username} updated.` });
            }
            return callback({ success: false, message: 'User not found.' });
        }

        if (action === 'editUser') {
            const { oldUsername, newUsername, newPassword, newEmail } = target;
            const users = await loadUsers();
            if (!users[oldUsername]) return callback({ success: false, message: 'User not found.' });
            if (newUsername && newUsername !== oldUsername) {
                if (users[newUsername]) return callback({ success: false, message: 'New username already taken.' });
                users[newUsername] = users[oldUsername];
                delete users[oldUsername];
                if (activeUsers[oldUsername]) { activeUsers[newUsername] = activeUsers[oldUsername]; delete activeUsers[oldUsername]; }
            }
            const targetUname = newUsername || oldUsername;
            if (newPassword) users[targetUname].password = newPassword;
            if (newEmail !== undefined) users[targetUname].email = newEmail;
            await saveUsers(users);
            logAudit('EDIT_USER', `Edited user: ${oldUsername}${newUsername && newUsername !== oldUsername ? ' → ' + newUsername : ''}`);
            return callback({ success: true, message: `User ${oldUsername} updated.` });
        }

        if (action === 'banUser') {
            const username = target;
            const users = await loadUsers();
            if (users[username]) {
                users[username].banned = true;
                await saveUsers(users);
                const session = activeUsers[username];
                if (session) {
                    io.to(session.socketId).emit('kick', 'Your account has been banned.');
                    const targetSocket = io.sockets.sockets.get(session.socketId);
                    if (targetSocket) targetSocket.disconnect();
                }
                logAudit('BAN_USER', `Banned user: ${username}`);
                io.emit('adminNotification', { type: 'ban', message: `🔨 User ${username} was banned` });
                return callback({ success: true, message: `User ${username} banned.` });
            }
        }

        if (action === 'unbanUser') {
            const username = target;
            const users = await loadUsers();
            if (users[username]) {
                users[username].banned = false;
                await saveUsers(users);
                logAudit('UNBAN_USER', `Unbanned user: ${username}`);
                return callback({ success: true, message: `User ${username} unbanned.` });
            }
        }

        console.log('[ADMIN] Action received:', action, 'Target:', target); if (action === 'restartServer') {
            logAudit('RESTART_SERVER', 'Admin triggered server restart via file touch');
            io.emit('adminNotification', { type: 'system', message: '⚠️ Server is restarting...' });

            setTimeout(() => {
                try {
                    // Updating the timestamp of server.js triggers nodemon to restart the process
                    // This is much safer than process.exit(0) as it keeps the parent terminal alive.
                    utimesSync('server.js', new Date(), new Date());
                    console.log('[ADMIN] Restart triggered via server.js touch.');
                } catch (e) {
                    console.error('[ADMIN] Restart failed, falling back to exit:', e);
                    process.exit(1);
                }
            }, 1000);

            return callback({ success: true, message: 'Server is restarting...' });
        }

        callback({ success: false, message: 'Action failed.' });
    });

    // Real-time push: send a snapshot every 30s to any admin sockets
    socket.on('subscribeAdminLive', (secret) => {
        if (secret !== ADMIN_SECRET) return;
        socket.join('admin-live');
    });
}

// Broadcast live metrics every 30 seconds to subscribed admins
export function startAdminBroadcast(io, activeUsers, serverStartTime) {
    setInterval(() => {
        const liveData = {
            activeSessions: Object.keys(activeUsers).length,
            activeRooms: Object.keys(rooms).length,
            connectedSockets: io.engine.clientsCount
        };
        io.to('admin-live').emit('adminLiveUpdate', liveData);
    }, 30_000);
}
