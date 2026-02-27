import { state } from './state.js';
import { socket } from './socket.js';
import { renderIcon, switchScreen } from './utils.js';
import { stopAllAudio, audioPlayer } from './audio.js';

export function renderLeaderboard(type = 'players') {
    const categorySelect = document.getElementById('lb-category-select');
    const modeSelect = document.getElementById('lb-mode-select');

    const category = categorySelect.value;
    const mode = modeSelect.value;

    console.log(`[Leaderboard] Fetching ranking for Category=${category}, Mode=${mode}, Type=${type}`);

    socket.emit('getLeaderboard', { category, mode, type }, (leaderboard) => {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        if (!leaderboard || leaderboard.length === 0) {
            list.innerHTML = '<div style="text-align:center; color:#a8b0cc; padding:20px;" data-i18n="lb-no-records">No records yet! Be the first!</div>';
        } else {
            leaderboard.forEach((user, index) => {
                const div = document.createElement('div');
                div.className = 'player-score-inline';
                div.style.background = user.username === state.name ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)';
                div.style.border = user.username === state.name ? '1px solid #00f2fe' : 'none';
                div.style.cursor = type === 'teams' ? 'pointer' : 'default';
                div.innerHTML = `<span><strong style="width:25px; display:inline-block;">#${index + 1}</strong> <span style="margin-right:5px;">${renderIcon(user.icon)}</span> ${user.username}</span> <span>${user.score} pts</span>`;

                if (type === 'teams') {
                    div.onclick = () => showTeamDetailModal(user.id);
                }

                list.appendChild(div);
            });
        }
    });
}

export function renderFavorites() {
    const list = document.getElementById('favorites-list');
    list.innerHTML = '';
    document.getElementById('favorites-subtitle').innerText = `${state.favorites.length} Songs saved`;

    if (state.favorites.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#a8b0cc; padding:20px;">No favorites saved yet.</div>';
        return;
    }

    state.favorites.forEach(song => {
        const div = document.createElement('div');
        div.className = 'fav-item';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '15px';
        div.style.borderRadius = '10px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '10px';

        div.innerHTML = `
      <div><strong>${song.title}</strong><br><span style="font-size:0.9em;color:#a8b0cc;">${song.artist}</span></div>
      <div style="display:flex; gap:10px; justify-content:space-between; align-items:center;">
        <button class="action-btn fav-play-btn" style="padding:5px 15px; font-size:0.9em;" onclick="playFavoritePreview('${song.audioUrl}', this)">▶️ Play</button>
        ${song.appleUrl ? `<a href="${song.appleUrl}&at=1000l1234" target="_blank" style="color:#fa243c; text-decoration:none; font-size:0.9em; font-weight:bold;">🎵 Apple Music</a>` : ''}
        <button class="action-btn" style="padding:5px 15px; font-size:0.9em; background:rgba(255,71,87,0.1); color:#ff4757; border-color:#ff4757;" onclick="removeFavoriteLocal(${song.id})">❌</button>
      </div>
    `;
        list.appendChild(div);
    });
}

