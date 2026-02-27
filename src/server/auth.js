import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadUsers, saveUsers, loadRecoveryRequests, saveRecoveryRequests } from './db.js';
import { getClientIp } from './utils.js';
import { rooms } from './rooms.js';
import { checkRateLimit, isIpBanned } from './rateLimiter.js';
import { User } from './models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'songguess_fallback_secret_key';

async function markUserLogin(username) {
    try {
        await User.findOneAndUpdate({ username }, { lastLogin: new Date() });
    } catch (err) {
        console.error('[AUTH] Failed to update lastLogin:', err);
    }
}

async function markUserLogout(username) {
    try {
        await User.findOneAndUpdate({ username }, { lastLogout: new Date() });
    } catch (err) {
        console.error('[AUTH] Failed to update lastLogout:', err);
    }
}

export function registerAuthHandlers(io, socket, activeUsers) {
    socket.on('loginWithToken', async ({ token }, callback) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const username = decoded.username;
            const users = await loadUsers();
            const user = users[username];

            if (user && !user.banned) {
                socket.username = username;
                activeUsers[username] = {
                    socketId: socket.id,
                    ip: getClientIp(socket),
                    loginTime: Date.now(),
                    latency: 0
                };

                await markUserLogin(username);

                callback({
                    success: true,
                    username,
                    displayName: user.displayName || username,
                    icon: user.icon,
                    favorites: user.favorites || [],
                    teamId: user.teamId || null,
                    email: user.email
                });
            } else {
                callback({ success: false, message: 'Invalid session.' });
            }
        } catch (err) {
            callback({ success: false, message: 'Session expired.' });
        }
    });

    socket.on('register', async ({ username, password }, callback) => {
        const ip = socket.handshake.address;
        if (isIpBanned(ip)) return callback({ success: false, message: 'Temporarily blocked.' });
        if (!checkRateLimit(ip, 'register', 5, 60_000)) return callback({ success: false, message: 'Too many registration attempts. Please wait.' });

        // Input Validation
        if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
            return callback({ success: false, message: 'Username must be 3-50 characters.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return callback({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const users = await loadUsers();
        if (users[username]) {
            return callback({ success: false, message: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            totalScore: 0,
            icon: '👤',
            favorites: [],
            highScores: {},
            banned: false,
            displayName: username
        };
        await saveUsers(users);

        // Generate JWT Token for immediate login
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

        socket.username = username;
        activeUsers[username] = {
            socketId: socket.id,
            ip: getClientIp(socket),
            loginTime: Date.now(),
            latency: 0
        };
        await markUserLogin(username);

        callback({ success: true, message: 'Registration successful!', username, token, displayName: username, icon: '👤', favorites: [] });
    });

    socket.on('login', async ({ username, password }, callback) => {
        const ip = socket.handshake.address;
        if (isIpBanned(ip)) return callback({ success: false, message: 'Temporarily blocked.' });
        if (!checkRateLimit(ip, 'login', 10, 60_000)) return callback({ success: false, message: 'Too many login attempts. Please wait.' });

        if (typeof username !== 'string' || typeof password !== 'string') {
            return callback({ success: false, message: 'Invalid credentials format.' });
        }

        const users = await loadUsers();
        if (users[username] && users[username].banned) {
            return callback({ success: false, message: 'This account has been banned.' });
        }

        const user = users[username];
        if (user && (user.password === password || await bcrypt.compare(password, user.password))) {
            if (activeUsers[username] && activeUsers[username].socketId !== socket.id) {
                io.to(activeUsers[username].socketId).emit('kick', 'You have been logged in from another device.');
                const oldSocket = io.sockets.sockets.get(activeUsers[username].socketId);
                if (oldSocket) oldSocket.disconnect();
            }

            activeUsers[username] = {
                socketId: socket.id,
                ip: getClientIp(socket),
                loginTime: Date.now(),
                latency: 0
            };
            socket.username = username;

            await markUserLogin(username);

            // Generate JWT Token (valid for 24h)
            const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

            const icon = users[username].icon || '👤';
            const favorites = users[username].favorites || [];
            const displayName = users[username].displayName || username;
            const teamId = users[username].teamId || null;
            callback({ success: true, username, displayName, icon, favorites, teamId, token, message: 'Login successful!' });
        } else {
            callback({ success: false, message: 'Invalid username or password.' });
        }
    });

    socket.on('googleLogin', async ({ username, googleId, email, icon, name }, callback) => {
        const users = await loadUsers();
        let user = users[username];

        if (!user) {
            user = { password: '', googleId, email, icon, totalScore: 0, favorites: [], highScores: {}, banned: false, displayName: name || username };
            users[username] = user;
            await saveUsers(users);
        } else {
            if (user.banned) {
                return callback({ success: false, message: 'This account has been banned.' });
            }
            if (!user.googleId) {
                user.googleId = googleId;
                await saveUsers(users);
            }
        }

        if (activeUsers[username] && activeUsers[username].socketId !== socket.id) {
            io.to(activeUsers[username].socketId).emit('kick', 'You have been logged in from another device.');
            const oldSocket = io.sockets.sockets.get(activeUsers[username].socketId);
            if (oldSocket) oldSocket.disconnect();
        }

        activeUsers[username] = {
            socketId: socket.id,
            ip: getClientIp(socket),
            loginTime: Date.now(),
            latency: 0
        };
        socket.username = username;

        await markUserLogin(username);

        // Generate JWT Token (valid for 24h)
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

        const userData = {
            success: true,
            username,
            displayName: user.displayName || username,
            icon: user.icon || '👤',
            favorites: user.favorites || [],
            teamId: user.teamId || null,
            token,
            message: 'Google login successful!'
        };
        callback(userData);
    });

    socket.on('forgotPassword', async ({ email }, callback) => {
        if (typeof email !== 'string' || !email.includes('@')) {
            return callback({ success: false, message: 'Valid email is required.' });
        }
        const users = await loadUsers();
        let username = null;
        if (users[email]) {
            username = email;
        } else {
            username = Object.keys(users).find(u => users[u].email === email);
        }

        if (!username) {
            return callback({ success: false, message: 'Account with this email or username not found.' });
        }

        const requests = await loadRecoveryRequests();
        requests[username] = {
            username: username,
            email: email,
            timestamp: Date.now()
        };
        await saveRecoveryRequests(requests);

        callback({ success: true, message: 'Recovery request sent to administrator! Please wait for manual reset.' });
    });

    socket.on('updateSettings', async ({ username, oldPassword, newPassword, icon, email, displayName }, callback) => {
        // Validation: must be the owner of the account
        if (socket.username !== username) {
            return callback({ success: false, message: 'Unauthorized.' });
        }

        const users = await loadUsers();
        if (!users[username]) {
            return callback({ success: false, message: 'User not found.' });
        }

        if (displayName && (typeof displayName !== 'string' || displayName.length > 50)) {
            return callback({ success: false, message: 'Display name too long.' });
        }

        if (oldPassword || newPassword) {
            if (users[username].password && users[username].password !== oldPassword && !bcrypt.compareSync(oldPassword, users[username].password)) {
                return callback({ success: false, message: 'Invalid current password.' });
            }
            if (newPassword) {
                users[username].password = bcrypt.hashSync(newPassword, 10);
            }
        }

        if (icon || displayName) {
            if (icon) users[username].icon = icon;
            if (displayName) users[username].displayName = displayName;

            // Sync with active rooms
            for (const roomId in rooms) {
                const player = rooms[roomId].players.find(p => p.username === username);
                if (player) {
                    if (icon) player.icon = icon;
                    if (displayName) player.name = displayName;
                    io.to(roomId).emit('roomUpdate', { players: rooms[roomId].players });
                }
            }
        }

        if (email) {
            users[username].email = email;
        }

        await saveUsers(users);
        callback({
            success: true,
            message: 'Settings updated successfully!',
            icon: users[username].icon,
            email: users[username].email,
            displayName: users[username].displayName
        });
    });

    socket.on('logout', async (callback) => {
        const username = socket.username;
        if (username) {
            await markUserLogout(username);
            if (activeUsers[username] && activeUsers[username].socketId === socket.id) {
                delete activeUsers[username];
            }
        }
        socket.username = null;
        if (callback) callback({ success: true });
    });

    socket.on('disconnect', async () => {
        const username = socket.username;
        if (username) {
            await markUserLogout(username);
        }
    });
}

