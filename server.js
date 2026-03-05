import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
// Songs data will be loaded from MongoDB on startup
let allSongs = {};

// Internal modules
import { migratePasswords, connectDB, loadSongs, updateUser } from './src/server/db.js';
import { registerAuthHandlers } from './src/server/auth.js';
import { registerAdminHandlers, startAdminBroadcast, recordRoomCreated, getAnnouncement } from './src/server/admin.js';
import { registerSocialHandlers } from './src/server/social.js';
import { registerGameplayHandlers, handlePlayerExit } from './src/server/gameplay.js';
import { registerTeamHandlers } from './src/server/teams.js';
import { registerChatHandlers } from './src/server/chat.js';
import { rooms } from './src/server/rooms.js';
import { isIpBanned, checkRateLimit } from './src/server/rateLimiter.js';

const app = express();

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to allow simple loading of assets/iframes if needed for now
}));
app.use(express.json({ limit: '10kb' })); // Body parser, limit size to 10kb
app.use(cookieParser());

// Request Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Global Rate Limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

// Static file serving - ensure we serve index.html and assets
app.use(express.static('public'));
app.use('/src', express.static('src'));

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [
                "https://localhost:5173",
                "http://localhost:5173",
                process.env.FRONTEND_URL
            ].filter(Boolean);

            if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.onrender.com')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'songguess_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'songguess_fallback_secret_key';
const serverStartTime = Date.now();
const activeUsers = {}; // Track username -> session info

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['x-auth-token'];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.username = decoded.username;
            console.log(`[AUTH] Socket ${socket.id} authenticated as ${socket.username}`);
        } catch (err) {
            console.warn(`[AUTH] Invalid token from socket ${socket.id}`);
            // We don't necessarily block the connection, but we don't set socket.username
        }
    }
    next();
});

io.on('connection', (socket) => {
    const ip = socket.handshake.address;

    // Immediately disconnect banned or flood IPs
    if (isIpBanned(ip)) {
        console.warn(`[SECURITY] Rejected connection from banned IP: ${ip}`);
        socket.emit('kick', 'You are temporarily blocked. Please try again later.');
        socket.disconnect(true);
        return;
    }
    // Rate-limit new connections (max 20 new connections/min per IP)
    if (!checkRateLimit(ip, '__connect__', 20, 60_000)) {
        console.warn(`[SECURITY] Connection flood from ${ip} — dropping.`);
        socket.disconnect(true);
        return;
    }

    console.log(`New connection from ${ip} (${socket.id})`);

    // Standard latency monitoring
    socket.on('pong_latency', (startTime) => {
        if (socket.username && activeUsers[socket.username]) {
            activeUsers[socket.username].latency = Date.now() - startTime;
        }
    });

    // Public: any logged-in user can fetch the current announcement
    socket.on('getAnnouncement', (callback) => {
        if (typeof callback !== 'function') return;
        const ann = getAnnouncement();
        if (ann.enabled && ann.title) {
            callback({ success: true, announcement: ann });
        } else {
            callback({ success: false });
        }
    });

    socket.on('disconnect', () => {
        if (socket.username && activeUsers[socket.username] && activeUsers[socket.username].socketId === socket.id) {
            updateUser(socket.username, { lastLogout: new Date() });
            delete activeUsers[socket.username];
        }
        handlePlayerExit(io, socket);
    });

    // Register modularized handlers
    registerAuthHandlers(io, socket, activeUsers);
    registerAdminHandlers(io, socket, activeUsers, ADMIN_SECRET, serverStartTime, allSongs);
    registerSocialHandlers(io, socket, allSongs);
    registerGameplayHandlers(io, socket, allSongs);
    registerTeamHandlers(io, socket);
    registerChatHandlers(io, socket, activeUsers);

    // Stats Sync Fix: If user has a valid token, add them to activeUsers immediately
    if (socket.username && !activeUsers[socket.username]) {
        activeUsers[socket.username] = {
            username: socket.username,
            socketId: socket.id,
            startTime: Date.now(),
            ip: ip,
            latency: 0
        };
        console.log(`[AUTH] Resumed session for ${socket.username} (${socket.id})`);
    }
});

// Periodic cleanup of inactive rooms (every 2 minutes)
setInterval(() => {
    const now = Date.now();
    Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        // If no activity for 20 minutes and no players, or just generally 60 mins idle
        if (now - room.lastActivity > 20 * 60 * 1000 && room.players.length === 0) {
            delete rooms[roomId];
        } else if (now - room.lastActivity > 60 * 60 * 1000) { // 1 hour absolute timeout
            delete rooms[roomId];
        }
    });
}, 2 * 60 * 1000);

httpServer.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectDB();

    // Load songs into memory from MongoDB
    try {
        const songsInDb = await loadSongs();
        Object.assign(allSongs, songsInDb);
        console.log(`[System] Loaded ${Object.values(allSongs).reduce((acc, curr) => acc + curr.length, 0)} songs from DB.`);
    } catch (err) {
        console.error('[System] Failed to load songs from DB:', err);
    }

    await migratePasswords();
    startAdminBroadcast(io, activeUsers, serverStartTime);
});

// Keep-Alive Mechanism to prevent sleep (Render Free Tier)
const RENDER_URL = process.env.RENDER_URL;
if (RENDER_URL) {
    console.log(`[System] Keep-alive initialized for: ${RENDER_URL}`);
    setInterval(async () => {
        try {
            await fetch(RENDER_URL);
            console.log(`[System] Keep-alive ping sent to ${RENDER_URL} (${new Date().toLocaleTimeString()})`);
        } catch (err) {
            console.error('[System] Keep-alive ping failed:', err.message);
        }
    }, 14 * 60 * 1000); // Ping every 14 minutes
} else {
    console.warn('[System] RENDER_URL not set. Server may go to sleep on Render free tier.');
}