export function initSocialHandlers() {
    let currentLbType = 'players';

    document.getElementById('show-leaderboard-btn').onclick = () => {
        currentLbType = 'players';
        document.getElementById('lb-type-players').style.background = 'var(--primary-accent)';
        document.getElementById('lb-type-players').style.color = 'white';
        document.getElementById('lb-type-teams').style.background = 'transparent';
        document.getElementById('lb-type-teams').style.color = 'var(--text-main)';

        // Populate Categories Dynamically
        socket.emit('getCategories', (categories) => {
            const lbCat = document.getElementById('lb-category-select');
            if (lbCat) {
                // Keep 'Total Scores' (Global cumulative) as the first item
                lbCat.innerHTML = '<option value="all" data-i18n="lb-cat-all">Total Scores</option>';

                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    // Standard labels for language hits
                    let i18nKey = 'cat-' + cat.replace('songs', '').toLowerCase();
                    opt.setAttribute('data-i18n', i18nKey);

                    // Fallback label if translations fail
                    let label = cat.replace('songs', '') + ' Hits';
                    if (cat.startsWith('spotify:')) label = cat.replace('spotify:', '') + ' (Spotify)';
                    opt.innerText = label;

                    lbCat.appendChild(opt);
                });

                // Keep 'all' as default
                lbCat.value = 'all';

                // Re-apply translations
                const currentLang = localStorage.getItem('songGuessLang') || 'EN';
                import('./i18n.js').then(m => m.applyLanguage(currentLang));
            }
            renderLeaderboard(currentLbType);
        });

        switchScreen('leaderboard');
    };

    document.getElementById('lb-type-players').onclick = () => {
        currentLbType = 'players';
        document.getElementById('lb-type-players').style.background = 'var(--primary-accent)';
        document.getElementById('lb-type-players').style.color = 'white';
        document.getElementById('lb-type-teams').style.background = 'transparent';
        document.getElementById('lb-type-teams').style.color = 'var(--text-main)';
        renderLeaderboard(currentLbType);
    };

    document.getElementById('lb-type-teams').onclick = () => {
        currentLbType = 'teams';
        document.getElementById('lb-type-teams').style.background = 'var(--primary-accent)';
        document.getElementById('lb-type-teams').style.color = 'white';
        document.getElementById('lb-type-players').style.background = 'transparent';
        document.getElementById('lb-type-players').style.color = 'var(--text-main)';
        renderLeaderboard(currentLbType);
    };

    document.getElementById('team-detail-close-btn').onclick = () => {
        document.getElementById('team-detail-modal').classList.add('hidden');
    };

    document.getElementById('show-favorites-btn').onclick = () => {
        renderFavorites();
        switchScreen('favorites');
    };

    window.playFavoritePreview = (url, btnElement) => {
        if (state.currentFavUrl === url && !audioPlayer.paused) {
            stopAllAudio();
            return;
        }
        stopAllAudio();
        state.currentFavUrl = url;
        audioPlayer.src = url;
        if (btnElement) btnElement.innerHTML = '⏸️ Pause';
        audioPlayer.play().catch(e => console.log(e));
    };

    window.removeFavoriteLocal = (songId) => {
        const song = state.favorites.find(s => s.id === songId);
        if (!song) return;
        socket.emit('toggleFavorite', { username: state.username, song: song }, (res) => {
            if (res.success) {
                state.favorites = res.favorites;
                renderFavorites();
            }
        });
    };
    const lbCat = document.getElementById('lb-category-select');
    const lbMode = document.getElementById('lb-mode-select');
    if (lbCat) lbCat.onchange = () => renderLeaderboard(currentLbType);
    if (lbMode) lbMode.onchange = () => renderLeaderboard(currentLbType);

    // --- Community Playlists ---
    let allCommunityPlaylists = [];
    let selectedGenre = 'All';
    let modalTracks = [];

    function renderCommunityPlaylists(playlists) {
        allCommunityPlaylists = playlists;
        const searchVal = (document.getElementById('community-search-input')?.value || '').toLowerCase();
        const filtered = playlists.filter(p => {
            const matchGenre = selectedGenre === 'All' || p.genre === selectedGenre;
            const matchSearch = !searchVal || p.name.toLowerCase().includes(searchVal) || (p.owner || '').toLowerCase().includes(searchVal);
            return matchGenre && matchSearch;
        });

        const container = document.getElementById('community-playlists-list');
        if (!container) return;
        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">No playlists found.</div>';
            return;
        }

        filtered.forEach(pl => {
            const isOwner = pl.owner === state.name;
            const liked = (pl.likes || []).includes(state.name);
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:12px;padding:15px;display:flex;flex-direction:column;gap:8px;';
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div>
                        <strong style="font-size:1em;color:var(--text-main);">${pl.name}</strong>
                        <div style="font-size:0.8em;color:var(--text-muted);margin-top:2px;">by ${pl.owner} · ${(pl.songs || []).length} songs · ${pl.genre || 'Other'}</div>
                    </div>
                    <button data-pl-id="${pl.id}" class="like-btn action-btn" style="padding:4px 10px;font-size:0.85em;border-color:${liked ? '#e74c3c' : 'rgba(255,255,255,0.2)'};color:${liked ? '#e74c3c' : 'var(--text-muted)'};background:transparent;flex-shrink:0;">
                        ${liked ? '❤️' : '🤍'} ${(pl.likes || []).length}
                    </button>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button data-pl-id="${pl.id}" data-pl-name="${pl.name}" class="play-community-btn action-btn" style="flex:1;justify-content:center;background:rgba(46,204,113,0.1);border-color:#2ecc71;color:#2ecc71;font-size:0.85em;">
                        ▶️ Play This Playlist
                    </button>
                    ${isOwner ? `<button data-pl-id="${pl.id}" class="edit-pl-btn action-btn" style="padding:4px 12px;font-size:0.85em;border-color:#f1c40f;color:#f1c40f;background:transparent;">✏️</button>` : ''}
                    ${isOwner ? `<button data-pl-id="${pl.id}" class="delete-pl-btn action-btn" style="padding:4px 12px;font-size:0.85em;border-color:#e74c3c;color:#e74c3c;background:transparent;">🗑️</button>` : ''}
                </div>
            `;

            // Like
            card.querySelector('.like-btn').onclick = () => {
                socket.emit('likePlaylist', { id: pl.id, username: state.name }, (res) => {
                    if (res.success) renderCommunityPlaylists(allCommunityPlaylists.map(p => p.id === pl.id ? { ...p, likes: res.isLiked ? [...(p.likes || []), state.name] : (p.likes || []).filter(u => u !== state.name) } : p));
                });
            };

            // Play
            card.querySelector('.play-community-btn').onclick = () => {
                switchScreen('start');
                // Inject into lang-select as community playlist option
                const select = document.getElementById('lang-select');
                if (select) {
                    let opt = select.querySelector(`option[value="community:${pl.id}"]`);
                    if (!opt) { opt = document.createElement('option'); opt.value = `community:${pl.id}`; select.appendChild(opt); }
                    opt.innerText = pl.name;
                    select.value = `community:${pl.id}`;
                }
                document.getElementById('create-room-form')?.classList.remove('hidden');
                document.getElementById('join-room-form')?.classList.add('hidden');
            };

            // Edit
            card.querySelector('.edit-pl-btn')?.addEventListener('click', () => openModal(pl));

            // Delete
            card.querySelector('.delete-pl-btn')?.addEventListener('click', () => {
                if (!confirm(`Delete "${pl.name}"?`)) return;
                socket.emit('deletePlaylist', { id: pl.id, username: state.name }, () => {
                    socket.emit('getCommunityPlaylists', (res) => { if (res.success) renderCommunityPlaylists(res.playlists); });
                });
            });

            container.appendChild(card);
        });

        // Render genre chips
        const genres = ['All', ...new Set(playlists.map(p => p.genre).filter(Boolean))];
        const filtersContainer = document.getElementById('community-genre-filters');
        if (filtersContainer) {
            filtersContainer.innerHTML = '';
            genres.forEach(g => {
                const chip = document.createElement('button');
                chip.className = 'action-btn';
                chip.style.cssText = `padding:5px 14px;border-radius:20px;font-size:0.8em;flex-shrink:0;${g === selectedGenre ? 'background:var(--primary-accent);color:#fff;border-color:var(--primary-accent);' : 'background:transparent;border-color:var(--glass-border);'}`;
                chip.innerText = g;
                chip.onclick = () => { selectedGenre = g; renderCommunityPlaylists(allCommunityPlaylists); };
                filtersContainer.appendChild(chip);
            });
        }
    }

    function openModal(pl = null) {
        modalTracks = pl ? [...(pl.songs || [])] : [];
        document.getElementById('pl-modal-name').value = pl ? pl.name : '';
        document.getElementById('pl-modal-genre').value = pl ? (pl.genre || 'Other') : 'Other';
        document.getElementById('pl-modal-id').value = pl ? pl.id : '';
        renderModalTracks();
        document.getElementById('playlist-modal').classList.remove('hidden');
    }

    function renderModalTracks() {
        const container = document.getElementById('pl-modal-tracks');
        const countEl = document.getElementById('pl-modal-count');
        if (!container) return;
        container.innerHTML = '';
        if (countEl) countEl.innerText = modalTracks.length;
        modalTracks.forEach((song, i) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px;background:rgba(255,255,255,0.05);border-radius:6px;';
            row.innerHTML = `<span style="font-size:0.85em;">${song.title} - ${song.artist}</span><button style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:1em;" data-i="${i}">✕</button>`;
            row.querySelector('button').onclick = () => { modalTracks.splice(i, 1); renderModalTracks(); };
            container.appendChild(row);
        });
    }

    document.getElementById('show-community-btn').onclick = () => {
        socket.emit('getCommunityPlaylists', (res) => {
            if (res.success) renderCommunityPlaylists(res.playlists);
        });
        switchScreen('community');
    };

    document.getElementById('back-to-menu-community-btn').onclick = () => switchScreen('start');

    document.getElementById('refresh-community-btn').onclick = () => {
        socket.emit('getCommunityPlaylists', (res) => { if (res.success) renderCommunityPlaylists(res.playlists); });
    };

    document.getElementById('community-search-input').oninput = () => renderCommunityPlaylists(allCommunityPlaylists);

    document.getElementById('create-playlist-btn').onclick = () => openModal();

    document.getElementById('pl-modal-cancel-btn').onclick = () => {
        document.getElementById('playlist-modal').classList.add('hidden');
    };

    document.getElementById('pl-modal-search-btn').onclick = () => {
        const term = document.getElementById('pl-modal-search').value.trim();
        if (!term) return;
        const resultsContainer = document.getElementById('pl-modal-search-results');
        resultsContainer.innerHTML = '<div style="color:#a8b0cc;text-align:center;padding:10px;font-size:0.85em;">Searching...</div>';
        socket.emit('searchItunesSongs', term, (res) => {
            resultsContainer.innerHTML = '';
            if (!res.success || res.results.length === 0) {
                resultsContainer.innerHTML = '<div style="color:#a8b0cc;text-align:center;padding:10px;font-size:0.85em;">No results found.</div>';
                return;
            }
            res.results.forEach(song => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;cursor:pointer;background:rgba(255,255,255,0.03);';
                row.innerHTML = `<span style="font-size:0.85em;">${song.title} - ${song.artist}</span><button class="action-btn" style="padding:3px 10px;font-size:0.8em;border-color:#2ecc71;color:#2ecc71;background:transparent;">+ Add</button>`;
                row.querySelector('button').onclick = () => {
                    if (!modalTracks.find(s => s.id === song.id)) { modalTracks.push(song); renderModalTracks(); }
                };
                resultsContainer.appendChild(row);
            });
        });
    };

    document.getElementById('pl-modal-save-btn').onclick = () => {
        const name = document.getElementById('pl-modal-name').value.trim();
        const genre = document.getElementById('pl-modal-genre').value;
        const id = document.getElementById('pl-modal-id').value || null;
        if (!name) return alert('Please enter a playlist name.');
        if (modalTracks.length === 0) return alert('Please add at least one song.');
        socket.emit('savePlaylist', { name, genre, songs: modalTracks, owner: state.name, id }, (res) => {
            if (res.success) {
                document.getElementById('playlist-modal').classList.add('hidden');
                renderCommunityPlaylists(res.playlists);
            } else {
                alert(res.message || 'Error saving playlist.');
            }
        });
    };

    socket.on('communityPlaylistsUpdated', (playlists) => {
        if (document.getElementById('community-screen').classList.contains('active')) {
            renderCommunityPlaylists(playlists);
        }
    });
}

function showTeamDetailModal(teamId) {
    socket.emit('getTeam', teamId, (team) => {
        if (!team) return;
        document.getElementById('team-detail-icon').innerText = team.icon || '👥';
        document.getElementById('team-detail-name').innerText = team.name;
        document.getElementById('team-detail-id').innerText = `ID: ${team.id}`;
        document.getElementById('team-detail-score').innerText = team.score || 0;

        const list = document.getElementById('team-detail-member-list');
        list.innerHTML = '';

        // Sort members by contribution
        const sortedMembers = [...team.members].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        sortedMembers.forEach(m => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;';
            div.innerHTML = `
                <div style="color:var(--text-main); font-weight:600;">${m.displayName}</div>
                <div style="color:#f1c40f; font-weight:800;">${m.totalScore || 0} <span style="font-size:0.7em; font-weight:normal; color:var(--text-muted);">pts</span></div>
            `;
            list.appendChild(div);
        });

        document.getElementById('team-detail-modal').classList.remove('hidden');
    });
}
