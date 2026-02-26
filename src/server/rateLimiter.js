/**
 * Anti-abuse / anti-scraping protection for Socket.IO events.
 *
 * Provides:
 *   - Per-IP rate limiting on expensive socket events
 *   - Auth guard helper (requires socket to be logged in)
 *   - Suspicious activity tracking + auto-ban threshold
 */

// --- In-memory stores ---
const ipRateLimits = {};   // ip -> { eventName -> { count, resetAt } }
const suspiciousIps = {};  // ip -> { strikes, bannedUntil }

// How long (ms) to block a flagged IP
const BAN_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check whether an IP is currently banned.
 */
export function isIpBanned(ip) {
    const entry = suspiciousIps[ip];
    if (!entry || !entry.bannedUntil) return false;
    if (Date.now() > entry.bannedUntil) {
        entry.bannedUntil = null; // Lift expired ban
        return false;
    }
    return true;
}

/**
 * Rate-limit a socket event by IP.
 *
 * @param {string} ip        - Client IP address
 * @param {string} event     - Socket event name
 * @param {number} limit     - Max requests per window
 * @param {number} windowMs  - Window size in milliseconds
 * @returns {boolean}        - true = allowed, false = rate limited
 */
export function checkRateLimit(ip, event, limit, windowMs) {
    const now = Date.now();
    if (!ipRateLimits[ip]) ipRateLimits[ip] = {};
    const bucket = ipRateLimits[ip];

    if (!bucket[event] || now > bucket[event].resetAt) {
        bucket[event] = { count: 1, resetAt: now + windowMs };
        return true;
    }

    bucket[event].count++;

    if (bucket[event].count > limit) {
        // Strike system: too many rate-limit violations → temp ban
        if (!suspiciousIps[ip]) suspiciousIps[ip] = { strikes: 0, bannedUntil: null };
        suspiciousIps[ip].strikes++;

        if (suspiciousIps[ip].strikes >= 10) {
            suspiciousIps[ip].bannedUntil = now + BAN_DURATION_MS;
            suspiciousIps[ip].strikes = 0;
            console.warn(`[SECURITY] IP ${ip} temp-banned for repeated rate limit violations.`);
        }
        return false;
    }

    return true;
}

/**
 * Middleware factory — wraps a socket handler with rate limiting and auth.
 *
 * @param {object} socket   - Socket.IO socket
 * @param {string} event    - Event name
 * @param {object} opts     - { limit, windowMs, requireAuth }
 * @param {function} handler - The actual event handler
 */
export function rateGuard(socket, event, opts = {}, handler) {
    const {
        limit = 30,
        windowMs = 60_000,
        requireAuth = false
    } = opts;

    return (...args) => {
        const ip = socket.handshake.address;
        const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;

        const reject = (msg) => {
            console.warn(`[SECURITY] Blocked "${event}" from ${ip}: ${msg}`);
            if (callback) callback({ success: false, message: msg });
        };

        if (isIpBanned(ip)) return reject('You are temporarily banned. Try again later.');
        if (!checkRateLimit(ip, event, limit, windowMs)) return reject('Too many requests. Please slow down.');
        if (requireAuth && !socket.username) return reject('Authentication required.');

        handler(...args);
    };
}

// Cleanup old rate limit buckets every 5 minutes to avoid memory leaks
setInterval(() => {
    const now = Date.now();
    for (const ip in ipRateLimits) {
        for (const event in ipRateLimits[ip]) {
            if (now > ipRateLimits[ip][event].resetAt) {
                delete ipRateLimits[ip][event];
            }
        }
        if (Object.keys(ipRateLimits[ip]).length === 0) delete ipRateLimits[ip];
    }
}, 5 * 60 * 1000);
