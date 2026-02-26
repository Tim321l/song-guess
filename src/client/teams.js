import { state } from './state.js';
import { socket } from './socket.js';
import { switchScreen } from './utils.js';

let activeTeam = null;

export function clearTeamState() {
    activeTeam = null;
}

export function initTeamHandlers() {
    const showTeamsBtn = document.getElementById('show-teams-btn');
    const teamsBackBtn = document.getElementById('teams-back-btn');
    const createTeamBtn = document.getElementById('create-team-btn');
    const joinTeamBtn = document.getElementById('join-team-btn');
    const leaveTeamBtn = document.getElementById('leave-team-btn');

    if (showTeamsBtn) {
        showTeamsBtn.onclick = () => {
            // Check if user is already in a team
            if (state.teamId) {
                fetchTeamDetails(state.teamId);
            } else {
                renderNoTeamView();
            }
            switchScreen('teams');
        };
    }

    if (teamsBackBtn) {
        teamsBackBtn.onclick = () => switchScreen('start');
    }

    if (createTeamBtn) {
        createTeamBtn.onclick = () => {
            const name = document.getElementById('create-team-input').value.trim();
            if (!name) return alert('Enter a team name');
            socket.emit('createTeam', name, (res) => {
                if (res.success) {
                    state.teamId = res.teamId;
                    // UI will be updated by teamUpdated event
                    alert('Team created!');
                } else {
                    alert(res.message);
                }
            });
        };
    }

    if (joinTeamBtn) {
        joinTeamBtn.onclick = () => {
            const id = document.getElementById('join-team-input').value.trim();
            if (!id) return alert('Enter a team ID');
            socket.emit('joinTeam', id, (res) => {
                if (res.success) {
                    state.teamId = id;
                    // UI will be updated by teamUpdated event
                    alert('Joined team!');
                } else {
                    alert(res.message);
                }
            });
        }
    }

    if (leaveTeamBtn) {
        leaveTeamBtn.onclick = () => {
            if (!confirm('Are you sure you want to leave this team?')) return;
            socket.emit('leaveTeam', (res) => {
                if (res.success) {
                    state.teamId = null;
                    activeTeam = null;
                    renderNoTeamView();
                    alert(res.teamEnded ? 'Team disbanded' : 'Left team');
                } else {
                    alert(res.message);
                }
            });
        }
    }

    // --- Socket Events ---
    socket.on('teamUpdated', (team) => {
        // Called when you join, create, or leave
        if (team) {
            state.teamId = team.id;
            activeTeam = team;
            if (document.getElementById('teams-screen').classList.contains('active')) {
                renderActiveTeamView(team);
            }
        } else {
            state.teamId = null;
            activeTeam = null;
            if (document.getElementById('teams-screen').classList.contains('active')) {
                renderNoTeamView();
            }
        }
    });

    socket.on('teamStateUpdate', ({ teamId, team, kicked }) => {
        if (state.teamId === teamId) {
            if (kicked === state.username) {
                // You were kicked
                state.teamId = null;
                activeTeam = null;
                alert('You have been kicked from the team.');
                if (document.getElementById('teams-screen').classList.contains('active')) {
                    renderNoTeamView();
                }
            } else {
                activeTeam = team;
                if (document.getElementById('teams-screen').classList.contains('active')) {
                    renderActiveTeamView(team);
                }
            }
        }
    });

    // --- Role Modal Handlers ---
    const roleModal = document.getElementById('role-modal');
    const roleSelect = document.getElementById('role-modal-select');
    const roleDescs = document.querySelectorAll('.role-desc');

    if (roleSelect) {
        roleSelect.onchange = () => {
            const role = roleSelect.value;
            roleDescs.forEach(d => {
                if (d.getAttribute('data-role') === role) d.classList.remove('hidden');
                else d.classList.add('hidden');
            });
        };
    }

    document.getElementById('role-modal-cancel-btn').onclick = () => roleModal.classList.add('hidden');

    document.getElementById('role-modal-save-btn').onclick = () => {
        const username = document.getElementById('role-modal-username').innerText;
        const newRole = roleSelect.value;
        socket.emit('updateMemberRole', { targetUser: username, newRole }, res => {
            if (res.success) {
                roleModal.classList.add('hidden');
                alert('Role updated!');
            } else alert(res.message);
        });
    };

    document.getElementById('role-modal-kick-btn').onclick = () => {
        const username = document.getElementById('role-modal-username').innerText;
        if (confirm(`Kick ${username} from the team?`)) {
            socket.emit('kickMember', username, res => {
                if (res.success) {
                    roleModal.classList.add('hidden');
                    alert('Member kicked');
                } else alert(res.message);
            });
        }
    };

    // --- Team Icon Handlers ---
    document.querySelectorAll('#team-icon-selector .icon-btn').forEach(btn => {
        btn.onclick = () => {
            const icon = btn.innerText;
            socket.emit('updateTeamIcon', icon, res => {
                if (!res.success) alert(res.message);
            });
        };
    });
}

