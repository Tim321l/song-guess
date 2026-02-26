import { state } from './state.js';
import { socket } from './socket.js';
import { switchScreen, leaveRoom, renderIcon } from './utils.js';
import { audioPlayer, stopAllAudio } from './audio.js';

export function updateScores() {
    const container = document.getElementById('scores-display');
    if (!container) return;
    container.innerHTML = '';

    state.players.slice().sort((a, b) => b.score - a.score).forEach(p => {
        const d = document.createElement('div');
        d.className = "player-score-inline";
        d.style.color = 'var(--text-main)';

        let text = `<span style="margin-right: 5px;">${renderIcon(p.icon)}</span> <strong>${p.name}:</strong> ${p.score}`;
        if (p.hearts !== undefined) {
            text += p.eliminated ?
                ` <span style="color: #ff4757; font-size: 0.8em; margin-left: 10px;">💀 Eliminated</span>` :
                ` <span style="font-size: 0.8em; margin-left: 10px;">❤️ x${p.hearts}</span>`;
        }

        if (state.roomMode === 'team_vs_team' && p.team !== null && p.team !== undefined) {
            const teamName = p.team === 0 ? 'RED' : 'BLUE';
            const teamColor = p.team === 0 ? '#ff4757' : '#3498db';
            text += ` <span style="font-size: 0.7em; margin-left:10px; padding:2px 6px; border-radius:4px; background:${teamColor}; color:#fff; font-weight:bold;">${teamName}</span>`;
        }

        d.innerHTML = text;
        if (p.id === socket.id) {
            d.style.boxShadow = '0 0 10px rgba(126, 213, 111, 0.5)';
            d.style.border = '1px solid #7ed56f';
        }
        container.appendChild(d);
    });

    // --- Update 1v1 Match Score Bar ---
    if (state.roomMode === 'competition' && state.bracket) {
        const matchBar = document.getElementById('match-score-bar');
        const currentMatch = state.bracket.matches[state.bracket.currentMatchIndex];

        if (matchBar && currentMatch) {
            matchBar.classList.remove('hidden');
            const p1 = state.players.find(p => p.id === currentMatch.p1);
            const p2 = state.players.find(p => p.id === currentMatch.p2);

            if (p1) {
                document.getElementById('match-p1-name').innerText = p1.name;
                document.getElementById('match-p1-score').innerText = p1.score;
                document.getElementById('match-p1-fill').style.width = `${Math.min(100, p1.score)}%`;
            }
            if (p2) {
                document.getElementById('match-p2-name').innerText = p2.name;
                document.getElementById('match-p2-score').innerText = p2.score;
                document.getElementById('match-p2-fill').style.width = `${Math.min(100, p2.score)}%`;
            }
        }
    } else {
        const matchBar = document.getElementById('match-score-bar');
        if (matchBar) matchBar.classList.add('hidden');
    }

    // --- Update Team vs Team Score Bar ---
    const teamBar = document.getElementById('team-score-bar');
    if (state.roomMode === 'team_vs_team' && state.teamScores) {
        if (teamBar) {
            teamBar.classList.remove('hidden');
            const redScore = state.teamScores[0] || 0;
            const blueScore = state.teamScores[1] || 0;
            const maxScore = Math.max(100, redScore, blueScore);

            document.getElementById('team-red-score').innerText = redScore;
            document.getElementById('team-blue-score').innerText = blueScore;
            document.getElementById('team-red-fill').style.width = `${(redScore / maxScore) * 100}%`;
            document.getElementById('team-blue-fill').style.width = `${(blueScore / maxScore) * 100}%`;
        }
    } else {
        if (teamBar) teamBar.classList.add('hidden');
    }

    // --- Pause / Resume ---
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.onclick = () => socket.emit('togglePause', state.roomId);
    }

    const overlayResumeBtn = document.getElementById('overlay-resume-btn');
    if (overlayResumeBtn) {
        overlayResumeBtn.onclick = () => socket.emit('togglePause', state.roomId);
    }

    socket.on('gamePaused', () => {
        state.isPaused = true;
        audioPlayer.pause();
        document.getElementById('visualizer').classList.remove('playing');
        document.getElementById('pause-overlay').classList.remove('hidden');

        const pauseIcon = document.getElementById('pause-btn-icon');
        const pauseText = document.getElementById('pause-btn-text');
        if (pauseIcon) pauseIcon.innerText = '▶️';
        if (pauseText) { pauseText.innerText = 'Resume'; pauseText.setAttribute('data-i18n', 'resume-btn'); }

        if (state.isHost) {
            const overlay = document.getElementById('overlay-resume-btn');
            if (overlay) overlay.classList.remove('hidden');
        }
    });

    socket.on('gameResumed', () => {
        state.isPaused = false;
        document.getElementById('pause-overlay').classList.add('hidden');

        const pauseIcon = document.getElementById('pause-btn-icon');
        const pauseText = document.getElementById('pause-btn-text');
        if (pauseIcon) pauseIcon.innerText = '⏸️';
        if (pauseText) { pauseText.innerText = 'Pause'; pauseText.setAttribute('data-i18n', 'pause-btn'); }

        if (state.audioAutoplayAllowed) {
            audioPlayer.play().catch(e => console.log(e));
            document.getElementById('visualizer').classList.add('playing');
        }
    });
}

