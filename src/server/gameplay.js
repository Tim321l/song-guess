import { rooms, setRoomTimeout } from './rooms.js';
import { shuffle } from './utils.js';
import { loadUsers, saveUsers, loadCommunityPlaylists, loadTeams, saveTeams, loadTeams as loadTeamsDb, saveTeams as saveTeamsDb, saveReport } from './db.js';

export function registerGameplayHandlers(io, socket, allSongs) {
    socket.on('createRoom', ({ name, icon, mode, rounds, hearts, diff, lang, customSongs, isPublic }, callback) => {
        // Validation
        if (typeof rounds !== 'number' || rounds <= 0 || rounds > 100) rounds = 10;
        if (typeof hearts !== 'number' || hearts <= 0 || hearts > 10) hearts = 3;
        if (!['standard', 'elimination', 'competition', 'fastest', 'lyrics', 'next', 'team_vs_team'].includes(mode)) mode = 'standard';
        if (typeof name !== 'string' || name.length > 50) name = socket.username || 'Guest';

        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[roomId] = {
            id: roomId,
            host: socket.id,
            players: [{
                id: socket.id,
                username: socket.username || null,
                name,
                icon: icon || '👤',
                score: 0,
                hearts: hearts,
                eliminated: false,
                streak: 0,
                streakMultiplier: 1.0
            }],
            mode: mode,
            rounds: rounds,
            hearts: hearts,
            diff: diff,
            lang: lang,
            customSongs: customSongs || [],
            currentRound: 0,
            state: 'lobby',
            playlist: [],
            roundState: {},
            isPaused: false,
            pauseData: {},
            lastActivity: Date.now(),
            isPublic: !!isPublic,
            bracket: null,
            currentMatch: null,
            teamScores: mode === 'team_vs_team' ? [0, 0] : null
        };
        // In team mode, host starts in Team Red (0)
        if (rooms[roomId].mode === 'team_vs_team') {
            rooms[roomId].players[0].team = 0;
        }
        socket.join(roomId);
        broadcastPublicRooms(io);
        callback({ success: true, roomId, host: true, players: rooms[roomId].players, lang: rooms[roomId].lang, mode: rooms[roomId].mode });
    });

    socket.on('getPublicRooms', (callback) => {
        callback(getPublicRoomsList());
    });

    socket.on('joinRoom', ({ roomId, name, icon }, callback) => {
        if (typeof roomId !== 'string' || roomId.length > 10) return callback({ success: false, message: 'Invalid Room ID' });
        if (typeof name !== 'string' || name.length > 50) name = socket.username || 'Guest';

        roomId = roomId.toUpperCase();
        const room = rooms[roomId];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.state !== 'lobby') return callback({ success: false, message: 'Game already started' });

        let team = null;
        if (room.mode === 'team_vs_team') {
            const team0count = room.players.filter(p => p.team === 0).length;
            const team1count = room.players.filter(p => p.team === 1).length;
            team = team0count <= team1count ? 0 : 1;
        }

        room.players.push({
            id: socket.id,
            username: socket.username || null,
            name,
            icon: icon || '👤',
            score: 0,
            hearts: room.hearts,
            eliminated: false,
            team
        });
        room.lastActivity = Date.now();
        socket.join(roomId);
        io.to(roomId).emit('roomUpdate', { players: room.players, isPaused: room.isPaused });
        broadcastPublicRooms(io);
        callback({ success: true, roomId, host: false, players: room.players, lang: room.lang, mode: room.mode, isPaused: room.isPaused });
    });

    socket.on('startGame', async (roomId) => {
        const room = rooms[roomId];
        if (room && room.host === socket.id) {
            room.state = 'starting';
            room.readyPlayers = [];

            let songsList = [];
            if (room.lang.startsWith('community:')) {
                const plistId = room.lang.split(':')[1];
                const commLists = await loadCommunityPlaylists();
                const pl = commLists.find(p => p.id === plistId);
                if (pl && pl.songs && pl.songs.length > 0) {
                    songsList = pl.songs;
                } else {
                    songsList = allSongs['songsCn'];
                }
            } else if (room.lang === 'spotify' && room.customSongs && room.customSongs.length > 0) {
                songsList = room.customSongs;
            } else if (room.lang === 'all') {
                for (const key in allSongs) {
                    const listWithLang = allSongs[key].map(s => ({ ...s, srcList: key }));
                    songsList = songsList.concat(listWithLang);
                }
            } else {
                songsList = allSongs[room.lang] || allSongs['songsCn'];
            }

            if (room.mode === 'competition') {
                if (room.players.length < 4) {
                    return socket.emit('error', 'Competition Mode requires exactly 4 players.');
                }
                room.bracket = generateBracket(room.players);
                room.currentMatch = room.bracket.matches[0];
                room.rounds = room.bracket.totalMatches * 5; // e.g. 5 rounds per match
            }

            if (room.mode === 'elimination') {
                room.rounds = 9999;
                room.playlist = shuffle([...songsList]).slice(0, 9999);
            } else {
                room.playlist = shuffle([...songsList]).slice(0, room.rounds);
            }

            io.to(roomId).emit('gameStarting', { bracket: room.bracket });
            io.to(roomId).emit('playerReadyUpdate', { readyPlayers: room.readyPlayers, totalPlayers: room.players.length });
        }
    });

    function generateBracket(players) {
        const shuffled = shuffle([...players]);
        const matches = [];
        // Support 4 players specifically for now as requested "at least 4 player like nba final 1v1"
        // Semi-final 1: Player 0 vs Player 1
        // Semi-final 2: Player 2 vs Player 3
        // Final: Winner 1 vs Winner 2

        if (shuffled.length >= 4) {
            matches.push({ id: 'semi1', p1: shuffled[0].id, p2: shuffled[1].id, winner: null, stage: 'Semi-Final' });
            matches.push({ id: 'semi2', p1: shuffled[2].id, p2: shuffled[3].id, winner: null, stage: 'Semi-Final' });
            matches.push({ id: 'final', p1: null, p2: null, winner: null, stage: 'Final' });
        } else if (shuffled.length >= 2) {
            matches.push({ id: 'final', p1: shuffled[0].id, p2: shuffled[1].id, winner: null, stage: 'Final' });
        }

        return { matches, currentMatchIndex: 0, totalMatches: matches.length };
    }

    socket.on('playerReady', (roomId) => {
        const room = rooms[roomId];
        if (room && room.state === 'starting') {
            if (!room.readyPlayers.includes(socket.id)) {
                room.readyPlayers.push(socket.id);
            }
            io.to(roomId).emit('playerReadyUpdate', { readyPlayers: room.readyPlayers, totalPlayers: room.players.length });
            room.lastActivity = Date.now();
            if (room.readyPlayers.length === room.players.length) {
                room.state = 'playing';
                io.to(roomId).emit('gameStarted');
                setRoomTimeout(room, () => startTurn(roomId), 1000, 'turnStart');
            }
        }
    });

    socket.on('forceStartGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.state === 'starting' && room.host === socket.id) {
            room.state = 'playing';
            io.to(roomId).emit('gameStarted');
            setRoomTimeout(room, () => startTurn(roomId), 1000, 'turnStart');
        }
    });

    socket.on('guess', ({ roomId, songId }) => {
        const room = rooms[roomId];
        if (!room || room.state !== 'playing' || room.roundState.hasGuessed) return;

        if (room.mode === 'competition' && room.currentMatch) {
            if (socket.id !== room.currentMatch.p1 && socket.id !== room.currentMatch.p2) {
                return; // Non-competitors can't guess
            }
        }

        room.roundState.guesses[socket.id] = { songId, timestamp: Date.now() };
        const alivePlayers = room.mode === 'competition' ? 2 : room.players.filter(p => !p.eliminated).length;

        if (Object.keys(room.roundState.guesses).length >= alivePlayers) {
            room.roundState.hasGuessed = true;
            if (room.timeout) clearTimeout(room.timeout);
            room.lastActivity = Date.now();
            endTurn(roomId);
        }
    });

    socket.on('togglePause', (roomId) => {
        const room = rooms[roomId];
        if (!room || room.host !== socket.id) return;
        if (room.state !== 'playing' && room.state !== 'starting') return;

        if (!room.isPaused) {
            room.isPaused = true;
            if (room.timeout) {
                clearTimeout(room.timeout);
                const elapsed = Date.now() - room.timeoutStartTime;
                room.pauseData = {
                    remainingTime: Math.max(0, room.timeoutDuration - elapsed),
                    timeoutType: room.timeoutType,
                    timeoutCallback: room.timeoutCallback
                };
            }
            io.to(roomId).emit('gamePaused');
            room.lastActivity = Date.now();
        } else {
            room.isPaused = false;
            const pd = room.pauseData;
            if (pd && pd.remainingTime !== undefined) {
                setRoomTimeout(room, pd.timeoutCallback, pd.remainingTime, pd.timeoutType);
            }
            io.to(roomId).emit('gameResumed');
            room.lastActivity = Date.now();
        }
    });

    socket.on('requestPlayAgain', (roomId) => {
        const room = rooms[roomId];
        if (room && room.host === socket.id) {
            room.state = 'lobby';
            room.currentRound = 0;
            room.playlist = [];
            room.roundState = {};
            room.players.forEach(p => {
                p.score = 0;
                p.eliminated = false;
                p.hearts = room.hearts;
                p.streak = 0;
                p.streakMultiplier = 1.0;
            });

            io.to(roomId).emit('roomReset', { players: room.players });
        }
    });

    socket.on('reportSong', async ({ roomId, songId, reason }) => {
        const room = rooms[roomId];
        if (!room || !room.roundState || !room.roundState.correctSong) return;

        // Verify the song being reported is the correct one from the current round
        if (room.roundState.correctSong.id !== songId) return;

        const reportData = {
            songId: songId,
            title: room.roundState.correctSong.title,
            artist: room.roundState.correctSong.artist,
            audioUrl: room.roundState.correctSong.audioUrl,
            reporter: socket.username || 'Guest',
            reason: reason || 'Buggy Audio/Info',
            createdAt: new Date()
        };

        const success = await saveReport(reportData);
        if (success) {
            console.log(`[Report] Song ${songId} reported by ${reportData.reporter}`);
            // Notify admins if any are online (optional but good for real-time)
            io.to('admin-live').emit('adminNotification', {
                type: 'REPORT',
                message: `New song report for "${reportData.title}" by ${reportData.reporter}`
            });
        }
    });

    socket.on('leaveRoom', () => {
        handlePlayerExit(io, socket);
    });

    // --- Core Helper Logic ---

    async function startTurn(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        let alivePlayers = room.players.filter(p => !p.eliminated).length;
        room.currentRound++;

        if (room.currentRound > room.rounds || (room.mode === 'elimination' && alivePlayers === 0)) {
            room.state = 'ended';
            const users = await loadUsers();
            const teams = await loadTeams();
            let usersUpdated = false;
            let teamsUpdated = false;

            room.players.forEach(p => {
                if (users[p.name]) {
                    users[p.name].totalScore = (users[p.name].totalScore || 0) + p.score;
                    if (!users[p.name].highScores) users[p.name].highScores = {};
                    const scoreKey = `${room.lang}_${room.mode}`;
                    const currentBest = users[p.name].highScores[scoreKey] || 0;
                    if (p.score > currentBest) {
                        users[p.name].highScores[scoreKey] = p.score;
                        p.newRecord = true;
                    }

                    const teamId = users[p.name].teamId;
                    if (teamId && teams[teamId]) {
                        teams[teamId].score = (teams[teamId].score || 0) + p.score;
                        teamsUpdated = true;
                    }

                    usersUpdated = true;
                }
            });
            if (usersUpdated) await saveUsers(users);
            if (teamsUpdated) await saveTeams(teams);
            io.to(roomId).emit('gameOver', { players: room.players });
            return;
        }

        const correctSong = room.playlist[room.currentRound - 1];
        let songsList = (room.lang === 'all')
            ? (allSongs[correctSong.srcList] || Object.values(allSongs).flat())
            : (allSongs[room.lang] || allSongs['songsCn']);

        // Deduplicate options by title
        const usedTitles = new Set([correctSong.title]);
        const uniqueOptions = [correctSong];

        // Priority 1: Same artist, different titles
        let sameArtistSongs = shuffle(songsList.filter(s => s.id !== correctSong.id && s.artist === correctSong.artist));
        for (const song of sameArtistSongs) {
            if (uniqueOptions.length >= 20) break;
            if (!usedTitles.has(song.title)) {
                uniqueOptions.push(song);
                usedTitles.add(song.title);
            }
        }

        // Priority 2: Other artists, unique titles
        if (uniqueOptions.length < 20) {
            let otherSongs = shuffle(songsList.filter(s => s.id !== correctSong.id && s.artist !== correctSong.artist));
            for (const song of otherSongs) {
                if (uniqueOptions.length >= 20) break;
                if (!usedTitles.has(song.title)) {
                    uniqueOptions.push(song);
                    usedTitles.add(song.title);
                }
            }
        }

        let options = shuffle(uniqueOptions);

        room.roundState = { hasGuessed: false, correctSong, startTime: Date.now(), guesses: {} };
        const durationMs = room.diff * 1000;
        const totalGuessTimeMs = durationMs + 5000;

        if (room.mode === 'lyrics') {
            try {
                const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(correctSong.title)}&artist_name=${encodeURIComponent(correctSong.artist)}`;
                const response = await fetch(url);
                const data = await response.json();
                const bestResult = data.find(d => d.plainLyrics);
                let lyricsFound = false;

                if (bestResult) {
                    const lyricLines = bestResult.plainLyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !/^\[.*?\]$/.test(l));
                    if (lyricLines.length >= 4) {
                        const maxStartIndex = lyricLines.length - 3;
                        const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
                        const promptLines = [lyricLines[startIndex], lyricLines[startIndex + 1]];
                        const correctAnswer = lyricLines[startIndex + 2];
                        let wrongOptionLines = shuffle(lyricLines.filter(l => l !== correctAnswer && l.length > 3)).slice(0, 3);

                        if (wrongOptionLines.length === 3) {
                            lyricsFound = true;
                            let textOptions = shuffle([correctAnswer, ...wrongOptionLines]);
                            const clientOptions = textOptions.map(text => ({ id: text, title: text, artist: '' }));
                            room.roundState.correctSong = { id: correctAnswer, audioUrl: correctSong.audioUrl, title: correctSong.title, artist: correctSong.artist, appleUrl: correctSong.appleUrl, startTime: correctSong.startTime || 0, endTime: correctSong.endTime || 0 };
                            io.to(roomId).emit('newTurn', { round: room.currentRound, totalRounds: room.rounds, audioUrl: correctSong.audioUrl, options: clientOptions, lyricsPrompt: promptLines, durationMs, totalGuessTimeMs, mode: 'lyrics', startTime: correctSong.startTime || 0, endTime: correctSong.endTime || 0 });
                        }
                    }
                }
                if (!lyricsFound) emitStandardTurn(room, options, durationMs, totalGuessTimeMs, 'lyrics-fallback');
            } catch (e) {
                console.error("Lyrics fetch error", e);
                emitStandardTurn(room, options, durationMs, totalGuessTimeMs, 'lyrics-fallback');
            }
        } else if (room.mode === 'next') {
            const clientOptions = options.map(o => ({ id: o.id, audioUrl: o.audioUrl }));
            io.to(roomId).emit('newTurn', { round: room.currentRound, totalRounds: room.rounds, audioUrl: correctSong.audioUrl, options: clientOptions, durationMs, totalGuessTimeMs, mode: 'next', startTime: correctSong.startTime || 0, endTime: correctSong.endTime || 0 });
        } else {
            emitStandardTurn(room, options, durationMs, totalGuessTimeMs);
        }

        setRoomTimeout(room, () => {
            if (!room.roundState.hasGuessed) {
                room.roundState.hasGuessed = true;
                endTurn(roomId);
            }
        }, totalGuessTimeMs, 'turnLimit');
    }

    function emitStandardTurn(room, options, durationMs, totalGuessTimeMs, mode) {
        const clientOptions = options.map(o => ({ id: o.id, title: o.title, artist: o.artist }));
        const correct = room.roundState.correctSong;
        io.to(room.id).emit('newTurn', {
            round: room.currentRound,
            totalRounds: room.rounds,
            audioUrl: correct.audioUrl,
            options: clientOptions,
            durationMs,
            totalGuessTimeMs,
            mode,
            startTime: correct.startTime || 0,
            endTime: correct.endTime || 0
        });
    }

    async function endTurn(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        const results = {};
        const now = Date.now();
        const turnDuration = now - room.roundState.startTime;

        room.players.forEach(p => {
            const guess = room.roundState.guesses[p.id];
            const guessedSongId = guess?.songId;
            const isCorrect = guessedSongId === room.roundState.correctSong.id;

            if (room.mode === 'elimination' && !p.eliminated) {
                if (!isCorrect) {
                    p.hearts -= 1;
                    if (p.hearts <= 0) { p.eliminated = true; p.hearts = 0; }
                }
            }

            let pointsAwarded = 0;
            if (!p.eliminated) {
                // In competition mode, only active participants score
                const isActiveInCompetition = room.mode !== 'competition' ||
                    (room.currentMatch && (p.id === room.currentMatch.p1 || p.id === room.currentMatch.p2));

                if (isActiveInCompetition) {
                    if (guessedSongId) {
                        if (isCorrect) {
                            pointsAwarded = Math.floor(20 * (p.streakMultiplier || 1.0));
                            p.score += pointsAwarded;
                            p.streak = (p.streak || 0) + 1;
                            p.streakMultiplier = (p.streakMultiplier || 1.0) * 1.5;
                        } else {
                            pointsAwarded = -50;
                            p.score = Math.max(0, p.score + pointsAwarded);
                            p.streak = 0;
                            p.streakMultiplier = 1.0;
                        }
                    } else {
                        // Skip/No answer: 0 pts, streak reset
                        pointsAwarded = 0;
                        p.streak = 0;
                        p.streakMultiplier = 1.0;
                    }
                }
                p.scoreDelta = pointsAwarded;
            }

            results[p.id] = { songIdPicked: guessedSongId, isCorrect, eliminated: p.eliminated, pointsAwarded };

            if (room.mode === 'team_vs_team' && p.team !== null && p.team !== undefined) {
                room.teamScores[p.team] += pointsAwarded;
            }
        });

        // Fastest Answer Mode specific logic
        if (room.mode === 'fastest') {
            const correctGuesses = room.players
                .filter(p => room.roundState.guesses[p.id]?.songId === room.roundState.correctSong.id)
                .sort((a, b) => room.roundState.guesses[a.id].timestamp - room.roundState.guesses[b.id].timestamp);

            if (correctGuesses.length > 0) {
                const fastestPlayer = correctGuesses[0];
                fastestPlayer.score += 30; // 30 points bonus for being fastest
                fastestPlayer.scoreDelta += 30;
                results[fastestPlayer.id].isFastest = true;
            }
        }

        // Persistent Team & Personal Score Updates
        const teamUpdates = {}; // teamId -> { total: points, members: { username: points } }
        const users = await loadUsers();
        let usersModified = false;

        room.players.forEach(p => {
            if (p.username && p.scoreDelta && p.scoreDelta !== 0) {
                // Team logic
                const teamId = users[p.username]?.teamId;
                if (teamId) {
                    if (!teamUpdates[teamId]) teamUpdates[teamId] = { total: 0, members: {} };
                    teamUpdates[teamId].total += p.scoreDelta;
                    teamUpdates[teamId].members[p.username] = (teamUpdates[teamId].members[p.username] || 0) + p.scoreDelta;
                }

                // Personal Stats logic
                const user = users[p.username];
                if (user) {
                    // Update Total Score (lifetime cumulative)
                    if (p.scoreDelta !== 0) {
                        user.totalScore = (user.totalScore || 0) + p.scoreDelta;
                        if (user.totalScore < 0) user.totalScore = 0;
                        usersModified = true;
                    }

                    // High Score tracking (Check every turn for accuracy)
                    if (!user.highScores) user.highScores = {};
                    const catModeKey = `${room.lang}_${room.mode}`;

                    let currentBest = 0;
                    if (typeof user.highScores.get === 'function') {
                        currentBest = user.highScores.get(catModeKey) || 0;
                    } else {
                        currentBest = user.highScores[catModeKey] || 0;
                    }

                    if (p.score > currentBest) {
                        if (typeof user.highScores.set === 'function') {
                            user.highScores.set(catModeKey, p.score);
                        } else {
                            user.highScores[catModeKey] = p.score;
                        }
                        usersModified = true;
                    }
                }
            }
        });

        if (usersModified) {
            await saveUsers(users);
        }

        if (Object.keys(teamUpdates).length > 0) {
            const teams = await loadTeams();
            Object.keys(teamUpdates).forEach(tid => {
                if (teams[tid]) {
                    teams[tid].score = (teams[tid].score || 0) + teamUpdates[tid].total;
                    if (!teams[tid].memberScores) teams[tid].memberScores = {};
                    Object.keys(teamUpdates[tid].members).forEach(uname => {
                        teams[tid].memberScores[uname] = (teams[tid].memberScores[uname] || 0) + teamUpdates[tid].members[uname];
                    });

                    // Emit update to all members of this team for real-time score display
                    // This is handled by notifying all clients, they can filter if it's their team
                    // A better way is to augment and emit to all members
                }
            });
            await saveTeams(teams);

            // Send updates to the client
            for (const tid of Object.keys(teamUpdates)) {
                // Re-augment to get full member objects for UI
                const u = await loadUsers();
                const updatedTeam = {
                    ...teams[tid],
                    leaderDisplayName: u[teams[tid].leader]?.displayName || teams[tid].leader,
                    members: teams[tid].members.map(m => ({
                        id: m,
                        displayName: u[m]?.displayName || m,
                        role: teams[tid].roles?.[m] || 'member',
                        totalScore: teams[tid].memberScores?.[m] || 0
                    }))
                };
                io.emit('teamStateUpdate', { teamId: tid, team: updatedTeam });
            }
        }

        // Ensure team scores don't go negative if needed, but standard is fine
        if (room.mode === 'team_vs_team') {
            room.teamScores[0] = Math.max(0, room.teamScores[0]);
            room.teamScores[1] = Math.max(0, room.teamScores[1]);
        }

        // Check for match winner in competition mode
        if (room.mode === 'competition' && room.currentMatch) {
            const p1 = room.players.find(p => p.id === room.currentMatch.p1);
            const p2 = room.players.find(p => p.id === room.currentMatch.p2);

            let matchWinnerId = null;
            if (p1 && p1.score >= 100) matchWinnerId = p1.id;
            else if (p2 && p2.score >= 100) matchWinnerId = p2.id;

            if (matchWinnerId) {
                room.currentMatch.winner = matchWinnerId;
                const matchIndex = room.bracket.matches.findIndex(m => m.id === room.currentMatch.id);

                // Advance winner in bracket
                if (room.currentMatch.id === 'semi1') {
                    room.bracket.matches.find(m => m.id === 'final').p1 = matchWinnerId;
                } else if (room.currentMatch.id === 'semi2') {
                    room.bracket.matches.find(m => m.id === 'final').p2 = matchWinnerId;
                }

                room.bracket.currentMatchIndex++;
                if (room.bracket.currentMatchIndex < room.bracket.totalMatches) {
                    room.currentMatch = room.bracket.matches[room.bracket.currentMatchIndex];
                    // Reset scores and streaks for the next match
                    room.players.forEach(p => {
                        p.score = 0;
                        p.streak = 0;
                        p.streakMultiplier = 1.0;
                    });
                } else {
                    // Tournament Ended
                    room.state = 'ended';
                    io.to(roomId).emit('gameOver', { players: room.players, bracket: room.bracket });
                    return;
                }
            }
        }

        io.to(roomId).emit('turnResult', { correctSong: room.roundState.correctSong, results, players: room.players, teamScores: room.teamScores, isElimination: room.mode === 'elimination', bracket: room.bracket });
        setRoomTimeout(room, () => startTurn(roomId), 4000, 'nextTurnDelay');
    }
}

function getPublicRoomsList() {
    return Object.values(rooms)
        .filter(r => r.isPublic && r.state === 'lobby')
        .map(r => ({
            id: r.id,
            playerCount: r.players.length,
            mode: r.mode,
            lang: r.lang,
            diff: r.diff
        }));
}

export function broadcastPublicRooms(io) {
    io.emit('publicRoomsUpdate', getPublicRoomsList());
}

export function handlePlayerExit(io, socket) {
    let roomsUpdated = false;
    Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);

        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            room.lastActivity = Date.now();

            if (room.players.length === 0) {
                delete rooms[roomId];
                roomsUpdated = true;
            } else {
                if (room.host === socket.id) {
                    room.host = room.players[0].id; // Assign new host
                }
                io.to(roomId).emit('roomUpdate', { players: room.players, isPaused: room.isPaused });
                roomsUpdated = true;
            }
        }
    });

    if (roomsUpdated) {
        broadcastPublicRooms(io);
    }
}
