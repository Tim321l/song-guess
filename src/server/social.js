import { loadCommunityPlaylists, saveCommunityPlaylists, loadUsers, saveUsers, loadTeams } from './db.js';
import { checkRateLimit, isIpBanned } from './rateLimiter.js';

export function registerSocialHandlers(io, socket, allSongs) {
    const ip = () => socket.handshake.address;
    const rl = (event, limit, windowMs) => {
        if (isIpBanned(ip())) { return false; }
        return checkRateLimit(ip(), event, limit, windowMs);
    };
    const authRequired = () => !!socket.username;

    socket.on('getCommunityPlaylists', async (callback) => {
        if (!rl('getCommunityPlaylists', 20, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        const playlists = await loadCommunityPlaylists();
        callback({ success: true, playlists });
    });

    socket.on('savePlaylist', async ({ name, genre, songs, owner, id }, callback) => {
        if (!rl('savePlaylist', 5, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in.' });
        if (owner !== socket.username) return callback({ success: false, message: 'Unauthorized action.' });
        if (!name || !songs || songs.length === 0) return callback({ success: false, message: 'Playlist needs a name and at least one song.' });

        let playlists = await loadCommunityPlaylists();
        if (id) {
            const idx = playlists.findIndex(p => p.id === id && p.owner === owner);
            if (idx !== -1) { playlists[idx] = { ...playlists[idx], name, genre, songs }; }
        } else {
            playlists.push({ id: Date.now().toString(), name, genre, songs, owner, likes: [], createdAt: Date.now() });
        }
        await saveCommunityPlaylists(playlists);
        io.emit('communityPlaylistsUpdated', playlists);
        callback({ success: true, playlists });
    });

    socket.on('deletePlaylist', async ({ id, username }, callback) => {
        if (!rl('deletePlaylist', 5, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in.' });
        if (username !== socket.username) return callback({ success: false, message: 'Unauthorized action.' });
        let playlists = await loadCommunityPlaylists();
        playlists = playlists.filter(p => !(p.id === id && p.owner === username));
        await saveCommunityPlaylists(playlists);
        io.emit('communityPlaylistsUpdated', playlists);
        callback({ success: true });
    });

    socket.on('likePlaylist', async ({ id, username }, callback) => {
        if (!rl('likePlaylist', 20, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        if (!authRequired() || username !== socket.username) return callback({ success: false, message: 'Unauthorized action.' });
        let playlists = await loadCommunityPlaylists();
        const pl = playlists.find(p => p.id === id);
        if (pl) {
            if (!pl.likes) pl.likes = [];
            if (pl.likes.includes(username)) {
                pl.likes = pl.likes.filter(u => u !== username);
            } else {
                pl.likes.push(username);
            }
            await saveCommunityPlaylists(playlists);
            io.emit('communityPlaylistsUpdated', playlists);
            callback({ success: true, likes: pl.likes.length, isLiked: pl.likes.includes(username) });
        } else {
            callback({ success: false, message: 'Playlist not found.' });
        }
    });

    socket.on('searchItunesSongs', async (term, callback) => {
        if (!rl('searchItunesSongs', 10, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in.' });
        try {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=15&country=hk`;
            const response = await fetch(url);
            const data = await response.json();
            const results = data.results.filter(song => song.previewUrl).map(song => ({
                id: song.trackId,
                title: song.trackName,
                artist: song.artistName,
                audioUrl: song.previewUrl,
                appleUrl: song.trackViewUrl,
                year: new Date(song.releaseDate).getFullYear() || 2024
            }));
            callback({ success: true, results });
        } catch (e) {
            console.error('iTunes Search Error', e);
            callback({ success: false, message: 'Error searching iTunes.' });
        }
    });

    socket.on('toggleFavorite', async ({ username, song }, callback) => {
        if (!rl('toggleFavorite', 30, 60_000)) return callback({ success: false, message: 'Too many requests.' });
        if (!authRequired() || username !== socket.username) return callback({ success: false, message: 'Unauthorized action.' });
        const users = await loadUsers();
        if (!users[username]) return callback({ success: false, message: 'User not found' });

        if (!users[username].favorites) {
            users[username].favorites = [];
        }

        const favIndex = users[username].favorites.findIndex(s => s.id === song.id);
        let added = false;
        if (favIndex === -1) {
            users[username].favorites.push(song);
            added = true;
        } else {
            users[username].favorites.splice(favIndex, 1);
        }

        await saveUsers(users);
        callback({ success: true, added, favorites: users[username].favorites });
    });

    socket.on('getLeaderboard', async ({ category, mode, type }, callback) => {
        if (!rl('getLeaderboard', 10, 30_000)) return callback([]);

        console.log(`[Leaderboard] Request: Type=${type}, Category=${category}, Mode=${mode}`);

        let leaderboard = [];

        if (type === 'teams') {
            const teams = await loadTeams();
            leaderboard = Object.values(teams)
                .map(t => ({
                    id: t.id,
                    username: t.name,
                    score: t.score || 0,
                    icon: t.icon || '👥',
                    banned: false
                }))
                .filter(t => t.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            return callback(leaderboard);
        }

        const users = await loadUsers();

        // Logical Split:
        // 1. Total Scores: Category='all' AND Mode='standard' -> Fetch cumulative totalScore
        // 2. Mode Records: Specific Category OR specific Mode -> Fetch highScores[key]

        const isGlobalTotal = (category === 'all' || !category) && (mode === 'standard' || !mode);

        if (isGlobalTotal) {
            console.log(`[Leaderboard] Fetching GLOBAL TOTAL cumulative scores`);
            leaderboard = Object.keys(users)
                .map(username => ({
                    username: users[username].displayName || username,
                    score: users[username].totalScore || 0,
                    icon: users[username].icon || '👤',
                    banned: users[username].banned || false
                }))
                .filter(u => !u.banned && u.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
        } else {
            const scoreKey = `${category || 'all'}_${mode || 'standard'}`;
            console.log(`[Leaderboard] Fetching HIGH SCORE records for Key: ${scoreKey}`);

            leaderboard = Object.keys(users)
                .map(username => ({
                    username: users[username].displayName || username,
                    score: (users[username].highScores && users[username].highScores[scoreKey]) || 0,
                    icon: users[username].icon || '👤',
                    banned: users[username].banned || false
                }))
                .filter(u => u.score > 0 && !u.banned)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
        }

        callback(leaderboard);
    });

    socket.on('getCategories', (callback) => {
        callback(Object.keys(allSongs));
    });
}
