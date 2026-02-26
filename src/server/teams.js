import { loadUsers, saveUsers, loadTeams, saveTeams } from './db.js';
import { checkRateLimit, isIpBanned } from './rateLimiter.js';

export function registerTeamHandlers(io, socket) {
    const ip = () => socket.handshake.address;
    const rl = (event, limit, windowMs) => {
        if (isIpBanned(ip())) { return false; }
        return checkRateLimit(ip(), event, limit, windowMs);
    };
    const authRequired = () => !!socket.username;

    const users = loadUsers();

    // Helper to add metadata to team for client
    const augmentTeam = async (team) => {
        if (!team) return null;
        const u = await loadUsers();
        return {
            ...team,
            leaderDisplayName: u[team.leader]?.displayName || team.leader,
            members: team.members.map(m => ({
                id: m,
                displayName: u[m]?.displayName || m,
                role: team.roles?.[m] || 'member',
                totalScore: team.memberScores?.[m] || 0
            }))
        };
    };

    // Fetch team details
    socket.on('getTeam', async (teamId, callback) => {
        if (!rl('getTeam', 30, 60_000)) return callback({ success: false, message: 'Too many requests' });
        const teams = await loadTeams();
        const team = teams[teamId];
        if (team) {
            callback({ success: true, team: await augmentTeam(team) });
        } else {
            callback({ success: false, message: 'Team not found' });
        }
    });

    socket.on('createTeam', async (teamName, callback) => {
        if (!rl('createTeam', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });
        if (typeof teamName !== 'string' || teamName.length < 3 || teamName.length > 30) {
            return callback({ success: false, message: 'Team name must be 3-30 characters.' });
        }

        const users = await loadUsers();
        if (users[socket.username].teamId) {
            return callback({ success: false, message: 'You are already in a team' });
        }

        const teams = await loadTeams();
        // Simple name conflict check
        if (Object.values(teams).some(t => t.name === teamName)) {
            return callback({ success: false, message: 'Team name already exists' });
        }

        const teamId = 'T' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

        teams[teamId] = {
            id: teamId,
            name: teamName,
            icon: '👥',
            leader: socket.username,
            score: 0,
            members: [socket.username],
            roles: { [socket.username]: 'leader' },
            memberScores: { [socket.username]: 0 },
            createdAt: Date.now()
        };

        users[socket.username].teamId = teamId;

        await saveTeams(teams);
        await saveUsers(users);
        const augmented = await augmentTeam(teams[teamId]);
        io.to(socket.id).emit('teamUpdated', augmented);
        callback({ success: true, teamId });
    });

    socket.on('joinTeam', async (teamId, callback) => {
        if (!rl('joinTeam', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        if (users[socket.username].teamId) {
            return callback({ success: false, message: 'You are already in a team' });
        }

        const teams = await loadTeams();
        if (!teams[teamId]) {
            return callback({ success: false, message: 'Team not found' });
        }

        teams[teamId].members.push(socket.username);
        if (!teams[teamId].roles) teams[teamId].roles = {};
        teams[teamId].roles[socket.username] = 'member';
        if (!teams[teamId].memberScores) teams[teamId].memberScores = {};
        teams[teamId].memberScores[socket.username] = teams[teamId].memberScores[socket.username] || 0;

        users[socket.username].teamId = teamId;

        await saveTeams(teams);
        await saveUsers(users);
        const augmented = await augmentTeam(teams[teamId]);
        io.to(socket.id).emit('teamUpdated', augmented); // To joiner

        // Notify other team members
        io.emit('teamStateUpdate', { teamId, team: augmented });

        callback({ success: true, team: augmented });
    });

    socket.on('leaveTeam', async (callback) => {
        if (!rl('leaveTeam', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        const teamId = users[socket.username].teamId;

        if (!teamId) {
            return callback({ success: false, message: 'Not in a team' });
        }

        const teams = await loadTeams();
        const team = teams[teamId];

        if (team) {
            team.members = team.members.filter(m => m !== socket.username);
            users[socket.username].teamId = null;

            if (team.members.length === 0) {
                // Disband team if empty
                delete teams[teamId];
            } else if (team.leader === socket.username) {
                // Pass leadership to oldest member
                team.leader = team.members[0];
            }

            await saveTeams(teams);
            await saveUsers(users);

            io.to(socket.id).emit('teamUpdated', null);
            if (teams[teamId]) {
                io.emit('teamStateUpdate', { teamId, team: await augmentTeam(teams[teamId]) });
            }
            callback({ success: true, teamEnded: !teams[teamId] });
        } else {
            // Edge case, team gone but user still has id
            users[socket.username].teamId = null;
            await saveUsers(users);
            io.to(socket.id).emit('teamUpdated', null);
            callback({ success: true });
        }
    });

    socket.on('kickMember', async (targetUser, callback) => {
        if (!rl('kickMember', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        const teamId = users[socket.username].teamId;
        if (!teamId) return callback({ success: false, message: 'Not in a team' });

        const teams = await loadTeams();
        const team = teams[teamId];

        const role = team.roles?.[socket.username] || 'member';
        const canKick = role === 'leader' || role === 'manager' || role === 'elder';

        if (!team || !canKick) {
            return callback({ success: false, message: 'Not authorized or team not found' });
        }

        if (team.leader === targetUser) {
            return callback({ success: false, message: 'Cannot kick the leader' });
        }

        team.members = team.members.filter(m => m !== targetUser);
        if (team.roles) delete team.roles[targetUser];
        if (users[targetUser]) users[targetUser].teamId = null;

        await saveTeams(teams);
        await saveUsers(users);

        io.emit('teamStateUpdate', { teamId, team: await augmentTeam(teams[teamId]), kicked: targetUser });
        callback({ success: true });
    });

    socket.on('updateMemberRole', async ({ targetUser, newRole }, callback) => {
        if (!rl('updateMemberRole', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        const teamId = users[socket.username].teamId;
        if (!teamId) return callback({ success: false, message: 'Not in a team' });

        const teams = await loadTeams();
        const team = teams[teamId];
        const myRole = team.roles?.[socket.username] || 'member';

        // Only leader and manager can change roles
        if (myRole !== 'leader' && myRole !== 'manager') {
            return callback({ success: false, message: 'Not authorized' });
        }

        if (!team.members.includes(targetUser)) {
            return callback({ success: false, message: 'User not in team' });
        }

        if (targetUser === team.leader) {
            return callback({ success: false, message: 'Cannot change leader role' });
        }

        if (!['manager', 'elder', 'member'].includes(newRole)) {
            return callback({ success: false, message: 'Invalid role' });
        }

        if (!team.roles) team.roles = {};
        team.roles[targetUser] = newRole;

        await saveTeams(teams);
        io.emit('teamStateUpdate', { teamId, team: await augmentTeam(teams[teamId]) });
        callback({ success: true });
    });

    socket.on('updateTeamIcon', async (icon, callback) => {
        if (!rl('updateTeamIcon', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        const teamId = users[socket.username].teamId;
        if (!teamId) return callback({ success: false, message: 'Not in a team' });

        const teams = await loadTeams();
        const team = teams[teamId];
        const myRole = team.roles?.[socket.username] || 'member';

        if (myRole !== 'leader' && myRole !== 'manager') {
            return callback({ success: false, message: 'Not authorized' });
        }

        team.icon = icon || '👥';
        await saveTeams(teams);
        io.emit('teamStateUpdate', { teamId, team: await augmentTeam(teams[teamId]) });
        callback({ success: true });
    });

    socket.on('promoteMember', async (targetUser, callback) => {
        if (!rl('promoteMember', 5, 60_000)) return callback({ success: false, message: 'Too many requests' });
        if (!authRequired()) return callback({ success: false, message: 'Must be logged in' });

        const users = await loadUsers();
        const teamId = users[socket.username].teamId;
        const teams = await loadTeams();
        const team = teams[teamId];

        if (!team || team.leader !== socket.username) {
            return callback({ success: false, message: 'Not authorized' });
        }

        if (!team.members.includes(targetUser)) {
            return callback({ success: false, message: 'User not in team' });
        }

        const oldLeader = team.leader;
        team.leader = targetUser;

        if (!team.roles) team.roles = {};
        team.roles[oldLeader] = 'member';
        team.roles[targetUser] = 'leader';

        await saveTeams(teams);
        io.emit('teamStateUpdate', { teamId, team: await augmentTeam(teams[teamId]) });

        callback({ success: true });
    });
}
