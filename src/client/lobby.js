import { state } from './state.js';
import { socket } from './socket.js';
import { renderIcon, switchScreen, leaveRoom } from './utils.js';
import { audioPlayer } from './audio.js';

export function updateLobby() {
    const lobbyRoomCode = document.getElementById('lobby-room-code');
    if (lobbyRoomCode) lobbyRoomCode.innerText = state.roomId;

    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    state.players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.style.color = 'var(--text-main)';
        let teamTag = '';
        if (state.roomMode === 'team_vs_team' && p.team !== null && p.team !== undefined) {
            const teamName = p.team === 0 ? 'RED' : 'BLUE';
            const teamColor = p.team === 0 ? '#ff4757' : '#3498db';
            teamTag = ` <span style="font-size: 0.7em; margin-left:10px; padding:2px 6px; border-radius:4px; background:${teamColor}; color:#fff; font-weight:bold;">${teamName}</span>`;
        }
        div.innerHTML = `<span style="margin-right: 10px;">${renderIcon(p.icon)}</span> ${p.name}${teamTag}`;
        list.appendChild(div);
    });

    const startBtn = document.getElementById('lobby-start-btn');
    if (startBtn) {
        if (state.isHost) {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    }
}

export function initLobbyHandlers() {
    document.getElementById('show-create-btn').onclick = () => {
        socket.emit('getCategories', (categories) => {
            const select = document.getElementById('lang-select');
            select.innerHTML = '<option value="all">Mixed / All Categories</option>';

            categories.forEach(cat => {
                // Better labels for categories
                let label = cat.replace('songs', '') + ' Hits';
                if (cat === 'songsHk8090s') label = '80s-90s Hits (HK Classic)';
                if (cat === 'songsHk2000s') label = '2000s Hits (HK Pop)';
                if (cat === 'songsIn') label = 'India Hits';
                if (cat === 'songsJp') label = 'Japanese Hits';
                if (cat === 'songsKr') label = 'Korean Hits';
                if (cat === 'songsEs') label = 'Spanish / Latin Hits';
                if (cat === 'songsFr') label = 'French Hits';
                if (cat === 'songsEn') label = 'English Hits';
                if (cat === 'songsCn') label = 'Chinese Hits';
                if (cat === 'songsTh') label = 'Thai Hits';
                if (cat === 'songsEason') label = 'Eason Chan Hits';
                if (cat === 'songsJayChou') label = 'Jay Chou Collection';

                if (cat.startsWith('spotify:')) {
                    label = cat.replace('spotify:', '') + ' (Spotify)';
                }
                const option = document.createElement('option');
                option.value = cat;
                option.innerText = label;
                select.appendChild(option);
            });

            // Handle community playlists injection? (Later)
        });
        document.getElementById('create-room-form').classList.remove('hidden');
        document.getElementById('join-room-form').classList.add('hidden');
    };

    document.getElementById('show-join-btn').onclick = () => {
        document.getElementById('join-room-form').classList.remove('hidden');
        document.getElementById('create-room-form').classList.add('hidden');
        fetchPublicRooms();
    };

    document.getElementById('create-btn').onclick = () => {
        const mode = document.getElementById('mode-select').value;
        const rounds = parseInt(document.getElementById('rounds-select').value);
        const hearts = parseInt(document.getElementById('hearts-select').value);
        const diff = parseInt(document.getElementById('diff-select').value);
        const lang = document.getElementById('lang-select').value;
        const isPublic = document.getElementById('room-visibility-select').value === 'public';

        socket.emit('createRoom', {
            name: state.name, icon: state.icon, mode, rounds, hearts, diff, lang, customSongs: [], isPublic
        }, (res) => {
            if (res.success) {
                state.roomId = res.roomId;
                state.isHost = res.host;
                state.players = res.players;
                state.roomLang = res.lang;
                state.roomMode = res.mode;
                updateLobby();
                switchScreen('lobby');
            }
        });
    };

    document.getElementById('refresh-rooms-btn').onclick = fetchPublicRooms;

    document.getElementById('room-search-input').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.public-room-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    };

    document.getElementById('join-btn').onclick = () => {
        const roomId = document.getElementById('room-code-input').value;
        socket.emit('joinRoom', { roomId, name: state.name, icon: state.icon }, (res) => {
            if (res.success) {
                state.roomId = res.roomId;
                state.isHost = res.host;
                state.players = res.players;
                state.roomLang = res.lang;
                state.roomMode = res.mode;
                updateLobby();
                switchScreen('lobby');
            } else {
                alert(res.message);
            }
        });
    };

    document.getElementById('lobby-start-btn').onclick = () => {
        socket.emit('startGame', state.roomId);
    };

    document.getElementById('lobby-leave-btn').onclick = () => {
        leaveRoom();
    };

    socket.on('roomUpdate', (data) => {
        state.players = data.players;
        state.isPaused = !!data.isPaused;
        updateLobby();
    });

    socket.on('publicRoomsUpdate', (rooms) => {
        const list = document.getElementById('public-rooms-list');
        const container = document.getElementById('public-rooms-container');
        // Only update if the user is currently looking at the join form
        if (list && container && !container.closest('.hidden')) {
            renderPublicRoomsList(rooms);
        }
    });
}

function fetchPublicRooms() {
    const list = document.getElementById('public-rooms-list');
    if (!list) return;
    list.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85em; padding: 20px;">Refreshing...</div>';

    socket.emit('getPublicRooms', (rooms) => {
        renderPublicRoomsList(rooms);
    });
}

function renderPublicRoomsList(rooms) {
    const list = document.getElementById('public-rooms-list');
    if (!list) return;

    list.innerHTML = '';
    if (rooms.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85em; padding: 20px;">No public rooms found.</div>';
        return;
    }

    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'public-room-item';
        div.style = `
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px; padding: 12px 15px; cursor: pointer; transition: all 0.2s;
        `;
        div.onmouseover = () => div.style.background = 'rgba(255, 255, 255, 0.1)';
        div.onmouseout = () => div.style.background = 'rgba(255, 255, 255, 0.05)';

        let modeLabel = room.mode.charAt(0).toUpperCase() + room.mode.slice(1);
        let catLabel = room.lang.replace('songs', '') + ' Hits';
        if (room.lang === 'songsHk8090s') catLabel = '80s-90s Hits';
        if (room.lang === 'songsHk2000s') catLabel = '2000s Hits';
        if (room.lang === 'songsIn') catLabel = 'India Hits';
        if (room.lang === 'songsJp') catLabel = 'Japanese Hits';
        if (room.lang === 'songsKr') catLabel = 'Korean Hits';

        div.innerHTML = `
            <div style="text-align: left;">
                <div style="font-weight: 600; color: var(--text-main); font-size: 1rem;">${room.id}</div>
                <div style="font-size: 0.75em; color: var(--text-muted);">${modeLabel} • ${catLabel}</div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.8em; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 10px;">👤 ${room.playerCount}</span>
                <span style="color: var(--primary-accent);">➜</span>
            </div>
        `;
        div.onclick = () => {
            document.getElementById('room-code-input').value = room.id;
            document.getElementById('join-btn').click();
        };
        list.appendChild(div);
    });

    // Re-apply search filter if there's text in the input
    const query = document.getElementById('room-search-input').value.toLowerCase();
    if (query) {
        const items = list.querySelectorAll('.public-room-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
}