export function initGameplayHandlers() {
    socket.on('gameStarting', (data) => {
        switchScreen('game');
        const readyBtn = document.getElementById('ready-btn');
        readyBtn.classList.remove('hidden');
        document.getElementById('ready-status-container').classList.remove('hidden');
        if (state.isHost) document.getElementById('host-controls').classList.remove('hidden');

        if (data && data.bracket) {
            state.bracket = data.bracket;
            renderBracket(data.bracket);
            document.getElementById('bracket-container').classList.remove('hidden');
        } else {
            document.getElementById('bracket-container').classList.add('hidden');
        }
    });

    socket.on('gameStarted', () => {
        document.getElementById('ready-btn').classList.add('hidden');
        document.getElementById('ready-status-container').classList.add('hidden');
        document.getElementById('options-grid').classList.remove('hidden');
        if (state.isHost) document.getElementById('host-controls').classList.remove('hidden');
    });

    socket.on('newTurn', (data) => {
        stopAllAudio();
        state.hasGuessed = false;
        updateScores();

        const turnMsg = document.getElementById('turn-message');
        document.getElementById('round-display').innerText = `${data.round} / ${data.totalRounds}`;
        const grid = document.getElementById('options-grid');
        grid.innerHTML = '';

        // Handle standard options (can be expanded to support lyrics/next modes)
        data.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.dataset.id = opt.id;
            btn.innerHTML = `<div class="option-song">${opt.title || ''} ${opt.artist ? '- ' + opt.artist : ''}</div>`;
            btn.onclick = () => {
                if (state.hasGuessed || btn.disabled) return;
                state.hasGuessed = true;
                document.querySelectorAll('.option-btn').forEach(b => {
                    b.style.opacity = '0.5';
                    b.style.cursor = 'not-allowed';
                });
                btn.style.opacity = '1';
                btn.classList.add('picked');
                if (turnMsg) turnMsg.innerText = 'Answer locked! Waiting...';
                socket.emit('guess', { roomId: state.roomId, songId: opt.id });
            };
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            grid.appendChild(btn);
        });

        if (turnMsg) {
            const prefix = `Round ${data.round}: `;
            if (data.mode === 'lyrics') turnMsg.innerText = prefix + 'Read the lyrics and guess the next line!';
            else if (data.mode === 'next') turnMsg.innerText = prefix + 'What is next?';
            else turnMsg.innerText = prefix + 'Match the Song!';
        }

        const lyricsContainer = document.getElementById('lyrics-display-container');
        if (lyricsContainer) {
            if (data.mode === 'lyrics') {
                lyricsContainer.classList.remove('hidden');
                document.getElementById('lyrics-text').innerHTML = data.lyricsPrompt.join('<br>');
            } else {
                lyricsContainer.classList.add('hidden');
            }
        }

        if (state.audioAutoplayAllowed && data.audioUrl) {
            audioPlayer.src = data.audioUrl;
            audioPlayer.play().catch(e => console.log(e));
            document.getElementById('visualizer').classList.add('playing');
        }

        // --- Competition Matchup Handling ---
        if (state.roomMode === 'competition' && state.bracket) {
            const currentMatch = state.bracket.matches[state.bracket.currentMatchIndex];
            const isCompetitor = socket.id === currentMatch.p1 || socket.id === currentMatch.p2;

            if (!isCompetitor) {
                const p1Name = state.players.find(p => p.id === currentMatch.p1)?.name || '???';
                const p2Name = state.players.find(p => p.id === currentMatch.p2)?.name || '???';
                if (turnMsg) turnMsg.innerText = `Spectating: ${p1Name} vs ${p2Name}`;
                grid.classList.add('hidden');
            } else {
                grid.classList.remove('hidden');
            }
        }

        // Simplified Timer for modularization
        let timeLeft = data.totalGuessTimeMs / 1000;
        let audioTimeLeft = data.durationMs / 1000;
        const totalTime = timeLeft;

        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            if (state.isPaused) return;
            timeLeft -= 0.1;
            audioTimeLeft -= 0.1;

            if (audioTimeLeft <= 0) {
                if (!audioPlayer.paused) {
                    audioPlayer.pause();
                    document.getElementById('visualizer').classList.remove('playing');
                }
                if (!state.hasGuessed) {
                    document.querySelectorAll('.option-btn').forEach(b => {
                        if (b.disabled) {
                            b.disabled = false;
                            b.style.opacity = '1';
                            b.style.cursor = 'pointer';
                        }
                    });
                }
            }

            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(state.timerInterval);
            }

            const fill = document.getElementById('progress-fill');
            if (fill) fill.style.width = `${(timeLeft / totalTime) * 100}%`;
            const timeLabel = document.getElementById('time-left');
            if (timeLabel) timeLabel.innerText = `0:${Math.ceil(timeLeft).toString().padStart(2, '0')}`;
        }, 100);
    });

    socket.on('turnResult', (res) => {
        audioPlayer.pause();
        document.getElementById('visualizer').classList.remove('playing');
        clearInterval(state.timerInterval);

        state.players = res.players;
        if (res.teamScores) state.teamScores = res.teamScores;
        if (res.bracket) {
            state.bracket = res.bracket;
            renderBracket(res.bracket);
        }
        updateScores();
        state.hasGuessed = true;

        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            const isCorrect = String(btn.dataset.id) === String(res.correctSong.id);
            btn.classList.add(isCorrect ? 'correct' : 'wrong');
            btn.style.opacity = isCorrect ? '1' : '0.5';

            // Show point pop for the player's own result
            if (res.results[socket.id]) {
                const myResult = res.results[socket.id];
                if (String(btn.dataset.id) === String(myResult.songIdPicked)) {
                    showPointPop(myResult.pointsAwarded);
                }
            }
        });
    });

    function showPointPop(points) {
        const pop = document.createElement('div');
        pop.className = 'point-pop';
        pop.style.color = points > 0 ? '#2ecc71' : (points < 0 ? '#ff4757' : '#999');
        pop.style.left = '50%';
        pop.style.top = '50%';
        pop.innerText = points > 0 ? `+${points}` : points;
        document.body.appendChild(pop);
        setTimeout(() => pop.remove(), 1200);
    }

    function renderBracket(bracket) {
        const display = document.getElementById('bracket-display');
        if (!display) return;
        display.innerHTML = '';

        // Group matches by stage
        const stages = {};
        bracket.matches.forEach(match => {
            if (!stages[match.stage]) stages[match.stage] = [];
            stages[match.stage].push(match);
        });

        // Define order of stages
        const stageOrder = ['Semi-Final', 'Final'];

        stageOrder.forEach(stageName => {
            if (!stages[stageName]) return;

            const column = document.createElement('div');
            column.className = 'bracket-column';

            const roundTitle = document.createElement('div');
            roundTitle.className = 'bracket-round-title';
            roundTitle.innerText = stageName;
            column.appendChild(roundTitle);

            stages[stageName].forEach(match => {
                const matchDiv = document.createElement('div');
                const isActive = bracket.matches[bracket.currentMatchIndex]?.id === match.id;
                matchDiv.className = `match-card ${isActive ? 'active' : ''}`;

                const p1 = state.players.find(p => p.id === match.p1);
                const p2 = state.players.find(p => p.id === match.p2);

                const p1Name = p1 ? p1.name : (match.p1 ? '???' : 'TBD');
                const p2Name = p2 ? p2.name : (match.p2 ? '???' : 'TBD');
                const p1Icon = p1 ? renderIcon(p1.icon) : (match.p1 ? '👤' : '?');
                const p2Icon = p2 ? renderIcon(p2.icon) : (match.p2 ? '👤' : '?');

                const p1Score = p1 ? p1.score : 0;
                const p2Score = p2 ? p2.score : 0;

                const statusText = match.winner
                    ? `${state.players.find(p => p.id === match.winner)?.name || 'Winner'} Win`
                    : (isActive ? 'PLAYING LIVE' : 'WAITING');

                matchDiv.innerHTML = `
                    <div class="match-team ${match.winner === match.p1 ? 'winner' : ''}">
                        <div class="match-team-icon">${p1Icon}</div>
                        <div class="match-team-info">
                            <span class="match-team-name">${p1Name}</span>
                            <span class="match-team-score">${p1Score}</span>
                        </div>
                    </div>
                    <div class="match-team ${match.winner === match.p2 ? 'winner' : ''}">
                        <div class="match-team-icon">${p2Icon}</div>
                        <div class="match-team-info">
                            <span class="match-team-name">${p2Name}</span>
                            <span class="match-team-score">${p2Score}</span>
                        </div>
                    </div>
                    <div class="match-status-bar">${statusText}</div>
                `;

                column.appendChild(matchDiv);
            });

            display.appendChild(column);
        });
    }




    socket.on('gameOver', ({ players }) => {
        state.players = players;
        stopAllAudio();
        clearInterval(state.timerInterval);

        const ranking = document.getElementById('final-ranking');
        ranking.innerHTML = '';
        const sorted = players.slice().sort((a, b) => b.score - a.score);
        const isWinner = sorted[0] && sorted[0].id === socket.id;

        sorted.forEach((p, i) => {
            const d = document.createElement('div');
            d.className = 'final-score-card';
            d.style.cssText = 'width:100%;padding:12px 18px;background:rgba(255,255,255,0.05);border-radius:10px;display:flex;justify-content:space-between;align-items:center;';
            if (p.id === socket.id) d.style.border = '1px solid #00f2fe';

            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[i] || `#${i + 1}`;
            const recordBadge = p.newRecord
                ? '<span style="background:#f1c40f;color:#000;font-size:0.7em;padding:2px 6px;border-radius:10px;margin-left:8px;font-weight:bold;">🎉 NEW RECORD!</span>'
                : '';

            d.innerHTML = `
                <span style="font-size:1.1em;">${medal} <strong>${renderIcon(p.icon)} ${p.name}</strong>${recordBadge}</span>
                <span style="font-size:1.2em;font-weight:800;color:#00f2fe;">${p.score} pts</span>
            `;
            ranking.appendChild(d);
        });

        // Hide host controls
        const hostControls = document.getElementById('host-controls');
        if (hostControls) hostControls.classList.add('hidden');

        // Play Again button (host only)
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            if (state.isHost) {
                playAgainBtn.classList.remove('hidden');
                playAgainBtn.onclick = () => socket.emit('requestPlayAgain', state.roomId);
            } else {
                playAgainBtn.classList.add('hidden');
            }
        }

        // Global leaderboard for this category/mode
        const globalContainer = document.getElementById('global-ranking-container');
        const globalList = document.getElementById('global-ranking-list');
        const catModeText = document.getElementById('res-cat-mode-text');
        if (state.roomLang && state.roomMode && state.roomLang !== 'all' && globalContainer) {
            globalContainer.classList.remove('hidden');
            if (catModeText) catModeText.innerText = `${state.roomLang} (${state.roomMode})`;
            socket.emit('getLeaderboard', { category: state.roomLang, mode: state.roomMode }, (lb) => {
                globalList.innerHTML = '';
                if (!lb || lb.length === 0) {
                    globalList.innerHTML = '<div style="text-align:center;color:#666;">No records yet! Be the first!</div>';
                } else {
                    lb.forEach((entry, idx) => {
                        const div = document.createElement('div');
                        div.style.cssText = 'display:flex;justify-content:space-between;padding:10px;border-radius:8px;';
                        div.style.background = entry.username === state.name ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)';
                        div.innerHTML = `<span>#${idx + 1} ${renderIcon(entry.icon)} ${entry.username}</span><span style="font-weight:bold;color:#00f2fe;">${entry.score} pts</span>`;
                        globalList.appendChild(div);
                    });
                }
            });
        } else if (globalContainer) {
            globalContainer.classList.add('hidden');
        }

        switchScreen('result');
    });

    // Play Again / Room Reset
    socket.on('roomReset', ({ players }) => {
        state.players = players;
        state.hasGuessed = false;
        clearInterval(state.timerInterval);

        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            readyBtn.classList.remove('hidden');
            readyBtn.style.opacity = '1';
            readyBtn.style.pointerEvents = 'auto';
            readyBtn.textContent = 'Click Here to Ready & Enable Audio';
        }
        const hostControls = document.getElementById('host-controls');
        if (hostControls) hostControls.classList.add('hidden');
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) pauseOverlay.classList.add('hidden');

        switchScreen('lobby');
    });

    socket.on('playerReadyUpdate', ({ readyPlayers, totalPlayers }) => {
        const list = document.getElementById('ready-players-list');
        if (!list) return;
        list.innerHTML = '';
        state.players.forEach(p => {
            const isReady = readyPlayers.includes(p.id);
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.padding = '5px 10px';
            div.style.background = 'rgba(255,255,255,0.05)';
            div.style.borderRadius = '5px';
            div.innerHTML = `<span>${renderIcon(p.icon)} ${p.name}</span> <span style="color: ${isReady ? '#2ecc71' : '#ff4757'}">${isReady ? 'READY' : 'WAITING...'}</span>`;
            list.appendChild(div);
        });
        const forceBtn = document.getElementById('force-start-btn');
        if (forceBtn && state.isHost) {
            forceBtn.classList.remove('hidden');
            forceBtn.onclick = () => socket.emit('forceStartGame', state.roomId);
        }
    });

    const leaveBtn = document.getElementById('game-leave-btn');
    if (leaveBtn) {
        leaveBtn.onclick = () => {
            if (confirm(localStorage.getItem('songGuessLang') === 'ZH' ? '確定要離開房間嗎？' : 'Are you sure you want to leave the room?')) {
                leaveRoom();
            }
        };
    }
}