function fetchTeamDetails(teamId) {
    socket.emit('getTeam', teamId, (res) => {
        if (res.success) {
            activeTeam = res.team;
            renderActiveTeamView(res.team);
        } else {
            // Team might have been deleted
            state.teamId = null;
            activeTeam = null;
            renderNoTeamView();
        }
    });
}

function renderNoTeamView() {
    document.getElementById('no-team-view').classList.remove('hidden');
    document.getElementById('active-team-view').classList.add('hidden');
    document.getElementById('create-team-input').value = '';
    document.getElementById('join-team-input').value = '';
}

function renderActiveTeamView(team) {
    document.getElementById('no-team-view').classList.add('hidden');
    document.getElementById('active-team-view').classList.remove('hidden');

    document.getElementById('active-team-name').innerText = team.name;
    document.getElementById('active-team-id').innerText = team.id;
    document.getElementById('active-team-score').innerText = team.score || 0;
    document.getElementById('team-member-count').innerText = team.members.length;
    document.getElementById('active-team-icon-display').innerText = team.icon || '👥';

    const myMemberObj = team.members.find(m => m.id === state.username);
    const myRole = myMemberObj?.role || 'member';
    const canManage = myRole === 'leader' || myRole === 'manager';

    const adminControls = document.getElementById('team-admin-controls');
    if (adminControls) {
        if (canManage) adminControls.classList.remove('hidden');
        else adminControls.classList.add('hidden');
    }

    const list = document.getElementById('team-members-list');
    list.innerHTML = '';

    team.members.forEach(member => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;';

        const isLeader = member.role === 'leader';
        const isManager = member.role === 'manager';
        const isElder = member.role === 'elder';
        const isMe = member.id === state.username;

        let roleBadge = '';
        if (isLeader) roleBadge = '<span style="font-size:0.7em; margin-left:5px; padding:2px 6px; background:#f39c12; color:#fff; border-radius:10px;">Leader</span>';
        else if (isManager) roleBadge = '<span style="font-size:0.7em; margin-left:5px; padding:2px 6px; background:#3498db; color:#fff; border-radius:10px;">Manager</span>';
        else if (isElder) roleBadge = '<span style="font-size:0.7em; margin-left:5px; padding:2px 6px; background:#9b59b6; color:#fff; border-radius:10px;">Elder</span>';

        let manageBtn = '';
        if (canManage && !isMe && member.role !== 'leader') {
            manageBtn = `<button class="action-btn manage-role-btn" data-user="${member.id}" data-role="${member.role}" style="padding:4px 8px; font-size:0.7em; border-color:#3498db; color:#3498db; background:transparent;">Manage</button>`;
        } else if (myRole === 'elder' && !isMe && member.role === 'member') {
            // Elders can kick members
            manageBtn = `<button class="action-btn kick-btn" data-user="${member.id}" style="padding:4px 8px; font-size:0.7em; border-color:#e74c3c; color:#e74c3c; background:transparent;">Kick</button>`;
        }

        row.innerHTML = `
            <div>
               <div style="color:var(--text-main); font-weight:${isMe ? 'bold' : 'normal'}; display:flex; align-items:center; gap:5px;">
                  ${member.displayName} ${isMe ? '(You)' : ''} ${roleBadge}
               </div>
               <div style="font-size:0.8em; color:var(--text-muted); margin-top:2px;">Score Contribution: ${member.totalScore || 0} pts</div>
            </div>
            ${manageBtn}
         `;

        list.appendChild(row);
    });

    // Attach handler for dynamically created buttons
    list.querySelectorAll('.manage-role-btn').forEach(btn => {
        btn.onclick = () => {
            console.log("Manage button clicked for:", btn.getAttribute('data-user'));
            const tgt = btn.getAttribute('data-user');
            const role = btn.getAttribute('data-role');
            const modalUname = document.getElementById('role-modal-username');
            const modalSelect = document.getElementById('role-modal-select');

            if (modalUname) modalUname.innerText = tgt;
            if (modalSelect) {
                modalSelect.value = role;
                modalSelect.onchange();
            }

            const modal = document.getElementById('role-modal');
            if (modal) modal.classList.remove('hidden');
            else console.error("role-modal element not found!");
        };
    });

    list.querySelectorAll('.kick-btn').forEach(btn => {
        btn.onclick = () => {
            const tgt = btn.getAttribute('data-user');
            if (confirm(`Kick ${tgt} from the team?`)) {
                socket.emit('kickMember', tgt, res => {
                    if (!res.success) alert(res.message);
                });
            }
        };
    });
}
