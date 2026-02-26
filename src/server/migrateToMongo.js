import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { User, Team, Playlist, RecoveryRequest } from './models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/songguess';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // 1. Migrate Users
        if (fs.existsSync('./users.json')) {
            const usersData = JSON.parse(fs.readFileSync('./users.json', 'utf8'));
            console.log(`Migrating ${Object.keys(usersData).length} users...`);
            for (const username in usersData) {
                const data = usersData[username];
                await User.findOneAndUpdate(
                    { username },
                    {
                        username,
                        password: data.password,
                        email: data.email,
                        displayName: data.displayName || username,
                        icon: data.icon || '👤',
                        banned: data.banned || false,
                        teamId: data.teamId || null,
                        highScores: data.highScores || {},
                        totalScore: data.totalScore || 0,
                        favorites: data.favorites || []
                    },
                    { upsert: true, new: true }
                );
            }
            console.log('Users migrated.');
        }

        // 2. Migrate Teams
        if (fs.existsSync('./teams.json')) {
            const teamsData = JSON.parse(fs.readFileSync('./teams.json', 'utf8'));
            console.log(`Migrating ${Object.keys(teamsData).length} teams...`);
            for (const id in teamsData) {
                const data = teamsData[id];
                await Team.findOneAndUpdate(
                    { id },
                    {
                        id,
                        name: data.name,
                        leader: data.leader,
                        members: data.members || [],
                        icon: data.icon || '👥',
                        score: data.score || 0,
                        roles: data.roles || {},
                        memberScores: data.memberScores || {}
                    },
                    { upsert: true, new: true }
                );
            }
            console.log('Teams migrated.');
        }

        // 3. Migrate Playlists
        if (fs.existsSync('./community_playlists.json')) {
            const playlistsData = JSON.parse(fs.readFileSync('./community_playlists.json', 'utf8'));
            console.log(`Migrating ${playlistsData.length} playlists...`);
            for (const data of playlistsData) {
                await Playlist.findOneAndUpdate(
                    { name: data.name, owner: data.owner },
                    {
                        name: data.name,
                        genre: data.genre || 'Other',
                        songs: data.songs || [],
                        owner: data.owner,
                        likes: data.likes || 0,
                        plays: data.plays || 0
                    },
                    { upsert: true, new: true }
                );
            }
            console.log('Playlists migrated.');
        }

        // 4. Migrate Recovery Requests
        if (fs.existsSync('./recovery_requests.json')) {
            const recoveryData = JSON.parse(fs.readFileSync('./recovery_requests.json', 'utf8'));
            console.log(`Migrating ${Object.keys(recoveryData).length} recovery requests...`);
            for (const username in recoveryData) {
                const data = recoveryData[username];
                await RecoveryRequest.findOneAndUpdate(
                    { username },
                    {
                        username,
                        requestedAt: data.requestedAt,
                        newPassword: data.newPassword
                    },
                    { upsert: true, new: true }
                );
            }
            console.log('Recovery requests migrated.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
